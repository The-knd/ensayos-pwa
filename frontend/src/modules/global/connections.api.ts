import { httpClient } from '../../shared/api/httpClient';

/** Backend: /api/connections (superadmin) y /api/clients/sync. Las credenciales nunca vuelven del servidor. */

export type IntegrationSystem = string;
export type IntegrationEnvironment = 'production' | 'test';
export type TestStatus = 'ok' | 'auth' | 'transient' | 'definitive';
export type ConnectionAuthType = 'token' | 'basic' | 'session';
export type ConnectionFieldType = 'text' | 'number' | 'boolean' | 'json' | 'select' | 'multiselect';

/** Un campo NO secreto de `settings` declarado por la plantilla del sistema. */
export interface ConnectionField {
  key: string;
  label?: string;
  type?: ConnectionFieldType;
  required?: boolean;
  options?: string[];
  default?: unknown;
  /** true = cambiarlo no obliga a volver a probar la conexión. */
  operational?: boolean;
}

/** Un secreto de la conexión (valor cifrado). */
export interface ConnectionSecretField {
  key: string;
  label?: string;
  required?: boolean;
}

/** Plantilla global de un sistema: qué campos y secretos tiene una conexión. */
export interface ConnectionTemplate {
  id: string;
  systemKey: IntegrationSystem;
  label: string;
  settingsFields: ConnectionField[];
  secretFields: ConnectionSecretField[];
  authType: ConnectionAuthType | null;
  enabled: boolean;
}

export interface ConnectionTemplateInput {
  systemKey: IntegrationSystem;
  label: string;
  settingsFields: ConnectionField[];
  secretFields: ConnectionSecretField[];
  authType?: ConnectionAuthType;
  enabled?: boolean;
}

export interface SystemOption {
  key: IntegrationSystem;
  label: string;
  /** true = hay adaptador de código: se puede probar la conexión. */
  testable: boolean;
}

export interface ConnectionsMeta {
  enabled: boolean;
  systems: SystemOption[];
  environments: IntegrationEnvironment[];
  authTypes: ConnectionAuthType[];
}

/** Módulo de la app que consume una conexión (`modules.module`). */
export interface ModuleOption {
  module: string;
  label: string;
}

export interface Connection {
  id: string;
  system: IntegrationSystem;
  module: string;
  label: string;
  environment: IntegrationEnvironment;
  enabled: boolean;
  authType: ConnectionAuthType;
  baseUrl: string;
  settings: Record<string, unknown>;
  templateId: string | null;
  hasCredentials: boolean;
  credentialsUpdatedAt: string | null;
  expiresAt: string | null;
  lastTestAt: string | null;
  lastTestStatus: TestStatus | null;
  updatedAt: string;
}

export interface ConnectionInput {
  label: string;
  module: string;
  system: IntegrationSystem;
  environment: IntegrationEnvironment;
  templateId?: string;
  authType?: ConnectionAuthType;
  baseUrl: string;
  settings: Record<string, unknown>;
  /** Ausente = se conservan las guardadas (al editar). */
  credentials?: Record<string, string>;
  expiresAt?: string | null;
  enabled?: boolean;
}

export interface SyncResult {
  processed: number;
  created: number;
  updated: number;
  linked: number;
  unchanged: number;
  failed: number;
  errors: { externalId: string; message: string }[];
}

export interface IntegrationJob {
  id: string;
  system: IntegrationSystem;
  operation: string;
  trigger: 'manual' | 'schedule';
  status: 'queued' | 'running' | 'done' | 'failed';
  attempts: number;
  nextAttemptAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  result: SyncResult | null;
  error: { type: TestStatus; message: string; at: string } | null;
  createdAt: string;
}

/** GET /clients/sync/meta: estrategias de sincronización registradas. */
export interface SyncMeta {
  strategies: { system: IntegrationSystem; key: string }[];
}

const connBase = (companyId: string) => `/connections/companies/${companyId}`;

export const connectionsApi = {
  meta: () => httpClient.get<ConnectionsMeta>('/connections/meta').then((r) => r.data),
  list: (companyId: string) => httpClient.get<Connection[]>(connBase(companyId)).then((r) => r.data),
  create: (companyId: string, input: ConnectionInput) => httpClient.post<Connection>(connBase(companyId), input).then((r) => r.data),
  update: (companyId: string, id: string, input: Partial<ConnectionInput>) =>
    httpClient.put<Connection>(`${connBase(companyId)}/${id}`, input).then((r) => r.data),
  remove: (companyId: string, id: string) => httpClient.delete(`${connBase(companyId)}/${id}`).then((r) => r.data),
  test: (companyId: string, id: string) =>
    httpClient.post<{ status: TestStatus; message: string }>(`${connBase(companyId)}/${id}/test`).then((r) => r.data),
};

export const templatesApi = {
  list: () => httpClient.get<ConnectionTemplate[]>('/connections/templates').then((r) => r.data),
  create: (input: ConnectionTemplateInput) => httpClient.post<ConnectionTemplate>('/connections/templates', input).then((r) => r.data),
  update: (id: string, input: ConnectionTemplateInput) =>
    httpClient.put<ConnectionTemplate>(`/connections/templates/${id}`, input).then((r) => r.data),
  remove: (id: string) => httpClient.delete(`/connections/templates/${id}`).then((r) => r.data),
};

export const syncApi = {
  /** Estrategias registradas por sistema. */
  meta: () => httpClient.get<SyncMeta>('/clients/sync/meta').then((r) => r.data),
  keysFor: (meta: SyncMeta | null, system: IntegrationSystem) =>
    (meta?.strategies ?? []).filter((s) => s.system === system).map((s) => s.key),
  /** "Sincronizar ahora". `companyId` solo lo usa el superadmin (contexto del módulo). */
  syncClients: (companyId: string) =>
    httpClient.post<{ jobId: string; status: string; created: boolean }>('/clients/sync', { companyId }).then((r) => r.data),
  jobs: (companyId: string, limit = 15) =>
    httpClient.get<IntegrationJob[]>('/clients/sync/jobs', { params: { companyId, limit } }).then((r) => r.data),
  job: (companyId: string, jobId: string) =>
    httpClient.get<IntegrationJob>(`/clients/sync/${jobId}`, { params: { companyId } }).then((r) => r.data),
};

export const TEST_STATUS_TEXT: Record<TestStatus, string> = {
  ok: 'Conexión correcta',
  auth: 'Usuario o contraseña rechazados por el sistema',
  transient: 'El sistema no responde (revisar red o proxy de salida)',
  definitive: 'El sistema rechazó la solicitud',
};

export const errorMessage = (err: unknown, fallback: string): string => {
  const m = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message as { message?: unknown } | string | undefined;
  const inner = typeof m === 'object' && m !== null ? (m.message ?? m) : m;
  if (Array.isArray(inner)) return inner.join(' · ');
  return typeof inner === 'string' ? inner : fallback;
};
