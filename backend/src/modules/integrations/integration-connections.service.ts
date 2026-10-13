import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { buildAad, CredentialsCipher, CredentialsCipherError, CURRENT_KEY_VERSION } from '../../commons/crypto/credentials.cipher';
import { inTenant } from '../../commons/database/in-tenant';
import { StructuredLogger } from '../../commons/logger/structured-logger.service';
import { UpsertConnectionDto } from './dto/upsert-connection.dto';
import { IntegrationConnection } from './entities/integration-connection.entity';
import { IntegrationError, IntegrationErrorType } from './http/integration.errors';
import { IntegrationAuthType, IntegrationCredentials, IntegrationEnvironment, IntegrationSystem } from './integration.types';
import { ClientSyncStrategyRegistry } from './sync/client-sync-strategy.registry';

/** Ajustes que no cambian a dónde ni cómo se conecta: cambiarlos no obliga a volver a probar. */
const OPERATIONAL_SETTINGS = new Set(['pageSize', 'schedule', 'ownedFields']);

export type ConnectionTestStatus = 'ok' | IntegrationErrorType;

export interface ConnectionView {
  id: string;
  system: IntegrationSystem;
  environment: IntegrationEnvironment;
  enabled: boolean;
  authType: IntegrationAuthType;
  baseUrl: string;
  settings: Record<string, unknown>;
  hasCredentials: boolean;
  keyVersion: number;
  credentialsUpdatedAt: Date | null;
  expiresAt: Date | null;
  lastTestAt: Date | null;
  lastTestStatus: string | null;
  updatedAt: Date;
}

/**
 * Conexiones por empresa con sistemas externos.
 *
 * - Las credenciales son de solo escritura: se cifran al guardar (AAD =
 *   empresa:sistema:entorno) y ninguna respuesta las devuelve, ni enmascaradas.
 *   Solo `loadForUse` las descifra, para abrir la sesión con el sistema.
 * - Todo acceso va en `inTenant(companyId)`: lo llama el superadmin (su token
 *   no tiene empresa) o el worker (no hay request), y la tabla tiene RLS estricta.
 * - Una conexión solo se activa después de una prueba correcta; cambiar URL,
 *   credenciales o ajustes de conexión invalida esa prueba.
 */
