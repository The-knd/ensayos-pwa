import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { httpClient } from '../../shared/api/httpClient';

export function TestViewPage() {
  const { bootstrap, moduleContexts, loadModuleContext } = useAuth();
  const [rows, setRows] = useState<Array<{ mod: string; ctx: { permissions: string[]; featureFlags?: Record<string, any> } }>>([]);

  useEffect(() => {
    Promise.all(['config', 'clients', 'users', 'credits'].map((m) => loadModuleContext(m))).then(() => {
      setRows(
        ['config', 'clients', 'users', 'credits'].map((mod) => ({
          mod,
          ctx: moduleContexts[mod] || { permissions: [] },
        })),
      );
    });
  }, []);

  return (
    <div className="s2">
      <div className="body" style={{ paddingBottom: 24 }}>
        <div className="appbar" style={{ margin: '12px 0' }}>
          <div className="abtitle"><h2>Vista de Pruebas QA</h2></div>
        </div>

        <div className="info-card">
          <div className="info-row">
            <span className="info-label">Usuario</span>
            <span className="info-value">{bootstrap?.user.name} ({bootstrap?.user.email})</span>
          </div>
          <div className="info-row" style={{ borderBottom: 0 }}>
            <span className="info-label">Empresa</span>
            <span className="info-value">{bootstrap?.company.name} ({bootstrap?.company.id.slice(0, 8)}…)</span>
          </div>
        </div>

        <h3 style={{ fontSize: 15, margin: '16px 0 10px', color: 'var(--ink)' }}>Contexto de módulos</h3>
        {rows.map((r) => (
          <div key={r.mod} className="info-card" style={{ marginBottom: 10 }}>
            <div className="info-row">
              <span className="info-label">{r.mod}</span>
              <span className="info-value" style={{ fontSize: 12 }}>
                {r.ctx.permissions.length} permisos · {r.ctx.featureFlags ? Object.keys(r.ctx.featureFlags).length : 0} flags
              </span>
            </div>
            <div style={{ padding: '4px 0 0', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(r.ctx.permissions as string[]).map((p) => (
                <span key={p} style={{ fontSize: 11, background: 'var(--accent)', color: '#fff', padding: '2px 8px', borderRadius: 999 }}>{p}</span>
              ))}
              {r.ctx.permissions.length === 0 && <span style={{ fontSize: 11, color: 'var(--muted)' }}>Sin permisos</span>}
            </div>
          </div>
        ))}

        <h3 style={{ fontSize: 15, margin: '16px 0 10px', color: 'var(--ink)' }}>Pruebas de aislamiento por empresa</h3>
        <div className="rowbtn">
          <button className="btn btn-primary" onClick={() => httpClient.get('/clients').then((res) => alert(`Clientes visibles: ${res.data[0].length}`))}>
            Contar clientes
          </button>
          <button className="btn btn-primary" onClick={() => httpClient.get('/credits').then((res) => alert(`Créditos visibles: ${res.data[0].length}`))}>
            Contar créditos
          </button>
          <button className="btn btn-ghost" onClick={() => httpClient.get('/users').then((res) => alert(`Usuarios visibles: ${res.data[0].length}`))}>
            Contar usuarios
          </button>
        </div>
      </div>
    </div>
  );
}