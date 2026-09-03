import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Can } from '../../shared/components/Can';
import { httpClient } from '../../shared/api/httpClient';
import { Header } from '../../shared/components/Header';
import { Footer } from '../../shared/components/Footer';

interface Client {
  id: string;
  fullName: string;
  documentNumber: string;
  status: string;
}

export function ClientsListPage() {
  const { loadModuleContext, moduleContexts } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const ctx = moduleContexts['clients'];

  useEffect(() => {
    loadModuleContext('clients').then(() => {
      httpClient.get('/clients').then((res) => setClients(res.data[0]));
    });
  }, []);

  if (!ctx) return <p style={{ padding: 40 }}>Cargando...</p>;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 90, background: 'var(--bg)' }}>
      <Header />
      <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, color: 'var(--ink)' }}>Clientes</h1>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <thead>
            <tr style={{ background: '#f0f0f0', color: '#333' }}>
              <th style={{ textAlign: 'left', padding: 12 }}>Nombre</th>
              <th style={{ textAlign: 'left', padding: 12 }}>Documento</th>
              <th style={{ textAlign: 'left', padding: 12 }}>Estado</th>
              <th style={{ textAlign: 'left', padding: 12 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 16, color: '#666', textAlign: 'center' }}>
                  No hay clientes.
                </td>
              </tr>
            )}
            {clients.map((c) => (
              <tr key={c.id} style={{ borderTop: '1px solid #eee' }}>
                <td style={{ padding: 12 }}>{c.fullName}</td>
                <td style={{ padding: 12 }}>{c.documentNumber}</td>
                <td style={{ padding: 12 }}>{c.status}</td>
                <td style={{ padding: 12 }}>
                  <Can permission="clients.update" permissions={ctx.permissions}>
                    <button style={{ marginRight: 8 }}>Editar</button>
                    <button>Activar/Desactivar</button>
                  </Can>
                  <Can permission="clients.delete" permissions={ctx.permissions}>
                    <button style={{ marginLeft: 8 }}>Eliminar</button>
                  </Can>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Can permission="clients.create" permissions={ctx.permissions}>
        <button
          onClick={() => navigate('/clients/new')}
          style={{
            position: 'fixed',
            bottom: 80,
            right: 16,
            width: 50,
            height: 50,
            borderRadius: '50%',
            border: 0,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-deep))',
            color: '#fff',
            fontSize: 28,
            lineHeight: 1,
            cursor: 'pointer',
            boxShadow: '0 12px 22px -8px rgba(var(--accent-rgb), 0.6)',
            zIndex: 10,
          }}
          title="Nuevo cliente"
        >
          +
        </button>
      </Can>

      <Footer />
    </div>
  );
}