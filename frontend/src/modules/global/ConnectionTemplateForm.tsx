import { useState } from 'react';
import {
  ConnectionAuthType,
  ConnectionField,
  ConnectionFieldType,
  ConnectionSecretField,
  ConnectionTemplate,
  ConnectionTemplateInput,
  SystemOption,
} from './connections.api';

interface Props {
  existing: ConnectionTemplate | null;
  systems: SystemOption[];
  authTypes: ConnectionAuthType[];
  busy: boolean;
  error: string;
  onCancel: () => void;
  onSave: (input: ConnectionTemplateInput) => void;
}

interface FieldRow {
  key: string;
  label: string;
  type: ConnectionFieldType;
  required: boolean;
  operational: boolean;
  options: string;
  default: string;
}

interface SecretRow {
  key: string;
  label: string;
  required: boolean;
}

const FIELD_TYPES: ConnectionFieldType[] = ['text', 'number', 'boolean', 'json', 'select', 'multiselect'];

const csv = (s: string): string[] => s.split(',').map((x) => x.trim()).filter(Boolean);

/** Valor por defecto desde texto, según el tipo del campo. */
function parseDefault(raw: string, type: ConnectionFieldType): unknown {
  const t = raw.trim();
  if (t === '') return undefined;
  if (type === 'number') return Number(t);
  if (type === 'boolean') return t === 'true';
  if (type === 'json' || type === 'multiselect') {
    try {
      return JSON.parse(t);
    } catch {
      return csv(t);
    }
  }
  return t;
}

const defaultToText = (v: unknown): string => (v == null ? '' : typeof v === 'string' ? v : JSON.stringify(v));

/**
 * Editor de una plantilla de conexión: declara qué campos de `settings` y qué
 * secretos tendrá una conexión de este sistema. Es global (superadmin) y no
 * conoce sistemas concretos: solo usa la clave del catálogo.
 */
