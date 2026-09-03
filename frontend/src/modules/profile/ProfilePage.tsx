import { useAuth } from '../auth/AuthContext';
import { httpClient } from '../../shared/api/httpClient';
import { Header } from '../../shared/components/Header';
import { Footer } from '../../shared/components/Footer';
import { useNavigate } from 'react-router-dom';

export function ProfilePage() {
  const { bootstrap } = useAuth();
  const navigate = useNavigate();

  const name = bootstrap?.user.name || '';
  const email = bootstrap?.user.email || '';
  const companyId = bootstrap?.company.id || '';

  const logout = async () => {
    await httpClient.post('/auth/logout');
    navigate('/login');
  };

  return (
    <div className="profile-page">
      <Header />

      <div className="profile-head">
        <div className="profile-avatar">👤</div>
        <h2>{name}</h2>
        <p className="profile-email">{email}</p>
      </div>

      <div className="profile-body">
        <div className="info-card">
          <div className="info-row">
            <span className="info-label">Email</span>
            <span className="info-value">{email}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Empresa</span>
            <span className="info-value">{companyId.slice(0, 6) || '—'}</span>
          </div>
          <div className="info-row" style={{ borderBottom: 0 }}>
            <span className="info-label">Cuenta</span>
            <span className="info-value">Vinculada</span>
          </div>
        </div>

        <div className="bio-notice">
          <div className="bio-notice-icon">🔐</div>
          <div>
            <strong>Autenticación biométrica disponible</strong>
            <p>
              Registra una huella o reconocimiento facial en este dispositivo para acceder sin
              conexión y agilizar futuros inicios de sesión.
            </p>
          </div>
        </div>

        <h3 className="section-title">Dispositivos</h3>
        <div className="empty-state">
          <span className="empty-icon">📱</span>
          <p>No tienes dispositivos registrados</p>
        </div>

        <button className="btn btn-primary" style={{ marginTop: 16 }}>
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M12 4c-2.8 0-5 1.6-6 3.5M19 9c0-1.2-.5-2.4-1.3-3.4M5 11c0-1 .3-2 .8-2.8M4.5 16c.7-1.3 1-2.8 1-4.3M8 19c1-1.6 1.4-3.6 1.4-5.6 0-1.5 1-2.6 2.6-2.6s2.6 1.1 2.6 2.6c0 .9-.1 1.8-.3 2.6M11.8 13.4c0 3.2-.6 5.8-1.6 7.6M15 17.5c-.3 1-.7 2-1.2 2.9"
              stroke="#fff"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>{' '}
          Registrar huella
        </button>
        <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={logout}>
          Cerrar sesión
        </button>
      </div>

      <Footer />
    </div>
  );
}