import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface AppBarProps {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}

export function AppBar({ title, onBack, right }: AppBarProps) {
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
      </div>
      {right}
    </div>
  );
}