@Injectable()
export class IntegrationConnectionsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly cipher: CredentialsCipher,
    private readonly strategies: ClientSyncStrategyRegistry,
    private readonly config: ConfigService,
    private readonly logger: StructuredLogger,
  ) {}

  get enabled(): boolean {
    return this.config.get<boolean>('INTEGRATIONS_ENABLED') === true;
  }

  ensureEnabled() {
    if (!this.enabled) {
      throw new ConflictException('Las integraciones están deshabilitadas en este servidor (INTEGRATIONS_ENABLED)');
    }
  }

  async list(companyId: string): Promise<ConnectionView[]> {
    await this.ensureCompany(companyId);
    const rows = await inTenant(this.dataSource, companyId, (m) =>
      m.find(IntegrationConnection, { where: { companyId }, order: { system: 'ASC', environment: 'ASC' } }),
    );
    return rows.map(toView);
  }

  async upsert(
    companyId: string,
    system: IntegrationSystem,
    environment: IntegrationEnvironment,
    dto: UpsertConnectionDto,
    userId: string,
  ): Promise<ConnectionView> {
    this.ensureEnabled();
    await this.ensureCompany(companyId);
    this.assertAllowedHost(dto.baseUrl);
    const settings = this.strategies.validateSettings(system, dto.settings);
    const credentials = dto.credentials ? buildCredentials(dto.authType, dto.credentials) : null;

    const saved = await inTenant(this.dataSource, companyId, async (m) => {
      const existing = await this.findWithSecret(m, companyId, system, environment);
      if (existing && existing.authType !== dto.authType && !credentials) {
        throw new BadRequestException('Al cambiar el tipo de autenticación hay que volver a cargar las credenciales');
      }

      const conn = existing ?? m.create(IntegrationConnection, { companyId, system, environment, enabled: false });
      const mustRetest =
        !existing ||
        !!credentials ||
        existing.baseUrl !== dto.baseUrl ||
        existing.authType !== dto.authType ||
        connectionKey(existing.settings) !== connectionKey(settings);

      conn.authType = dto.authType;
      conn.baseUrl = dto.baseUrl;
      conn.settings = settings;
      if (dto.expiresAt !== undefined) conn.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
      if (credentials) {
        conn.credentialsEncrypted = this.encrypt(conn, credentials);
        conn.keyVersion = CURRENT_KEY_VERSION;
        conn.credentialsUpdatedAt = new Date();
      }
      if (mustRetest) {
        conn.lastTestAt = null;
        conn.lastTestStatus = null;
      }

      // Sin `enabled` explícito, un cambio de conexión la desactiva hasta volver a probarla.
      const wantsEnabled = dto.enabled ?? (mustRetest ? false : (existing?.enabled ?? false));
      if (wantsEnabled && !conn.credentialsEncrypted) {
        throw new BadRequestException('No se puede activar una conexión sin credenciales');
      }
      if (wantsEnabled && conn.lastTestStatus !== 'ok') {
        throw new ConflictException('Prueba la conexión antes de activarla');
      }
      conn.enabled = wantsEnabled;
      conn.updatedBy = userId;
      return m.save(IntegrationConnection, conn);
    });

    this.logger.audit('integration.connection.saved', {
      targetCompanyId: companyId,
      system,
      environment,
      credentialsChanged: !!credentials,
      enabled: saved.enabled,
      by: userId,
    });
    return toView(saved);
  }

  async remove(companyId: string, system: IntegrationSystem, environment: IntegrationEnvironment, userId: string) {
    await this.ensureCompany(companyId);
    const res = await inTenant(this.dataSource, companyId, (m) => m.delete(IntegrationConnection, { companyId, system, environment }));
    if (!res.affected) throw new NotFoundException('No existe esa conexión');
    this.logger.audit('integration.connection.deleted', { targetCompanyId: companyId, system, environment, by: userId });
    return { deleted: true };
  }

  /**
   * Fila + credenciales descifradas, solo para abrir la sesión con el sistema
   * externo (prueba y worker). Lo devuelto no se registra ni se guarda.
   */
  async loadForUse(
    companyId: string,
    system: IntegrationSystem,
    environment: IntegrationEnvironment,
  ): Promise<{ connection: IntegrationConnection; credentials: IntegrationCredentials }> {
    const connection = await inTenant(this.dataSource, companyId, (m) => this.findWithSecret(m, companyId, system, environment));
    if (!connection) throw new IntegrationError('definitive', 'No hay conexión configurada');
    if (!connection.credentialsEncrypted) throw new IntegrationError('definitive', 'La conexión no tiene credenciales');
    let plain: string;
    try {
      plain = this.cipher.decrypt(connection.credentialsEncrypted, buildAad(connection));
    } catch (err) {
      if (err instanceof CredentialsCipherError) {
        throw new IntegrationError('definitive', `Credencial inválida para esta conexión: ${err.message}`);
      }
      throw err;
    }
    connection.credentialsEncrypted = null; // no viaja más allá de aquí
    return { connection, credentials: JSON.parse(plain) as IntegrationCredentials };
  }

  /** Abre y cierra una sesión con el sistema externo y guarda el resultado. */
  async test(companyId: string, system: IntegrationSystem, environment: IntegrationEnvironment, userId: string) {
    this.ensureEnabled();
    await this.ensureCompany(companyId);
    let status: ConnectionTestStatus = 'ok';
    let message = 'Conexión correcta';
    try {
      const { connection, credentials } = await this.loadForUse(companyId, system, environment);
      const strategy = this.strategies.resolve(system, connection.settings.strategy);
      const session = await strategy.open(connection, credentials);
      await strategy.close(session);
    } catch (err) {
      if (!(err instanceof IntegrationError)) throw err;
      status = err.type;
      message = err.message;
    }
    await inTenant(this.dataSource, companyId, (m) =>
      m.update(IntegrationConnection, { companyId, system, environment }, { lastTestAt: new Date(), lastTestStatus: status }),
    );
    this.logger.audit('integration.connection.tested', { targetCompanyId: companyId, system, environment, status, by: userId });
    return { status, message };
  }

  private findWithSecret(m: EntityManager, companyId: string, system: IntegrationSystem, environment: IntegrationEnvironment) {
    return m
      .getRepository(IntegrationConnection)
      .createQueryBuilder('c')
      .addSelect('c.credentialsEncrypted')
      .where('c.companyId = :companyId AND c.system = :system AND c.environment = :environment', { companyId, system, environment })
      .getOne();
  }

  private encrypt(conn: IntegrationConnection, credentials: IntegrationCredentials): string {
    try {
      return this.cipher.encrypt(JSON.stringify(credentials), buildAad(conn));
    } catch (err) {
      if (err instanceof CredentialsCipherError) throw new ConflictException(err.message);
      throw err;
    }
  }

  private async ensureCompany(companyId: string) {
    // `companies` no tiene RLS: se puede consultar sin tenant.
    const rows = await this.dataSource.query(`SELECT 1 FROM companies WHERE id = $1`, [companyId]);
    if (rows.length === 0) throw new NotFoundException('Empresa no encontrada');
  }

  /**
   * Evita SSRF: la URL solo puede apuntar a hosts de INTEGRATIONS_ALLOWED_HOSTS
   * (los mismos de la lista blanca del egress-proxy). ".dominio" admite subdominios.
   */
  private assertAllowedHost(baseUrl: string) {
    const host = new URL(baseUrl).hostname.toLowerCase();
    const allowed = (this.config.get<string>('INTEGRATIONS_ALLOWED_HOSTS') ?? '')
      .split(',')
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean);
    const ok = allowed.some((a) => (a.startsWith('.') ? host === a.slice(1) || host.endsWith(a) : host === a));
    if (!ok) {
      throw new BadRequestException(
        `El host ${host} no está permitido. Debe estar en INTEGRATIONS_ALLOWED_HOSTS y en la lista blanca del egress-proxy.`,
      );
    }
  }
}

