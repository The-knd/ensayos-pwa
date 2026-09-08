import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { httpClient } from '../../shared/api/httpClient';

interface Credit {
  id: string;
  clientId: string;
  requestedAmount: string;
  status: string;
  client?: { fullName: string };
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  in_study: 'En estudio',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  signed: 'Firmado',
  disbursed: 'Desembolsado',
};

export function CreditsListPage() {
  const { moduleContexts, loadModuleContext } = useAuth();
  const navigate = useNavigate();
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(false);
  const ctx = moduleContexts['credits'];

  const reload = () => {
    setLoading(true);
    httpClient
      .get('/credits')
      .then((res) => setCredits(res.data[0]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadModuleContext('credits').then(reload);
  }, []);

  if (!ctx) return <p style={{ padding: 40 }}>Cargando...</p>;

  const has = (perm: string) => ctx.permissions.includes(perm);

  const goTo = (action: string, id: string) => navigate(`/credits/${action}/${id}`);

  const patch = async (path: string) => {
    await httpClient.patch(path);
    reload();
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 90, background: 'var(--bg)' }}>
      <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: 22, color: 'var(--ink)' }}>Créditos</h1>
          <button onClick={() => navigate('/credits/study')} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            + Nueva solicitud
          </button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <thead>
            <tr style={{ background: '#f0f0f0', color: '#333' }}>
              <th style={{ textAlign: 'left', padding: 12 }}>Cliente</th>
              <th style={{ textAlign: 'left', padding: 12 }}>Monto</th>
              <th style={{ textAlign: 'left', padding: 12 }}>Estado</th>
              <th style={{ textAlign: 'left', padding: 12 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {credits.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 16, color: '#666', textAlign: 'center' }}>
                  {loading ? 'Cargando…' : 'No hay solicitudes de crédito.'}
                </td>
              </tr>
            )}
            {credits.map((c) => (
              <tr key={c.id} style={{ borderTop: '1px solid #eee' }}>
                <td style={{ padding: 12 }}>{c.client?.fullName || c.clientId}</td>
                <td style={{ padding: 12 }}>${Number(c.requestedAmount).toLocaleString()}</td>
                <td style={{ padding: 12 }}>{STATUS_LABEL[c.status] || c.status}</td>
                <td style={{ padding: 12 }}>
                  {c.status === 'pending' && has('credits.study') && (
                    <button style={{ marginRight: 6 }} onClick={() => patch(`/credits/${c.id}/study`)}>
                      Enviar a estudio
                    </button>
                  )}
                  {c.status === 'in_study' && has('credits.study') && (
                    <button style={{ marginRight: 6 }} onClick={() => goTo('result', c.id)}>
                      Decidir
                    </button>
                  )}
                  {c.status === 'approved' && has('credits.study') && (
                    <button style={{ marginRight: 6 }} onClick={() => goTo('sign', c.id)}>
                      Firmar
                    </button>
                  )}
                  {c.status === 'signed' && has('credits.study') && (
                    <button style={{ marginRight: 6 }} onClick={() => goTo('success', c.id)}>
                      Desembolsar
                    </button>
                  )}
                  {has('credits.read') && (
                    <button style={{ marginRight: 6 }} onClick={() => navigate(`/credits/${c.id}/documents`)}>
                      Documentos
                    </button>
                  )}
                  {(c.status === 'in_study' || c.status === 'rejected') && (
                    <button onClick={() => navigate(`/credits/${c.id}`)} disabled>
                      —
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}