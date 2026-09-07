import { useNavigate } from 'react-router-dom';

export function BrainPage() {
  const navigate = useNavigate();
  return (
    <div className="s2">
      <div className="s2-head">
        <div className="s2-top">
          <div className="cback" onClick={() => navigate('/home')}>
            <svg viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div className="org-chip"><span className="org-dot" />Brain</div>
        </div>
        <h1 className="page-title">Inteligencia de cliente</h1>
      </div>
      <div className="s2-body">
        <div className="empty-state">
          <span className="empty-icon">🧠</span>
          <p>Próximamente: análisis RFM y recomendaciones.</p>
        </div>
      </div>
    </div>
  );
}