import { useCallback, useEffect, useRef, useState } from 'react';
import { httpClient } from '../../shared/api/httpClient';
import { Modal } from '../../shared/components/Modal';
import { IntegrationConnectionForm } from './IntegrationConnectionForm';
import {
  Connection,
  ConnectionInput,
  errorMessage,
  IntegrationEnvironment,
  IntegrationJob,
  integrationsApi,
  IntegrationsMeta,
  TEST_STATUS_TEXT,
} from './integrations.api';

interface CompanyOption {
  id: string;
  name: string;
}

const ENV_LABEL: Record<IntegrationEnvironment, string> = { production: 'Producción', test: 'Pruebas' };
const JOB_STATUS: Record<IntegrationJob['status'], { label: string; bg: string; fg: string }> = {
  queued: { label: 'En cola', bg: '#fff4e5', fg: '#a15c00' },
  running: { label: 'En curso', bg: '#e8f0fe', fg: '#1a4fb5' },
  done: { label: 'Terminado', bg: 'var(--green-soft)', fg: 'var(--green-deep)' },
  failed: { label: 'Falló', bg: '#fdecea', fg: '#b00020' },
};
/** Seguimiento de "Sincronizar ahora": cada 3 s, hasta 3 min; luego queda en el historial. */
const POLL_MS = 3_000;
const POLL_MAX_MS = 3 * 60_000;
const EXPIRY_WARN_DAYS = 15;

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const pill = (bg: string, fg: string) => ({ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: bg, color: fg, whiteSpace: 'nowrap' as const });
const smallBtn = { width: 'auto', height: 38, padding: '0 14px', fontSize: 12.5 };

/**
 * Integraciones por empresa (SAP Business One). Solo superadmin; backend:
 * /api/integrations. Las credenciales se escriben aquí pero nunca se leen:
 * el servidor solo informa si hay credenciales y cuándo se guardaron.
 */
