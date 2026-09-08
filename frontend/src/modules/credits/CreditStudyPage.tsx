import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AppBar } from '../../shared/components/AppBar';
import { CreditStepper } from '../../shared/components/CreditStepper';
import { httpClient } from '../../shared/api/httpClient';

interface ClientLookup {
  id: string;
  fullName: string;
  documentNumber: string;
  documentType?: string;
  legalName?: string;
  commercialName?: string;
  city?: string;
}

interface Verdict {
  creditId: string;
  mockup: {
    decision: 'approved' | 'rejected';
    approvedLimit?: number;
    reason: string;
  };
}

export function CreditStudyPage() {
  const navigate = useNavigate();
  const { bootstrap, moduleContexts } = useAuth();
  const [nit, setNit] = useState('');
  const [results, setResults] = useState<ClientLookup[]>([]);
  const [client, setClient] = useState<ClientLookup | null>(null);
  const [searching, setSearching] = useState(false);
  const [consentData, setConsentData] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);

  const canCreateClient = moduleContexts['clients']?.permissions.includes('clients.create') ?? false;

  useEffect(() => {
    if (nit.length >= 3) {
      setSearching(true);
      setError('');
      setResults([]);
      httpClient
        .get('/clients', { params: { limit: 500 } })
        .then((res) => {
          const list: ClientLookup[] = res.data[0] || [];
          setResults(list.filter((c) => c.documentNumber.includes(nit)));
          setClient(null);
          setSearching(false);
        })
        .catch(() => {
          setError('No se pudieron consultar los clientes');
          setSearching(false);
        });
    } else {
      setResults([]);
      setClient(null);
    }
  }, [nit]);

  const selectClient = (c: ClientLookup) => {
    setClient(c);
    setError('');
  };

  const goCreateClient = () => navigate(`/clients/new?nit=${nit}`);

  const handleSubmit = async () => {
    setError('');
    setVerdict(null);
    if (!client) {
      setError('El NIT no corresponde a un cliente registrado.');
      return;
    }
    if (!consentData) {
      setError('Debes aceptar el tratamiento de datos para continuar');
      return;
    }
    setSubmitting(true);
    try {
      const res = await httpClient.post('/credits/study', {
        clientId: client.id,
        consentData,
      });
      setVerdict({ creditId: res.data.credit.id, mockup: res.data.mockup });
    } catch (err: any) {
      setError(err?.response?.data?.message?.message || 'No se pudo enviar la solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  const goToSign = async () => {
    if (!verdict || verdict.mockup.decision !== 'approved') return;
    setSubmitting(true);
    try {
      await httpClient.post(`/credits/${verdict.creditId}/result`, {
        decision: 'approved',
        approvedLimit: verdict.mockup.approvedLimit,
      });
      navigate(`/credits/sign/${verdict.creditId}`, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message?.message || 'No se pudo continuar a la firma');
      setSubmitting(false);
    }
  };

  const logo = bootstrap?.company.theme.logoUrl || undefined;
  const clientReady = !!client && consentData;
  const step = verdict ? 2 : 1;

  return (
    <div className="s2 flow credit-shell">
      <AppBar title="Estudio de crédito" subtitle="Paso 1 de 4" logo={logo} />
      <div className="body credit-body">
        <CreditStepper current={step} />

        {verdict ? (
          <div>
            {verdict.mockup.decision === 'approved' ? (
              <>
                <div className="approve">
                  <div className="badge">
                    <svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <h3>Aprobó el algoritmo</h3>
                  <p>El cliente cumple con las condiciones del crédito</p>
                  <div className="amt">${verdict.mockup.approvedLimit?.toLocaleString('es-CO')}</div>
                  <div className="amtl">Cupo aprobado</div>
                </div>
                <div className="terms">
                  <div className="term"><div className="k">Sin intereses</div><div className="v">30 días</div></div>
                  <div className="term"><div className="k">Plazo máx.</div><div className="v">90 días</div></div>
                </div>
              </>
            ) : (
              <>
                <div className="approve" style={{ background: '#fdecec', borderColor: '#f6caca' }}>
                  <div className="badge" style={{ background: '#E11225' }}>
                    <svg viewBox="0 0 24 24" fill="none"><path d="M12 3l9 16H3L12 3Z" stroke="#fff" strokeWidth="2" strokeLinejoin="round" /></svg>
                  </div>
                  <h3 style={{ color: '#b00020' }}>Solicitud no aprobada</h3>
                  <p>{verdict.mockup.reason}</p>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="sectitle">Identificación del cliente</div>
            <div className="field">
              <label>
                NIT{' '}
                <span style={{ color: 'var(--faint)', fontWeight: 600 }}>
                  {nit.length < 3 ? 'Digita 3+ dígitos' : searching ? 'Consultando…' : client ? 'Encontrado' : results.length > 0 ? `${results.length} coincidencia(s)` : 'Sin registro'}
                </span>
              </label>
              <input
                className="inp"
                inputMode="numeric"
                maxLength={10}
                value={nit}
                onChange={(e) => setNit(e.target.value.replace(/\D/g, ''))}
                placeholder="Ej. 901234567"
                disabled={!!verdict}
              />
              <div className="help">Digita el NIT (sin dígito de verificación) o la cédula. La búsqueda es parcial e inicia desde los 3 dígitos.</div>
            </div>

            {nit.length < 3 && (
              <div className="empty" style={{ background: '#fff', border: '1.5px dashed #dbe4ef', borderRadius: 16, textAlign: 'center', padding: '26px 16px', marginBottom: 13 }}>
                <svg viewBox="0 0 24 24" fill="none" width="30" height="30" color="#c3cede"><path d="M4 20V9l8-5 8 5v11" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M9 20v-6h6v6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
                <div>Esperando el NIT para consultar los datos del cliente</div>
              </div>
            )}

            {nit.length >= 3 && searching && (
              <p style={{ color: 'var(--muted)', fontSize: 12, padding: '15px 3px' }}>Consultando…</p>
            )}

            {nit.length >= 3 && !searching && !client && results.length > 0 && (
              <div>
                <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.1em', color: 'var(--faint)', margin: '6px 2px 10px' }}>SELECCIONA UN CLIENTE</div>
                {results.map((c) => (
                  <button
                    key={c.id}
                    className="card pick"
                    onClick={() => selectClient(c)}
                  >
                    <div>
                      <div className="pname">{c.legalName || c.fullName}</div>
                      <div className="pdoc">{(c.documentType ? c.documentType + ' ' : '') + c.documentNumber}</div>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                ))}
              </div>
            )}

            {client && (
              <>
                <div className="card" style={{ borderColor: '#cfe8d9', background: '#f4fbf6' }}>
                  <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.1em', color: 'var(--green-deep)', marginBottom: 9 }}>DATOS TRAÍDOS AUTOMÁTICAMENTE</div>
                  <div className="stk"><div className="k">Razón social</div><div className="v">{client.legalName || client.fullName}</div></div>
                  <div className="stk"><div className="k">NIT</div><div className="v">{client.documentNumber}</div></div>
                  {client.city && <div className="stk"><div className="k">Ciudad</div><div className="v">{client.city}</div></div>}
                  <button className="btn btn-ghost" style={{ marginTop: 12, height: 44 }} onClick={() => { setClient(null); setNit(''); }}>
                    Cambiar cliente
                  </button>
                </div>

                <div className="attnote">
                  <svg viewBox="0 0 24 24" fill="none"><path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
                  <p>Antes de correr el algoritmo, el cliente debe autorizar el tratamiento de sus datos personales.</p>
                </div>
              </>
            )}

            {nit.length >= 3 && !searching && !client && results.length === 0 && (
              <div className="card" style={{ textAlign: 'center', borderColor: '#f6caca', background: '#fdecec' }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.1em', color: '#b00020', marginBottom: 9 }}>CLIENTE NO ENCONTRADO</div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>No existe un cliente registrado que coincida con {nit}.</div>
                {canCreateClient ? (
                  <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={goCreateClient}>
                    Crear cliente <svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /></svg>
                  </button>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
                    No tienes permisos para crear clientes. Solicita al administrador que lo registre.
                  </div>
                )}
              </div>
            )}

            {error && <p style={{ color: '#c62828', fontSize: 12, margin: '10px 2px' }}>{error}</p>}
          </>
        )}
      </div>

      <div
        className={`check ${consentData ? 'on' : ''}`}
        onClick={() => setConsentData((v) => !v)}
        style={{ margin: '0 22px', flex: 'none' }}
      >
        <span className="bx"><svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
        <p>Acepto la <span>política de tratamiento de datos personales</span> y autorizo la consulta en centrales de riesgo.</p>
      </div>

      <div className="action-bar credit-actions">
        {verdict ? (
          verdict.mockup.decision === 'approved' ? (
            <button className="btn btn-green" onClick={goToSign} disabled={submitting}>
              Continuar a firma del pagaré
              <svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          ) : (
            <button className="btn btn-ghost" onClick={() => setVerdict(null)}>Reintentar</button>
          )
        ) : (
          <div className="credit-form-actions">
            <button className="btn btn-primary" disabled={!clientReady || submitting} onClick={handleSubmit}>
              Solicitar estudio de crédito
              <svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div className="bhelp">Se habilita al validar el NIT y aceptar el tratamiento de datos</div>
          </div>
        )}
      </div>
    </div>
  );
}
