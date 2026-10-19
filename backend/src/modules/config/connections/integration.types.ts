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
 * Forma de autenticarse. Se conserva como metadato informativo: la plantilla del
 * sistema (ConnectionTemplate) es quien declara qué secretos existen. Valores:
 *   token    credencial de API
 *   basic    usuario y contraseña (Authorization: Basic en cada llamada)
 *   session  login que devuelve una sesión (p. ej. SAP B1)
 */
export enum IntegrationAuthType {
  TOKEN = 'token',
  BASIC = 'basic',
  SESSION = 'session',
}

/**
 * Secretos de una conexión, como mapa clave→valor (contraseña, token, los que
 * haga falta). Se guarda cifrado; los campos concretos los declara la plantilla
 * del sistema (`secretFields`). No se limita a un solo secreto.
 */
export type IntegrationCredentials = Record<string, string>;
