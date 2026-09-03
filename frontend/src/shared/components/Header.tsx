import { useAuth } from '../../modules/auth/AuthContext';
import { httpClient } from '../api/httpClient';
import { useNavigate } from 'react-router-dom';

export function Header() {
  const { bootstrap } = useAuth();
  const navigate = useNavigate();

  const logout = async () => {
    await httpClient.post('/auth/logout');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <a className="brand company-brand" onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}>
          <img src={bootstrap?.company.theme.logoUrl} alt="logo" className="brand-logo" />
          {bootstrap?.company.id && <span>{bootstrap.user.name.split(' ')[0]} · {bootstrap.company.id.slice(0, 6)}</span>}
          <span className="status-dot online">En línea</span>
        </a>
        <div className="nav-links">
          <button className="ibtn" title="Notificaciones">
            <svg viewBox="0 0 24 24" fill="none"><path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" /><path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></svg>
          </button>
          <button className="logout-btn" onClick={logout} title="Cerrar sesión">
            <svg viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>
    </nav>
  );
}