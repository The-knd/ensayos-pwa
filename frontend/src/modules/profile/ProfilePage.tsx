import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { httpClient } from '../../shared/api/httpClient';
import { startRegistration } from '@simplewebauthn/browser';

interface Device {
  id: string;
  name: string;
  createdAt: string;
}

export function ProfilePage() {
  const { bootstrap, logout, exitCompany, isSuperAccount } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceName, setDeviceName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // Cambio de contraseña propio
  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' });
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdError, setPwdError] = useState('');

  const name = bootstrap?.user.name || '';
  const email = bootstrap?.user.email || '';
  const companyName = bootstrap?.company?.name || '';

  const loadDevices = () => {
    httpClient
      .get('/auth/passkeys')
      .then((res) => setDevices(res.data || []))
      .catch(() => setDevices([]));
  };

  useEffect(loadDevices, []);

  const registerDevice = async () => {
    setBusy(true);
    setMsg('');
    setError('');
    try {
      const optionsRes = await httpClient.post('/auth/passkeys/register/options', {});
      const options = optionsRes.data;
      console.info('[passkey:register] options recibidas', {
        challenge: options?.challenge?.slice(-8),
        rp: { name: options?.rp?.name, id: options?.rp?.id },
        user: { name: options?.user?.name },
        origin: window.location.origin,
      });
      if (!window.location.origin.includes(options?.rp?.id)) {
        console.warn('[passkey:register] MISMATCH rpID/origen', {
          origin: window.location.origin,
          rpId: options?.rp?.id,
        });
      }
      const credential = await startRegistration(options);
      console.info('[passkey:register] credential obtenida', {
        id: credential?.id?.slice(-8),
        type: credential?.type,
        transports: credential?.response?.transports,
      });
      await httpClient.post('/auth/passkeys/register/verify', {
        response: credential,
        deviceName: deviceName || 'Dispositivo principal',
      });
      setMsg('Dispositivo registrado correctamente.');
      setDeviceName('');
      loadDevices();
    } catch (err: any) {
      console.error('[passkey:register] fallo', {
        name: err?.name,
        message: err?.message,
        code: err?.code,
        server: err?.response?.data,
        stack: err?.stack,
      });
      if (err?.name === 'NotAllowedError') {
        setError('Se canceló el registro del dispositivo.');
      } else {
        const serverMsg = err?.response?.data?.message;
        const detail = typeof serverMsg === 'object' && serverMsg !== null ? serverMsg?.message : serverMsg;
        setError(detail || err?.message || 'No se pudo registrar el dispositivo');
      }
    } finally {
      setBusy(false);
    }
  };

  const removeDevice = async (id: string) => {
    if (!window.confirm('¿Eliminar este dispositivo? Ya no podrás iniciar sesión con él.')) return;
    try {
      await httpClient.delete(`/auth/passkeys/${id}`);
      loadDevices();
    } catch {
      setError('No se pudo eliminar el dispositivo');
    }
  };

  const changePassword = async () => {
    setPwdMsg('');
    setPwdError('');
    if (pwdForm.next.length < 8) {
      setPwdError('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (pwdForm.next !== pwdForm.confirm) {
      setPwdError('Las contraseñas nuevas no coinciden');
      return;
    }
    if (pwdForm.next === pwdForm.current) {
      setPwdError('La nueva contraseña debe ser distinta a la actual');
      return;
    }
    setPwdBusy(true);
    try {
      await httpClient.patch('/auth/password', {
        currentPassword: pwdForm.current,
        newPassword: pwdForm.next,
      });
      setPwdMsg('Contraseña actualizada correctamente.');
      setPwdForm({ current: '', next: '', confirm: '' });
    } catch (err: any) {
      setPwdError(err?.response?.data?.message?.message || err?.response?.data?.message || 'No se pudo cambiar la contraseña');
    } finally {
      setPwdBusy(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-head">
        <div className="profile-avatar">👤</div>
        <h2>{name}</h2>
        <p className="profile-email">{email}</p>
      </div>

      <div className="profile-body">
        <div className="info-card">
          <div className="info-row">
            <span className="info-label">Email</span>
            <span className="info-value">{email}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Empresa</span>
            <span className="info-value">{companyName || '—'}</span>
          </div>
          <div className="info-row" style={{ borderBottom: 0 }}>
            <span className="info-label">Cuenta</span>
            <span className="info-value">Vinculada</span>
          </div>
        </div>

        <div className="bio-notice">
          <div className="bio-notice-icon">🔐</div>
          <div>
            <strong>Autenticación biométrica disponible</strong>
            <p>Registra una huella, rostro o llave de seguridad para iniciar sesión sin contraseña.</p>
          </div>
        </div>

        <h3 className="section-title">Cambiar contraseña</h3>
        <div className="info-card" style={{ padding: 16 }}>
          <div className="field">
            <label>Contraseña actual</label>
            <input
              className="inp"
              type="password"
              value={pwdForm.current}
              onChange={(e) => setPwdForm({ ...pwdForm, current: e.target.value })}
              placeholder="Tu contraseña actual"
            />
          </div>
          <div className="field">
            <label>Nueva contraseña</label>
            <input
              className="inp"
              type="password"
              value={pwdForm.next}
              onChange={(e) => setPwdForm({ ...pwdForm, next: e.target.value })}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div className="field">
            <label>Confirmar nueva contraseña</label>
            <input
              className="inp"
              type="password"
              value={pwdForm.confirm}
              onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })}
              placeholder="Repetir nueva contraseña"
            />
          </div>
          {pwdMsg && (
            <div className="error-msg" style={{ background: 'var(--green-soft)', color: 'var(--green-deep)', borderColor: 'rgba(62,155,97,0.2)' }}>
              {pwdMsg}
            </div>
          )}
          {pwdError && <div className="error-msg">{pwdError}</div>}
          <button
            className="btn btn-primary"
            onClick={changePassword}
            disabled={pwdBusy}
            style={{ opacity: pwdBusy ? 0.6 : 1, marginTop: 8 }}
          >
            {pwdBusy ? 'Guardando…' : 'Actualizar contraseña'}
          </button>
        </div>

        <h3 className="section-title">Dispositivos</h3>
        {devices.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📱</span>
            <p>No tienes dispositivos registrados</p>
          </div>
        ) : (
          <div className="info-card" style={{ padding: '10px 14px' }}>
            {devices.map((d) => (
              <div key={d.id} className="info-row" style={{ gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--faint)' }}>
                    {new Date(d.createdAt).toLocaleDateString('es-CO')}
                  </div>
                </div>
                <button
                  onClick={() => removeDevice(d.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'var(--body)',
                  }}
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="field" style={{ marginTop: 12 }}>
          <label>Nombre del dispositivo</label>
          <input
            className="inp"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder="Ej: iPhone de Juan"
          />
        </div>

        <button className="btn btn-primary" onClick={registerDevice} disabled={busy} style={{ opacity: busy ? 0.6 : 1 }}>
          {busy ? 'Registrando…' : 'Registrar dispositivo'}
        </button>

        {msg && <div className="error-msg" style={{ background: 'var(--green-soft)', color: 'var(--green-deep)', borderColor: 'rgba(62,155,97,0.2)', marginTop: 12 }}>{msg}</div>}
        {error && <div className="error-msg" style={{ marginTop: 12 }}>{error}</div>}

        {isSuperAccount && (
          <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => exitCompany()}>
            Volver al selector de empresas
          </button>
        )}
        <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={logout}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}