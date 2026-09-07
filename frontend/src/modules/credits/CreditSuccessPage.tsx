import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AppBar } from '../../shared/components/AppBar';
import { httpClient } from '../../shared/api/httpClient';

interface SuccessCredit {
  id: string;
  applicationNumber: string;
  approvedLimit: string;
  status: string;
}

export function CreditSuccessPage() {
  const { id } = useParams<{ id: string }>();
  const { bootstrap } = useAuth();
  const navigate = useNavigate();
  const [credit, setCredit] = useState<SuccessCredit | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [disbursed, setDisbursed] = useState(false);

  useEffect(() => {
    if (!id) return;
    httpClient
      .get(`/credits/${id}`)
      .then((res) => {
        setCredit(res.data);
        setDisbursed(res.data.status === 'disbursed');
      })
      .catch((err: any) => setError(err?.response?.data?.message || 'No se pudo cargar el crédito'));
  }, [id]);

  const finalize = async () => {
    if (!id) return;
    setBusy(true);
    setError('');
    try {
      await httpClient.post(`/credits/${id}/finalize`);
      setDisbursed(true);
    } catch (err: any) {
      setError(err?.response?.data?.message?.message || 'No se pudo registrar el desembolso');
    } finally {
      setBusy(false);
    }
  };

  const primary = bootstrap?.company.theme.primaryColor || '#0057B8';

  return (
    <div className="s2">
      <AppBar title={disbursed ? '¡Crédito desembolsado!' : '¡Firma exitosa!'} />
      <div className="body">
        <div
          style={{
            textAlign: 'center',
            padding: '32px 8px 24px',
            background: `linear-gradient(135deg, ${primary}, ${primary}cc)`,
            borderRadius: 18,
            color: '#fff',
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 54 }}>{disbursed ? '🎉' : '✍️'}</div>
          <h2 style={{ margin: '10px 0 4px', fontFamily: 'var(--display)' }}>
            {disbursed ? '¡Crédito desembolsado!' : '¡Firma exitosa!'}
          </h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: 13 }}>
            {credit?.applicationNumber
              ? `Solicitud ${credit.applicationNumber}`
              : 'Aplica a una empresa conectada'}
          </p>
        </div>

        {credit && (
          <div className="info-card" style={{ background: 'var(--white)', borderRadius: 14, border: '1.5px solid var(--line)', padding: '6px 16px', marginBottom: 16 }}>
            <div className="info-row">
              <span className="info-label">Cupo aprobado</span>
              <span className="info-value">${Number(credit.approvedLimit).toLocaleString()}</span>
            </div>
            <div className="info-row" style={{ borderBottom: 0 }}>
              <span className="info-label">Estado</span>
              <span className="info-value" style={{ color: 'var(--green-deep)', fontWeight: 700 }}>
                {disbursed ? 'Desembolsado' : 'Firmado'}
              </span>
            </div>
          </div>
        )}

        {!disbursed && (
          <>
            <div className="addr-result" style={{ marginBottom: 12 }}>
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                <path d="M12 8v5M12 16.5v.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <span>
                El pagaré quedó firmado. Ahora puedes registrar el desembolso para completar el ciclo.
              </span>
            </div>
            {error && <p style={{ color: '#c62828', fontSize: 12, margin: '10px 2px' }}>{error}</p>}
            <button type="button" className="btn btn-primary" disabled={busy} onClick={finalize} style={{ opacity: busy ? 0.6 : 1, background: primary }}>
              {busy ? 'Procesando…' : 'Registrar desembolso'}
            </button>
          </>
        )}

        {disbursed && (
          <div className="addr-result" style={{ background: '#eef6ee', borderColor: '#d3e8d3', color: '#2a6b3a' }}>
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>El crédito fue desembolsado correctamente. Ingresa a Documentos para consultar el expediente.</span>
          </div>
        )}

        <div className="rowbtn">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(`/credits/${id}/documents`)}>
            Ver documentos
          </button>
          <button type="button" className="btn btn-primary" style={{ background: primary }} onClick={() => navigate('/credits')}>
            Ir a créditos
          </button>
        </div>
      </div>
    </div>
  );
}