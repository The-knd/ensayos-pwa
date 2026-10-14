import { Injectable } from '@nestjs/common';
import { IntegrationHttpClient, IntegrationResponse } from '../http/integration-http.client';
import { IntegrationError } from '../http/integration.errors';

/** Sesión del Service Layer: la cookie que hay que reenviar en cada llamada. Vive solo durante un job. */
export interface SapB1Session {
  baseUrl: string;
  cookie: string;
}

/**
 * SAP Business One Service Layer (OData):
 *   POST {base}/Login   { CompanyDB, UserName, Password } → cookies B1SESSION (y ROUTEID)
 *   GET  {base}/<Entidad>?$select…  con la cookie
 *   POST {base}/Logout
 *
 * Sin estado: no guarda sesiones ni credenciales; quien llama abre y cierra.
 */
@Injectable()
export class SapB1Client {
  constructor(private readonly http: IntegrationHttpClient) {}

  async login(baseUrl: string, companyDb: string, username: string, password: string): Promise<SapB1Session> {
    const base = baseUrl.replace(/\/+$/, '');
    const res = await this.http.send(
      `${base}/Login`,
      { method: 'POST', body: { CompanyDB: companyDb, UserName: username, Password: password } },
      'SAP Login',
    );
    this.http.failIfNotOk(res, 'SAP Login', sapMessage(res));
    const cookies = (res.headers.getSetCookie?.() ?? [])
      .map((c) => c.split(';')[0])
      .filter((c) => /^(B1SESSION|ROUTEID)=/.test(c));
    if (!cookies.some((c) => c.startsWith('B1SESSION='))) {
      throw new IntegrationError('definitive', 'SAP Login: la respuesta no trajo la sesión (B1SESSION)');
    }
    return { baseUrl: base, cookie: cookies.join('; ') };
  }

  async logout(session: SapB1Session): Promise<void> {
    // Mejor esfuerzo: si falla, la sesión caduca sola en SAP.
    await this.http.send(`${session.baseUrl}/Logout`, { method: 'POST', headers: { Cookie: session.cookie } }, 'SAP Logout').catch(() => undefined);
  }

  async get(session: SapB1Session, pathAndQuery: string, pageSize?: number): Promise<any> {
    const res = await this.http.send(
      `${session.baseUrl}/${pathAndQuery}`,
      {
        method: 'GET',
        headers: {
          Cookie: session.cookie,
          // El Service Layer pagina de 20 en 20 salvo que se pida otro tamaño.
          ...(pageSize ? { Prefer: `odata.maxpagesize=${pageSize}` } : {}),
        },
      },
      'SAP',
    );
    this.http.failIfNotOk(res, 'SAP', sapMessage(res));
    return res.body;
  }
}

/** Mensaje de error del Service Layer: { error: { code, message: { value } | string } }. */
function sapMessage(res: IntegrationResponse): string | undefined {
  const msg = res.body?.error?.message;
  const text = typeof msg === 'string' ? msg : msg?.value;
  return typeof text === 'string' ? text.slice(0, 300) : undefined;
}
