import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Header } from '../../shared/components/Header';
import { Footer } from '../../shared/components/Footer';

const MODULES = [
  {
    path: '/clients',
    name: 'config',
    title: 'Clientes',
    description: 'Gestión de clientes de la empresa',
    icon: '👥',
  },
  {
    path: '/users',
    name: 'users',
    title: 'Usuarios',
    description: 'Administración de usuarios y accesos',
    icon: '🪪',
  },
  {
    path: '/config',
    name: 'config',
    title: 'Configuración',
    description: 'Ajustes y personalización de la empresa',
    icon: '⚙️',
  },
  {
    path: '/credits',
    name: 'credits',
    title: 'Créditos',
    description: 'Solicitudes y estudio de créditos',
    icon: '💳',
  },
];

export function HomePage() {
  const { bootstrap, moduleContexts, loadModuleContext } = useAuth();

  useEffect(() => {
    const names = MODULES.map((m) => m.name).filter(
      (value, index, self) => self.indexOf(value) === index,
    );
    names.forEach((n) => loadModuleContext(n).catch(() => undefined));
  }, []);

  const primary = bootstrap?.company.theme.primaryColor || '#0057B8';

  const visibleModules = MODULES.filter((m) => {
    const ctx = moduleContexts[m.name];
    if (!ctx) return false;
    const readPerm = `${m.name}.read`;
    return ctx.permissions.includes(readPerm);
  });

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 60, background: '#f4f5f7' }}>
      <Header />

      <div
        style={{
          background: `linear-gradient(135deg, ${primary}, ${primary}cc)`,
          color: '#fff',
          padding: '32px 24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={bootstrap?.company.theme.logoUrl}
              alt="logo"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24 }}>Hola, {bootstrap?.user.name}</h1>
            <p style={{ margin: '4px 0 0', opacity: 0.9 }}>
              {bootstrap?.user.email} · Empresa conectada
            </p>
          </div>
        </div>
      </div>

      <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{ margin: '0 0 16px', color: '#333', fontSize: 18 }}>Módulos disponibles</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          {visibleModules.length === 0 && (
            <p style={{ color: '#666' }}>Cargando módulos según tus permisos...</p>
          )}
          {visibleModules.map((m) => (
            <Link
              key={m.path}
              to={m.path}
              style={{
                textDecoration: 'none',
                background: '#fff',
                borderRadius: 12,
                border: '1px solid #e3e3e3',
                padding: 20,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                transition: 'transform 0.1s ease, box-shadow 0.1s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
              }}
            >
              <div style={{ fontSize: 32 }}>{m.icon}</div>
              <div style={{ marginTop: 12, color: '#1a1a1a', fontWeight: 600 }}>{m.title}</div>
              <div style={{ marginTop: 4, color: '#666', fontSize: 13 }}>{m.description}</div>
            </Link>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}