import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Header } from '../../shared/components/Header';
import { Footer } from '../../shared/components/Footer';
import { httpClient } from '../../shared/api/httpClient';

export function ConfigPage() {
  const { bootstrap, moduleContexts, loadModuleContext } = useAuth();
  const [name, setName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#0057B8');
  const [logoUrl, setLogoUrl] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const ctx = moduleContexts['config'];

  useEffect(() => {
    loadModuleContext('config');
    if (bootstrap) {
      setName(bootstrap.company.theme.primaryColor ? '' : '');
      setPrimaryColor(bootstrap.company.theme.primaryColor || '#0057B8');
      setLogoUrl(bootstrap.company.theme.logoUrl || '');
    }
  }, [bootstrap]);

  const canUpdate = ctx?.permissions.includes('config.update');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    try {
      await httpClient.patch('/config', { name, primaryColor, logoUrl });
      setSaved(true);
    } catch (err: any) {
      setError(err?.response?.data?.message?.message || 'No se pudo guardar la configuración');
    }
  };

  if (!ctx) return <p style={{ padding: 40 }}>Cargando...</p>;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 60, background: '#f4f5f7' }}>
      <Header />
      <div style={{ padding: 24, maxWidth: 700, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, color: '#333' }}>Configuración</h1>
        {!canUpdate && (
          <p style={{ color: '#b00020' }}>No tenés permisos para editar la configuración.</p>
        )}
        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e3e3e3', padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, color: '#333', fontWeight: 500 }}>
              Nombre de la empresa
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={bootstrap?.company.id ? 'Empresa actual' : 'Nombre'}
              disabled={!canUpdate}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, color: '#333', fontWeight: 500 }}>
              Color principal (tema)
            </label>
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              disabled={!canUpdate}
              style={{ width: 80, height: 40, padding: 0, borderRadius: 8, border: '1px solid #ccc' }}
            />
            <span style={{ marginLeft: 12, color: '#666' }}>{primaryColor}</span>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, color: '#333', fontWeight: 500 }}>
              URL del logo
            </label>
            <input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              disabled={!canUpdate}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
            />
          </div>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          {saved && <p style={{ color: 'green' }}>Configuración guardada.</p>}
          {canUpdate && (
            <button type="submit" style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: primaryColor, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
              Guardar
            </button>
          )}
        </form>
      </div>
      <Footer />
    </div>
  );
}