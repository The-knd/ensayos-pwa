import { useMemo, useState } from 'react';
import {
  Connection,
  ConnectionAuthType,
  ConnectionField,
  ConnectionInput,
  ConnectionTemplate,
  ConnectionsMeta,
  IntegrationEnvironment,
  ModuleOption,
} from './connections.api';

interface Props {
  /** null = conexión nueva. */
  existing: Connection | null;
  templates: ConnectionTemplate[];
  modules: ModuleOption[];
  meta: ConnectionsMeta;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onSave: (input: ConnectionInput) => void;
}

const ENV_LABEL: Record<IntegrationEnvironment, string> = { production: 'Producción', test: 'Pruebas' };

/** Muestra un valor de settings como texto (objetos/arrays en JSON). */
const display = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : JSON.stringify(v));

/** Valor de un campo "extra": intenta número/booleano/JSON y, si no, texto. */
function coerceExtra(raw: string): unknown {
  const t = raw.trim();
  if (t === '') return '';
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (t === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
    try {
      return JSON.parse(t);
    } catch {
      return raw;
    }
  }
  return raw;
}

/**
 * Alta/edición de una conexión guiada por la plantilla del sistema: la plantilla
 * declara los campos de `settings` y los secretos, y aquí se pintan. No conoce
 * ningún sistema concreto. Los secretos son de solo escritura: vacíos al editar
 * = se conservan los guardados. Cambiar URL, sistema o ajustes de conexión
 * desactiva la conexión hasta volver a probarla (lo decide el servidor).
 */
