import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../modules/auth/AuthContext';
import { Header } from './Header';
import { Footer } from './Footer';
import { Sidebar } from './Sidebar';
import { useMediaQuery } from '../hooks/useMediaQuery';

const HOME_ROUTES = new Set(['/home', '/profile']);

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { bootstrap, isLoading } = useAuth();
  const { pathname } = useLocation();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const showTabbar = HOME_ROUTES.has(pathname);

  if (isLoading) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--muted)' }}>Cargando...</div>;
  }
  if (!bootstrap) {
    return <Navigate to="/login" replace />;
  }

  if (isDesktop) {
    return (
      <div className="app-shell">
        <Sidebar />
        <main className="app-main">{children}</main>
      </div>
    );
  }

  return (
    <>
      <Header />
      {children}
      {showTabbar && <Footer />}
    </>
  );
}
