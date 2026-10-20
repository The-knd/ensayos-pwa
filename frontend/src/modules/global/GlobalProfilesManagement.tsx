import { useEffect, useState } from 'react';
import { httpClient } from '../../shared/api/httpClient';
import { MODULES } from '../registry';
import { SUPER_ADMIN_PROFILE_ID } from '../auth/AuthContext';

interface GlobalProfile {
  id: string;
  name: string;
  isSystemRole: boolean;
}

interface Permission {
  id: string;
  code: string;
  resource: string;
  action: string;
}

const errorMessage = (err: any, fallback: string) =>
  err?.response?.data?.message?.message || err?.response?.data?.message || fallback;

/** `new-products` y `newProducts` deben compararse igual. */
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Recursos del catálogo que NO tienen módulo frontend: "ocultos"/de sistema. */
const UI_RESOURCES = new Set(MODULES.map((m) => normalize(m.module)));

const isHiddenResource = (resource: string) => !UI_RESOURCES.has(normalize(resource));

/**
 * Perfiles globales de sistema (company_id NULL), visibles solo en este portal.
 * Backend: GET/POST /profiles/global, PATCH/DELETE /profiles/global/:id y los
 * endpoints habituales de permisos (el superadmin opera sobre globales).
 */
export function GlobalProfilesManagement() {
  const [profiles, setProfiles] = useState<GlobalProfile[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<GlobalProfile | null>(null);
  const [profilePerms, setProfilePerms] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
    httpClient
      .get('/profiles/permissions')
      .then((res) => setPermissions(res.data || []))
      .catch(() => setPermissions([]));
  }, []);

  const load = () => {
    httpClient
      .get('/profiles/global')
      .then((res) => setProfiles(res.data || []))
      .catch((err) => setError(errorMessage(err, 'No se pudieron cargar los perfiles globales')));
  };

  const createProfile = async () => {
    if (!newName.trim()) return;
    setError('');
    try {
      await httpClient.post('/profiles/global', { name: newName.trim() });
      setNewName('');
      load();
    } catch (err) {
      setError(errorMessage(err, 'No se pudo crear'));
    }
  };

  const updateProfile = async (id: string) => {
    if (!editName.trim()) return;
    setError('');
    try {
      await httpClient.patch(`/profiles/global/${id}`, { name: editName.trim() });
      setEditing(null);
      load();
    } catch (err) {
      setError(errorMessage(err, 'No se pudo actualizar'));
    }
  };

  const deleteProfile = async (id: string) => {
    if (!window.confirm('¿Eliminar este perfil global?')) return;
    setError('');
    try {
      await httpClient.delete(`/profiles/global/${id}`);
      load();
    } catch (err) {
      setError(errorMessage(err, 'No se pudo eliminar'));
    }
  };

  const openPermissions = async (p: GlobalProfile) => {
    setSelectedProfile(p);
    setError('');
    try {
      const res = await httpClient.get(`/profiles/${p.id}/permissions`);
      setProfilePerms((res.data || []).map((perm: Permission) => perm.id));
    } catch (err) {
      setError(errorMessage(err, 'No se pudieron cargar los permisos'));
    }
  };

  const togglePerm = async (permId: string) => {
    if (!selectedProfile) return;
    const has = profilePerms.includes(permId);
    try {
      if (has) {
        await httpClient.delete(`/profiles/${selectedProfile.id}/permissions/${permId}`);
        setProfilePerms((prev) => prev.filter((id) => id !== permId));
      } else {
        await httpClient.post(`/profiles/${selectedProfile.id}/permissions`, { permissionId: permId });
        setProfilePerms((prev) => [...prev, permId]);
      }
    } catch (err) {
      setError(errorMessage(err, 'Error al cambiar permiso'));
    }
  };

  // Catálogo agrupado por recurso, para mostrar módulos ocultos aparte.
  const groups = Array.from(
    permissions.reduce((acc, p) => {
      const list = acc.get(p.resource) ?? [];
      list.push(p);
      acc.set(p.resource, list);
      return acc;
    }, new Map<string, Permission[]>()),
  ).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div>
      <div className="info-card" style={{ padding: 20, marginBottom: 16 }}>
        <h3 className="section-title" style={{ marginTop: 0 }}>Nuevo perfil de sistema global</h3>
        <p style={{ fontSize: 12, color: 'var(--faint)', marginTop: 0 }}>
          Sin empresa asignada: solo pueden portarlo usuarios globales creados en la pestaña Usuarios.
        </p>
        <div className="row2">
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <input
              className="inp"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre del perfil"
            />
          </div>
          <button className="btn btn-primary" onClick={createProfile} style={{ width: 'auto', padding: '0 20px' }}>
            Crear
          </button>
        </div>
        {error && <p style={{ color: 'red', fontSize: 12, marginTop: 8 }}>{error}</p>}
      </div>

      {profiles.length === 0 && <p className="empty-state">No hay perfiles globales de sistema</p>}
      {profiles.map((p) => (
        <div key={p.id} className="info-card" style={{ padding: 16, marginBottom: 12 }}>
          <div className="info-row" style={{ borderBottom: 0, padding: '8px 0' }}>
            <div style={{ flex: 1 }}>
              {editing === p.id ? (
                <div className="row2">
                  <input className="inp" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ flex: 1 }} />
                  <button className="btn btn-primary" onClick={() => updateProfile(p.id)} style={{ width: 'auto', padding: '0 14px' }}>Guardar</button>
                  <button className="btn btn-ghost" onClick={() => setEditing(null)} style={{ width: 'auto', padding: '0 14px' }}>Cancelar</button>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</div>
                  <span style={{ fontSize: 10, background: 'var(--accent-soft)', color: 'var(--accent-deep)', padding: '2px 8px', borderRadius: 99 }}>
                    Sistema global
                  </span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {p.id !== SUPER_ADMIN_PROFILE_ID && !editing && (
                <button
                  onClick={() => { setEditing(p.id); setEditName(p.name); }}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  Editar
                </button>
              )}
              <button
                onClick={() => openPermissions(p)}
                style={{ background: 'none', border: 'none', color: 'var(--green-deep)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                Permisos
              </button>
              {p.id !== SUPER_ADMIN_PROFILE_ID && (
                <button
                  onClick={() => deleteProfile(p.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  Eliminar
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {selectedProfile && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
          onClick={() => setSelectedProfile(null)}
        >
          <div
            style={{
              background: '#fff', borderRadius: 18, padding: 24, width: '100%', maxWidth: 560, maxHeight: '80vh', overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="section-title" style={{ marginTop: 0 }}>Permisos: {selectedProfile.name}</h3>
            {permissions.length === 0 && <p className="empty-state">No hay permisos</p>}
            {groups.map(([resource, perms]) => (
              <div key={resource} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink)' }}>{resource}</span>
                  {isHiddenResource(resource) && (
                    <span style={{ fontSize: 10, background: 'var(--line)', color: 'var(--faint)', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>
                      Sin interfaz (solo backend)
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {perms.map((perm) => {
                    const active = profilePerms.includes(perm.id);
                    return (
                      <button
                        key={perm.id}
                        onClick={() => togglePerm(perm.id)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 14px', borderRadius: 12, border: '1.6px solid var(--line)',
                          background: active ? 'var(--green-soft)' : '#fff',
                          cursor: 'pointer', textAlign: 'left',
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 600, color: active ? 'var(--green-deep)' : 'var(--ink)' }}>
                          {perm.code}
                        </span>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                          background: active ? 'var(--green)' : 'var(--line)', color: active ? '#fff' : 'var(--faint)',
                        }}>
                          {active ? 'On' : 'Off'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <button className="btn btn-primary" onClick={() => setSelectedProfile(null)} style={{ marginTop: 8 }}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