function buildCredentials(authType: IntegrationAuthType, dto: { token?: string; username?: string; password?: string }): IntegrationCredentials {
  if (authType === IntegrationAuthType.TOKEN) {
    if (!dto.token) throw new BadRequestException('credentials.token es obligatorio para autenticación por token');
    return { token: dto.token };
  }
  if (!dto.username || !dto.password) {
    throw new BadRequestException('credentials.username y credentials.password son obligatorios');
  }
  return { username: dto.username, password: dto.password };
}

/** Parte de settings que define la conexión (sin los ajustes operativos), en forma comparable. */
function connectionKey(settings: Record<string, unknown> | null | undefined): string {
  const entries = Object.entries(settings ?? {})
    .filter(([k]) => !OPERATIONAL_SETTINGS.has(k))
    .sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(entries);
}

function toView(c: IntegrationConnection): ConnectionView {
  return {
    id: c.id,
    system: c.system,
    environment: c.environment,
    enabled: c.enabled,
    authType: c.authType,
    baseUrl: c.baseUrl,
    settings: c.settings,
    hasCredentials: c.credentialsUpdatedAt != null,
    keyVersion: c.keyVersion,
    credentialsUpdatedAt: c.credentialsUpdatedAt,
    expiresAt: c.expiresAt,
    lastTestAt: c.lastTestAt,
    lastTestStatus: c.lastTestStatus,
    updatedAt: c.updatedAt,
  };
}
