/**
 * Sistema externo con una conexión. Identificador ABIERTO (string): el valor
 * concreto (p. ej. 'sap') lo declara el adaptador correspondiente, nunca este
 * módulo genérico. Así se añade un sistema sin tocar `config/connections`.
 */
export type IntegrationSystem = string;

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
