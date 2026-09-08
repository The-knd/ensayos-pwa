import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface AppBarProps {
  title: string;
  subtitle?: string;
  logo?: string;
  onBack?: () => void;
  right?: ReactNode;
}

export function AppBar({ title, subtitle, logo, onBack, right }: AppBarProps) {
  const navigate = useNavigate();
  const handleBack = onBack ?? (() => navigate(-1));

  return (
    <div className="appbar">
      <button className="abk" onClick={handleBack} title="Volver">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className="abtitle">
        <h2>{title}</h2>
        {subtitle && <small>{subtitle}</small>}
      </div>
      {logo && <img className="alogo" src={logo} alt="logo" />}
      {right}
    </div>
  );
}