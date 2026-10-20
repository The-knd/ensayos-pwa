import { useCallback, useEffect, useRef, useState } from 'react';
import { httpClient } from '../../shared/api/httpClient';
import { Modal } from '../../shared/components/Modal';
import { ConnectionForm } from './ConnectionForm';
import { ConnectionTemplateForm } from './ConnectionTemplateForm';
import {
  Connection,
  ConnectionInput,
  connectionsApi,
  ConnectionsMeta,
  ConnectionTemplate,
  ConnectionTemplateInput,
  errorMessage,
  IntegrationEnvironment,
  IntegrationJob,
  ModuleOption,
  SyncMeta,
  syncApi,
  templatesApi,
  TEST_STATUS_TEXT,
} from './connections.api';

interface CompanyOption {
  id: string;
  name: string;
}

type Tab = 'companies' | 'templates';

const ENV_LABEL: Record<IntegrationEnvironment, string> = { production: 'Producción', test: 'Pruebas' };
const JOB_STATUS: Record<IntegrationJob['status'], { label: string; bg: string; fg: string }> = {
  queued: { label: 'En cola', bg: '#fff4e5', fg: '#a15c00' },
  running: { label: 'En curso', bg: '#e8f0fe', fg: '#1a4fb5' },
  done: { label: 'Terminado', bg: 'var(--green-soft)', fg: 'var(--green-deep)' },
  failed: { label: 'Falló', bg: '#fdecea', fg: '#b00020' },
};
const POLL_MS = 3_000;
const POLL_MAX_MS = 3 * 60_000;
const EXPIRY_WARN_DAYS = 15;

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const pill = (bg: string, fg: string) => ({ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: bg, color: fg, whiteSpace: 'nowrap' as const });
const smallBtn = { width: 'auto', height: 38, padding: '0 14px', fontSize: 12.5 };

/**
 * Conexiones con sistemas externos, solo superadmin. Dos pestañas:
 *   - Conexiones Empresas: tarjetas por empresa (acordeón, una abierta a la vez)
 *     con sus conexiones; alta guiada por plantilla; activar/desactivar.
 *   - Plantillas para sistemas: catálogo de sistemas y plantillas que definen
 *     qué campos y secretos tiene cada conexión.
 * Backend: /api/connections y /api/clients/sync. Las credenciales nunca se leen.
 */
