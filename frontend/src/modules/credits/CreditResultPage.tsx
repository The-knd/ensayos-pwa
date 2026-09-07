import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AppBar } from '../../shared/components/AppBar';
import { httpClient } from '../../shared/api/httpClient';

interface CreditDetail {
  id: string;
  applicationNumber: string;
  requestedAmount: string;
  approvedLimit: string | null;
  status: string;
  nit: string | null;
  monthlyIncome: string | null;
  monthlyExpenses: string | null;
  assetsValue: string | null;
  liabilitiesValue: string | null;
  client?: {
    id: string;
    fullName: string;
    documentNumber: string;
    legalName?: string;
    commercialName?: string;
    city?: string;
    email?: string;
    phone?: string;
  };
}

export function CreditResultPage() {
  const { id } = useParams<{ id: string }>();
  const { bootstrap } = useAuth();
  const navigate = useNavigate();
  const [credit, setCredit] = useState<CreditDetail | null>(null);
  const [approvedLimit, setApprovedLimit] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    httpClient
      .get(`/credits/${id}`)
      .then((res) => {
        setCredit(res.data);
        setApprovedLimit(res.data.approvedLimit ?? res.data.requestedAmount);
      })
      .catch((err: any) => setError(err?.response?.data?.message || 'No se pudo cargar el crédito'));
  }, [id]);

  const decide = async (decision: 'approved' | 'rejected') => {
    if (!id) return;
    setBusy(true);
    setError('');
    try {
      await httpClient.post(`/credits/${id}/result`, {
        decision,
        approvedLimit: decision === 'approved' ? Number(approvedLimit) : undefined,
      });
      if (decision === 'approved') {
        navigate(`/credits/sign/${id}`);
      } else {
        setCredit((prev) => (prev ? { ...prev, status: 'rejected' } : prev));
        setBusy(false);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message?.message || 'No se pudo registrar la decisión');
      setBusy(false);
    }
  };

  if (error && !credit) {
    return (
      <div className="s2">
        <AppBar title="Resultado del crédito" />
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
        <AppBar title="Resultado del crédito" />
        <div className="body" style={{ color: 'var(--muted)', fontSize: 13 }}>Cargando…</div>
      </div>
    );
  }

  const primary = bootstrap?.company.theme.primaryColor || '#0057B8';

  return (
    <div className="s2">
      <AppBar title="Resultado del crédito" />
      <div className="body">
        <div className="note">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12 8v5M12 16.5v.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <p>Revisa la información del solicitante y define el cupo aprobado antes de continuar con la firma del pagaré.</p>
        </div>

        <div className="sec">Datos del solicitante</div>
        <div className="addr-result">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="3.6" stroke="currentColor" strokeWidth="2" />
            <path d="M5 20c0-3.4 3.1-6 7-6s7 2.6 7 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>
            {credit.client?.legalName || credit.client?.fullName}
            <br />
            {credit.client?.commercialName ? `Razón comercial: ${credit.client.commercialName}` : ''}
            <br />
            NIT {credit.client?.documentNumber || credit.nit} · {credit.client?.city || '—'}
          </span>
        </div>

        <div className="info-card" style={{ background: 'var(--white)', borderRadius: 14, border: '1.5px solid var(--line)', padding: '6px 16px', margin: '12px 0' }}>
          <div className="info-row">
            <span className="info-label">Monto solicitado</span>
            <span className="info-value">${Number(credit.requestedAmount).toLocaleString()}</span>
          </div>
          {credit.monthlyIncome && (
            <div className="info-row">
              <span className="info-label">Ingresos mensuales</span>
              <span className="info-value">${Number(credit.monthlyIncome).toLocaleString()}</span>
            </div>
          )}
          {credit.monthlyExpenses && (
            <div className="info-row">
              <span className="info-label">Egresos mensuales</span>
              <span className="info-value">${Number(credit.monthlyExpenses).toLocaleString()}</span>
            </div>
          )}
          {credit.assetsValue && (
            <div className="info-row">
              <span className="info-label">Activos</span>
              <span className="info-value">${Number(credit.assetsValue).toLocaleString()}</span>
            </div>
          )}
          {credit.liabilitiesValue && (
            <div className="info-row" style={{ borderBottom: 0 }}>
              <span className="info-label">Pasivos</span>
              <span className="info-value">${Number(credit.liabilitiesValue).toLocaleString()}</span>
            </div>
          )}
        </div>

        {credit.status === 'rejected' ? (
          <div className="addr-result" style={{ background: '#fdecec', borderColor: '#f6caca', color: '#c62828' }}>
            La solicitud fue rechazada. Comunícate con el cliente para informar la decisión.
          </div>
        ) : (
          <>
            <label className="f-label">* Cupo aprobado</label>
            <div className="field">
              <input
                className="inp"
                type="number"
                min="0"
                step="0.01"
                value={approvedLimit}
                onChange={(e) => setApprovedLimit(e.target.value)}
              />
            </div>

            {error && <p style={{ color: '#c62828', fontSize: 12, margin: '10px 2px' }}>{error}</p>}

            <div className="rowbtn">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy}
                onClick={() => decide('rejected')}
                style={{ opacity: busy ? 0.6 : 1 }}
              >
                Rechazar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => decide('approved')}
                style={{ opacity: busy ? 0.6 : 1, background: primary }}
              >
                Aprobar y continuar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}