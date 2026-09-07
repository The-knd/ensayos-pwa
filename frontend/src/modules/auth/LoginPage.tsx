import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { httpClient } from '../../shared/api/httpClient';
import { startAuthentication } from '@simplewebauthn/browser';

interface AuthCompany {
  id: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string;
}

const fallbackCompanies: AuthCompany[] = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Herragro', logoUrl: null, primaryColor: '#1565C0' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Adylog', logoUrl: null, primaryColor: '#E2602B' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Toptec', logoUrl: null, primaryColor: '#27AE60' },
];

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companies, setCompanies] = useState<AuthCompany[]>(fallbackCompanies);
  const [companyId, setCompanyId] = useState('11111111-1111-1111-1111-111111111111');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uiMode, setUiMode] = useState<'form' | 'has-passkey' | 'loading'>('loading');
  const navigate = useNavigate();
  const { refreshBootstrap, resetModuleContexts } = useAuth();

  // Cargar empresas
  useEffect(() => {
    httpClient
      .get('/auth/companies')
      .then((res) => {
        const list: AuthCompany[] = res.data || [];
        if (list.length > 0) {
          setCompanies(list);
          const current = list.find((c) => c.id === companyId);
          setCompanyId(current ? current.id : list[0].id);
        }
      })
      .catch(() => setCompanies(fallbackCompanies));
  }, []);

  // Verificar passkey automáticamente al cargar si hay email guardado
  useEffect(() => {
    const savedEmail = localStorage.getItem('lastEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      checkPasskeys(savedEmail, companyId);
    } else {
      setUiMode('form');
    }
  }, [companyId]);

  const checkPasskeys = async (emailToCheck: string, cid: string) => {
    try {
      const res = await httpClient.post('/auth/passkeys/check', { email: emailToCheck, companyId: cid });
      if (res.data?.hasPasskeys) {
        setUiMode('has-passkey');
        // Intento automático tras un pequeño delay para que el usuario vea la UI
        setTimeout(() => {
          handlePasskeyAuto(emailToCheck, cid);
        }, 600);
      } else {
        setUiMode('form');
      }
    } catch {
      setUiMode('form');
    }
  };

  const finishLogin = async () => {
    resetModuleContexts();
    await refreshBootstrap();
    navigate('/home');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await httpClient.post('/auth/login', { email, password, companyId });
      localStorage.setItem('lastEmail', email);
      await finishLogin();
    } catch (err: any) {
      setError(err?.response?.data?.message?.message || 'Credenciales inválidas');
    } finally {
      setBusy(false);
    }
  };

  const handlePasskeyAuto = async (emailToUse: string, cid: string) => {
    setBusy(true);
    setError('');
    try {
      const optionsRes = await httpClient.post('/auth/passkeys/login/options', { email: emailToUse, companyId: cid });
      const options = optionsRes.data;
      const credential = await startAuthentication(options);
      await httpClient.post('/auth/passkeys/login/verify', { email: emailToUse, companyId: cid, response: credential });
      localStorage.setItem('lastEmail', emailToUse);
      await finishLogin();
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        // El usuario canceló el prompt biométrico: volvemos al formulario
        setUiMode('form');
      } else {
        setError(err?.response?.data?.message?.message || 'No se pudo iniciar sesión con passkey');
        setUiMode('form');
      }
    } finally {
      setBusy(false);
    }
  };

  const handlePasskeyManual = () => {
    if (!email) {
      setError('Ingresa tu correo para iniciar con passkey');
      return;
    }
    handlePasskeyAuto(email, companyId);
  };

  const today = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const selected = companies.find((c) => c.id === companyId);

  return (
    <div className="s1">
      <div className="s1-hero" style={{ background: `linear-gradient(160deg, ${selected?.primaryColor || '#1356a0'}, #0c3567)` }}>
        <div className="org-row">
          <div className="org-chip">
            <span className="org-dot" />
            {selected?.name || 'PWA App'}
          </div>
        </div>
        <div className="s1-date">
          <span className="date-label">{today}</span>
        </div>
      </div>

      <div className="s1-sheet">
        <div className="sheet-handle" />
        <div className="sheet-scroll">
          {error && <div className="error-msg">{error}</div>}

          <h3 className="sheet-title">Iniciar sesión</h3>
          <p className="sheet-lead">Accede con tu cuenta corporativa.</p>

          {uiMode === 'has-passkey' && (
            <>
              <button
                className="btn btn-primary"
                onClick={handlePasskeyManual}
                disabled={busy}
                style={{ padding: '18px', fontSize: 17 }}
              >
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M12 4c-2.8 0-5 1.6-6 3.5M19 9c0-1.2-.5-2.4-1.3-3.4M5 11c0-1 .3-2 .8-2.8M4.5 16c.7-1.3 1-2.8 1-4.3M8 19c1-1.6 1.4-3.6 1.4-5.6 0-1.5 1-2.6 2.6-2.6s2.6 1.1 2.6 2.6c0 .9-.1 1.8-.3 2.6M11.8 13.4c0 3.2-.6 5.8-1.6 7.6M15 17.5c-.3 1-.7 2-1.2 2.9" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                {busy ? 'Entrando…' : 'Entrar con huella'}
              </button>

              <div className="divider">o continúa con</div>
            </>
          )}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Email</label>
              <div className="inp">
                <svg viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" /><path d="m2 7 10 7 10-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                <input
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setUiMode('form');
                  }}
                  onBlur={(e) => {
                    if (e.target.value && uiMode !== 'has-passkey') {
                      checkPasskeys(e.target.value, companyId);
                    }
                  }}
                  placeholder="tu@empresa.com"
                  autoComplete="username"
                  type="email"
                />
              </div>
            </div>

            <div className="field">
              <label>Contraseña</label>
              <div className="inp">
                <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" /></svg>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div className="field">
              <label>Empresa</label>
              <div className="sel">
                <select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <svg className="cv" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={busy} style={{ opacity: busy ? 0.6 : 1 }}>
              {busy ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>

          {uiMode === 'form' && (
            <>
              <div className="divider">o</div>
              <button className="btn btn-ghost" onClick={handlePasskeyManual} disabled={busy}>
                <svg viewBox="0 0 24 24" fill="none"><path d="M12 2a7 7 0 0 0-7 7c0 2.5 1.5 4.5 3 6v3a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-3c1.5-1.5 3-3.5 3-6a7 7 0 0 0-7-7Z" stroke="currentColor" strokeWidth="2" /><path d="M9 22h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                Iniciar con passkey
              </button>
            </>
          )}

          <div className="s1-foot">
            <svg viewBox="0 0 24 24" fill="none"><path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Conexión cifrada de extremo a extremo
          </div>
        </div>
      </div>
    </div>
  );
}