export function IntegrationsManagement() {
  const [meta, setMeta] = useState<IntegrationsMeta | null>(null);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [jobs, setJobs] = useState<IntegrationJob[]>([]);
  const [editing, setEditing] = useState<{ env: IntegrationEnvironment; existing: Connection | null } | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [openJob, setOpenJob] = useState<IntegrationJob | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    integrationsApi.meta().then(setMeta).catch((err) => setError(errorMessage(err, 'No se pudo cargar la configuración de integraciones')));
    httpClient
      .get('/config/companies')
      .then((res) => {
        const list: CompanyOption[] = (res.data || []).map((c: CompanyOption) => ({ id: c.id, name: c.name }));
        setCompanies(list);
        if (list[0]) setCompanyId(list[0].id);
      })
      .catch(() => setError('No se pudieron cargar las empresas'));
    return () => {
      if (pollRef.current) window.clearTimeout(pollRef.current);
    };
  }, []);

  const load = useCallback(async () => {
    if (!companyId) return;
    try {
      const [conns, recent] = await Promise.all([integrationsApi.list(companyId), integrationsApi.jobs(companyId)]);
      setConnections(conns);
      setJobs(recent);
    } catch (err) {
      setError(errorMessage(err, 'No se pudieron cargar las conexiones'));
    }
  }, [companyId]);

  useEffect(() => {
    setConnections([]);
    setJobs([]);
    setNotice('');
    setError('');
    load();
  }, [load]);

  const strategies = meta?.systems.find((s) => s.system === 'sap')?.strategies ?? [];
  const byEnv = (env: IntegrationEnvironment) => connections.find((c) => c.system === 'sap' && c.environment === env) ?? null;

  const run = async (key: string, work: () => Promise<void>) => {
    setBusy(key);
    setError('');
    setNotice('');
    try {
      await work();
    } catch (err) {
      setError(errorMessage(err, 'La operación falló'));
    } finally {
      setBusy('');
    }
  };

  const save = async (input: ConnectionInput) => {
    if (!editing) return;
    setBusy('save');
    setFormError('');
    try {
      const saved = await integrationsApi.save(companyId, 'sap', editing.env, input);
      setEditing(null);
      setNotice(saved.enabled ? 'Conexión guardada.' : 'Conexión guardada. Pruébala y luego actívala.');
      await load();
    } catch (err) {
      setFormError(errorMessage(err, 'No se pudo guardar la conexión'));
    } finally {
      setBusy('');
    }
  };

  const test = (c: Connection) =>
    run(`test:${c.environment}`, async () => {
      const r = await integrationsApi.test(companyId, 'sap', c.environment);
      if (r.status === 'ok') setNotice(TEST_STATUS_TEXT.ok);
      else setError(`${TEST_STATUS_TEXT[r.status]}: ${r.message}`);
      await load();
    });

  const setEnabled = (c: Connection, enabled: boolean) =>
    run(`toggle:${c.environment}`, async () => {
      await integrationsApi.save(companyId, 'sap', c.environment, { authType: c.authType, baseUrl: c.baseUrl, settings: c.settings, enabled });
      setNotice(enabled ? 'Conexión activada.' : 'Conexión desactivada: no se lanzarán nuevas sincronizaciones.');
      await load();
    });

  const remove = (c: Connection) => {
    if (!window.confirm(`¿Eliminar la conexión de ${ENV_LABEL[c.environment].toLowerCase()}? Se borran sus credenciales. Los clientes ya sincronizados se conservan.`)) return;
    run(`remove:${c.environment}`, async () => {
      await integrationsApi.remove(companyId, 'sap', c.environment);
      setNotice('Conexión eliminada.');
      await load();
    });
  };

  const follow = (jobId: string, startedAt = Date.now()) => {
    pollRef.current = window.setTimeout(async () => {
      try {
        const job = await integrationsApi.job(companyId, jobId);
        setJobs((prev) => [job, ...prev.filter((j) => j.id !== job.id)]);
        if (job.status === 'done' || job.status === 'failed') {
          setNotice(job.status === 'done' ? `Sincronización terminada: ${summary(job)}` : '');
          if (job.status === 'failed') setError(`La sincronización falló: ${job.error?.message ?? 'sin detalle'}`);
          return;
        }
        if (Date.now() - startedAt < POLL_MAX_MS) follow(jobId, startedAt);
        else setNotice('Sigue en proceso; consulta el historial más tarde.');
      } catch {
        // Un fallo puntual de red no corta el seguimiento.
        if (Date.now() - startedAt < POLL_MAX_MS) follow(jobId, startedAt);
      }
    }, POLL_MS);
  };

  const syncNow = () =>
    run('sync', async () => {
      const r = await integrationsApi.syncClients(companyId, 'sap');
      if (!r.jobId) {
        setError(r.message ?? 'No se pudo lanzar la sincronización');
        return;
      }
      setNotice('Sincronización en cola…');
      await load();
      if (pollRef.current) window.clearTimeout(pollRef.current);
      follow(r.jobId);
    });

  const production = byEnv('production');
  const activeJob = jobs.find((j) => j.status === 'queued' || j.status === 'running');

  return (
    <div>
      <div className="note" style={{ marginBottom: 14 }}>
        <p>
          Conexión de cada empresa con <strong>SAP Business One</strong> para sincronizar sus clientes. Las credenciales se guardan cifradas y no
          se vuelven a mostrar.
        </p>
      </div>

      {meta && !meta.enabled && (
        <div className="info-card" style={{ padding: 14, marginBottom: 12, borderLeft: '4px solid #a15c00', fontSize: 12.5 }}>
          Las integraciones están deshabilitadas en este servidor (<code>INTEGRATIONS_ENABLED</code>). Puedes consultar las conexiones, pero no
          guardarlas, probarlas ni sincronizar.
        </div>
      )}

      <div className="field">
        <label>Empresa</label>
        <div className="sel">
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p style={{ color: '#c62828', fontSize: 12, marginBottom: 8 }}>{error}</p>}
      {notice && <p style={{ color: 'var(--green-deep)', fontSize: 12, marginBottom: 8 }}>{notice}</p>}

      {(['production', 'test'] as IntegrationEnvironment[]).map((env) => {
        const c = byEnv(env);
        if (!c) {
          return (
            <div key={env} className="info-card" style={{ padding: '14px 16px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div>
                <strong style={{ fontSize: 14 }}>SAP · {ENV_LABEL[env]}</strong>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>Sin configurar</div>
              </div>
              <button
                className="btn btn-primary"
                style={smallBtn}
                disabled={!meta?.enabled || !companyId}
                onClick={() => {
                  setFormError('');
                  setEditing({ env, existing: null });
                }}
              >
                Configurar
              </button>
            </div>
          );
        }
        const expiresInDays = c.expiresAt ? Math.ceil((new Date(c.expiresAt).getTime() - Date.now()) / 86_400_000) : null;
        const tested = c.lastTestStatus === 'ok';
        return (
          <div key={env} className="info-card" style={{ padding: '14px 16px', marginBottom: 12, opacity: c.enabled ? 1 : 0.85 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <strong style={{ fontSize: 14 }}>SAP · {ENV_LABEL[env]}</strong>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2, wordBreak: 'break-all' }}>
                  {c.baseUrl} · {String(c.settings.companyDb ?? '')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 4 }}>
                  Credenciales: {c.hasCredentials ? `guardadas el ${fmt(c.credentialsUpdatedAt)}` : 'sin cargar'} · Última prueba:{' '}
                  {c.lastTestStatus ? `${TEST_STATUS_TEXT[c.lastTestStatus]} (${fmt(c.lastTestAt)})` : 'pendiente'}
                  {env === 'production' && ` · ${c.settings.schedule?.everyMinutes ? `cada ${c.settings.schedule.everyMinutes} min` : 'solo manual'}`}
                </div>
                {expiresInDays !== null && expiresInDays <= EXPIRY_WARN_DAYS && (
                  <div style={{ fontSize: 11.5, color: '#b00020', marginTop: 4, fontWeight: 600 }}>
                    {expiresInDays <= 0 ? 'La credencial está vencida' : `La credencial vence en ${expiresInDays} días`}
                  </div>
                )}
              </div>
              <span style={c.enabled ? pill('var(--green-soft)', 'var(--green-deep)') : pill('#f1f3f5', 'var(--muted)')}>
                {c.enabled ? 'Activa' : 'Inactiva'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button className="btn btn-ghost" style={smallBtn} disabled={!!busy || !meta?.enabled} onClick={() => test(c)}>
                {busy === `test:${env}` ? 'Probando…' : 'Probar conexión'}
              </button>
              <button
                className="btn btn-ghost"
                style={smallBtn}
                disabled={!!busy || !meta?.enabled}
                onClick={() => {
                  setFormError('');
                  setEditing({ env, existing: c });
                }}
              >
                Editar
              </button>
              <button
                className="btn btn-ghost"
                style={{ ...smallBtn, color: c.enabled ? '#b00020' : 'var(--green-deep)' }}
                disabled={!!busy || !meta?.enabled || (!c.enabled && !tested)}
                title={!c.enabled && !tested ? 'Prueba la conexión antes de activarla' : undefined}
                onClick={() => setEnabled(c, !c.enabled)}
              >
                {c.enabled ? 'Desactivar' : 'Activar'}
              </button>
              <button className="btn btn-ghost" style={{ ...smallBtn, color: '#b00020' }} disabled={!!busy} onClick={() => remove(c)}>
                Eliminar
              </button>
            </div>
          </div>
        );
      })}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '18px 0 8px', gap: 10 }}>
        <h3 className="section-title" style={{ margin: 0 }}>
          Sincronizaciones de clientes
        </h3>
        <button
          className="btn btn-primary"
          style={smallBtn}
          disabled={!!busy || !meta?.enabled || !production?.enabled || !!activeJob}
          title={!production?.enabled ? 'Activa la conexión de producción para sincronizar' : activeJob ? 'Ya hay una sincronización en curso' : undefined}
          onClick={syncNow}
        >
          {busy === 'sync' ? 'Lanzando…' : activeJob ? 'En curso…' : 'Sincronizar ahora'}
        </button>
      </div>

      {jobs.length === 0 && <p className="empty-state">Todavía no hay sincronizaciones.</p>}
      {jobs.map((j) => {
        const st = JOB_STATUS[j.status];
        return (
          <div
            key={j.id}
            className="info-card"
            style={{ padding: '10px 14px', marginBottom: 8, cursor: j.result || j.error ? 'pointer' : 'default' }}
            onClick={() => (j.result || j.error) && setOpenJob(j)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <div style={{ fontSize: 12.5, minWidth: 0 }}>
                <strong>{fmt(j.createdAt)}</strong> · {j.trigger === 'manual' ? 'Manual' : 'Programada'}
                {j.attempts > 1 && ` · intento ${j.attempts}`}
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                  {j.result ? summary(j) : j.error ? j.error.message : j.status === 'queued' && j.attempts > 0 ? `Reintento a las ${fmt(j.nextAttemptAt)}` : ''}
                </div>
              </div>
              <span style={pill(st.bg, st.fg)}>{st.label}</span>
            </div>
          </div>
        );
      })}

      <Modal open={!!editing} onClose={() => busy !== 'save' && setEditing(null)}>
        {editing && (
          <IntegrationConnectionForm
            existing={editing.existing}
            environment={editing.env}
            strategies={strategies}
            busy={busy === 'save'}
            error={formError}
            onCancel={() => setEditing(null)}
            onSave={save}
          />
        )}
      </Modal>

      <Modal open={!!openJob} onClose={() => setOpenJob(null)}>
        {openJob && (
          <div>
            <div className="sectitle">Sincronización del {fmt(openJob.createdAt)}</div>
            {openJob.result && <p style={{ fontSize: 12.5 }}>{summary(openJob)}</p>}
            {openJob.error && (
              <p style={{ fontSize: 12.5, color: '#b00020' }}>
                Error ({openJob.error.type}): {openJob.error.message}
              </p>
            )}
            {!!openJob.result?.errors.length && (
              <>
                <p style={{ fontSize: 12, fontWeight: 700, margin: '10px 0 6px' }}>Registros con error</p>
                <div style={{ maxHeight: 280, overflowY: 'auto', fontSize: 12 }}>
                  {openJob.result.errors.map((e, i) => (
                    <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
                      <strong>{e.externalId}</strong>: {e.message}
                    </div>
                  ))}
                </div>
                {openJob.result.failed > openJob.result.errors.length && (
                  <p style={{ fontSize: 11, color: 'var(--faint)', marginTop: 6 }}>
                    Se muestran {openJob.result.errors.length} de {openJob.result.failed}.
                  </p>
                )}
              </>
            )}
            <div className="rowbtn" style={{ marginTop: 12 }}>
              <button className="btn btn-primary" onClick={() => setOpenJob(null)}>
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function summary(j: IntegrationJob): string {
  const r = j.result;
  if (!r) return '';
  const n = (v: number) => v.toLocaleString('es-CO');
  return (
    `Procesados ${n(r.processed)} · creados ${n(r.created)} · actualizados ${n(r.updated)} · ` +
    `enlazados ${n(r.linked)} · sin cambios ${n(r.unchanged)} · con error ${n(r.failed)}`
  );
}
