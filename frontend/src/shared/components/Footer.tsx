import { NavLink } from 'react-router-dom';

export function Footer() {
  return (
    <nav className="tabbar">
      <NavLink to="/home" end className={({ isActive }) => (isActive ? 'tab on' : 'tab')}>
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1v-8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        <span>Inicio</span>
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) => (isActive ? 'tab on' : 'tab')}>
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="3.6" stroke="currentColor" strokeWidth="2" />
          <path d="M5 20c0-3.4 3.1-6 7-6s7 2.6 7 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span>Perfil</span>
      </NavLink>
    </nav>
  );
}