import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;
/** Versión con la que se cifra hoy. Va en el blob y en `key_version`. */
export const CURRENT_KEY_VERSION = 1;

/** Error al descifrar: blob alterado, AAD distinto (otra fila) o versión desconocida. */
export class CredentialsCipherError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CredentialsCipherError';
  }
}

/**
 * AAD de una conexión: ata el blob cifrado a su fila. Un blob copiado a otra
 * conexión no se descifra (GCM rechaza el tag). Usa el `id` (inmutable) para
 * permitir varias conexiones con el mismo sistema/entorno en una empresa.
 * `legacyAad` reproduce el formato anterior (company:system:environment) para
 * poder descifrar blobs guardados antes de existir el `id` en el AAD.
 */
export function buildAad(c: { companyId: string; id: string }): string {
  return `${c.companyId}:${c.id}`;
}

export function legacyAad(c: { companyId: string; system: string; environment: string }): string {
  return `${c.companyId}:${c.system}:${c.environment}`;
}

/**
 * Cifrado de credenciales de integraciones (AES-256-GCM).
 *
 * Formato del blob: `v<versión>.<iv>.<tag>.<ct>`, en base64url. La versión
 * indica qué clave lo cifró; hoy solo existe la 1 (`CREDENTIALS_KEY`). Para
 * rotar la clave más adelante basta con que `getKey()` conozca más versiones y
 * un script que re-cifre: el formato, la tabla y los llamadores no cambian.
 *
 * Nunca registra el valor ni el blob: los errores solo dicen qué falló.
 */
@Injectable()
export class CredentialsCipher {
  constructor(private readonly config: ConfigService) {}

  get configured(): boolean {
    return !!this.config.get<string>('CREDENTIALS_KEY');
  }

  encrypt(plain: string, aad: string): string {
    const key = this.getKey(CURRENT_KEY_VERSION);
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
    cipher.setAAD(Buffer.from(aad, 'utf8'));
    const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [`v${CURRENT_KEY_VERSION}`, iv, tag, ct].map((p) => (typeof p === 'string' ? p : p.toString('base64url'))).join('.');
  }

  decrypt(blob: string, aad: string): string {
    const parts = blob.split('.');
    const match = /^v(\d+)$/.exec(parts[0] ?? '');
    if (parts.length !== 4 || !match) throw new CredentialsCipherError('Formato de credencial cifrada inválido');
    const key = this.getKey(Number(match[1]));
    const [iv, tag, ct] = parts.slice(1).map((p) => Buffer.from(p, 'base64url'));
    if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
      throw new CredentialsCipherError('Formato de credencial cifrada inválido');
    }
    try {
      const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
      decipher.setAAD(Buffer.from(aad, 'utf8'));
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
    } catch {
      // GCM no distingue entre blob alterado y AAD distinto: ambos son "no es de esta conexión".
      throw new CredentialsCipherError('La credencial no corresponde a esta conexión o fue alterada');
    }
  }

  /** Clave de una versión. Hoy solo la 1; aquí se añadiría el anillo de claves. */
  private getKey(version: number): Buffer {
    if (version !== CURRENT_KEY_VERSION) {
      throw new CredentialsCipherError(`Versión de clave desconocida: v${version}`);
    }
    const raw = this.config.get<string>('CREDENTIALS_KEY') ?? '';
    const key = Buffer.from(raw, 'base64');
    if (key.length !== KEY_BYTES) {
      throw new CredentialsCipherError('CREDENTIALS_KEY no está configurada (32 bytes en base64)');
    }
    return key;
  }
}
