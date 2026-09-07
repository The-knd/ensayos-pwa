import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../modules/auth/AuthContext';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { bootstrap, isLoading } = useAuth();

  if (isLoading) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--muted)' }}>Cargando...</div>;
  }
  if (!bootstrap) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}