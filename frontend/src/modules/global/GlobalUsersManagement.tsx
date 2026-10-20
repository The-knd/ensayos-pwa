import { useEffect, useState } from 'react';
import { httpClient } from '../../shared/api/httpClient';
import { Modal } from '../../shared/components/Modal';

interface GlobalUser {
  id: string;
  fullName: string;
  email: string;
  status: string;
  profileId?: string | null;
  company?: { id: string; name: string } | null;
  profile?: { id: string; name: string } | null;
}

interface CompanyOption {
  id: string;
  name: string;
}

const errorMessage = (err: any, fallback: string) =>
  err?.response?.data?.message?.message || err?.response?.data?.message || fallback;

/**
 * Lista global de usuarios (todas las empresas) con búsqueda por email/nombre,
 * filtro por empresa y acciones de activar/desactivar y resetear contraseña.
 * Backend: GET /users/global, PATCH /users/:id/status, PATCH /users/:id/password.
 */
export function GlobalUsersManagement() {
  const [users, setUsers] = useState<GlobalUser[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  // Modal de cambio de contraseña
  const [pwdTarget, setPwdTarget] = useState<GlobalUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    httpClient
      .get('/users/global')
      .then((res) => setUsers(res.data || []))
      .catch((err) => setError(errorMessage(err, 'No se pudieron cargar los usuarios')))
      .finally(() => setLoading(false));
    httpClient
      .get('/config/companies')
      .then((res) => setCompanies((res.data || []).map((c: any) => ({ id: c.id, name: c.name }))))
      .catch(() => setCompanies([]));
  };

  useEffect(load, []);

  const toggleStatus = async (u: GlobalUser) => {
    setError('');
    setMsg('');
    try {
      await httpClient.patch(`/users/${u.id}/status`);
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, status: x.status === 'active' ? 'inactive' : 'active' } : x)),
      );
      setMsg(`${u.fullName} ${u.status === 'active' ? 'desactivado' : 'activado'}.`);
    } catch (err: any) {
      setError(errorMessage(err, 'No se pudo cambiar el estado'));
    }
  };

  const openPasswordModal = (u: GlobalUser) => {
    setError('');
    setMsg('');
    setPwdTarget(u);
    setNewPassword('');
    setConfirmPassword('');
  };

  const savePassword = async () => {
    if (!pwdTarget) return;
    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await httpClient.patch(`/users/${pwdTarget.id}/password`, { password: newPassword });
      setMsg(`Contraseña de ${pwdTarget.fullName} actualizada.`);
      setPwdTarget(null);
    } catch (err: any) {
      setError(errorMessage(err, 'No se pudo cambiar la contraseña'));
    } finally {
      setBusy(false);
    }
  };

  const visible = users.filter((u) => {
    if (companyFilter !== 'all') {
      if (companyFilter === 'none' ? u.company != null : u.company?.id !== companyFilter) return false;
    }
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return u.email.toLowerCase().includes(q) || u.fullName.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="info-card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="inp"
            style={{ flex: 1, minWidth: 200 }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por email o nombre"
          />
          <div className="sel" style={{ minWidth: 180 }}>
            <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}>
              <option value="all">Todas las empresas</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              <option value="none">Sin empresa (super_admin)</option>
            </select>
            <svg className="cv" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </div>
      </div>

      {error && <p style={{ color: 'red', fontSize: 12, marginBottom: 8 }}>{error}</p>}
      {msg && (
        <p style={{ color: 'var(--green-deep)', fontSize: 12, marginBottom: 8, background: 'var(--green-soft)', padding: '6px 10px', borderRadius: 8 }}>
          {msg}
        </p>
      )}

      {loading && <p className="empty-state">Cargando usuarios...</p>}
      {!loading && visible.length === 0 && <p className="empty-state">No hay usuarios que coincidan</p>}

      {visible.map((u) => (
        <div key={u.id} className="info-card" style={{ padding: '12px 16px', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{u.fullName}</div>
              <div style={{ fontSize: 11, color: 'var(--faint)' }}>
                {u.email} · {u.company?.name || 'Sin empresa'} · {u.profile?.name || 'Sin perfil'}
              </div>
            </div>
            <span
              style={{
                fontSize: 11,
                background: u.status === 'active' ? 'var(--green-soft)' : '#fdecea',
                color: u.status === 'active' ? 'var(--green-deep)' : '#b00020',
                padding: '2px 8px',
                borderRadius: 99,
                fontWeight: 700,
              }}
            >
              {u.status === 'active' ? 'activo' : 'inactivo'}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => toggleStatus(u)}
                title={u.status === 'active' ? 'Desactivar usuario' : 'Activar usuario'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--ink)', display: 'inline-flex' }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                  <path d="M12 3v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M6.3 6.3a8 8 0 1 0 11.4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              <button
                onClick={() => openPasswordModal(u)}
                title="Cambiar contraseña"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--accent)', display: 'inline-flex' }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                  <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}

      <Modal open={!!pwdTarget} onClose={() => !busy && setPwdTarget(null)}>
        <h3 className="section-title" style={{ marginTop: 0 }}>
          Cambiar contraseña de {pwdTarget?.fullName}
        </h3>
        <div className="field">
          <label>Nueva contraseña</label>
          <input
            className="inp"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            autoFocus
          />
        </div>
        <div className="field">
          <label>Confirmar nueva contraseña</label>
          <input
            className="inp"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repetir contraseña"
          />
        </div>
        {error && <p style={{ color: 'red', fontSize: 12 }}>{error}</p>}
        <div className="row2" style={{ marginTop: 12 }}>
          <button className="btn btn-primary" onClick={savePassword} disabled={busy} style={{ opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Guardando…' : 'Guardar'}
          </button>
          <button className="btn btn-ghost" onClick={() => setPwdTarget(null)} disabled={busy}>
            Cancelar
          </button>
        </div>
      </Modal>
    </div>
  );
}
