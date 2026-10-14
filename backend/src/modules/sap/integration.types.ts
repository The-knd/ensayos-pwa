/** Sistemas externos soportados. Uno nuevo: añadirlo aquí, con su cliente y estrategias. */
export enum IntegrationSystem {
  SAP = 'sap',
}

export enum IntegrationEnvironment {
  PRODUCTION = 'production',
  TEST = 'test',
}

/**
 * Forma de autenticarse; decide qué lleva el blob cifrado:
 *   token    { token }
 *   basic    { username, password }   (Authorization: Basic en cada llamada)
 *   session  { username, password }   (login que devuelve una sesión, p. ej. SAP B1)
 */
export enum IntegrationAuthType {
  TOKEN = 'token',
  BASIC = 'basic',
  SESSION = 'session',
}

export type IntegrationCredentials = { token: string } | { username: string; password: string };

/** Operaciones que lanza el worker. */
export enum IntegrationOperation {
  CLIENTS_SYNC = 'clients.sync',
}
