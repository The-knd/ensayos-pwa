import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../modules/auth/AuthContext';

export function Footer() {
  const { moduleContexts, loadModuleContext } = useAuth();

  useEffect(() => {
    ['credits', 'config'].forEach((m) => {
      if (!moduleContexts[m]) loadModuleContext(m).catch(() => undefined);
    });
  }, []);

  const has = (mod: string, perm: string) => {
    const ctx = moduleContexts[mod];
    return ctx ? ctx.permissions.includes(perm) : false;
  };

  const tabs = [
    { to: '/home', label: 'Inicio', icon: homeIcon },
    ...(has('credits', 'credits.read') ? [{ to: '/credits', label: 'Créditos', icon: creditIcon }] : []),
    ...(has('config', 'config.read') ? [{ to: '/config', label: 'Config', icon: configIcon }] : []),
    { to: '/profile', label: 'Perfil', icon: profileIcon },
  ];

  return (
    <nav className="tabbar">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end className={({ isActive }) => (isActive ? 'tab on' : 'tab')}>
          {t.icon()}
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function homeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1v-8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function creditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M2 10h20" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function configIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function profileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="3.6" stroke="currentColor" strokeWidth="2" />
      <path d="M5 20c0-3.4 3.1-6 7-6s7 2.6 7 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
