import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { EntityManager, FindOptionsWhere, IsNull } from 'typeorm';
import { isValidFullNit } from '../../../commons/utils/nit';
import { Client, ClientDocumentType, ClientStatus } from '../../clients/entities/client.entity';
import { ClientExternalRef } from '../entities/client-external-ref.entity';
import { SyncResult } from '../entities/integration-job.entity';
import { IntegrationSystem } from '../integration.types';
import { ExternalClient, OWNABLE_CLIENT_FIELDS, OwnableClientField } from './client-sync.strategy';

/** Cuántos errores por registro se guardan en el job (el contador `failed` sigue sumando). */
const MAX_STORED_ERRORS = 200;
const UNIQUE_VIOLATION = '23505';

class ItemError extends Error {}

export function emptyResult(): SyncResult {
  return { processed: 0, created: 0, updated: 0, linked: 0, unchanged: 0, failed: 0, errors: [] };
}

/**
 * Aplica una página de clientes externos sobre `clients` de UNA empresa.
 * Debe llamarse dentro de `inTenant(companyId)`.
 *
 * Reglas (sin cambiar el UNIQUE global de `clients.document_number`):
 *   1. Ya enlazado y sin cambios en el origen (mismo hash) → `unchanged`.
 *   2. Cliente propio de la empresa (enlazado o con el mismo documento) →
 *      se actualizan solo los `ownedFields` → `updated`.
 *   3. Cliente del padrón compartido → se enlaza sin modificarlo (lo
 *      administra el superadmin para todas las empresas) → `linked`.
 *   4. Documento de otra empresa (RLS no deja verlo; lo delata el UNIQUE) →
 *      error del registro, sin tocar nada.
 *   5. No existe → se crea como cliente de la empresa → `created`.
 *
 * Cada registro va en su SAVEPOINT: uno malo no aborta la página.
 */
@Injectable()
export class ClientSyncService {
  async persistPage(
    m: EntityManager,
    companyId: string,
    system: IntegrationSystem,
    items: ExternalClient[],
    ownedFields: OwnableClientField[] | undefined,
    result: SyncResult,
  ): Promise<void> {
    const owned = ownedFields ?? [...OWNABLE_CLIENT_FIELDS];
    for (const item of items) {
      result.processed++;
      await m.query('SAVEPOINT sync_item');
      try {
        const action = await this.apply(m, companyId, system, normalize(item), owned);
        result[action]++;
        await m.query('RELEASE SAVEPOINT sync_item');
      } catch (err) {
        await m.query('ROLLBACK TO SAVEPOINT sync_item');
        result.failed++;
        if (result.errors.length < MAX_STORED_ERRORS) {
          result.errors.push({ externalId: String(item.externalId).slice(0, 100), message: describe(err) });
        }
      }
    }
  }

  private async apply(
    m: EntityManager,
    companyId: string,
    system: IntegrationSystem,
    item: ExternalClient,
    owned: OwnableClientField[],
  ): Promise<'created' | 'updated' | 'linked' | 'unchanged'> {
    const hash = sourceHash(item, owned);
    const ref = await m.findOne(ClientExternalRef, { where: { companyId, system, externalId: item.externalId } });
    // Incremental por registro: si el origen no es posterior a la última
    // sincronización del enlace, ya está al día y no se toca. Solo se
    // descartan fechas de días anteriores (SAP guarda fecha, no hora): los del
    // mismo día se re-verifican con el hash de abajo.
    if (ref && isOlderThanLastSync(item.updateDate, ref.lastSyncedAt)) return 'unchanged';
    if (ref && ref.sourceHash === hash) return 'unchanged';

    const visible = (extra: FindOptionsWhere<Client>): FindOptionsWhere<Client>[] => [
      { ...extra, companyId },
      { ...extra, companyId: IsNull() },
    ];
    const client = await m.findOne(Client, {
      where: ref ? visible({ id: ref.clientId }) : visible({ documentNumber: item.documentNumber }),
      withDeleted: true,
    });
    if (client?.deletedAt) throw new ItemError('El cliente con este documento fue eliminado en la app');

    let action: 'created' | 'updated' | 'linked' | 'unchanged';
    let clientId: string;
    if (!client) {
      const created = await m.save(
        Client,
        m.create(Client, {
          companyId,
          documentNumber: item.documentNumber,
          documentType: item.documentType,
          dv: item.documentType === ClientDocumentType.NIT ? item.documentNumber.slice(-1) : undefined,
          personType: item.personType,
          ...ownedValues(item, [...OWNABLE_CLIENT_FIELDS]),
        }),
      );
      clientId = created.id;
      action = 'created';
    } else if (client.companyId === null) {
      clientId = client.id;
      action = 'linked';
    } else {
      clientId = client.id;
      const changes = diff(client, ownedValues(item, owned));
      if (Object.keys(changes).length > 0) {
        await m.update(Client, { id: client.id, companyId }, changes);
        action = 'updated';
      } else {
        action = 'unchanged';
      }
    }

    if (ref) {
      await m.update(ClientExternalRef, { id: ref.id, companyId }, { clientId, sourceHash: hash, lastSyncedAt: new Date() });
    } else {
      await m.insert(ClientExternalRef, { companyId, system, externalId: item.externalId, clientId, sourceHash: hash, lastSyncedAt: new Date() });
    }
    return action;
  }
}

