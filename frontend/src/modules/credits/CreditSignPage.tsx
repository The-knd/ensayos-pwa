import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AppBar } from '../../shared/components/AppBar';
import { httpClient } from '../../shared/api/httpClient';

interface SignCredit {
  id: string;
  applicationNumber: string;
  requestedAmount: string;
  approvedLimit: string;
  status: string;
  client?: { fullName: string; documentNumber: string; legalName?: string };
}

export function CreditSignPage() {
  const { id } = useParams<{ id: string }>();
  const { bootstrap } = useAuth();
  const navigate = useNavigate();
  const [credit, setCredit] = useState<SignCredit | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    httpClient
      .get(`/credits/${id}`)
      .then((res) => setCredit(res.data))
      .catch((err: any) => setError(err?.response?.data?.message || 'No se pudo cargar el crédito'));
  }, [id]);

  const sign = async () => {
    if (!id) return;
    setBusy(true);
    setError('');
    try {
      await httpClient.post(`/credits/${id}/sign`);
      navigate(`/credits/success/${id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message?.message || 'No se pudo firmar el pagaré');
      setBusy(false);
    }
  };

  const primary = bootstrap?.company.theme.primaryColor || '#0057B8';

  if (error && !credit) {
    return (
      <div className="s2">
        <AppBar title="Firma del pagaré" />
        <div className="body">
          <div className="addr-result" style={{ background: '#fdecec', borderColor: '#f6caca', color: '#c62828' }}>
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!credit) {
    return (
      <div className="s2">
        <AppBar title="Firma del pagaré" />
        <div className="body" style={{ color: 'var(--muted)', fontSize: 13 }}>Cargando…</div>
      </div>
    );
  }

  return (
    <div className="s2">
      <AppBar title="Firma del pagaré" />
      <div className="body">
        <div className="note">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p>
            Revisa el cupo aprobado y las condiciones antes de firmar el pagaré y la carta de
            instrucciones. La firma es electrónica y queda registrada en el expediente del crédito.
          </p>
        </div>

        <div className="sec">Solicitud {credit.applicationNumber || '—'}</div>

        <div className="info-card" style={{ background: 'var(--white)', borderRadius: 14, border: '1.5px solid var(--line)', padding: '6px 16px', marginBottom: 16 }}>
          <div className="info-row">
            <span className="info-label">Cliente</span>
            <span className="info-value">{credit.client?.legalName || credit.client?.fullName}</span>
          </div>
          <div className="info-row">
            <span className="info-label">NIT</span>
            <span className="info-value">{credit.client?.documentNumber}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Monto solicitado</span>
            <span className="info-value">${Number(credit.requestedAmount).toLocaleString()}</span>
          </div>
          <div className="info-row" style={{ borderBottom: 0 }}>
            <span className="info-label">Cupo aprobado</span>
            <span className="info-value" style={{ color: 'var(--green-deep)', fontWeight: 700 }}>
              ${Number(credit.approvedLimit || credit.requestedAmount).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="check-row" style={{ background: 'var(--accent-soft)', borderColor: 'transparent' }}>
          <span style={{ fontSize: 12, lineHeight: 1.5 }}>
            <strong>Pagaré + carta de instrucciones.</strong> Al firmar aceptas el cupo aprobado y
            las condiciones de pago del crédito. La firma se realiza sobre el resumen de la solicitud.
          </span>
        </div>

        {error && <p style={{ color: '#c62828', fontSize: 12, margin: '10px 2px' }}>{error}</p>}

        <div className="rowbtn">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(`/credits`)}>
            Volver
          </button>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={sign} style={{ opacity: busy ? 0.6 : 1, background: primary }}>
            {busy ? 'Firmando…' : 'Firmar pagaré'}
          </button>
        </div>
      </div>
    </div>
  );
}