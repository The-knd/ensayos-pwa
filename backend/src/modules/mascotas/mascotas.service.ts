import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Ruta de la consulta, FIJADA en código (no se configura desde la GUI; sí el
 * host, con `MASCOTAS_API_URL`). Cambiar el contrato del servicio externo es un
 * cambio de código.
 */
export const MASCOTAS_PATH = '/mascotas';

/**
 * Cliente del servicio externo de Mascotas.
 *
 * Es un **módulo de sistema** (ver Anexo B de MODULE-GUIDE.md): sin pantallas
 * propias, sin permisos ni registro, se lanza desde un botón del panel
 * superadmin. Por eso:
 *   - La URL base es global (`MASCOTAS_API_URL`), no por empresa: no hay
 *     conexión ni credenciales (no pasa por `config/connections`).
 *   - Usa el `fetch` global (undici) SIN proxy: el servicio está en el mismo
 *     host y no debe salir por el egress-proxy con lista blanca.
 *   - Devuelve el JSON crudo tal cual; la GUI lo muestra en un modal.
 */
@Injectable()
export class MascotasService {
  constructor(private readonly config: ConfigService) {}

  async consultar(): Promise<unknown> {
    const base = (this.config.get<string>('MASCOTAS_API_URL') ?? '').trim().replace(/\/+$/, '');
    if (!base) throw new BadGatewayException('MASCOTAS_API_URL no está configurada');
    const timeoutMs = Number(this.config.get('MASCOTAS_REQUEST_TIMEOUT_MS') ?? 5_000);

    let res: Response;
    try {
      res = await fetch(`${base}${MASCOTAS_PATH}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      const code = (err as { cause?: { code?: string } }).cause?.code ?? (err as Error).name;
      throw new BadGatewayException(`No se pudo contactar con el servicio de Mascotas en ${base}${MASCOTAS_PATH} (${code})`);
    }

    if (!res.ok) {
      throw new BadGatewayException(`El servicio de Mascotas respondió HTTP ${res.status}`);
    }

    // Respuesta cruda: si no es JSON válido, se devuelve igualmente para que el
    // modal muestre lo que llegó.
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  }
}