/** Valida y deja el registro en el formato de la app; lanza ItemError si no sirve. */
function normalize(item: ExternalClient): ExternalClient {
  const externalId = String(item.externalId ?? '').trim();
  if (!externalId || externalId.length > 100) throw new ItemError('Registro sin código externo válido');
  const documentNumber = String(item.documentNumber ?? '').replace(/\D/g, '');
  if (!documentNumber) throw new ItemError('Sin número de documento');
  if (documentNumber.length > 20) throw new ItemError('Documento demasiado largo');
  if (item.documentType === ClientDocumentType.NIT && !isValidFullNit(documentNumber)) {
    throw new ItemError(`NIT ${documentNumber} con dígito de verificación inválido`);
  }
  const fullName = (item.fullName ?? '').trim().slice(0, 200);
  if (!fullName) throw new ItemError('Sin nombre');
  return { ...item, externalId, documentNumber, fullName };
}

/** Valores de los campos que manda el origen; `undefined` = el origen no lo trae. */
function ownedValues(item: ExternalClient, owned: OwnableClientField[]): Partial<Client> {
  const values: Partial<Record<OwnableClientField, unknown>> = {};
  for (const field of owned) {
    if (field === 'status') values.status = item.active ? ClientStatus.ACTIVE : ClientStatus.INACTIVE;
    else if (item[field] !== undefined) values[field] = item[field];
  }
  return values as Partial<Client>;
}

function diff(client: Client, values: Partial<Client>): Partial<Client> {
  return Object.fromEntries(
    Object.entries(values).filter(([k, v]) => (client as unknown as Record<string, unknown>)[k] !== v),
  ) as Partial<Client>;
}

function sourceHash(item: ExternalClient, owned: OwnableClientField[]): string {
  const material = {
    documentNumber: item.documentNumber,
    documentType: item.documentType,
    personType: item.personType,
    owned: [...owned].sort(),
    values: ownedValues(item, owned),
  };
  return createHash('sha256').update(JSON.stringify(material)).digest('hex');
}

/**
 * ¿El `UpdateDate` del origen es de un día anterior a la última sincronización
 * del enlace? El `UpdateDate` de SAP es solo fecha (YYYY-MM-DD); se compara a
 * nivel de día (UTC) contra `last_synced_at`. Un día igual o posterior no se
 * descarta: puede ser un cambio del mismo día posterior al job, y el hash de
 * origen es quien decide si de verdad cambió. Sin fecha en el origen o sin
 * enlace previo no se descarta nada.
 */
function isOlderThanLastSync(updateDate: string | null | undefined, lastSyncedAt: Date | null): boolean {
  if (!updateDate || !lastSyncedAt) return false;
  const source = new Date(updateDate);
  if (Number.isNaN(source.getTime())) return false;
  const toDay = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return toDay(source) < toDay(lastSyncedAt);
}

function describe(err: unknown): string {
  if (err instanceof ItemError) return err.message;
  const e = err as { code?: string; constraint?: string; message?: string };
  if (e.code === UNIQUE_VIOLATION) {
    return e.constraint?.startsWith('UQ_client_external_refs')
      ? 'Otro registro externo ya está enlazado a este cliente (documento duplicado en el origen)'
      : 'El documento ya está registrado en otra empresa';
  }
  return `Error al guardar: ${(e.message ?? 'desconocido').slice(0, 200)}`;
}
