import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface TileDef {
  id: string;
  path: string;
  label: string;
  perm: string;
  implemented: boolean;
  icon: React.ReactNode;
  flag?: string;
}

const ICONS: Record<string, React.ReactNode> = {
  cliente: (
    <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.6" stroke="currentColor" strokeWidth="2" /><path d="M5 20c0-3.4 3.1-6 7-6s7 2.6 7 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
  ),
  encuestas: (
    <svg viewBox="0 0 24 24" fill="none"><rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
  ),
  cartera: (
    <svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16v12H4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M4 10h16M16 15h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
  ),
  crear: (
    <svg viewBox="0 0 24 24" fill="none"><circle cx="10" cy="8" r="3.4" stroke="currentColor" strokeWidth="2" /><path d="M4 19c0-3 2.7-5.2 6-5.2 1 0 2 .2 2.8.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M18 14v6M15 17h6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
  ),
  descuentos: (
    <svg viewBox="0 0 24 24" fill="none"><path d="M8 8h.01M16 16h.01M7 17L17 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2" /></svg>
  ),
  nuevos: (
    <svg viewBox="0 0 24 24" fill="none"><path d="M4 8l8-4 8 4-8 4-8-4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M4 8v8l8 4 8-4V8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M18 4v5M15.5 5.5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
  ),
  rutero: (
    <svg viewBox="0 0 24 24" fill="none"><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="2" /></svg>
  ),
  brain: (
    <svg viewBox="0 0 24 24" fill="none"><path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5.8A3 3 0 0 0 9 18a3 3 0 0 0 3-1V5a3 3 0 0 0-3-1Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 1 5.8A3 3 0 0 1 15 18a3 3 0 0 1-3-1" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
  ),
  quejas: (
    <svg viewBox="0 0 24 24" fill="none"><path d="M12 3l9 16H3L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M12 10v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="12" cy="17" r="1" fill="currentColor" /></svg>
  ),
  precios: (
    <svg viewBox="0 0 24 24" fill="none"><path d="M4 8l6-4 10 6-6 10L4 14V8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><circle cx="9" cy="10" r="1.4" fill="currentColor" /></svg>
  ),
  gastos: (
    <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="13" rx="2.5" stroke="currentColor" strokeWidth="2" /><path d="M3 10h18" stroke="currentColor" strokeWidth="2" /><path d="M7 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
  ),
  creditos: (
    <svg viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M2 10h20" stroke="currentColor" strokeWidth="2" /></svg>
  ),
  usuarios: (
    <svg viewBox="0 0 24 24" fill="none"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
  ),
  config: (
    <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ),
  perfiles: (
    <svg viewBox="0 0 24 24" fill="none"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
  ),
};

const TILES: TileDef[] = [
  { id: 'cliente', path: '/clients', label: 'Cliente', perm: 'clients.read', implemented: true, icon: ICONS.cliente },
  { id: 'crear', path: '/clients/new', label: 'Crear cliente', perm: 'clients.create', implemented: true, icon: ICONS.crear },
  { id: 'cartera', path: '/portfolio', label: 'Cartera', perm: 'clients.read', implemented: false, icon: ICONS.cartera, flag: 'module.portfolio' },
  { id: 'creditos', path: '/credits', label: 'Créditos', perm: 'credits.read', implemented: true, icon: ICONS.creditos },
  { id: 'usuarios', path: '/users', label: 'Usuarios', perm: 'users.read', implemented: true, icon: ICONS.usuarios },
  { id: 'perfiles', path: '/profiles', label: 'Perfiles', perm: 'profiles.read', implemented: true, icon: ICONS.perfiles },
  { id: 'config', path: '/config', label: 'Configuración', perm: 'config.read', implemented: true, icon: ICONS.config },
  { id: 'descuentos', path: '/discounts', label: 'Descuentos', perm: 'clients.read', implemented: false, icon: ICONS.descuentos, flag: 'module.discounts' },
  { id: 'precios', path: '/prices', label: 'Precios', perm: 'clients.read', implemented: false, icon: ICONS.precios, flag: 'module.prices' },
  { id: 'nuevos', path: '/new-products', label: 'Nuevos', perm: 'clients.read', implemented: false, icon: ICONS.nuevos, flag: 'module.newProducts' },
  { id: 'encuestas', path: '/surveys', label: 'Encuestas', perm: 'clients.read', implemented: false, icon: ICONS.encuestas, flag: 'module.surveys' },
  { id: 'gastos', path: '/expenses', label: 'Gastos', perm: 'clients.read', implemented: false, icon: ICONS.gastos, flag: 'module.expenses' },
  { id: 'quejas', path: '/complaints', label: 'Quejas', perm: 'clients.read', implemented: false, icon: ICONS.quejas, flag: 'module.complaints' },
  { id: 'rutero', path: '/routes', label: 'Rutero', perm: 'credits.read', implemented: false, icon: ICONS.rutero, flag: 'module.routes' },
  { id: 'brain', path: '/brain', label: 'Brain', perm: 'clients.read', implemented: false, icon: ICONS.brain, flag: 'module.brain' },
];

export function HomePage() {
  const { bootstrap, moduleContexts, loadModuleContext } = useAuth();

  useEffect(() => {
    ['clients', 'users', 'config', 'credits'].forEach((n) =>
      loadModuleContext(n).catch(() => undefined),
    );
  }, []);

  const hasPerm = (perm: string) => {
    const [mod] = perm.split('.');
    const ctx = moduleContexts[mod];
    if (!ctx) return false;
    return ctx.permissions.includes(perm);
  };

  const flags = bootstrap?.featureFlags || {};
  const visible = TILES.filter((t) => {
    if (!hasPerm(t.perm)) return false;
    if (t.flag && !flags[t.flag]) return false;
    return true;
  });
  const name = bootstrap?.user.name?.split(' ')[0] || 'Usuario';
  const company = bootstrap?.company.name || '';

  return (
    <div className="s2">
      <div className="s2-head">
        <div className="s2-top">
          <div className="org-chip">
            <span className="org-dot" />
            {company} · Gestión Comercial
          </div>
        </div>
        <div className="greet">
          <div className="welcome">
            <div className="brand-ava">
              <svg viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" /></svg>
            </div>
            <div>
              <h2>
                Hola, {name} <span className="wave">👋</span>
              </h2>
              <p className="brand-sub">¿Con qué área te ayudo?</p>
            </div>
          </div>
        </div>
        <h1 className="page-title">Módulos comerciales</h1>
        <p className="lead below">Selecciona el módulo que deseas consultar.</p>
      </div>

      <div className="s2-body">
        <div className="hsec">Módulos</div>
        <div className="grid-3">
          {visible.map((t) => (
            <Link
              key={t.id}
              to={t.path}
              className={t.implemented ? 'tile' : 'tile disabled'}
              style={{ textDecoration: 'none' }}
            >
              <div className="ic">{t.icon}</div>
              <span>{t.label}</span>
              {!t.implemented && <span className="coming-soon">Próximamente</span>}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}