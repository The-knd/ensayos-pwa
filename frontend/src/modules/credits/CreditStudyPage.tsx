import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar } from '../../shared/components/AppBar';
import { httpClient } from '../../shared/api/httpClient';

interface ClientOption {
  id: string;
  fullName: string;
  documentNumber: string;
  documentType?: string;
  legalName?: string;
  city?: string;
}

export function CreditStudyPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientId, setClientId] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [monthlyExpenses, setMonthlyExpenses] = useState('');
  const [assetsValue, setAssetsValue] = useState('');
  const [liabilitiesValue, setLiabilitiesValue] = useState('');
  const [consentData, setConsentData] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    httpClient
      .get('/clients', { params: { limit: 500 } })
      .then((res) => setClients(res.data[0]))
      .catch(() => setError('No se pudieron cargar los clientes'));
  }, []);

  const selected = clients.find((c) => c.id === clientId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!clientId) {
      setError('Selecciona un cliente');
      return;
    }
    if (!consentData) {
      setError('Debes aceptar el tratamiento de datos para continuar');
      return;
    }
    setSubmitting(true);
    try {
      const res = await httpClient.post('/credits/study', {
        clientId,
        monthlyIncome: monthlyIncome ? Number(monthlyIncome) : undefined,
        monthlyExpenses: monthlyExpenses ? Number(monthlyExpenses) : undefined,
        assetsValue: assetsValue ? Number(assetsValue) : undefined,
        liabilitiesValue: liabilitiesValue ? Number(liabilitiesValue) : undefined,
        consentData,
      });
      navigate(`/credits/result/${res.data.id}`, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message?.message || 'No se pudo enviar la solicitud');
      setSubmitting(false);
    }
  };

  return (
    <div className="s2">
      <AppBar title="Estudio de crédito" />
      <form className="body" onSubmit={handleSubmit}>
        <div className="note">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12 8v5M12 16.5v.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <p>
            Consulta el NIT, confirma los datos del cliente, registra la información financiera y
            acepta el tratamiento de datos para iniciar el estudio del crédito.
          </p>
        </div>

        <div className="sec">Solicitud de crédito</div>

        <label className="f-label">* Cliente (NIT/documento)</label>
        <div className="sel">
          <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Selecciona un cliente</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.documentNumber} — {c.fullName}
              </option>
            ))}
          </select>
          <svg className="cv" viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {selected && (
          <div className="addr-result">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M4 11l8-6 8 6v8a1 1 0 01-1 1h-4v-5h-6v5H5a1 1 0 01-1-1v-8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
            <span>
              {selected.legalName || selected.fullName} · NIT {selected.documentNumber}
              {selected.city ? ` · ${selected.city}` : ''}
            </span>
          </div>
        )}

        <div className="sec-sub" style={{ color: 'var(--accent)' }}>Información financiera (opcional)</div>

        <div className="row2">
          <div className="field">
            <label className="f-label">Ingresos mensuales</label>
            <input className="inp" type="number" value={monthlyIncome} onChange={(e) => setMonthlyIncome(e.target.value)} placeholder="0.00" />
          </div>
          <div className="field">
            <label className="f-label">Egresos mensuales</label>
            <input className="inp" type="number" value={monthlyExpenses} onChange={(e) => setMonthlyExpenses(e.target.value)} placeholder="0.00" />
          </div>
        </div>

        <div className="row2">
          <div className="field">
            <label className="f-label">Activos</label>
            <input className="inp" type="number" value={assetsValue} onChange={(e) => setAssetsValue(e.target.value)} placeholder="0.00" />
          </div>
          <div className="field">
            <label className="f-label">Pasivos</label>
            <input className="inp" type="number" value={liabilitiesValue} onChange={(e) => setLiabilitiesValue(e.target.value)} placeholder="0.00" />
          </div>
        </div>

        <label className="check-row">
          <input type="checkbox" checked={consentData} onChange={(e) => setConsentData(e.target.checked)} />
          <span>Autorizo el tratamiento de mis datos personales para el estudio de la solicitud de crédito.</span>
        </label>

        {error && <p style={{ color: '#c62828', fontSize: 12, margin: '10px 2px' }}>{error}</p>}

        <div className="rowbtn">
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/credits')}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting} style={{ opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Enviando…' : 'Solicitar estudio'}
          </button>
        </div>
      </form>
    </div>
  );
}