export function ConnectionsManagement() {
  const [tab, setTab] = useState<Tab>('companies');
  const [meta, setMeta] = useState<ConnectionsMeta | null>(null);
  const [syncMeta, setSyncMeta] = useState<SyncMeta | null>(null);
  const [templates, setTemplates] = useState<ConnectionTemplate[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [openCompany, setOpenCompany] = useState('');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [jobs, setJobs] = useState<IntegrationJob[]>([]);
  const [editingConn, setEditingConn] = useState<{ existing: Connection | null } | null>(null);
  const [editingTpl, setEditingTpl] = useState<{ existing: ConnectionTemplate | null } | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [metaError, setMetaError] = useState('');
  const [companiesError, setCompaniesError] = useState('');
  const [notice, setNotice] = useState('');
  const [formError, setFormError] = useState('');
  const [tplError, setTplError] = useState('');
  const [openJob, setOpenJob] = useState<IntegrationJob | null>(null);
  const pollRef = useRef<number | null>(null);

  const reloadTemplates = useCallback(() => templatesApi.list().then(setTemplates).catch((err) => setError(errorMessage(err, 'No se pudieron cargar las plantillas'))), []);

  const loadMeta = useCallback(() => {
    setMetaError('');
    connectionsApi.meta().then(setMeta).catch((err) => setMetaError(errorMessage(err, 'No se pudo cargar la configuración de conexiones')));
  }, []);

  const loadCompanies = useCallback(() => {
    setCompaniesError('');
    httpClient
      .get('/config/companies')
      .then((res) => {
        const list: CompanyOption[] = (res.data || []).map((c: CompanyOption) => ({ id: c.id, name: c.name }));
        setCompanies(list);
      })
      .catch((err) => setCompaniesError(errorMessage(err, 'No se pudieron cargar las empresas')));
  }, []);

  useEffect(() => {
    loadMeta();
    syncApi.meta().then(setSyncMeta).catch(() => undefined);
    reloadTemplates();
    loadCompanies();
    httpClient
      .get('/config/modules')
      .then((res) => {
        const seen = new Map<string, string>();
        for (const m of res.data || []) if (m?.module && !seen.has(m.module)) seen.set(m.module, m.label ?? m.module);
        setModules([...seen.entries()].map(([module, label]) => ({ module, label })));
      })
      .catch(() => undefined);
    return () => {
      if (pollRef.current) window.clearTimeout(pollRef.current);
    };
  }, [reloadTemplates, loadMeta, loadCompanies]);

  const loadCompany = useCallback(async (companyId: string) => {
    if (!companyId) {
      setConnections([]);
      setJobs([]);
      return;
    }
    setError('');
    try {
      const [conns, recent] = await Promise.all([connectionsApi.list(companyId), syncApi.jobs(companyId)]);
      setConnections(conns);
      setJobs(recent);
    } catch (err) {
      setError(errorMessage(err, 'No se pudieron cargar las conexiones'));
    }
  }, []);

  useEffect(() => {
    loadCompany(openCompany);
  }, [openCompany, loadCompany]);

  const toggleCompany = (id: string) => {
    setNotice('');
    setError('');
    setOpenCompany((prev) => (prev === id ? '' : id));
  };

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

  const saveConnection = async (input: ConnectionInput) => {
    if (!editingConn || !openCompany) return;
    setBusy('save');
    setFormError('');
    try {
      const saved = editingConn.existing
        ? await connectionsApi.update(openCompany, editingConn.existing.id, input)
        : await connectionsApi.create(openCompany, input);
      setEditingConn(null);
      setNotice(saved.enabled ? 'Conexión guardada.' : 'Conexión guardada. Pruébala y luego actívala.');
      await loadCompany(openCompany);
    } catch (err) {
      setFormError(errorMessage(err, 'No se pudo guardar la conexión'));
    } finally {
      setBusy('');
    }
  };

  const test = (c: Connection) =>
    run(`test:${c.id}`, async () => {
      const r = await connectionsApi.test(openCompany, c.id);
      if (r.status === 'ok') setNotice(TEST_STATUS_TEXT.ok);
      else setError(`${TEST_STATUS_TEXT[r.status]}: ${r.message}`);
      await loadCompany(openCompany);
    });

  const setEnabled = (c: Connection, enabled: boolean) =>
    run(`toggle:${c.id}`, async () => {
      await connectionsApi.update(openCompany, c.id, { enabled });
      setNotice(enabled ? 'Conexión activada.' : 'Conexión desactivada: no se lanzarán nuevas sincronizaciones.');
      await loadCompany(openCompany);
    });

  const remove = (c: Connection) => {
    if (!window.confirm(`¿Eliminar la conexión "${c.label}"? Se borran sus credenciales. Los datos ya sincronizados se conservan.`)) return;
    run(`remove:${c.id}`, async () => {
      await connectionsApi.remove(openCompany, c.id);
      setNotice('Conexión eliminada.');
      await loadCompany(openCompany);
    });
  };

  const saveTemplate = async (input: ConnectionTemplateInput) => {
    setBusy('save-tpl');
    setTplError('');
    try {
      if (editingTpl?.existing) await templatesApi.update(editingTpl.existing.id, input);
      else await templatesApi.create(input);
      setEditingTpl(null);
      await reloadTemplates();
      setNotice('Plantilla guardada.');
    } catch (err) {
      setTplError(errorMessage(err, 'No se pudo guardar la plantilla'));
    } finally {
      setBusy('');
    }
  };

  const removeTemplate = (t: ConnectionTemplate) => {
    if (!window.confirm(`¿Eliminar la plantilla "${t.label}"? Las conexiones ya creadas no se modifican.`)) return;
    run(`tpl:${t.id}`, async () => {
      await templatesApi.remove(t.id);
      await reloadTemplates();
      setNotice('Plantilla eliminada.');
    });
  };

  const follow = (jobId: string, startedAt = Date.now()) => {
    pollRef.current = window.setTimeout(async () => {
      try {
        const job = await syncApi.job(openCompany, jobId);
        setJobs((prev) => [job, ...prev.filter((j) => j.id !== job.id)]);
        if (job.status === 'done' || job.status === 'failed') {
          setNotice(job.status === 'done' ? `Sincronización terminada: ${summary(job)}` : '');
          if (job.status === 'failed') setError(`La sincronización falló: ${job.error?.message ?? 'sin detalle'}`);
          return;
        }
        if (Date.now() - startedAt < POLL_MAX_MS) follow(jobId, startedAt);
        else setNotice('Sigue en proceso; consulta el historial más tarde.');
      } catch {
        if (Date.now() - startedAt < POLL_MAX_MS) follow(jobId, startedAt);
      }
    }, POLL_MS);
  };

  const syncNow = () =>
    run('sync', async () => {
      const r = await syncApi.syncClients(openCompany);
      if (!r.jobId) return setError('No se pudo lanzar la sincronización');
      setNotice('Sincronización en cola…');
      await loadCompany(openCompany);
      if (pollRef.current) window.clearTimeout(pollRef.current);
      follow(r.jobId);
    });

  const systemLabel = (key: string) => meta?.systems.find((s) => s.key === key)?.label ?? key;
  const templateLabel = (templateId: string | null, system: string) =>
    templates.find((t) => t.id === templateId)?.label ?? templates.find((t) => t.systemKey === system)?.label ?? system;

  const activeJob = jobs.find((j) => j.status === 'queued' || j.status === 'running');
  const hasSyncableConnection = connections.some(
    (c) => c.environment === 'production' && c.enabled && syncApi.keysFor(syncMeta, c.system).length > 0,
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button className={tab === 'companies' ? 'btn btn-primary' : 'btn btn-ghost'} style={smallBtn} onClick={() => setTab('companies')}>
          Conexiones Empresas
        </button>
        <button className={tab === 'templates' ? 'btn btn-primary' : 'btn btn-ghost'} style={smallBtn} onClick={() => setTab('templates')}>
          Plantillas para sistemas
        </button>
      </div>

      {meta && !meta.enabled && (
        <div className="info-card" style={{ padding: 14, marginBottom: 12, borderLeft: '4px solid #a15c00', fontSize: 12.5 }}>
          Las integraciones están deshabilitadas en este servidor (<code>INTEGRATIONS_ENABLED</code>). Puedes consultar, pero no guardar ni probar.
        </div>
      )}
      {error && <p style={{ color: '#c62828', fontSize: 12, marginBottom: 8 }}>{error}</p>}
      {metaError && (
        <p style={{ color: '#c62828', fontSize: 12, marginBottom: 8 }}>
          {metaError}{' '}
          <button onClick={loadMeta} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
            Reintentar
          </button>
        </p>
      )}
      {companiesError && (
        <p style={{ color: '#c62828', fontSize: 12, marginBottom: 8 }}>
          {companiesError}{' '}
          <button onClick={loadCompanies} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
            Reintentar
          </button>
        </p>
      )}
      {notice && <p style={{ color: 'var(--green-deep)', fontSize: 12, marginBottom: 8 }}>{notice}</p>}

      {tab === 'companies' ? (
        <CompaniesTab
          companies={companies}
          openCompany={openCompany}
          onToggle={toggleCompany}
          connections={connections}
          templates={templates}
          systemLabel={systemLabel}
          templateLabel={templateLabel}
          meta={meta}
          busy={busy}
          onTest={test}
          onEdit={(c) => {
            setFormError('');
            setEditingConn({ existing: c });
          }}
          onToggleEnabled={setEnabled}
          onRemove={remove}
          onAdd={() => {
            setFormError('');
            setEditingConn({ existing: null });
          }}
          jobs={jobs}
          activeJob={activeJob}
          hasSyncableConnection={hasSyncableConnection}
          onSync={syncNow}
          onOpenJob={setOpenJob}
        />
      ) : (
        <TemplatesTab
          meta={meta}
          metaError={metaError}
          templates={templates}
          busy={busy}
          onNew={() => {
            setTplError('');
            setEditingTpl({ existing: null });
          }}
          onEdit={(t) => {
            setTplError('');
            setEditingTpl({ existing: t });
          }}
          onRemove={removeTemplate}
        />
      )}

      <Modal open={!!editingConn} onClose={() => busy !== 'save' && setEditingConn(null)}>
        {editingConn &&
          (meta ? (
            <ConnectionForm
              existing={editingConn.existing}
              templates={templates}
              modules={modules}
              meta={meta}
              busy={busy === 'save'}
              error={formError}
              onCancel={() => setEditingConn(null)}
              onSave={saveConnection}
            />
          ) : (
            <MetaFallback metaError={metaError} onRetry={loadMeta} />
          ))}
      </Modal>

      <Modal open={!!editingTpl} onClose={() => busy !== 'save-tpl' && setEditingTpl(null)}>
        {editingTpl &&
          (meta ? (
            <ConnectionTemplateForm
              existing={editingTpl.existing}
              systems={meta.systems}
              authTypes={meta.authTypes}
              busy={busy === 'save-tpl'}
              error={tplError}
              onCancel={() => setEditingTpl(null)}
              onSave={saveTemplate}
            />
          ) : (
            <MetaFallback metaError={metaError} onRetry={loadMeta} />
          ))}
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

interface CompaniesTabProps {
  companies: CompanyOption[];
  openCompany: string;
  onToggle: (id: string) => void;
  connections: Connection[];
  templates: ConnectionTemplate[];
  systemLabel: (key: string) => string;
  templateLabel: (templateId: string | null, system: string) => string;
  meta: ConnectionsMeta | null;
  busy: string;
  onTest: (c: Connection) => void;
  onEdit: (c: Connection) => void;
  onToggleEnabled: (c: Connection, enabled: boolean) => void;
  onRemove: (c: Connection) => void;
  onAdd: () => void;
  jobs: IntegrationJob[];
  activeJob: IntegrationJob | undefined;
  hasSyncableConnection: boolean;
  onSync: () => void;
  onOpenJob: (j: IntegrationJob) => void;
}

function CompaniesTab(props: CompaniesTabProps) {
  const { companies, openCompany, onToggle, connections, meta, busy } = props;

  return (
    <div>
      <div className="note" style={{ marginBottom: 14 }}>
        <p>
          Conexión de cada empresa con sus sistemas externos. Las credenciales se guardan cifradas y no se vuelven a mostrar. Una conexión solo se
          activa después de probarla.
        </p>
      </div>

      {companies.length === 0 && <p className="empty-state">No hay empresas.</p>}

      {companies.map((company) => {
        const open = openCompany === company.id;
        const count = open ? connections.length : undefined;
        return (
          <div key={company.id} className="info-card" style={{ marginBottom: 10, overflow: 'hidden' }}>
            <button
              onClick={() => onToggle(company.id)}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                padding: '14px 16px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div>
                <strong style={{ fontSize: 14 }}>{company.name}</strong>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                  {open ? `${count} conexión(es)` : 'Ver conexiones'}
                </div>
              </div>
              <span style={{ fontSize: 18, color: 'var(--muted)' }}>{open ? '▾' : '▸'}</span>
            </button>

            {open && (
              <div style={{ padding: '0 16px 16px' }}>
                {connections.length === 0 && <p className="empty-state">Esta empresa no tiene conexiones aún.</p>}

                {connections.map((c) => (
                  <ConnectionCard
                    key={c.id}
                    c={c}
                    templates={props.templates}
                    systemLabel={props.systemLabel}
                    templateLabel={props.templateLabel}
                    meta={meta}
                    busy={busy}
                    onTest={props.onTest}
                    onEdit={props.onEdit}
                    onToggleEnabled={props.onToggleEnabled}
                    onRemove={props.onRemove}
                  />
                ))}

                <button
                  className="btn btn-primary"
                  style={{ ...smallBtn, marginTop: 4 }}
                  disabled={!meta?.enabled || props.templates.filter((t) => t.enabled).length === 0}
                  title={props.templates.filter((t) => t.enabled).length === 0 ? 'Crea una plantilla en «Plantillas para sistemas»' : undefined}
                  onClick={props.onAdd}
                >
                  + Agregar conexión
                </button>

                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', margin: '18px 0 8px', gap: 10 }}>
                  <button
                    className="btn btn-primary"
                    style={smallBtn}
                    disabled={!!busy || !meta?.enabled || !props.hasSyncableConnection || !!props.activeJob}
                    title={!props.hasSyncableConnection ? 'Necesitas una conexión de producción activa que sincronice clientes' : props.activeJob ? 'Ya hay una sincronización en curso' : undefined}
                    onClick={props.onSync}
                  >
                    {busy === 'sync' ? 'Lanzando…' : props.activeJob ? 'En curso…' : 'Sincronizar ahora'}
                  </button>
                </div>

                {props.jobs.length === 0 && <p className="empty-state">Todavía no hay sincronizaciones.</p>}
                {props.jobs.map((j) => {
                  const st = JOB_STATUS[j.status];
                  return (
                    <div
                      key={j.id}
                      className="info-card"
                      style={{ padding: '10px 14px', marginBottom: 8, cursor: j.result || j.error ? 'pointer' : 'default' }}
                      onClick={() => (j.result || j.error) && props.onOpenJob(j)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                        <div style={{ fontSize: 12.5, minWidth: 0 }}>
                          <strong>{fmt(j.createdAt)}</strong> · {j.trigger === 'manual' ? 'Manual' : 'Programada'}
                          {j.attempts > 1 && ` · intento ${j.attempts}`}
                          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                            {j.result ? summary(j) : j.error ? j.error.message : ''}
                          </div>
                        </div>
                        <span style={pill(st.bg, st.fg)}>{st.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface ConnectionCardProps {
  c: Connection;
  templates: ConnectionTemplate[];
  systemLabel: (key: string) => string;
  templateLabel: (templateId: string | null, system: string) => string;
  meta: ConnectionsMeta | null;
  busy: string;
  onTest: (c: Connection) => void;
  onEdit: (c: Connection) => void;
  onToggleEnabled: (c: Connection, enabled: boolean) => void;
  onRemove: (c: Connection) => void;
}

function ConnectionCard({ c, systemLabel, templateLabel, meta, busy, onTest, onEdit, onToggleEnabled, onRemove }: ConnectionCardProps) {
  const expiresInDays = c.expiresAt ? Math.ceil((new Date(c.expiresAt).getTime() - Date.now()) / 86_400_000) : null;
  const tested = c.lastTestStatus === 'ok';
  return (
    <div className="info-card" style={{ padding: '14px 16px', marginBottom: 8, opacity: c.enabled ? 1 : 0.55 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <strong style={{ fontSize: 14 }}>{c.label}</strong>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
            {systemLabel(c.system)} · {templateLabel(c.templateId, c.system)} · {ENV_LABEL[c.environment]} · módulo {c.module}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2, wordBreak: 'break-all' }}>{c.baseUrl}</div>
          <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 4 }}>
            Credenciales: {c.hasCredentials ? `guardadas el ${fmt(c.credentialsUpdatedAt)}` : 'sin cargar'} · Última prueba:{' '}
            {c.lastTestStatus ? `${TEST_STATUS_TEXT[c.lastTestStatus]} (${fmt(c.lastTestAt)})` : 'pendiente'}
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
        <button className="btn btn-ghost" style={smallBtn} disabled={!!busy || !meta?.enabled || !c.hasCredentials} onClick={() => onTest(c)}>
          {busy === `test:${c.id}` ? 'Probando…' : 'Probar conexión'}
        </button>
        <button className="btn btn-ghost" style={smallBtn} disabled={!!busy || !meta?.enabled} onClick={() => onEdit(c)}>
          Editar
        </button>
        <button
          className="btn btn-ghost"
          style={{ ...smallBtn, color: c.enabled ? '#b00020' : 'var(--green-deep)' }}
          disabled={!!busy || !meta?.enabled || (!c.enabled && !tested)}
          title={!c.enabled && !tested ? 'Prueba la conexión antes de activarla' : undefined}
          onClick={() => onToggleEnabled(c, !c.enabled)}
        >
          {c.enabled ? 'Desactivar' : 'Activar'}
        </button>
        <button className="btn btn-ghost" style={{ ...smallBtn, color: '#b00020' }} disabled={!!busy} onClick={() => onRemove(c)}>
          Eliminar
        </button>
      </div>
    </div>
  );
}

interface TemplatesTabProps {
  meta: ConnectionsMeta | null;
  metaError: string;
  templates: ConnectionTemplate[];
  busy: string;
  onNew: () => void;
  onEdit: (t: ConnectionTemplate) => void;
  onRemove: (t: ConnectionTemplate) => void;
}

function TemplatesTab({ meta, metaError, templates, busy, onNew, onEdit, onRemove }: TemplatesTabProps) {
  return (
    <div>
      <div className="note" style={{ marginBottom: 14 }}>
        <p>
          Un <strong>sistema</strong> es un servicio externo (SAP, una API, Copilot Chat Agent…). Una <strong>plantilla</strong> define qué campos
          (<em>settings</em>) y qué secretos tendrá cada conexión de ese sistema. Al crear una conexión se elige una plantilla y el formulario se
          arma solo.
        </p>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Sistemas</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {(meta?.systems ?? []).map((s) => (
            <span key={s.key} style={pill('var(--green-soft)', 'var(--green-deep)')} title={s.testable ? 'Con adaptador: se puede probar' : 'Sin adaptador: solo configuración'}>
              {s.label}
              {s.testable ? ' ✓' : ''}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 8px' }}>
        <h3 className="section-title" style={{ margin: 0 }}>
          Plantillas
        </h3>
        <button
          className="btn btn-primary"
          style={smallBtn}
          onClick={onNew}
          disabled={!meta && !metaError}
          title={meta ? undefined : metaError ? undefined : 'Cargando configuración de conexiones…'}
        >
          + Nueva plantilla
        </button>
      </div>

      {templates.length === 0 && <p className="empty-state">No hay plantillas todavía.</p>}
      {templates.map((t) => (
        <div key={t.id} className="info-card" style={{ padding: '12px 16px', marginBottom: 8, opacity: t.enabled ? 1 : 0.55 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <strong style={{ fontSize: 14 }}>{t.label}</strong>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                Sistema: {t.systemKey} · {t.settingsFields.length} campo(s) de settings · {t.secretFields.length} secreto(s)
                {t.authType ? ` · auth ${t.authType}` : ''}
              </div>
              <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 4, wordBreak: 'break-word' }}>
                {t.settingsFields.map((f) => f.key).join(', ') || 'sin campos'}
                {t.secretFields.length ? ` · secretos: ${t.secretFields.map((s) => s.key).join(', ')}` : ''}
              </div>
            </div>
            <span style={t.enabled ? pill('var(--green-soft)', 'var(--green-deep)') : pill('#f1f3f5', 'var(--muted)')}>
              {t.enabled ? 'Activa' : 'Inactiva'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" style={smallBtn} disabled={!!busy} onClick={() => onEdit(t)}>
              Editar
            </button>
            <button className="btn btn-ghost" style={{ ...smallBtn, color: '#b00020' }} disabled={!!busy} onClick={() => onRemove(t)}>
              Eliminar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Contenido del modal cuando `meta` aún no llegó: cargando o error con reintento (nunca vacío). */
function MetaFallback({ metaError, onRetry }: { metaError: string; onRetry: () => void }) {
  if (!metaError) return <p style={{ fontSize: 13, margin: 0 }}>Cargando configuración de conexiones…</p>;
  return (
    <div>
      <p style={{ fontSize: 13, color: '#b00020', margin: '0 0 10px' }}>{metaError}</p>
      <button className="btn btn-primary" style={smallBtn} onClick={onRetry}>
        Reintentar
      </button>
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
