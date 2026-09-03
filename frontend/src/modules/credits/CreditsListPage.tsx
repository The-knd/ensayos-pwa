import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Header } from '../../shared/components/Header';
import { Footer } from '../../shared/components/Footer';
import { httpClient } from '../../shared/api/httpClient';

interface Credit {
  id: string;
  clientId: string;
  requestedAmount: string;
  status: string;
  client?: { fullName: string };
}

export function CreditsListPage() {
  const { moduleContexts, loadModuleContext } = useAuth();
  const [credits, setCredits] = useState<Credit[]>([]);
  const ctx = moduleContexts['credits'];

  useEffect(() => {
    loadModuleContext('credits').then(() => {
      httpClient.get('/credits').then((res) => setCredits(res.data[0]));
    });
  }, []);

  if (!ctx) return <p style={{ padding: 40 }}>Cargando...</p>;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 60, background: '#f4f5f7' }}>
      <Header />
      <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, color: '#333' }}>Créditos</h1>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <thead>
            <tr style={{ background: '#f0f0f0', color: '#333' }}>
              <th style={{ textAlign: 'left', padding: 12 }}>Cliente</th>
              <th style={{ textAlign: 'left', padding: 12 }}>Monto</th>
              <th style={{ textAlign: 'left', padding: 12 }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {credits.length === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: 16, color: '#666', textAlign: 'center' }}>
                  No hay solicitudes de crédito.
                </td>
              </tr>
            )}
            {credits.map((c) => (
              <tr key={c.id} style={{ borderTop: '1px solid #eee' }}>
                <td style={{ padding: 12 }}>{c.client?.fullName || c.clientId}</td>
                <td style={{ padding: 12 }}>${Number(c.requestedAmount).toLocaleString()}</td>
                <td style={{ padding: 12 }}>{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Footer />
    </div>
  );
}