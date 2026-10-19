import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, FindOptionsWhere } from 'typeorm';
import { buildAad, CredentialsCipher, CredentialsCipherError, CURRENT_KEY_VERSION, legacyAad } from '../../../commons/crypto/credentials.cipher';
import { inTenant } from '../../../commons/database/in-tenant';
import { StructuredLogger } from '../../../commons/logger/structured-logger.service';
import { ConnectionPluginsRegistry } from './connection-plugins';
import { ConnectionTemplatesService } from './connection-templates.service';
import { CreateConnectionDto, UpdateConnectionDto } from './dto/connection.dto';
import { ConnectionTemplate } from './entities/connection-template.entity';
import { IntegrationConnection } from './entities/integration-connection.entity';
import { IntegrationError, IntegrationErrorType } from './http/integration.errors';
import { IntegrationAuthType, IntegrationCredentials, IntegrationEnvironment, IntegrationSystem } from './integration.types';

/** Ajustes que no cambian a dónde ni cómo se conecta: cambiarlos no obliga a probar. */
const DEFAULT_OPERATIONAL_SETTINGS = ['pageSize', 'schedule', 'ownedFields'];

export type ConnectionTestStatus = 'ok' | IntegrationErrorType;

export interface ConnectionView {
  id: string;
  system: IntegrationSystem;
  module: string;
  label: string;
  environment: IntegrationEnvironment;
  enabled: boolean;
  authType: IntegrationAuthType;
  baseUrl: string;
  settings: Record<string, unknown>;
  templateId: string | null;
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
 * - Agnóstica: no conoce ningún sistema concreto. La plantilla del sistema
 *   (ConnectionTemplatesService) declara qué campos de `settings` y qué secretos
 *   existen; el adaptador (ConnectionPlugin) valida/prueba si está registrado.
 * - Varias conexiones por empresa (una por `label`), del mismo sistema o no.
 * - Las credenciales son de solo escritura: se cifran al guardar (AAD =
 *   empresa:id) y ninguna respuesta las devuelve. `loadById`/`loadForUse` las
 *   descifran solo para abrir la sesión. El AAD legado (empresa:sistema:entorno)
 *   se reintenta al descifrar para no invalidar credenciales ya guardadas.
 * - Todo acceso va en `inTenant(companyId)`: lo llama el superadmin (su token no
 *   tiene empresa) o el worker (no hay request); la tabla tiene RLS estricta.
 * - Una conexión solo se activa después de una prueba correcta; cambiar URL,
 *   credenciales o ajustes de conexión invalida esa prueba.
 */
@Injectable()
export class ConnectionsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly cipher: CredentialsCipher,
    private readonly plugins: ConnectionPluginsRegistry,
    private readonly templates: ConnectionTemplatesService,
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
      m.find(IntegrationConnection, { where: { companyId }, order: { createdAt: 'ASC' } }),
    );
    return rows.map(toView);
  }

  async get(companyId: string, id: string): Promise<ConnectionView> {
    await this.ensureCompany(companyId);
    const row = await inTenant(this.dataSource, companyId, (m) => m.findOne(IntegrationConnection, { where: { companyId, id } }));
    if (!row) throw new NotFoundException('Conexión no encontrada');
    return toView(row);
  }

  async create(companyId: string, dto: CreateConnectionDto, userId: string): Promise<ConnectionView> {
    this.ensureEnabled();
    await this.ensureCompany(companyId);
    this.assertAllowedHost(dto.baseUrl);
    const template = await this.resolveTemplate(dto.templateId, dto.system);
    const settings = this.validateSettings(dto.system, dto.module, template, dto.settings);
    const credentials = dto.credentials ? this.buildCredentials(template, dto.credentials) : null;

    const saved = await inTenant(this.dataSource, companyId, async (m) => {
      const clash = await m.findOne(IntegrationConnection, { where: { companyId, label: dto.label } });
      if (clash) throw new ConflictException(`Ya existe una conexión llamada '${dto.label}' en esta empresa`);

      const conn = m.create(IntegrationConnection, {
        companyId,
        system: dto.system,
        module: dto.module,
        label: dto.label,
        templateId: dto.templateId ?? template?.id ?? null,
        environment: dto.environment,
        authType: dto.authType ?? template?.authType ?? IntegrationAuthType.BASIC,
        baseUrl: dto.baseUrl,
        settings,
        enabled: false,
      });
      // El `id` es parte del AAD: se guarda una vez para obtenerlo y recién ahí se cifra.
      await m.save(IntegrationConnection, conn);
      if (credentials) {
        conn.credentialsEncrypted = this.encrypt(conn, credentials);
        conn.keyVersion = CURRENT_KEY_VERSION;
        conn.credentialsUpdatedAt = new Date();
      }
      if (dto.expiresAt !== undefined) conn.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
      return m.save(IntegrationConnection, conn);
    });

    this.logger.audit('integration.connection.created', {
      targetCompanyId: companyId,
      system: dto.system,
      module: dto.module,
      label: dto.label,
      hasCredentials: !!credentials,
      by: userId,
    });
    return toView(saved);
  }

  async update(companyId: string, id: string, dto: UpdateConnectionDto, userId: string): Promise<ConnectionView> {
    this.ensureEnabled();
    await this.ensureCompany(companyId);

    const saved = await inTenant(this.dataSource, companyId, async (m) => {
      const conn = await this.findWithSecretById(m, companyId, id);
      if (!conn) throw new NotFoundException('Conexión no encontrada');

      const system = dto.system ?? conn.system;
      const module = dto.module ?? conn.module;
      const templateId = dto.templateId !== undefined ? dto.templateId : conn.templateId;
      const template = await this.resolveTemplate(templateId, system);
      const baseUrl = dto.baseUrl ?? conn.baseUrl;
      this.assertAllowedHost(baseUrl);

      const settings = dto.settings !== undefined ? this.validateSettings(system, module, template, dto.settings) : conn.settings;
      const credentials = dto.credentials ? this.buildCredentials(template, dto.credentials) : null;
      // El authType por defecto de la plantilla solo aplica al crear; en una
      // edición se conserva el guardado salvo que se indique otro.
      const authType = dto.authType ?? conn.authType;
      const environment = dto.environment ?? conn.environment;

      const operational = operationalKeys(template);
      const mustRetest =
        !!credentials ||
        conn.system !== system ||
        conn.environment !== environment ||
        conn.baseUrl !== baseUrl ||
        conn.authType !== authType ||
        connectionKey(conn.settings, operational) !== connectionKey(settings, operational);

      if (dto.label && dto.label !== conn.label) {
        const clash = await m.findOne(IntegrationConnection, { where: { companyId, label: dto.label } });
        if (clash) throw new ConflictException(`Ya existe una conexión llamada '${dto.label}' en esta empresa`);
        conn.label = dto.label;
      }
      conn.system = system;
      if (dto.module !== undefined) conn.module = dto.module;
      conn.environment = environment;
      conn.templateId = templateId ?? null;
      conn.authType = authType;
      conn.baseUrl = baseUrl;
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

      const wantsEnabled = dto.enabled ?? (mustRetest ? false : conn.enabled);
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
      connectionId: id,
      enabled: saved.enabled,
      by: userId,
    });
    return toView(saved);
  }

  async remove(companyId: string, id: string, userId: string) {
    await this.ensureCompany(companyId);
    const res = await inTenant(this.dataSource, companyId, (m) => m.delete(IntegrationConnection, { companyId, id }));
    if (!res.affected) throw new NotFoundException('No existe esa conexión');
    this.logger.audit('integration.connection.deleted', { targetCompanyId: companyId, connectionId: id, by: userId });
    return { deleted: true };
  }

  /** Conexión + credenciales descifradas por `id` (para probar). */
  async loadById(companyId: string, id: string) {
    const connection = await inTenant(this.dataSource, companyId, (m) => this.findWithSecretById(m, companyId, id));
    if (!connection) throw new IntegrationError('definitive', 'No hay conexión configurada');
    return { connection, credentials: this.decryptCredentials(connection) };
  }

  /**
   * Conexión habilitada + credenciales de un (empresa, sistema, entorno) — y,
   * opcionalmente, de un módulo concreto (p. ej. `peliculas` dentro de `api`).
   * Determinista: la más antigua si hubiera varias.
   */
  async loadForUse(
    companyId: string,
    system: IntegrationSystem,
    environment: IntegrationEnvironment,
    module?: string,
  ) {
    const connection = await inTenant(this.dataSource, companyId, (m) =>
      this.findWithSecret(m, companyId, { system, environment, enabled: true, ...(module ? { module } : {}) }),
    );
    if (!connection) throw new IntegrationError('definitive', 'No hay conexión configurada');
    return { connection, credentials: this.decryptCredentials(connection) };
  }

  /** Abre y cierra una sesión con el sistema externo (vía su plugin) y guarda el resultado. */
  async test(companyId: string, id: string, userId: string) {
    this.ensureEnabled();
    await this.ensureCompany(companyId);
    const { connection, credentials } = await this.loadById(companyId, id);
    const plugin = this.plugins.get(connection.system, connection.module);
    let status: ConnectionTestStatus = 'ok';
    let message = 'Conexión correcta';
    try {
      await plugin.test(connection, credentials);
    } catch (err) {
      if (!(err instanceof IntegrationError)) throw err;
      status = err.type;
      message = err.message;
    }
    await inTenant(this.dataSource, companyId, (m) =>
      m.update(IntegrationConnection, { id, companyId }, { lastTestAt: new Date(), lastTestStatus: status }),
    );
    this.logger.audit('integration.connection.tested', { targetCompanyId: companyId, connectionId: id, status, by: userId });
    return { status, message };
  }

  private async resolveTemplate(templateId: string | null | undefined, system: string): Promise<ConnectionTemplate | null> {
    if (templateId) {
      const template = await this.templates.findTemplate(templateId);
      if (!template) throw new BadRequestException('Plantilla no encontrada');
      if (template.systemKey !== system) throw new BadRequestException('La plantilla no corresponde al sistema indicado');
      return template;
    }
    return this.templates.findTemplateForSystem(system);
  }

  /** Valida `settings` contra la plantilla (obligatorios) y, si hay, contra el adaptador del (sistema, módulo). */
  private validateSettings(
    system: string,
    module: string,
    template: ConnectionTemplate | null,
    settings: Record<string, unknown>,
  ): Record<string, unknown> {
    const cleaned = { ...settings };
    for (const field of template?.settingsFields ?? []) {
      if (field.required && isEmptyValue(cleaned[field.key])) {
        throw new BadRequestException(`El campo '${field.label ?? field.key}' es obligatorio`);
      }
    }
    if (this.plugins.has(system, module)) {
      return this.plugins.get(system, module).validateSettings(cleaned);
    }
    return cleaned;
  }

  private buildCredentials(template: ConnectionTemplate | null, credentials: Record<string, string>): IntegrationCredentials {
    const out: IntegrationCredentials = {};
    for (const [key, value] of Object.entries(credentials)) {
      if (typeof value !== 'string') throw new BadRequestException(`El secreto '${key}' debe ser texto`);
      out[key] = value;
    }
    for (const field of template?.secretFields ?? []) {
      if (field.required && !out[field.key]) {
        throw new BadRequestException(`El secreto '${field.label ?? field.key}' es obligatorio`);
      }
    }
    return out;
  }

  private findWithSecret(m: EntityManager, companyId: string, where: FindOptionsWhere<IntegrationConnection>) {
    const qb = m
      .getRepository(IntegrationConnection)
      .createQueryBuilder('c')
      .addSelect('c.credentialsEncrypted')
      .where('c.companyId = :companyId', { companyId });
    let i = 0;
    for (const [key, value] of Object.entries(where)) {
      qb.andWhere(`c.${key} = :w${i}`, { [`w${i}`]: value });
      i += 1;
    }
    return qb.orderBy('c.createdAt', 'ASC').getOne();
  }

  private findWithSecretById(m: EntityManager, companyId: string, id: string) {
    return this.findWithSecret(m, companyId, { id });
  }

  /** Descifra con el AAD actual y, si falla, con el legado (blobs anteriores). */
  private decryptCredentials(connection: IntegrationConnection): IntegrationCredentials {
    if (!connection.credentialsEncrypted) throw new IntegrationError('definitive', 'La conexión no tiene credenciales');
    let plain: string;
    try {
      plain = this.cipher.decrypt(connection.credentialsEncrypted, buildAad(connection));
    } catch (err) {
      if (!(err instanceof CredentialsCipherError)) throw err;
      try {
        plain = this.cipher.decrypt(connection.credentialsEncrypted, legacyAad(connection));
      } catch {
        throw new IntegrationError('definitive', `Credencial inválida para esta conexión: ${err.message}`);
      }
    }
    connection.credentialsEncrypted = null; // no viaja más allá de aquí
    return JSON.parse(plain) as IntegrationCredentials;
  }

  private encrypt(conn: IntegrationConnection, credentials: IntegrationCredentials): string {
    try {
      return this.cipher.encrypt(JSON.stringify(credentials), buildAad(conn));
    } catch (err) {
      if (err instanceof CredentialsCipherError) throw new ConflictException(err.message);
      throw err;
    }
  }

  /** Valida que la empresa exista (lo usan también los endpoints de sincronización). */
  async ensureCompany(companyId: string) {
    // `companies` no tiene RLS: se puede consultar sin tenant.
    const rows = await this.dataSource.query(`SELECT 1 FROM companies WHERE id = $1`, [companyId]);
    if (rows.length === 0) throw new NotFoundException('Empresa no encontrada');
  }

  /**
   * Evita SSRF: la URL solo puede apuntar a hosts de INTEGRATIONS_ALLOWED_HOSTS
   * (los mismos de la lista blanca del egress-proxy). Cada entrada puede ser
   * `host` o `host:puerto`; ".dominio" admite subdominios; sin puerto se admite
   * cualquier puerto del host.
   */
  private assertAllowedHost(baseUrl: string) {
    const url = new URL(baseUrl);
    const host = url.hostname.toLowerCase();
    const port = url.port; // '' cuando es el puerto por defecto del esquema
    const allowed = (this.config.get<string>('INTEGRATIONS_ALLOWED_HOSTS') ?? '')
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);
    const ok = allowed.some((entry) => {
      const { host: pattern, port: patternPort } = splitHostPort(entry);
      const hostOk = pattern.startsWith('.') ? host === pattern.slice(1) || host.endsWith(pattern) : host === pattern;
      const portOk = !patternPort || patternPort === port;
      return hostOk && portOk;
    });
    if (!ok) {
      throw new BadRequestException(
        `El host ${host} no está permitido. Debe estar en INTEGRATIONS_ALLOWED_HOSTS (host o host:puerto) y en la lista blanca del egress-proxy.`,
      );
    }
  }
}

