import { useState } from 'react';
import { Connection, ConnectionInput, IntegrationEnvironment, OWNABLE_FIELDS } from './integrations.api';

interface Props {
  /** null = conexión nueva. */
  existing: Connection | null;
  environment: IntegrationEnvironment;
  strategies: string[];
  busy: boolean;
  error: string;
  onCancel: () => void;
  onSave: (input: ConnectionInput) => void;
}

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleString('es-CO') : '');

/**
 * Datos de una conexión SAP B1. Usuario y contraseña son de solo escritura: el
 * servidor nunca los devuelve. Vacíos al editar = se conservan los guardados.
 * Cambiar URL, base o credenciales desactiva la conexión hasta volver a probarla.
 */
export function IntegrationConnectionForm({ existing, environment, strategies, busy, error, onCancel, onSave }: Props) {
  const s = existing?.settings;
  const [baseUrl, setBaseUrl] = useState(existing?.baseUrl ?? '');
  const [strategy, setStrategy] = useState(s?.strategy ?? strategies[0] ?? 'sap-b1');
  const [companyDb, setCompanyDb] = useState(String(s?.companyDb ?? ''));
  const [pageSize, setPageSize] = useState(String(s?.pageSize ?? 200));
  const [everyMinutes, setEveryMinutes] = useState(s?.schedule?.everyMinutes ? String(s.schedule.everyMinutes) : '');
  const [owned, setOwned] = useState<string[]>(s?.ownedFields ?? OWNABLE_FIELDS.map((f) => f.key));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [expiresAt, setExpiresAt] = useState(existing?.expiresAt ? existing.expiresAt.slice(0, 10) : '');

  const needsCredentials = !existing?.hasCredentials;
  const credentialsTouched = username !== '' || password !== '';
  const canSave =
    baseUrl.trim() !== '' &&
    companyDb.trim() !== '' &&
    (needsCredentials ? username !== '' && password !== '' : !credentialsTouched || (username !== '' && password !== ''));

  const submit = () => {
    const input: ConnectionInput = {
      authType: 'session',
      baseUrl: baseUrl.trim(),
      settings: {
        ...(existing?.settings ?? {}),
        strategy,
        companyDb: companyDb.trim(),
        pageSize: Number(pageSize) || 200,
        schedule: everyMinutes ? { everyMinutes: Number(everyMinutes) } : null,
        ownedFields: owned,
      },
      expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
    };
    if (credentialsTouched) input.credentials = { username, password };
    onSave(input);
  };

  const toggleOwned = (key: string) => setOwned((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  return (
    <div>
      <div className="sectitle">
        {existing ? 'Editar' : 'Nueva'} conexión SAP Business One · {environment === 'production' ? 'Producción' : 'Pruebas'}
      </div>
      <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: '-4px 0 12px' }}>
        El host debe estar autorizado en el servidor (lista blanca del proxy de salida).
        {environment === 'test' && ' La conexión de pruebas solo sirve para probar la conexión: no sincroniza clientes.'}
      </p>

      <div className="field">
        <label>* URL del Service Layer</label>
        <input className="inp" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://sap.empresa.com:50000/b1s/v1" />
      </div>
      <div className="row2">
        <div className="field" style={{ flex: 2 }}>
          <label>* Base de la compañía (CompanyDB)</label>
          <input className="inp" value={companyDb} onChange={(e) => setCompanyDb(e.target.value)} placeholder="SBO_EMPRESA" />
        </div>
        {strategies.length > 1 && (
          <div className="field" style={{ flex: 1 }}>
            <label>Estrategia</label>
            <div className="sel">
              <select value={strategy} onChange={(e) => setStrategy(e.target.value)}>
                {strategies.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="row2">
        <div className="field" style={{ flex: 1 }}>
          <label>{needsCredentials ? '* Usuario' : 'Usuario'}</label>
          <input
            className="inp"
            autoComplete="off"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={existing?.hasCredentials ? '•••• guardado' : ''}
          />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>{needsCredentials ? '* Contraseña' : 'Contraseña'}</label>
          <input
            className="inp"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={existing?.hasCredentials ? '•••• guardada' : ''}
          />
        </div>
      </div>
      {existing?.hasCredentials && (
        <p style={{ fontSize: 11, color: 'var(--faint)', margin: '-6px 2px 10px' }}>
          Credenciales guardadas el {fmtDate(existing.credentialsUpdatedAt)}. Déjalas vacías para conservarlas; para cambiarlas escribe usuario y
          contraseña.
        </p>
      )}

      <div className="row2">
        <div className="field" style={{ flex: 1 }}>
          <label>Sincronizar cada (minutos)</label>
          <input
            className="inp"
            inputMode="numeric"
            value={everyMinutes}
            onChange={(e) => setEveryMinutes(e.target.value.replace(/\D/g, ''))}
            placeholder="Vacío = solo manual (mín. 15)"
          />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>Registros por página</label>
          <input className="inp" inputMode="numeric" value={pageSize} onChange={(e) => setPageSize(e.target.value.replace(/\D/g, ''))} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>Vencimiento de la credencial</label>
          <input className="inp" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </div>
      </div>

      <div className="field">
        <label>Datos que manda SAP (el resto solo se edita en la app)</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', fontSize: 12.5 }}>
          {OWNABLE_FIELDS.map((f) => (
            <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={owned.includes(f.key)} onChange={() => toggleOwned(f.key)} />
              {f.label}
            </label>
          ))}
        </div>
      </div>

      {error && <p style={{ color: '#c62828', fontSize: 12, margin: '6px 2px' }}>{error}</p>}
      <div className="rowbtn" style={{ marginTop: 12 }}>
        <button className="btn btn-ghost" disabled={busy} onClick={onCancel}>
          Cancelar
        </button>
        <button className="btn btn-primary" disabled={busy || !canSave} onClick={submit}>
          {busy ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
