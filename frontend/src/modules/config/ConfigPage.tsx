import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { httpClient } from '../../shared/api/httpClient';

interface ListCompany {
  id: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  isActive: boolean;
}

interface UserItem {
  id: string;
  fullName: string;
  email: string;
  status: string;
  profileId: string;
}

interface FlagItem {
  id: string;
  key: string;
  enabled: boolean;
}

interface PlacementItem {
  id: string;
  key: string;
  module: string;
  label: string;
  placement: 'grid' | 'fab';
  position: number;
  path: string;
  perm: string;
  flag: string | null;
  logoUrl: string | null;
  enabled: boolean;
}

const TABS = [
  { id: 'company', label: 'Mi empresa' },
  { id: 'users', label: 'Usuarios' },
  { id: 'flags', label: 'Feature Flags' },
  { id: 'modules', label: 'Módulos' },
  { id: 'companies', label: 'Empresas' },
];

export function ConfigPage() {
  const { bootstrap, moduleContexts, loadModuleContext, refreshBootstrap } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('company');

  const [name, setName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#0057B8');
  const [logoUrl, setLogoUrl] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [companies, setCompanies] = useState<ListCompany[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { name: string; primaryColor: string }>>({});
  const [companiesError, setCompaniesError] = useState('');

  const [users, setUsers] = useState<UserItem[]>([]);
  const [selectedCompanyForUsers, setSelectedCompanyForUsers] = useState('');

  const [flags, setFlags] = useState<FlagItem[]>([]);
  const [newFlagKey, setNewFlagKey] = useState('');

  const [placements, setPlacements] = useState<PlacementItem[]>([]);
  const [newPlacement, setNewPlacement] = useState({
    key: '', module: '', label: '', placement: 'grid' as 'grid' | 'fab', position: 0, path: '', perm: '', flag: '', enabled: true,
  });
  const [editPlacementId, setEditPlacementId] = useState<string | null>(null);
  const [editPlacement, setEditPlacement] = useState<Partial<PlacementItem>>({});

  const ctx = moduleContexts['config'];
  const canUpdate = ctx?.permissions.includes('config.update');
  const isSuperAdmin = bootstrap?.user.email?.startsWith('superadmin');

  useEffect(() => {
    loadModuleContext('config');
    if (bootstrap) {
      setName(bootstrap.company.name || '');
      setPrimaryColor(bootstrap.company.theme.primaryColor || '#0057B8');
      setLogoUrl(bootstrap.company.theme.logoUrl || '');
      setSelectedCompanyForUsers(bootstrap.company.id);
    }
  }, [bootstrap]);

  useEffect(() => {
    if (canUpdate && (tab === 'companies' || tab === 'users')) {
      httpClient.get('/config/companies')
        .then((res) => {
          const list: ListCompany[] = res.data || [];
          setCompanies(list);
          const draftsMap: Record<string, { name: string; primaryColor: string }> = {};
          for (const c of list) draftsMap[c.id] = { name: c.name, primaryColor: c.primaryColor };
          setDrafts(draftsMap);
        })
        .catch(() => setCompaniesError('No se pudieron cargar las empresas'));
    }
  }, [canUpdate, tab]);

  useEffect(() => {
    if (tab === 'users') loadUsers(selectedCompanyForUsers);
  }, [tab, selectedCompanyForUsers]);

  useEffect(() => {
    if (tab === 'flags') loadFlags();
  }, [tab]);

  useEffect(() => {
    if (tab === 'modules') loadPlacements();
  }, [tab]);

  const loadUsers = (cid: string) => {
    const url = isSuperAdmin && cid ? `/users?companyId=${cid}` : '/users';
    httpClient.get(url).then((res) => setUsers(res.data?.[0] || [])).catch(() => setUsers([]));
  };

  const loadFlags = () => {
    httpClient.get('/feature-flags').then((res) => setFlags(res.data || [])).catch(() => setFlags([]));
  };

  const loadPlacements = () => {
    httpClient.get('/config/modules').then((res) => setPlacements(res.data || [])).catch(() => setPlacements([]));
  };

  const createPlacement = async () => {
    setError('');
    try {
      const payload = {
        ...newPlacement,
        flag: newPlacement.flag || undefined,
        position: Number(newPlacement.position) || 0,
      };
      await httpClient.post('/config/modules', payload);
      setNewPlacement({ key: '', module: '', label: '', placement: 'grid', position: 0, path: '', perm: '', flag: '', enabled: true });
      loadPlacements();
      await refreshBootstrap();
    } catch (err: any) {
      setError(err?.response?.data?.message?.message || 'No se pudo crear');
    }
  };

  const savePlacement = async (id: string) => {
    setError('');
    try {
      await httpClient.patch(`/config/modules/${id}`, editPlacement);
      setEditPlacementId(null);
      setEditPlacement({});
      loadPlacements();
      await refreshBootstrap();
    } catch (err: any) {
      setError(err?.response?.data?.message?.message || 'No se pudo guardar');
    }
  };

  const deletePlacement = async (id: string) => {
    if (!window.confirm('¿Eliminar esta ubicación de módulo?')) return;
    try {
      await httpClient.delete(`/config/modules/${id}`);
      loadPlacements();
      await refreshBootstrap();
    } catch { /* ignore */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSaved(false); setBusy(true);
    try {
      await httpClient.patch('/config', { name, primaryColor });
      setSaved(true); await refreshBootstrap();
    } catch (err: any) {
      setError(err?.response?.data?.message?.message || 'No se pudo guardar');
    } finally { setBusy(false); }
  };

  const uploadOwnLogo = async (file: File) => {
    setError('');
    const form = new FormData(); form.append('file', file);
    setBusy(true);
    try {
      const res = await httpClient.post('/config/logo', form);
      setLogoUrl(res.data?.logoUrl || ''); await refreshBootstrap(); setSaved(true);
    } catch (err: any) {
      setError(err?.response?.data?.message?.message || 'No se pudo subir el logo');
    } finally { setBusy(false); }
  };

  const saveCompany = async (c: ListCompany) => {
    const draft = drafts[c.id]; if (!draft) return;
    try {
      await httpClient.patch(`/config/companies/${c.id}`, draft);
      setCompanies((prev) => prev.map((x) => (x.id === c.id ? { ...x, ...draft } : x)));
      if (c.id === bootstrap?.company.id) await refreshBootstrap();
    } catch (err: any) {
      setCompaniesError(err?.response?.data?.message?.message || 'No se pudo guardar');
    }
  };

  const uploadCompanyLogo = async (c: ListCompany, file: File) => {
    const form = new FormData(); form.append('file', file);
    try {
      const res = await httpClient.post(`/config/companies/${c.id}/logo`, form);
      const newLogo = res.data?.logoUrl || '';
      setCompanies((prev) => prev.map((x) => (x.id === c.id ? { ...x, logoUrl: newLogo } : x)));
      if (c.id === bootstrap?.company.id) { setLogoUrl(newLogo); await refreshBootstrap(); }
    } catch (err: any) {
      setCompaniesError(err?.response?.data?.message?.message || 'No se pudo subir');
    }
  };

  const toggleFlag = async (f: FlagItem) => {
    try {
      await httpClient.patch(`/feature-flags/${f.id}`, { enabled: !f.enabled });
      setFlags((prev) => prev.map((x) => (x.id === f.id ? { ...x, enabled: !x.enabled } : x)));
      await refreshBootstrap();
    } catch { /* ignore */ }
  };

  const createFlag = async () => {
    if (!newFlagKey.trim()) return;
    try {
      await httpClient.post('/feature-flags', { key: newFlagKey.trim(), enabled: true });
      setNewFlagKey(''); loadFlags(); await refreshBootstrap();
    } catch (err: any) {
      setError(err?.response?.data?.message?.message || 'No se pudo crear');
    }
  };

  const deleteFlag = async (id: string) => {
    if (!window.confirm('¿Eliminar este feature flag?')) return;
    try { await httpClient.delete(`/feature-flags/${id}`); loadFlags(); await refreshBootstrap(); } catch { /* ignore */ }
  };

  if (!ctx) return <p style={{ padding: 40 }}>Cargando...</p>;

  return (
    <div className="s2">
      <div className="s2-head">
        <div className="s2-top">
          <div className="cback" onClick={() => navigate('/home')}>
            <svg viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div className="org-chip"><span className="org-dot" />Configuración</div>
        </div>
        <h1 className="page-title">Configuración</h1>
      </div>

      <div className="s2-body">
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, overflowX: 'auto' }}>
          {TABS.filter((t) => {
            if (t.id === 'companies' && !isSuperAdmin) return false;
            return true;
          }).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '8px 16px',
                borderRadius: 12,
                border: 'none',
                background: tab === t.id ? 'var(--accent)' : '#fff',
                color: tab === t.id ? '#fff' : 'var(--ink)',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: tab === t.id ? '0 4px 12px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'company' && (
          <div className="info-card" style={{ padding: 20 }}>
            <h2 className="section-title" style={{ marginTop: 0 }}>Mi empresa</h2>
            {!canUpdate && <p style={{ color: '#b00020' }}>No tenés permisos para editar.</p>}
            <div className="field">
              <label>Nombre de la empresa</label>
              <input className="inp" value={name} onChange={(e) => setName(e.target.value)} disabled={!canUpdate} />
            </div>
            <div className="field">
              <label>Color principal</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} disabled={!canUpdate} style={{ width: 60, height: 44, padding: 0, borderRadius: 10, border: '1px solid var(--line)' }} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{primaryColor}</span>
              </div>
            </div>
            <div className="field">
              <label>Logo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {logoUrl ? <img src={logoUrl} alt="logo" height={48} style={{ objectFit: 'contain' }} /> : (
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: primaryColor, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700 }}>{(name || 'P').charAt(0)}</div>
                )}
                {canUpdate && (
                  <label style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 13, background: '#fff' }}>
                    {busy ? 'Subiendo…' : 'Elegir imagen'}
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadOwnLogo(f); e.target.value = ''; }} />
                  </label>
                )}
              </div>
            </div>
            {error && <p style={{ color: 'red', fontSize: 12 }}>{error}</p>}
            {saved && <p style={{ color: 'green', fontSize: 12 }}>Guardado.</p>}
            {canUpdate && (
              <button className="btn btn-primary" onClick={handleSubmit} disabled={busy} style={{ opacity: busy ? 0.6 : 1 }}>
                Guardar
              </button>
            )}
          </div>
        )}

        {tab === 'users' && (
          <div>
            {isSuperAdmin && (
              <div className="field" style={{ marginBottom: 12 }}>
                <label>Empresa</label>
                <div className="sel">
                  <select value={selectedCompanyForUsers} onChange={(e) => setSelectedCompanyForUsers(e.target.value)}>
                    {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <svg className="cv" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
              </div>
            )}
            <div className="info-card" style={{ padding: '6px 0' }}>
              {users.length === 0 && <p className="empty-state">No hay usuarios</p>}
              {users.map((u) => (
                <div key={u.id} className="info-row" style={{ padding: '10px 16px' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{u.fullName}</div>
                    <div style={{ fontSize: 11, color: 'var(--faint)' }}>{u.email}</div>
                  </div>
                  <span style={{ fontSize: 11, background: u.status === 'active' ? 'var(--green-soft)' : '#fdecea', color: u.status === 'active' ? 'var(--green-deep)' : '#b00020', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>
                    {u.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'flags' && (
          <div>
            <div className="info-card" style={{ padding: 20, marginBottom: 16 }}>
              <h3 className="section-title" style={{ marginTop: 0 }}>Nuevo flag</h3>
              <div className="row2">
                <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                  <input className="inp" value={newFlagKey} onChange={(e) => setNewFlagKey(e.target.value)} placeholder="Ej: module.portfolio" />
                </div>
                <button className="btn btn-primary" onClick={createFlag} style={{ width: 'auto', padding: '0 20px' }}>
                  Crear
                </button>
              </div>
              {error && <p style={{ color: 'red', fontSize: 12, marginTop: 8 }}>{error}</p>}
            </div>

            {flags.length === 0 && <p className="empty-state">No hay feature flags</p>}
            {flags.map((f) => (
              <div key={f.id} className="info-card" style={{ padding: '10px 16px', marginBottom: 10 }}>
                <div className="info-row" style={{ borderBottom: 0, padding: '8px 0' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{f.key}</div>
                    <div style={{ fontSize: 11, color: 'var(--faint)' }}>{f.enabled ? 'Habilitado' : 'Deshabilitado'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      onClick={() => toggleFlag(f)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: 'none',
                        background: f.enabled ? 'var(--green)' : 'var(--line)',
                        color: f.enabled ? '#fff' : 'var(--ink)',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {f.enabled ? 'On' : 'Off'}
                    </button>
                    <button
                      onClick={() => deleteFlag(f.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'modules' && (
          <div>
            {canUpdate && (
              <div className="info-card" style={{ padding: 20, marginBottom: 16 }}>
                <h3 className="section-title" style={{ marginTop: 0 }}>Nuevo módulo</h3>
                <div className="row2">
                  <div className="field" style={{ flex: 1 }}>
                    <label>Key</label>
                    <input className="inp" value={newPlacement.key} onChange={(e) => setNewPlacement({ ...newPlacement, key: e.target.value })} placeholder="Ej: creditos" />
                  </div>
                  <div className="field" style={{ flex: 1 }}>
                    <label>Módulo backend</label>
                    <input className="inp" value={newPlacement.module} onChange={(e) => setNewPlacement({ ...newPlacement, module: e.target.value })} placeholder="Ej: credits" />
                  </div>
                </div>
                <div className="row2">
                  <div className="field" style={{ flex: 1 }}>
                    <label>Nombre visible</label>
                    <input className="inp" value={newPlacement.label} onChange={(e) => setNewPlacement({ ...newPlacement, label: e.target.value })} placeholder="Ej: Créditos" />
                  </div>
                  <div className="field" style={{ flex: 1 }}>
                    <label>Path</label>
                    <input className="inp" value={newPlacement.path} onChange={(e) => setNewPlacement({ ...newPlacement, path: e.target.value })} placeholder="Ej: /credits" />
                  </div>
                </div>
                <div className="row2">
                  <div className="field" style={{ flex: 1 }}>
                    <label>Permiso</label>
                    <input className="inp" value={newPlacement.perm} onChange={(e) => setNewPlacement({ ...newPlacement, perm: e.target.value })} placeholder="Ej: credits.read" />
                  </div>
                  <div className="field" style={{ flex: 1 }}>
                    <label>Feature flag (opcional)</label>
                    <input className="inp" value={newPlacement.flag} onChange={(e) => setNewPlacement({ ...newPlacement, flag: e.target.value })} placeholder="Ej: module.credits" />
                  </div>
                </div>
                <div className="row2">
                  <div className="field" style={{ flex: 1 }}>
                    <label>Ubicación</label>
                    <div className="sel">
                      <select value={newPlacement.placement} onChange={(e) => setNewPlacement({ ...newPlacement, placement: e.target.value as 'grid' | 'fab' })}>
                        <option value="grid">Botón en Home</option>
                        <option value="fab">FAB superior derecha</option>
                      </select>
                      <svg className="cv" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                  </div>
                  <div className="field" style={{ flex: 1 }}>
                    <label>Posición</label>
                    <input className="inp" type="number" value={newPlacement.position} onChange={(e) => setNewPlacement({ ...newPlacement, position: Number(e.target.value) })} />
                  </div>
                </div>
                {error && <p style={{ color: 'red', fontSize: 12, marginTop: 8 }}>{error}</p>}
                <button className="btn btn-primary" onClick={createPlacement} style={{ width: 'auto', padding: '0 20px' }}>
                  Crear
                </button>
              </div>
            )}

            {placements.length === 0 && <p className="empty-state">No hay módulos configurados</p>}
            {placements.map((p) => (
              <div key={p.id} className="info-card" style={{ padding: '10px 16px', marginBottom: 10 }}>
                {editPlacementId === p.id ? (
                  <div>
                    <div className="row2">
                      <div className="field" style={{ flex: 1 }}>
                        <label>Nombre</label>
                        <input className="inp" value={editPlacement.label ?? p.label} onChange={(e) => setEditPlacement({ ...editPlacement, label: e.target.value })} />
                      </div>
                      <div className="field" style={{ flex: 1 }}>
                        <label>Path</label>
                        <input className="inp" value={editPlacement.path ?? p.path} onChange={(e) => setEditPlacement({ ...editPlacement, path: e.target.value })} />
                      </div>
                    </div>
                    <div className="row2">
                      <div className="field" style={{ flex: 1 }}>
                        <label>Ubicación</label>
                        <div className="sel">
                          <select value={editPlacement.placement ?? p.placement} onChange={(e) => setEditPlacement({ ...editPlacement, placement: e.target.value as 'grid' | 'fab' })}>
                            <option value="grid">Botón en Home</option>
<option value="fab">FAB inferior derecha</option>
                          </select>
                          <svg className="cv" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </div>
                      </div>
                      <div className="field" style={{ flex: 1 }}>
                        <label>Posición</label>
                        <input className="inp" type="number" value={editPlacement.position ?? p.position} onChange={(e) => setEditPlacement({ ...editPlacement, position: Number(e.target.value) })} />
                      </div>
                    </div>
                    <div className="row2">
                      <div className="field" style={{ flex: 1 }}>
                        <label>Permiso</label>
                        <input className="inp" value={editPlacement.perm ?? p.perm} onChange={(e) => setEditPlacement({ ...editPlacement, perm: e.target.value })} />
                      </div>
                      <div className="field" style={{ flex: 1 }}>
                        <label>Flag (opcional)</label>
                        <input className="inp" value={editPlacement.flag ?? (p.flag || '')} onChange={(e) => setEditPlacement({ ...editPlacement, flag: e.target.value || null })} />
                      </div>
                    </div>
                    <div className="row2" style={{ marginTop: 8 }}>
                      <button className="btn btn-primary" onClick={() => savePlacement(p.id)} style={{ width: 'auto', padding: '0 16px' }}>Guardar</button>
                      <button className="btn btn-ghost" onClick={() => { setEditPlacementId(null); setEditPlacement({}); }} style={{ width: 'auto', padding: '0 16px' }}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="info-row" style={{ borderBottom: 0, padding: '8px 0' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{p.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--faint)' }}>
                        {p.module} · {p.placement === 'grid' ? 'Home' : 'FAB'} · pos {p.position} · {p.enabled ? 'Habilitado' : 'Deshabilitado'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {canUpdate && (
                        <>
                          <button
                            onClick={() => { setEditPlacementId(p.id); setEditPlacement({}); }}
                            style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => deletePlacement(p.id)}
                            style={{ background: 'none', border: 'none', color: '#b00020', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'companies' && isSuperAdmin && (
          <div>
            {companiesError && <p style={{ color: 'red' }}>{companiesError}</p>}
            {companies.map((c) => (
              <div key={c.id} className="info-card" style={{ padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  {c.logoUrl ? <img src={c.logoUrl} alt={c.name} height={40} style={{ objectFit: 'contain' }} /> : (
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: c.primaryColor, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700 }}>{c.name.charAt(0)}</div>
                  )}
                  <strong style={{ fontSize: 14, flex: 1 }}>
                    {c.name}
                    {c.isActive && <span style={{ marginLeft: 8, fontSize: 11, background: 'var(--green-soft)', color: 'var(--green-deep)', borderRadius: 99, padding: '2px 8px' }}>activa</span>}
                  </strong>
                  <label style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 12, background: '#fff' }}>
                    Subir logo
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCompanyLogo(c, f); e.target.value = ''; }} />
                  </label>
                </div>
                <div className="row2">
                  <input value={drafts[c.id]?.name ?? c.name} onChange={(e) => setDrafts((prev) => ({ ...prev, [c.id]: { ...prev[c.id], name: e.target.value } }))} className="inp" style={{ flex: 1 }} />
                  <input type="color" value={drafts[c.id]?.primaryColor ?? c.primaryColor} onChange={(e) => setDrafts((prev) => ({ ...prev, [c.id]: { ...prev[c.id], primaryColor: e.target.value } }))} style={{ width: 48, height: 44, padding: 0, borderRadius: 10, border: '1px solid var(--line)' }} />
                  <button className="btn btn-primary" onClick={() => saveCompany(c)} style={{ width: 'auto', padding: '0 16px' }}>Guardar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}