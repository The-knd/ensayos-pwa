import { httpClient } from '../../shared/api/httpClient';

/** Backend: /api/integrations (solo superadmin). Las credenciales nunca vuelven del servidor. */

export type IntegrationSystem = 'sap';
export type IntegrationEnvironment = 'production' | 'test';
export type TestStatus = 'ok' | 'auth' | 'transient' | 'definitive';

export const OWNABLE_FIELDS: { key: string; label: string }[] = [
  { key: 'fullName', label: 'Nombre' },
  { key: 'commercialName', label: 'Nombre comercial' },
  { key: 'legalName', label: 'Razón social' },
  { key: 'billingEmail', label: 'Correo de facturación' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'email', label: 'Correo' },
  { key: 'status', label: 'Estado (activo/inactivo)' },
];

export interface IntegrationsMeta {
  enabled: boolean;
  systems: { system: IntegrationSystem; strategies: string[] }[];
  environments: IntegrationEnvironment[];
}

export interface ConnectionSettings {
  strategy: string;
  companyDb?: string;
  pageSize?: number;
  schedule?: { everyMinutes: number } | null;
  ownedFields?: string[];
  [key: string]: unknown;
}

export interface Connection {
  id: string;
  system: IntegrationSystem;
  environment: IntegrationEnvironment;
  enabled: boolean;
  authType: 'token' | 'basic' | 'session';
  baseUrl: string;
  settings: ConnectionSettings;
  hasCredentials: boolean;
  credentialsUpdatedAt: string | null;
  expiresAt: string | null;
  lastTestAt: string | null;
  lastTestStatus: TestStatus | null;
  updatedAt: string;
}

export interface ConnectionInput {
  enabled?: boolean;
  authType: Connection['authType'];
  baseUrl: string;
  settings: ConnectionSettings;
  /** Ausente = se conservan las guardadas. */
  credentials?: { username?: string; password?: string; token?: string };
  expiresAt?: string | null;
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

const base = (companyId: string) => `/integrations/companies/${companyId}`;

export const integrationsApi = {
  meta: () => httpClient.get<IntegrationsMeta>('/integrations/meta').then((r) => r.data),
  list: (companyId: string) => httpClient.get<Connection[]>(base(companyId)).then((r) => r.data),
  save: (companyId: string, system: IntegrationSystem, env: IntegrationEnvironment, input: ConnectionInput) =>
    httpClient.put<Connection>(`${base(companyId)}/${system}/${env}`, input).then((r) => r.data),
  remove: (companyId: string, system: IntegrationSystem, env: IntegrationEnvironment) =>
    httpClient.delete(`${base(companyId)}/${system}/${env}`).then((r) => r.data),
  test: (companyId: string, system: IntegrationSystem, env: IntegrationEnvironment) =>
    httpClient.post<{ status: TestStatus; message: string }>(`${base(companyId)}/${system}/${env}/test`).then((r) => r.data),
  syncClients: (companyId: string, system: IntegrationSystem) =>
    httpClient
      .post<{ jobId: string | null; status: string; message?: string }>(`${base(companyId)}/${system}/sync/clients`)
      .then((r) => r.data),
  jobs: (companyId: string, limit = 15) => httpClient.get<IntegrationJob[]>(`${base(companyId)}/jobs`, { params: { limit } }).then((r) => r.data),
  job: (companyId: string, jobId: string) => httpClient.get<IntegrationJob>(`${base(companyId)}/jobs/${jobId}`).then((r) => r.data),
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
