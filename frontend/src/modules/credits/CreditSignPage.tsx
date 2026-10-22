import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AddressBuilderModal } from '../../shared/components/AddressBuilderModal';
import { AppBar } from '../../shared/components/AppBar';
import { CreditStepper } from '../../shared/components/CreditStepper';
import { FormField } from '../../shared/components/FormField';
import { FormSummary } from '../../shared/components/FormSummary';
import { httpClient } from '../../shared/api/httpClient';
import { useTheme } from '../../shared/theme/ThemeContext';
import { useFieldErrors } from '../../shared/validation/useFieldErrors';
import { resumePath, statusMeta } from './creditStatus';

interface SignCredit {
  id: string;
  applicationNumber: string;
  nit?: string | null;
  approvedLimit: string;
  status: string;
  client?: {
    fullName: string;
    documentNumber: string;
    legalName?: string;
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?\d{7,15}$/;

const LABELS = {
  email: 'Correo electrónico',
  phone: 'Teléfono de contacto',
  address: 'Dirección',
  confirm: 'Confirmación para firmar',
};

export function CreditSignPage() {
  const { id } = useParams<{ id: string }>();
  const theme = useTheme();
  const navigate = useNavigate();
  const [credit, setCredit] = useState<SignCredit | null>(null);
  const [confirm, setConfirm] = useState(false);
  // Vacíos a propósito: el asesor los confirma con el cliente, no se precargan.
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [addrModal, setAddrModal] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    httpClient
      .get(`/credits/${id}`)
      .then((res) => setCredit(res.data))
      .catch((err: any) => setError(err?.response?.data?.message?.message || 'No se pudo cargar el crédito'));
  }, [id]);

  const fields = useFieldErrors({
    values: { email, phone, address, confirm },
    required: ['email', 'phone', 'address', 'confirm'],
    validate: (values) => ({
      email: values.email && EMAIL_RE.test(String(values.email).trim()) ? '' : 'Ingrese un correo válido',
      phone: values.phone && PHONE_RE.test(String(values.phone).replace(/[\s()-]/g, '')) ? '' : 'Entre 7 y 15 dígitos',
      address: values.address && String(values.address).trim().length >= 5 ? '' : 'Ingrese la dirección completa',
      confirm: values.confirm ? '' : 'Debe confirmar para enviar a firma',
    }),
  });

  const contactValid = fields.isValid;

  const sign = async () => {
    if (!id) return;
    fields.touchAll();
    if (!contactValid) return;
    setBusy(true);
    setError('');
    try {
      // Queda en pending_signatures hasta que el servicio externo confirme las firmas.
      await httpClient.post(`/credits/${id}/sign`, { email: email.trim(), phone, address: address.trim() });
      navigate(`/credits/success/${id}`, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message?.message || 'No se pudieron enviar los documentos a firma');
      setBusy(false);
    }
  };

