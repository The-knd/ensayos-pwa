import { Injectable } from '@nestjs/common';
import { IntegrationHttpClient, IntegrationResponse } from '../../config/connections/http/integration-http.client';
import { IntegrationError } from '../../config/connections/http/integration.errors';
import { IntegrationCredentials } from '../../config/connections/integration.types';

/**
 * Rutas del API externo. A diferencia de SAP (funciona por plantilla), aquí se
 * FIJAN en código: la conexión solo aporta `baseUrl` + credenciales + strategy,
 * así que un cambio de contrato es un cambio de código (y de la estrategia que
 * traduce la respuesta), no de configuración.
 *
 * Coinciden con la API demo `apis-base` (la misma que sirve `/mascotas`).
 */
export const PELICULAS_ROUTES = {
  /** POST {base}/login  { username, password } → { access_token } */
  login: '/login',
  /** GET {base}/peliculas  Authorization: Bearer <token> → respuesta cruda */
  query: '/peliculas',
  /** POST {base}/logout  Authorization: Bearer <token> */
  logout: '/logout',
} as const;

/** Sesión de Películas: el token que hay que reenviar. Vive solo durante la consulta. */
export interface PeliculasSession {
  baseUrl: string;
  token: string;
}

/**
 * HTTP contra el API de Películas (login → consulta → logout), reutilizando
 * `IntegrationHttpClient` (proxy con lista blanca, timeout y clasificación de
 * errores). Sin estado: no guarda sesiones ni credenciales; quien llama abre y
 * cierra.
 */
@Injectable()
export class PeliculasClient {
  constructor(private readonly http: IntegrationHttpClient) {}

  async login(baseUrl: string, credentials: IntegrationCredentials): Promise<PeliculasSession> {
    const username = credentials.username;
    const password = credentials.password;
    if (!username || !password) {
      throw new IntegrationError('definitive', 'La conexión de Películas no tiene usuario/contraseña configurados');
    }
    const base = baseUrl.replace(/\/+$/, '');
    const res = await this.http.send(
      `${base}${PELICULAS_ROUTES.login}`,
      { method: 'POST', body: { username, password } },
      'Películas Login',
    );
    this.http.failIfNotOk(res, 'Películas Login', detail(res));
    const token = res.body?.access_token ?? res.body?.token ?? res.body?.accessToken;
    if (typeof token !== 'string' || !token) {
      throw new IntegrationError('definitive', 'Películas Login: la respuesta no trajo el token');
    }
    return { baseUrl: base, token };
  }

  async logout(session: PeliculasSession): Promise<void> {
    // Mejor esfuerzo: si falla, el token caduca solo en el API.
    await this.http
      .send(
        `${session.baseUrl}${PELICULAS_ROUTES.logout}`,
        { method: 'POST', headers: { Authorization: `Bearer ${session.token}` } },
        'Películas Logout',
      )
      .catch(() => undefined);
  }

  async query(session: PeliculasSession): Promise<unknown> {
    const res = await this.http.send(
      `${session.baseUrl}${PELICULAS_ROUTES.query}`,
      { method: 'GET', headers: { Authorization: `Bearer ${session.token}` } },
      'Películas',
    );
    this.http.failIfNotOk(res, 'Películas', detail(res));
    return res.body;
  }
}

/** El cuerpo de error del API (`{ detail: "…" }`) como detalle legible del fallo. */
function detail(res: IntegrationResponse): string | undefined {
  const value = res.body?.detail;
  return typeof value === 'string' && value ? value : undefined;
}
