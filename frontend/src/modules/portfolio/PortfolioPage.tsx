import { useNavigate } from 'react-router-dom';

export function PortfolioPage() {
  const navigate = useNavigate();
  return (
    <div className="s2">
      <div className="s2-head">
        <div className="s2-top">
          <div className="cback" onClick={() => navigate('/home')}>
            <svg viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div className="org-chip"><span className="org-dot" />Cartera</div>
        </div>
        <h1 className="page-title">Estado de cartera</h1>
      </div>
      <div className="s2-body">
        <div className="empty-state">
          <span className="empty-icon">💼</span>
          <p>Próximamente: indicadores de mora y estado de cartera por cliente.</p>
        </div>
      </div>
    </div>
  );
}