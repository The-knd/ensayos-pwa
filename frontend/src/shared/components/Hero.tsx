import { useAuth } from '../../modules/auth/AuthContext';

export function Hero({ children }: { children?: React.ReactNode }) {
  const { bootstrap } = useAuth();
  return (
    <div style={{ background: bootstrap?.company.theme.primaryColor || '#0057B8', padding: 24, color: '#fff' }}>
      {children}
    </div>
  );
}