  if (error && !credit) {
    return (
      <div className="s2 crflow">
        <AppBar title="Firma de documentos" subtitle="Paso 3 de 4" logo={theme.logoUrl || undefined} />
        <div className="body" style={{ paddingBottom: 24 }}>
          <div className="card" style={{ borderColor: '#f6caca', background: '#fdecec', color: '#c62828', fontSize: 12, fontWeight: 600 }}>
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!credit) {
    return (
      <div className="s2 crflow">
        <AppBar title="Firma de documentos" subtitle="Paso 3 de 4" logo={theme.logoUrl || undefined} />
        <div className="body" style={{ color: 'var(--muted)', fontSize: 13 }}>Cargando…</div>
      </div>
    );
  }

  const clientName = credit.client?.legalName || credit.client?.fullName;

  // Solo un crédito pre-aprobado se envía a firma. Si ya avanzó (o terminó),
  // se ofrece ir a donde corresponde según su estado.
  if (credit.status !== 'pre_approved') {
    const next = resumePath(credit.id, credit.status);
    return (
      <div className="s2 crflow">
        <AppBar title="Firma de documentos" subtitle="Paso 3 de 4" logo={theme.logoUrl || undefined} />
        <div className="body" style={{ paddingBottom: 24 }}>
          <CreditStepper current={3} />
          <div className="note">
            <p>
              Esta solicitud está en estado <strong>{statusMeta(credit.status).label}</strong>: los documentos solo
              se envían a firma cuando el crédito está pre-aprobado.
            </p>
          </div>
          <div className="rowbtn" style={{ marginTop: 16 }}>
            <button className="btn btn-ghost" onClick={() => navigate('/credits/list')}>Volver a la lista</button>
            {next && next !== `/credits/sign/${credit.id}` && (
              <button className="btn btn-primary" onClick={() => navigate(next)}>Continuar</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="s2 crflow">
      <AppBar title="Firma de documentos" subtitle="Paso 3 de 4" logo={theme.logoUrl || undefined} />
      <div className="body" style={{ paddingBottom: 24 }}>
        <CreditStepper current={3} />

        <div className="sectitle">Confirma los datos de contacto</div>

        <div className="card">
          <div className="stk"><div className="k">Cliente</div><div className="v">{clientName}</div></div>
          <div className="stk"><div className="k">NIT</div><div className="v">{credit.client?.documentNumber ?? credit.nit}</div></div>
          <div className="stk"><div className="k">Solicitud</div><div className="v">{credit.applicationNumber || '—'}</div></div>
          <div className="stk"><div className="k">Cupo pre-aprobado</div><div className="v" style={{ color: 'var(--green-deep)' }}>${Number(credit.approvedLimit).toLocaleString('es-CO')}</div></div>
        </div>

        <FormSummary
          pending={fields.pendingKeys.map((k) => ({ key: k, label: LABELS[k] }))}
          errors={fields.invalidKeys.map((k) => ({ key: k, label: LABELS[k], message: fields.errors[k] }))}
        />

        <FormField
          id="sign-email"
          label="Correo electrónico"
          required
          status={fields.status.email}
          error={fields.errors.email}
          help="Correo donde llegarán los documentos para firmar."
        >
          <input
            id="sign-email"
            className="inp"
            type="email"
            inputMode="email"
            autoComplete="off"
            placeholder="correo@cliente.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); fields.touch('email'); }}
            onBlur={() => fields.touch('email')}
          />
        </FormField>

        <FormField
          id="sign-phone"
          label="Teléfono de contacto"
          required
          status={fields.status.phone}
          error={fields.errors.phone}
          help="Celular o fijo de contacto."
        >
          <input
            id="sign-phone"
            className="inp"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            placeholder="Celular o fijo"
            value={phone}
            onChange={(e) => { setPhone(e.target.value.replace(/[^\d+\s()-]/g, '')); fields.touch('phone'); }}
            onBlur={() => fields.touch('phone')}
          />
        </FormField>

        <FormField
          id="sign-address"
          label="Dirección"
          required
          status={fields.status.address}
          error={fields.errors.address}
          help="Escriba la dirección o use el constructor."
        >
          <div className="inp-row inset">
            <input
              id="sign-address"
              className="inp"
              autoComplete="off"
              placeholder="Escriba la dirección o use el constructor"
              value={address}
              onChange={(e) => { setAddress(e.target.value); fields.touch('address'); }}
              onBlur={() => fields.touch('address')}
            />
            <button className="addr-btn" type="button" onClick={() => setAddrModal(true)} aria-label="Construir dirección">
              <svg viewBox="0 0 24 24" fill="none"><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="2" /></svg>
            </button>
          </div>
        </FormField>

        <div className="doc">
          <div className="di">
            <svg viewBox="0 0 24 24" fill="none"><path d="M5 4h9l5 5v11H5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M14 4v5h5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M8 15h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </div>
          <div className="dc">
            <div className="t">Pagaré + carta de instrucciones</div>
            <div className="st">Se firma en: <b>Plataforma de firma electrónica</b></div>
          </div>
          <button className="docbtn">Ver</button>
        </div>

        <FormField
          id="sign-confirm"
          label="Confirmación para firmar"
          required
          status={fields.status.confirm}
          error={fields.errors.confirm}
        >
          <div
            id="sign-confirm"
            tabIndex={-1}
            className={`check ${confirm ? 'on' : ''}`}
            onClick={() => { setConfirm((v) => !v); fields.touch('confirm'); }}
          >
            <span className="bx"><svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
            <p>Confirmo que la información de contacto es correcta y <span>acepto firmar</span> el pagaré y la carta de instrucciones.</p>
          </div>
        </FormField>

        {error && <p style={{ color: '#c62828', fontSize: 12, margin: '10px 2px' }}>{error}</p>}

        <div className="sp" />
        <div className="action-bar">
          <button className="btn btn-primary" disabled={!confirm || busy} onClick={sign} style={{ opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Enviando…' : 'Aceptar información y enviar a firma'}
            <svg viewBox="0 0 24 24" fill="none"><path d="M3 19c3-1 4-9 7-9s2 6 4 6 2-4 4-4 2 2 3 2" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
        <div className="bhelp">Los documentos se envían a la plataforma de firma electrónica; el crédito queda pendiente de firmas hasta su confirmación</div>
      </div>

      {addrModal && (
        <AddressBuilderModal
          onApply={(a) => {
            setAddress(a);
            setAddrModal(false);
          }}
          onClose={() => setAddrModal(false)}
        />
      )}
    </div>
  );
}