function isEmptyValue(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

/** Claves operativas: las por defecto más las que marque la plantilla. */
function operationalKeys(template: ConnectionTemplate | null): string[] {
  const fromTemplate = (template?.settingsFields ?? []).filter((f) => f.operational).map((f) => f.key);
  return [...DEFAULT_OPERATIONAL_SETTINGS, ...fromTemplate];
}

/** Parte de settings que define la conexión (sin los ajustes operativos), en forma comparable. */
function connectionKey(settings: Record<string, unknown> | null | undefined, operational: string[]): string {
  const skip = new Set(operational);
  const entries = Object.entries(settings ?? {})
    .filter(([k]) => !skip.has(k))
    .sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(entries);
}

/**
 * Parte una entrada de INTEGRATIONS_ALLOWED_HOSTS en host y puerto opcional
 * (se corta por el último ':'). Sin puerto, coincide cualquier puerto del host.
 * No contempla IPv6 (las entradas de la lista blanca son nombres de host).
 */
function splitHostPort(entry: string): { host: string; port: string } {
  const idx = entry.lastIndexOf(':');
  if (idx === -1) return { host: entry, port: '' };
  return { host: entry.slice(0, idx), port: entry.slice(idx + 1) };
}

function toView(c: IntegrationConnection): ConnectionView {
  return {
    id: c.id,
    system: c.system,
    module: c.module,
    label: c.label,
    environment: c.environment,
    enabled: c.enabled,
    authType: c.authType,
    baseUrl: c.baseUrl,
    settings: c.settings,
    templateId: c.templateId,
    hasCredentials: c.credentialsUpdatedAt != null,
    keyVersion: c.keyVersion,
    credentialsUpdatedAt: c.credentialsUpdatedAt,
    expiresAt: c.expiresAt,
    lastTestAt: c.lastTestAt,
    lastTestStatus: c.lastTestStatus,
    updatedAt: c.updatedAt,
  };
}