export function ConnectionTemplateForm({ existing, systems, authTypes, busy, error, onCancel, onSave }: Props) {
  const [systemKey, setSystemKey] = useState(existing?.systemKey ?? '');
  const [label, setLabel] = useState(existing?.label ?? '');
  const [authType, setAuthType] = useState<ConnectionAuthType | ''>(existing?.authType ?? '');
  const [enabled, setEnabled] = useState(existing?.enabled ?? true);
  const [fields, setFields] = useState<FieldRow[]>(() =>
    (existing?.settingsFields ?? []).map((f) => ({
      key: f.key,
      label: f.label ?? '',
      type: f.type ?? 'text',
      required: !!f.required,
      operational: !!f.operational,
      options: (f.options ?? []).join(', '),
      default: defaultToText(f.default),
    })),
  );
  const [secrets, setSecrets] = useState<SecretRow[]>(() =>
    (existing?.secretFields ?? []).map((f) => ({ key: f.key, label: f.label ?? '', required: !!f.required })),
  );
  const [localError, setLocalError] = useState('');

  const setField = (i: number, patch: Partial<FieldRow>) => setFields((prev) => prev.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const setSecret = (i: number, patch: Partial<SecretRow>) => setSecrets((prev) => prev.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const submit = () => {
    setLocalError('');
    if (systemKey.trim() === '') return setLocalError('Indica el sistema (clave del catálogo)');
    if (label.trim() === '') return setLocalError('El nombre de la plantilla es obligatorio');

    const settingsFields: ConnectionField[] = [];
    for (const f of fields) {
      const key = f.key.trim();
      if (!key) continue;
      settingsFields.push({
        key,
        label: f.label.trim() || undefined,
        type: f.type,
        required: f.required,
        operational: f.operational,
        options: f.type === 'select' || f.type === 'multiselect' ? csv(f.options) : undefined,
        default: parseDefault(f.default, f.type),
      });
    }
    const dupField = duplicateKey(settingsFields.map((f) => f.key));
    if (dupField) return setLocalError(`Campo de settings repetido: ${dupField}`);

    const secretFields: ConnectionSecretField[] = [];
    for (const s of secrets) {
      const key = s.key.trim();
      if (!key) continue;
      secretFields.push({ key, label: s.label.trim() || undefined, required: s.required });
    }
    const dupSecret = duplicateKey(secretFields.map((s) => s.key));
    if (dupSecret) return setLocalError(`Secreto repetido: ${dupSecret}`);

    onSave({
      systemKey: systemKey.trim(),
      label: label.trim(),
      settingsFields,
      secretFields,
      authType: authType || undefined,
      enabled,
    });
  };

  const inputStyle = { height: 34, fontSize: 12.5 } as const;

  return (
    <div>
      <div className="sectitle">{existing ? 'Editar' : 'Nueva'} plantilla de sistema</div>
      <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: '-4px 0 12px' }}>
        La plantilla define qué campos (<em>settings</em>) y qué secretos tendrá cada conexión de este sistema. Es global.
      </p>

      <div className="row2">
        <div className="field" style={{ flex: 1 }}>
          <label>* Sistema (clave del catálogo)</label>
          <input className="inp" list="connection-systems" value={systemKey} onChange={(e) => setSystemKey(e.target.value)} placeholder="sap" />
          <datalist id="connection-systems">
            {systems.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </datalist>
        </div>
        <div className="field" style={{ flex: 2 }}>
          <label>* Nombre</label>
          <input className="inp" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="SAP Business One (clientes)" />
        </div>
      </div>

      <div className="row2">
        <div className="field" style={{ flex: 1 }}>
          <label>Tipo de autenticación por defecto</label>
          <div className="sel">
            <select value={authType} onChange={(e) => setAuthType(e.target.value as ConnectionAuthType | '')}>
              <option value="">—</option>
              {authTypes.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field" style={{ flex: 1, justifyContent: 'flex-end' }}>
          <label>Estado</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Habilitada
          </label>
        </div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, margin: '8px 0 4px' }}>Campos de settings</div>
      {fields.map((f, i) => (
        <div key={i} className="info-card" style={{ padding: 10, marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input className="inp" style={{ ...inputStyle, flex: '1 1 120px' }} placeholder="clave" value={f.key} onChange={(e) => setField(i, { key: e.target.value })} />
            <input className="inp" style={{ ...inputStyle, flex: '2 1 160px' }} placeholder="etiqueta" value={f.label} onChange={(e) => setField(i, { label: e.target.value })} />
            <div className="sel" style={{ flex: '1 1 120px' }}>
              <select value={f.type} onChange={(e) => setField(i, { type: e.target.value as ConnectionFieldType })}>
                {FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
              <input type="checkbox" checked={f.required} onChange={(e) => setField(i, { required: e.target.checked })} /> Obligatorio
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
              <input type="checkbox" checked={f.operational} onChange={(e) => setField(i, { operational: e.target.checked })} /> Operativo
            </label>
            <button className="btn btn-ghost" style={{ width: 'auto', padding: '0 10px', height: 34 }} type="button" onClick={() => setFields((prev) => prev.filter((_, j) => j !== i))}>
              Quitar
            </button>
          </div>
          {(f.type === 'select' || f.type === 'multiselect') && (
            <input className="inp" style={{ ...inputStyle, marginTop: 6 }} placeholder="opciones separadas por coma" value={f.options} onChange={(e) => setField(i, { options: e.target.value })} />
          )}
          <input className="inp" style={{ ...inputStyle, marginTop: 6 }} placeholder="valor por defecto (opcional)" value={f.default} onChange={(e) => setField(i, { default: e.target.value })} />
        </div>
      ))}
      <button
        className="btn btn-ghost"
        style={{ width: 'auto', padding: '0 12px', height: 34, fontSize: 12 }}
        type="button"
        onClick={() => setFields((prev) => [...prev, { key: '', label: '', type: 'text', required: false, operational: false, options: '', default: '' }])}
      >
        + Agregar campo
      </button>

      <div style={{ fontSize: 12, fontWeight: 700, margin: '14px 0 4px' }}>Secretos (credenciales)</div>
      {secrets.map((s, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <input className="inp" style={{ ...inputStyle, flex: '1 1 120px' }} placeholder="clave" value={s.key} onChange={(e) => setSecret(i, { key: e.target.value })} />
          <input className="inp" style={{ ...inputStyle, flex: '2 1 160px' }} placeholder="etiqueta" value={s.label} onChange={(e) => setSecret(i, { label: e.target.value })} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
            <input type="checkbox" checked={s.required} onChange={(e) => setSecret(i, { required: e.target.checked })} /> Obligatorio
          </label>
          <button className="btn btn-ghost" style={{ width: 'auto', padding: '0 10px', height: 34 }} type="button" onClick={() => setSecrets((prev) => prev.filter((_, j) => j !== i))}>
            Quitar
          </button>
        </div>
      ))}
      <button
        className="btn btn-ghost"
        style={{ width: 'auto', padding: '0 12px', height: 34, fontSize: 12 }}
        type="button"
        onClick={() => setSecrets((prev) => [...prev, { key: '', label: '', required: true }])}
      >
        + Agregar secreto
      </button>

      {(localError || error) && <p style={{ color: '#c62828', fontSize: 12, margin: '10px 2px 0' }}>{localError || error}</p>}
      <div className="rowbtn" style={{ marginTop: 12 }}>
        <button className="btn btn-ghost" disabled={busy} onClick={onCancel}>
          Cancelar
        </button>
        <button className="btn btn-primary" disabled={busy} onClick={submit}>
          {busy ? 'Guardando…' : 'Guardar plantilla'}
        </button>
      </div>
    </div>
  );
}

function duplicateKey(keys: string[]): string | null {
  const seen = new Set<string>();
  for (const k of keys) {
    if (seen.has(k)) return k;
    seen.add(k);
  }
  return null;
}
