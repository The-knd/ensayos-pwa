import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Can } from '../../shared/components/Can';
import { httpClient } from '../../shared/api/httpClient';
import { Header } from '../../shared/components/Header';
import { Footer } from '../../shared/components/Footer';

interface User {
  id: string;
  fullName: string;
  email: string;
  status: string;
  profileId?: string;
  profile?: { name: string };
}

export function UsersListPage() {
  const { moduleContexts, loadModuleContext } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const ctx = moduleContexts['users'];

  const loadUsers = () => httpClient.get('/users').then((res) => setUsers(res.data));

  useEffect(() => {
    loadModuleContext('users')
      .catch(() => undefined)
      .then(loadUsers);
  }, []);

  if (!ctx) return <p style={{ padding: 40 }}>Cargando...</p>;

  const toggleStatus = (u: User) =>
    httpClient.patch(`/users/${u.id}/status`).then(loadUsers);

  const removeUser = (u: User) => {
    if (window.confirm(`¿Eliminar a ${u.fullName}?`)) {
      httpClient.delete(`/users/${u.id}`).then(loadUsers);
    }
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 90, background: 'var(--bg)' }}>
      <Header />
      <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, color: 'var(--ink)' }}>Usuarios</h1>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <thead>
            <tr style={{ background: '#f0f0f0', color: '#333' }}>
              <th style={{ textAlign: 'left', padding: 12 }}>Nombre</th>
              <th style={{ textAlign: 'left', padding: 12 }}>Email</th>
              <th style={{ textAlign: 'left', padding: 12 }}>Perfil</th>
              <th style={{ textAlign: 'left', padding: 12 }}>Estado</th>
              <th style={{ textAlign: 'left', padding: 12 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 16, color: '#666', textAlign: 'center' }}>
                  No hay usuarios.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id} style={{ borderTop: '1px solid #eee' }}>
                <td style={{ padding: 12 }}>{u.fullName}</td>
                <td style={{ padding: 12 }}>{u.email}</td>
                <td style={{ padding: 12 }}>{u.profile?.name || u.profileId || '—'}</td>
                <td style={{ padding: 12 }}>{u.status === 'active' ? 'Activo' : 'Inactivo'}</td>
                <td style={{ padding: 12 }}>
                  <Can permission="users.update" permissions={ctx.permissions}>
                    <button
                      onClick={() => toggleStatus(u)}
                      style={{ padding: '6px 10px', marginRight: 8, border: '1px solid var(--line)', borderRadius: 8, background: '#fff', cursor: 'pointer', color: 'var(--ink)' }}
                    >
                      {u.status === 'active' ? 'Desactivar' : 'Activar'}
                    </button>
                  </Can>
                  <Can permission="users.delete" permissions={ctx.permissions}>
                    <button
                      onClick={() => removeUser(u)}
                      style={{ padding: '6px 10px', border: '1px solid var(--line)', borderRadius: 8, background: 'var(--accent-soft)', cursor: 'pointer', color: 'var(--accent-deep)' }}
                    >
                      Eliminar
                    </button>
                  </Can>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Footer />
    </div>
  );
}