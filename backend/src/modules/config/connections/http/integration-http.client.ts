import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Dispatcher, fetch as undiciFetch, ProxyAgent } from 'undici';
import { classifyHttpStatus, IntegrationError } from './integration.errors';

export interface IntegrationResponse {
  status: number;
  headers: Headers;
  body: any;
}

/**
 * HTTP hacia sistemas externos. Mismo patrón que SamanClient:
 *   - El backend no tiene egreso directo: con EGRESS_HTTPS_PROXY (o, si está
 *     vacío, SAMAN_HTTPS_PROXY) todo sale por el egress-proxy con lista blanca.
 *     Se usa el fetch de `undici` porque el global de Node ignora los proxies.
 *   - Timeout por llamada (INTEGRATIONS_REQUEST_TIMEOUT_MS).
 *   - Un fallo de red es IntegrationError('transient'); un status no exitoso
 *     lo clasifica `failIfNotOk` (auth / transient / definitive).
 *
 * No registra cuerpos ni cabeceras: pueden llevar credenciales o datos personales.
 */
@Injectable()
export class IntegrationHttpClient {
  private readonly dispatcher: Dispatcher | undefined;
  private readonly timeoutMs: number;

  constructor(config: ConfigService) {
    const proxy = config.get<string>('EGRESS_HTTPS_PROXY') || config.get<string>('SAMAN_HTTPS_PROXY');
    if (proxy) this.dispatcher = new ProxyAgent(proxy);
    this.timeoutMs = Number(config.get('INTEGRATIONS_REQUEST_TIMEOUT_MS') ?? 15_000);
  }

  async send(
    url: string,
    init: { method: string; headers?: Record<string, string>; body?: unknown },
    label: string,
  ): Promise<IntegrationResponse> {
    let res: Awaited<ReturnType<typeof undiciFetch>>;
    try {
      res = await undiciFetch(url, {
        method: init.method,
        headers: {
          Accept: 'application/json',
          ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...init.headers,
        },
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
        signal: AbortSignal.timeout(this.timeoutMs),
        dispatcher: this.dispatcher,
      });
    } catch (err) {
      const e = err as Error & { cause?: { code?: string } };
      throw new IntegrationError('transient', `${label}: sin respuesta (${e.cause?.code ?? e.name})`);
    }
    const body: any = await res.json().catch(() => null);
    return { status: res.status, headers: res.headers as unknown as Headers, body };
  }

  /** Lanza el IntegrationError que corresponde si la respuesta no es 2xx. */
  failIfNotOk(res: IntegrationResponse, label: string, detail?: string): void {
    if (res.status >= 200 && res.status < 300) return;
    const type = classifyHttpStatus(res.status);
    throw new IntegrationError(type, `${label}: HTTP ${res.status}${detail ? ` — ${detail}` : ''}`);
  }
}