export function ConnectionForm({ existing, templates, modules, meta, busy, error, onCancel, onSave }: Props) {
  const initialTemplate = useMemo(
    () =>
      existing
        ? templates.find((t) => t.id === existing.templateId) ?? templates.find((t) => t.systemKey === existing.system) ?? null
        : null,
    [existing, templates],
  );

  const [templateId, setTemplateId] = useState(initialTemplate?.id ?? '');
  const template = useMemo(() => templates.find((t) => t.id === templateId) ?? null, [templates, templateId]);

  const [label, setLabel] = useState(existing?.label ?? '');
  const [module, setModule] = useState(existing?.module ?? '');
  const [environment, setEnvironment] = useState<IntegrationEnvironment>(existing?.environment ?? 'production');
  const [baseUrl, setBaseUrl] = useState(existing?.baseUrl ?? '');
  const [authType, setAuthType] = useState<ConnectionAuthType>(existing?.authType ?? 'session');
  const [settings, setSettings] = useState<Record<string, unknown>>(() => ({ ...(existing?.settings ?? {}) }));
  const [extras, setExtras] = useState<{ key: string; value: string }[]>(() => {
    if (!existing) return [];
    const known = new Set((initialTemplate?.settingsFields ?? []).map((f) => f.key));
    return Object.entries(existing.settings)
      .filter(([k]) => !known.has(k))
      .map(([k, v]) => ({ key: k, value: display(v) }));
  });
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [expiresAt, setExpiresAt] = useState(existing?.expiresAt ? existing.expiresAt.slice(0, 10) : '');
  const [localError, setLocalError] = useState('');

  const picking = !existing; // al crear se elige la plantilla
  const setValue = (key: string, value: unknown) => setSettings((prev) => ({ ...prev, [key]: value }));

  const pickTemplate = (id: string) => {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (t && !existing) {
      const initial: Record<string, unknown> = {};
      for (const f of t.settingsFields) if (f.default !== undefined) initial[f.key] = f.default;
      setSettings(initial);
      setExtras([]);
      setAuthType(t.authType ?? 'basic');
    }
  };

  const buildSettings = (): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } => {
    const out: Record<string, unknown> = {};
    for (const f of template?.settingsFields ?? []) {
      const raw = settings[f.key];
      if (raw === undefined || raw === null || raw === '') {
        if (f.required) return { ok: false, error: `El campo '${f.label ?? f.key}' es obligatorio` };
        continue;
      }
      if (f.type === 'number') {
        const n = Number(raw);
        if (Number.isNaN(n)) return { ok: false, error: `'${f.label ?? f.key}' debe ser numérico` };
        out[f.key] = n;
      } else if (f.type === 'json') {
        if (typeof raw === 'string') {
          try {
            out[f.key] = JSON.parse(raw);
          } catch {
            return { ok: false, error: `'${f.label ?? f.key}' no es JSON válido` };
          }
        } else {
          out[f.key] = raw;
        }
      } else if (f.type === 'boolean') {
        out[f.key] = !!raw;
      } else {
        out[f.key] = raw;
      }
    }
    for (const e of extras) {
      const key = e.key.trim();
      if (key) out[key] = coerceExtra(e.value);
    }
    return { ok: true, value: out };
  };

  const submit = () => {
    setLocalError('');
    if (!template) {
      setLocalError('Elige una plantilla de sistema');
      return;
    }
    if (label.trim() === '') return setLocalError('El nombre de la conexión es obligatorio');
    if (module === '') return setLocalError('El módulo es obligatorio');
    if (!/^https:\/\//i.test(baseUrl.trim())) return setLocalError('La URL debe empezar por https://');

    const built = buildSettings();
    if (!built.ok) return setLocalError(built.error);

    const secretTouched = Object.values(secrets).some((v) => v !== '');
    const needsSecrets = !existing?.hasCredentials || secretTouched;
    if (needsSecrets) {
      for (const f of template.secretFields) {
        if (f.required && !secrets[f.key]) return setLocalError(`El secreto '${f.label ?? f.key}' es obligatorio`);
      }
    }

    const input: ConnectionInput = {
      label: label.trim(),
      module,
      system: template.systemKey,
      environment,
      templateId: template.id,
      authType,
      baseUrl: baseUrl.trim(),
      settings: built.value,
      expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
    };
    if (needsSecrets) input.credentials = { ...secrets };
    onSave(input);
  };

  const fieldLabel = (f: ConnectionField) => `${f.required ? '* ' : ''}${f.label ?? f.key}`;

  const renderField = (f: ConnectionField) => {
    const value = settings[f.key];
    switch (f.type ?? 'text') {
      case 'boolean':
        return (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={!!value} onChange={(e) => setValue(f.key, e.target.checked)} />
            {f.label ?? f.key}
          </label>
        );
      case 'select':
        return (
          <div className="sel">
            <select value={value == null ? '' : String(value)} onChange={(e) => setValue(f.key, e.target.value)}>
              <option value="">—</option>
              {(f.options ?? []).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        );
      case 'multiselect': {
        const arr = Array.isArray(value) ? (value as string[]) : [];
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', fontSize: 12.5 }}>
            {(f.options ?? []).map((o) => (
              <label key={o} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={arr.includes(o)}
                  onChange={() => setValue(f.key, arr.includes(o) ? arr.filter((k) => k !== o) : [...arr, o])}
                />
                {o}
              </label>
            ))}
          </div>
        );
      }
      case 'json':
        return (
          <textarea
            className="inp"
            rows={2}
            style={{ height: 'auto', paddingTop: 8 }}
            value={display(value)}
            onChange={(e) => setValue(f.key, e.target.value)}
            placeholder='{"everyMinutes": 60}'
          />
        );
      case 'number':
        return <input className="inp" inputMode="numeric" value={display(value)} onChange={(e) => setValue(f.key, e.target.value)} />;
      default:
        return <input className="inp" value={display(value)} onChange={(e) => setValue(f.key, e.target.value)} />;
    }
  };

  return (
    <div>
      <div className="sectitle">
        {existing ? 'Editar' : 'Nueva'} conexión · {ENV_LABEL[environment]}
      </div>
      <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: '-4px 0 12px' }}>
        El host debe estar autorizado en el servidor (lista blanca del proxy de salida).
        {environment === 'test' && ' Las conexiones de pruebas solo sirven para probar: no sincronizan datos.'}
      </p>

      {picking ? (
        <div className="field">
          <label>* Plantilla del sistema</label>
          <div className="sel">
            <select value={templateId} onChange={(e) => pickTemplate(e.target.value)}>
              <option value="">— Elegir —</option>
              {templates
                .filter((t) => t.enabled)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
            </select>
          </div>
          {templates.length === 0 && (
            <p style={{ fontSize: 11.5, color: '#a15c00', marginTop: 6 }}>
              No hay plantillas. Créalas en la pestaña «Plantillas para sistemas».
            </p>
          )}
        </div>
      ) : (
        <div className="field">
          <label>Plantilla</label>
          <div style={{ fontSize: 12.5 }}>
            {template?.label ?? '—'} <span style={{ color: 'var(--faint)' }}>(sistema: {template?.systemKey ?? existing?.system})</span>
          </div>
        </div>
      )}

      {template && (
        <>
          <div className="row2">
            <div className="field" style={{ flex: 2 }}>
              <label>* Nombre de la conexión</label>
              <input className="inp" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ej.: SAP Clientes Producción" />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>* Módulo</label>
              <div className="sel">
                <select value={module} onChange={(e) => setModule(e.target.value)}>
                  <option value="">—</option>
                  {modules.map((m) => (
                    <option key={m.module} value={m.module}>
                      {m.label || m.module}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="row2">
            <div className="field" style={{ flex: 2 }}>
              <label>* URL base</label>
              <input className="inp" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://sistema.empresa.com" />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Entorno</label>
              <div className="sel">
                <select value={environment} onChange={(e) => setEnvironment(e.target.value as IntegrationEnvironment)}>
                  {meta.environments.map((env) => (
                    <option key={env} value={env}>
                      {ENV_LABEL[env]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Campos de settings declarados por la plantilla */}
          {template.settingsFields.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, margin: '6px 0 4px' }}>Ajustes</div>
              {template.settingsFields.map((f) => (
                <div className="field" key={f.key}>
                  <label>{fieldLabel(f)}</label>
                  {renderField(f)}
                </div>
              ))}
            </>
          )}

          {/* Campos extra (key/value) que no están en la plantilla */}
          <div className="field">
            <label>Ajustes adicionales</label>
            {extras.map((e, i) => (
              <div key={i} className="row2" style={{ marginBottom: 6 }}>
                <input
                  className="inp"
                  style={{ flex: 1 }}
                  placeholder="clave"
                  value={e.key}
                  onChange={(ev) => setExtras((prev) => prev.map((x, j) => (j === i ? { ...x, key: ev.target.value } : x)))}
                />
                <input
                  className="inp"
                  style={{ flex: 2 }}
                  placeholder="valor (texto, número, true/false o JSON)"
                  value={e.value}
                  onChange={(ev) => setExtras((prev) => prev.map((x, j) => (j === i ? { ...x, value: ev.target.value } : x)))}
                />
                <button
                  className="btn btn-ghost"
                  style={{ width: 'auto', padding: '0 12px' }}
                  type="button"
                  onClick={() => setExtras((prev) => prev.filter((_, j) => j !== i))}
                >
                  Quitar
                </button>
              </div>
            ))}
            <button
              className="btn btn-ghost"
              style={{ width: 'auto', padding: '0 12px', height: 34, fontSize: 12 }}
              type="button"
              onClick={() => setExtras((prev) => [...prev, { key: '', value: '' }])}
            >
              + Agregar campo
            </button>
          </div>

          {/* Secretos declarados por la plantilla (solo escritura) */}
          {template.secretFields.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, margin: '6px 0 4px' }}>Credenciales</div>
              <div className="row2">
                {template.secretFields.map((f) => (
                  <div className="field" key={f.key} style={{ flex: 1 }}>
                    <label>
                      {f.required && !existing?.hasCredentials ? '* ' : ''}
                      {f.label ?? f.key}
                    </label>
                    <input
                      className="inp"
                      type="password"
                      autoComplete="new-password"
                      value={secrets[f.key] ?? ''}
                      onChange={(e) => setSecrets((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={existing?.hasCredentials ? '•••• guardado' : ''}
                    />
                  </div>
                ))}
              </div>
              {existing?.hasCredentials && (
                <p style={{ fontSize: 11, color: 'var(--faint)', margin: '-6px 2px 10px' }}>
                  Déjalas vacías para conservar las guardadas. Para cambiarlas, escribe todos los secretos.
                </p>
              )}
            </>
          )}

          <div className="row2">
            <div className="field" style={{ flex: 1 }}>
              <label>Tipo de autenticación</label>
              <div className="sel">
                <select value={authType} onChange={(e) => setAuthType(e.target.value as ConnectionAuthType)}>
                  {meta.authTypes.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Vencimiento de la credencial</label>
              <input className="inp" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
          </div>
        </>
      )}

      {(localError || error) && <p style={{ color: '#c62828', fontSize: 12, margin: '6px 2px' }}>{localError || error}</p>}
      <div className="rowbtn" style={{ marginTop: 12 }}>
        <button className="btn btn-ghost" disabled={busy} onClick={onCancel}>
          Cancelar
        </button>
        <button className="btn btn-primary" disabled={busy || !template} onClick={submit}>
          {busy ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
