import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AppBar } from '../../shared/components/AppBar';
import { CreditStepper } from '../../shared/components/CreditStepper';
import { CurrencyInput } from '../../shared/components/CurrencyInput';
import { FormField } from '../../shared/components/FormField';
import { FormSummary } from '../../shared/components/FormSummary';
import { Modal } from '../../shared/components/Modal';
import { ScaleInput } from '../../shared/components/ScaleInput';
import { SignatureFullscreen, SignaturePad, useIsPhone } from '../../shared/components/SignaturePad';
import { httpClient } from '../../shared/api/httpClient';
import { getApiError } from '../../shared/api/apiError';
import { useTheme } from '../../shared/theme/ThemeContext';
import { formatMoney, sanitizeMoneyInput } from '../../shared/utils/format';
import { useFieldErrors } from '../../shared/validation/useFieldErrors';
import { documentForNewClient, idLabel, sanitizeNitInput, validateNit } from '../../shared/utils/validators';
import { CONSENT_UI_MODE } from './consentUiMode';

type PersonType = 'natural' | 'juridica';

/**
 * Sub-pasos del paso 1. Viven en la URL (?paso=identificacion) para que el
 * "atrás" del navegador o del móvil vuelva de 1b a 1a sin desmontar la página:
 * las respuestas se conservan en memoria. Recargar la página las pierde.
 */
const SUB_STEP_PARAM = 'paso';
const IDENTIFICATION = 'identificacion';
const CONFIRMATION = 'confirmacion';

const LABELS_1A = {
  yearsExperience: 'Años de experiencia',
  opportunityValue: 'Valor de la oportunidad',
  reliabilityScore: 'Confiabilidad',
};

const LABELS_1B = {
  nit: 'Número de identificación',
  nitConfirm: 'Confirmación del número',
  signature: 'Autorización de datos',
};

/** Respuesta de POST /credits/study/preview: lo que se enviará a Saman, sin crear nada. */
interface StudyPreview {
  simulated: boolean;
  endpoint: string;
  request: { tipo: string; empresa: string; identificacion: string; externas: boolean };
  /** clientId: el cliente que quedará vinculado; null si el documento no está registrado. */
  credit: { clientId: string | null };
}
/** ?desde=<id>: "Corregir y crear de nuevo" rellena el formulario con un borrador anterior. */
const FROM_PARAM = 'desde';

interface ClientLookup {
  id: string;
  fullName: string;
  documentNumber: string;
  documentType?: string;
  personType?: PersonType;
  legalName?: string;
  commercialName?: string;
  city?: string;
}

export function CreditStudyPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { moduleContexts } = useAuth();
  const theme = useTheme();
  const [personType, setPersonType] = useState<PersonType>('natural');
  const [nit, setNit] = useState('');
  const [nitConfirm, setNitConfirm] = useState('');
  const [results, setResults] = useState<ClientLookup[]>([]);
  const [client, setClient] = useState<ClientLookup | null>(null);
  const [searching, setSearching] = useState(false);
  // La autorización ya no es un booleano: sin firma no hay consentimiento, y el
  // backend deriva consent_data de que esta data URL exista.
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [showConsent, setShowConsent] = useState(false);
  // En teléfono el check abre la firma a pantalla completa y en horizontal,
  // sea cual sea CONSENT_UI_MODE.
  const isPhone = useIsPhone();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [yearsExperience, setYearsExperience] = useState('');
  const [opportunityValue, setOpportunityValue] = useState('');
  const [reliabilityScore, setReliabilityScore] = useState<number | null>(null);
  const [preview, setPreview] = useState<StudyPreview | null>(null);

  const step1a = useFieldErrors({
    values: { yearsExperience, opportunityValue, reliabilityScore },
    required: ['yearsExperience', 'opportunityValue', 'reliabilityScore'],
    validate: (values) => ({
      yearsExperience:
        values.yearsExperience && Number(values.yearsExperience) > 0
          ? ''
          : values.yearsExperience
            ? 'Debe ser mayor a 0'
            : '',
      opportunityValue:
        values.opportunityValue && Number(values.opportunityValue) > 0
          ? ''
          : values.opportunityValue
            ? 'Debe ser mayor a 0'
            : '',
      reliabilityScore: values.reliabilityScore != null ? '' : '',
    }),
  });

  const step1b = useFieldErrors({
    values: { nit, nitConfirm, signature: signatureData },
    required: ['nit', 'nitConfirm', 'signature'],
    validate: (values) => {
      const errors = { nit: '', nitConfirm: '', signature: '' } as Record<'nit' | 'nitConfirm' | 'signature', string>;
      if (values.nit) {
        const check = validateNit(String(values.nit), client?.documentNumber, personType);
        if (!check.ok) errors.nit = check.error;
      }
      if (values.nitConfirm && String(values.nitConfirm) !== String(values.nit)) {
        errors.nitConfirm = `La confirmación no coincide con el ${idLabel(personType)}.`;
      }
      return errors;
    },
  });

  const canCreateClient = moduleContexts['clients']?.permissions.includes('clients.create') ?? false;

  // El NIT se digita completo, con DV y sin '-' (solo dígitos).
  const digits = nit;
  const nitCheck = validateNit(nit, client?.documentNumber, personType);
  const confirmMatches = digits.length > 0 && nitConfirm === digits;
  // Sin cliente registrado también se puede estudiar: basta con el documento
  // válido y confirmado (el cliente se registra antes de firmar, en el paso 3).
  const documentConfirmed = nitCheck.ok && confirmMatches;

  // "Corregir y crear de nuevo": respuestas, tipo de persona y NIT del borrador
  // anterior. La firma de autorización no se copia: el cliente firma otra vez.
  const prefilledFrom = useRef<string | null>(null);
  const fromId = searchParams.get(FROM_PARAM);
  useEffect(() => {
    if (!fromId || prefilledFrom.current === fromId) return;
    prefilledFrom.current = fromId;
    httpClient
      .get(`/credits/${fromId}`)
      .then(({ data }) => {
        setPersonType(data.personType === 'juridica' ? 'juridica' : 'natural');
        if (data.yearsExperience != null) setYearsExperience(String(data.yearsExperience));
        if (data.opportunityValue != null) setOpportunityValue(sanitizeMoneyInput(String(data.opportunityValue)));
        if (data.reliabilityScore != null) setReliabilityScore(Number(data.reliabilityScore));
        if (data.nit) setNit(sanitizeNitInput(data.nit));
      })
      .catch(() => setError('No se pudieron cargar los datos de la solicitud anterior'));
  }, [fromId]);

  // Jurídica (NIT) y natural (cédula + DV) se validan distinto: al cambiar de
  // tipo se empieza de cero para no arrastrar el número ni el cliente del otro caso.
  const changePersonType = (next: PersonType) => {
    if (next === personType) return;
    setPersonType(next);
    setNit('');
    setNitConfirm('');
    step1b.resetTouched();
    setClient(null);
  };
  const juridica = personType === 'juridica';
  const idName = idLabel(personType);

  useEffect(() => {
    if (digits.length >= 3) {
      setSearching(true);
      setError('');
      setResults([]);
      httpClient
        .get('/clients', { params: { limit: 500 } })
        .then((res) => {
          const list: ClientLookup[] = res.data[0] || [];
          setResults(
            list.filter(
              (c) =>
                // Se digita tal como está guardado: NIT completo (jurídica) o cédula (natural).
                c.documentNumber.includes(digits) &&
                (c.personType ?? 'natural') === personType,
            ),
          );
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
  }, [digits, personType]);

  const selectClient = (c: ClientLookup) => {
    setClient(c);
    setError('');
  };

  const goCreateClient = () => navigate(`/clients/new?nit=${documentForNewClient(digits)}`);

  const studyPayload = () => ({
    clientId: client?.id,
    // Completo, con DV y sin '-'. El guion que espera Saman lo agrega el backend.
    nit,
    nitConfirm,
    personType,
    yearsExperience: Number(yearsExperience),
    opportunityValue: Number(opportunityValue),
    reliabilityScore,
    consentSignature: signatureData,
  });

  /**
   * Fallo al hablar con el estudio: un 4xx (validación) se corrige en el
   * formulario; un 5xx o una caída de red no dependen del asesor, así que se
   * vuelve al home con el aviso de reintento (CreditsHomePage). Devuelve `true`
   * si se navegó, para no dejar el botón en "enviando" sobre una pantalla que
   * se desmonta. Aplica igual a la vista previa (1b) y al envío (1c).
   */
  const handleStudyError = (err: unknown, fallback: string): boolean => {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status && status >= 400 && status < 500) {
      setError(getApiError(err)?.message || fallback);
      return false;
    }
    navigate('/credits', { replace: true, state: { estudioError: true } });
    return true;
  };

  /** 1b → 1c: valida en el front, pide al backend la petición que se enviará a Saman y la muestra. */
  const goToConfirmation = async () => {
    setError('');
    step1b.touchAll();
    if (!step1b.isValid) return;
    setSubmitting(true);
    try {
      const res = await httpClient.post('/credits/study/preview', studyPayload());
      setPreview(res.data);
      setSearchParams({ [SUB_STEP_PARAM]: CONFIRMATION });
      setSubmitting(false);
    } catch (err) {
      if (!handleStudyError(err, 'No se pudo validar la solicitud')) setSubmitting(false);
    }
  };

  /** 1c: lo envía a Saman; si el envío falla no hay borrador y se vuelve al home. */
  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const res = await httpClient.post('/credits/study', studyPayload());
      // El crédito queda en borrador y el algoritmo lo evalúa: la pantalla de
      // resultado consulta su veredicto. replace: volver atrás no debe reabrir
      // un formulario ya enviado.
      navigate(`/credits/result/${res.data.id}`, { replace: true });
    } catch (err) {
      if (!handleStudyError(err, 'No se pudo enviar la solicitud')) setSubmitting(false);
    }
  };

  const logo = theme.logoUrl || undefined;
  const consentSigned = !!signatureData;
  const clientReady = step1b.isValid;

  const opportunity = Number(opportunityValue);
  const answersReady = step1a.isValid;
  const subStep = searchParams.get(SUB_STEP_PARAM);
  const onIdentification = subStep === IDENTIFICATION;
  const onConfirmation = subStep === CONFIRMATION;

  // Entrar directo a 1b/1c (recarga, enlace) sin lo que vive en memoria: se
  // vuelve al sub-paso donde se captura.
  useEffect(() => {
    if ((onIdentification || onConfirmation) && !answersReady) setSearchParams({}, { replace: true });
    else if (onConfirmation && !preview) setSearchParams({ [SUB_STEP_PARAM]: IDENTIFICATION }, { replace: true });
  }, [onIdentification, onConfirmation, answersReady, preview, setSearchParams]);

  // Cualquier cambio en los datos deja la vista previa desactualizada: se vuelve a pedir al revisar.
  useEffect(() => {
    setPreview(null);
  }, [client, nit, nitConfirm, personType, signatureData, yearsExperience, opportunityValue, reliabilityScore]);

  const goToIdentification = () => {
    step1a.touchAll();
    if (step1a.isValid) {
      setSearchParams({ [SUB_STEP_PARAM]: IDENTIFICATION });
    }
  };

  const checkMark = (
    <span className="bx">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
  const consentCopy = (
    <p>
      Acepto la <span>política de tratamiento de datos personales</span> y autorizo la consulta en
      centrales de riesgo.
    </p>
  );

  // Las dos variantes de UI comparten el mismo estado: solo cambia dónde se
  // despliega el pad y cómo se abre (ver consentUiMode.ts).
  const consentCard = (
    <FormField
      id="credit-signature"
      label="Autorización de datos"
      required
      status={step1b.status.signature}
      error={step1b.errors.signature}
      help="El cliente debe firmar para autorizar la consulta en centrales de riesgo."
    >
      {CONSENT_UI_MODE === 'modal' || isPhone ? (
        <div
          id="credit-signature"
          tabIndex={-1}
          className={`check ${consentSigned ? 'on' : ''}`}
          onClick={() => setShowConsent(true)}
          style={{ flex: 'none' }}
        >
          {checkMark}
          {consentCopy}
          {consentSigned && <img className="sigthumb" src={signatureData as string} alt="Firma registrada" />}
        </div>
      ) : (
        <div id="credit-signature" tabIndex={-1}>
          <div className={`check ${consentSigned ? 'on' : ''}`} onClick={() => setShowConsent((v) => !v)}>
            {checkMark}
            {consentCopy}
          </div>
          {showConsent && <SignaturePad onChange={(data) => { setSignatureData(data); step1b.touch('signature'); }} />}
          {consentSigned && <img className="sigthumb" src={signatureData as string} alt="Firma registrada" />}
        </div>
      )}
    </FormField>
  );

  const consentSection = (
    <>
      <div className="attnote">
        <svg viewBox="0 0 24 24" fill="none"><path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
        <p>Antes de correr el algoritmo, el cliente debe autorizar el tratamiento de sus datos personales.</p>
      </div>

      {/* Variante 'inline': el pad vive en el cuerpo, bajo la nota. */}
      {CONSENT_UI_MODE === 'inline' && consentCard}
    </>
  );

  const part = onConfirmation ? 3 : onIdentification ? 2 : 1;
  const subSteps = (
    <div className="substeps" aria-label={`Paso 1, parte ${part} de 3`}>
      <span className={part > 1 ? 'done' : 'on'}>1. Evaluación</span>
      <span className={part > 2 ? 'done' : part === 2 ? 'on' : ''}>2. Identificación</span>
      <span className={part === 3 ? 'on' : ''}>3. Confirmación</span>
    </div>
  );

  if (onConfirmation && preview) {
    const req = preview.request;
    return (
      <div className="s2 flow crflow">
        <AppBar title="Estudio de crédito" subtitle="Paso 1 de 4 · Confirmación" logo={logo} />
        <div className="body credit-body">
          <CreditStepper current={1} />
          {subSteps}

          <div className="sectitle">Revisa la solicitud antes de enviarla a estudio</div>

          {preview.simulated && (
            <div className="note" style={{ marginBottom: 13 }}>
              <p>
                <strong>Modo simulado:</strong> SAMAN_API_URL no está configurada; el resultado será simulado y no se
                consultará Saman.
              </p>
            </div>
          )}

          <div className="card">
            <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.1em', color: 'var(--faint)', marginBottom: 9 }}>
              SE ENVIARÁ AL SERVICIO DE ESTUDIO (SAMAN) · {preview.endpoint}
            </div>
            <div className="stk"><div className="k">tipo</div><div className="v">{req.tipo}</div></div>
            <div className="stk"><div className="k">empresa</div><div className="v">{req.empresa || '— (SAMAN_EMPRESA vacía)'}</div></div>
            <div className="stk"><div className="k">identificacion</div><div className="v">{req.identificacion}</div></div>
            <div className="stk"><div className="k">externas</div><div className="v">{req.externas ? 'sí (true)' : 'no (false)'}</div></div>
            <details style={{ marginTop: 10 }}>
              <summary style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--accent)', cursor: 'pointer' }}>Ver JSON exacto</summary>
              <pre className="json-preview">{JSON.stringify(req, null, 2)}</pre>
            </details>
          </div>

          <div className="card">
            <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.1em', color: 'var(--faint)', marginBottom: 9 }}>
              SE REGISTRARÁ EN LA SOLICITUD
            </div>
            <div className="stk">
              <div className="k">Cliente</div>
              <div className="v">
                {client
                  ? client.legalName || client.fullName
                  : preview.credit.clientId
                    ? `Registrado con ${idName} ${nit}`
                    : `Sin cliente registrado (${idName} ${nit})`}{' '}
                · {personType === 'juridica' ? 'persona jurídica' : 'persona natural'}
              </div>
            </div>
            <div className="stk"><div className="k">Evaluación comercial</div><div className="v">{yearsExperience} años · {formatMoney(opportunity)} · confiabilidad {reliabilityScore}/5</div></div>
            <div className="stk"><div className="k">Autorización de datos</div><div className="v" style={{ color: 'var(--green-deep)' }}>Firmada ✓</div></div>
          </div>

          {error && <p style={{ color: '#c62828', fontSize: 12, margin: '10px 2px' }}>{error}</p>}
        </div>

        <div className="action-bar credit-actions">
          <div className="credit-form-actions">
            <div className="rowbtn">
              <button className="btn btn-ghost" disabled={submitting} onClick={() => navigate(-1)}>
                Volver y corregir
              </button>
              <button className="btn btn-primary" disabled={submitting} onClick={handleSubmit}>
                {submitting ? 'Enviando…' : 'Confirmar y enviar a estudio'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!onIdentification && !onConfirmation) {
    return (
      <div className="s2 flow crflow">
        <AppBar title="Estudio de crédito" subtitle="Paso 1 de 4 · Evaluación" logo={logo} />
        <div className="body credit-body">
          <CreditStepper current={1} />
          {subSteps}

          <div className="sectitle">Evaluación comercial</div>

          <FormSummary
            pending={step1a.pendingKeys.map((k) => ({ key: k, label: LABELS_1A[k] }))}
            errors={step1a.invalidKeys.map((k) => ({ key: k, label: LABELS_1A[k], message: step1a.errors[k] }))}
          />

          <FormField
            id="credit-years-experience"
            label="¿Cuántos años de experiencia tiene en el mercado?"
            required
            status={step1a.status.yearsExperience}
            error={step1a.errors.yearsExperience}
            help="Mide la trayectoria del negocio."
          >
            <input
              id="credit-years-experience"
              className="inp"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={yearsExperience}
              onChange={(e) => {
                setYearsExperience(e.target.value.replace(/[^0-9]/g, ''));
                step1a.touch('yearsExperience');
              }}
              onBlur={() => step1a.touch('yearsExperience')}
              placeholder="Ej. 8"
              aria-describedby="credit-years-experience-help"
            />
          </FormField>

          <FormField
            id="credit-opportunity-value"
            label="¿Cuál es el valor de la oportunidad que ve en el cliente?"
            required
            status={step1a.status.opportunityValue}
            error={step1a.errors.opportunityValue}
            help="Monto en pesos. Puedes escribir centavos."
          >
            <CurrencyInput
              id="credit-opportunity-value"
              value={opportunityValue}
              onChange={(raw) => {
                setOpportunityValue(raw);
                step1a.touch('opportunityValue');
              }}
              onBlur={() => step1a.touch('opportunityValue')}
              placeholder="Ej. 5.000.000"
            />
          </FormField>

          <FormField
            id="credit-reliability-score"
            label="De 1 a 5, ¿qué tan confiable le parece este crédito?"
            required
            status={step1a.status.reliabilityScore}
            error={step1a.errors.reliabilityScore}
            help="1 = no va a pagar, 5 = va a pagar. Registra el juicio del asesor que conoce al cliente."
          >
            <ScaleInput
              id="credit-reliability-score"
              value={reliabilityScore}
              onChange={(v) => {
                setReliabilityScore(v);
                step1a.touch('reliabilityScore');
              }}
              lowLabel="1 · No va a pagar"
              highLabel="5 · Va a pagar"
              ariaLabel="Qué tan confiable le parece este crédito"
            />
          </FormField>
        </div>

        <div className="action-bar credit-actions">
          <div className="credit-form-actions">
            <button className="btn btn-primary" disabled={!answersReady} onClick={goToIdentification}>
              Continuar
              <svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div className="bhelp">
              {step1a.pendingKeys.length > 0
                ? `Faltan ${step1a.pendingKeys.length} pregunta${step1a.pendingKeys.length === 1 ? '' : 's'}`
                : step1a.invalidKeys.length > 0
                  ? 'Corrige los errores para continuar'
                  : 'Listo para continuar'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="s2 flow crflow">
      <AppBar title="Estudio de crédito" subtitle="Paso 1 de 4 · Identificación" logo={logo} />
      <div className="body credit-body">
        <CreditStepper current={1} />
        {subSteps}

        <div className="sectitle">Identificación del cliente</div>

        <FormSummary
          pending={step1b.pendingKeys.map((k) => ({ key: k, label: LABELS_1B[k] }))}
          errors={step1b.invalidKeys.map((k) => ({ key: k, label: LABELS_1B[k], message: step1b.errors[k] }))}
        />

        <FormField label="Tipo de persona" help="Determina si se buscan cédulas o NITs en el registro de clientes.">
          <div className="radio-group">
            <label className="radio">
              <input
                type="radio"
                name="creditPersonType"
                checked={personType === 'natural'}
                onChange={() => changePersonType('natural')}
              />
              <span>Natural</span>
            </label>
            <label className="radio">
              <input
                type="radio"
                name="creditPersonType"
                checked={personType === 'juridica'}
                onChange={() => changePersonType('juridica')}
              />
              <span>Jurídica</span>
            </label>
          </div>
        </FormField>

        <FormField
          id="credit-nit"
          label={
            <>
              {juridica ? "NIT (completo, con DV, sin '-')" : "Número de identificación (sin DV ni '-')"}{' '}
              <span style={{ color: 'var(--faint)', fontWeight: 600 }}>
                {digits.length < 3 ? 'Digita 3+ dígitos' : searching ? 'Consultando…' : client ? 'Encontrado' : results.length > 0 ? `${results.length} coincidencia(s)` : 'Sin registro'}
              </span>
            </>
          }
          required
          status={step1b.status.nit}
          error={step1b.errors.nit}
          help={
            personType === 'juridica'
              ? "NIT completo, con su dígito de verificación (DV) al final y sin '-'. La búsqueda inicia desde los 3 dígitos."
              : "Número de cédula del cliente, solo dígitos: sin DV ni '-'. La búsqueda inicia desde los 3 dígitos."
          }
        >
          <input
            id="credit-nit"
            className="inp"
            inputMode="numeric"
            maxLength={17}
            value={nit}
            onChange={(e) => {
              setNit(sanitizeNitInput(e.target.value));
              step1b.touch('nit');
            }}
            onBlur={() => step1b.touch('nit')}
            placeholder={juridica ? 'Ej. 9014902765' : 'Ej. 11276427'}
          />
        </FormField>

        <FormField
          id="credit-nit-confirm"
          label={juridica ? 'Confirmación de NIT' : 'Confirmación del número de identificación'}
          required
          status={step1b.status.nitConfirm}
          error={step1b.errors.nitConfirm}
          help={
            juridica
              ? "Repite el NIT completo, con DV y sin '-', para confirmar que no hay errores de digitación."
              : "Repite el número de identificación, sin DV ni '-', para confirmar que no hay errores de digitación."
          }
        >
          <input
            id="credit-nit-confirm"
            className="inp"
            inputMode="numeric"
            maxLength={17}
            value={nitConfirm}
            onChange={(e) => {
              setNitConfirm(sanitizeNitInput(e.target.value));
              step1b.touch('nitConfirm');
            }}
            onBlur={() => step1b.touch('nitConfirm')}
            placeholder={juridica ? 'Ej. 9014902765' : 'Ej. 11276427'}
          />
        </FormField>

        {digits.length < 3 && (
          <div className="empty" style={{ background: '#fff', border: '1.5px dashed #dbe4ef', borderRadius: 16, textAlign: 'center', padding: '26px 16px', marginBottom: 13 }}>
            <svg viewBox="0 0 24 24" fill="none" width="30" height="30" color="#c3cede"><path d="M4 20V9l8-5 8 5v11" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M9 20v-6h6v6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
            <div>Esperando el {idName} para consultar los datos del cliente</div>
          </div>
        )}

        {digits.length >= 3 && searching && (
          <p style={{ color: 'var(--muted)', fontSize: 12, padding: '15px 3px' }}>Consultando…</p>
        )}

        {digits.length >= 3 && !searching && !client && results.length > 0 && (
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
              <div className="stk"><div className="k">{juridica ? 'Razón social' : 'Nombre'}</div><div className="v">{client.legalName || client.fullName}</div></div>
              <div className="stk"><div className="k">Tipo de persona</div><div className="v">{personType === 'juridica' ? 'Jurídica' : 'Natural'}</div></div>
              <div className="stk"><div className="k">{juridica ? 'NIT' : 'Cédula'}</div><div className="v">{client.documentNumber}</div></div>
              {client.city && <div className="stk"><div className="k">Ciudad</div><div className="v">{client.city}</div></div>}
              <button className="btn btn-ghost" style={{ marginTop: 12, height: 44 }} onClick={() => { setClient(null); setNit(''); setNitConfirm(''); }}>
                Cambiar cliente
              </button>
            </div>

            {consentSection}
          </>
        )}

        {digits.length >= 3 && !searching && !client && results.length === 0 && (
          <div className="card" style={{ textAlign: 'center', borderColor: '#f3dfb0', background: '#fff8e8' }}>
            <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.1em', color: '#8a5a00', marginBottom: 9 }}>CLIENTE NO REGISTRADO</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>No existe un cliente registrado que coincida con {nit}.</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
              Puedes hacer el estudio igual si confirmas el {idName}. El cliente debe quedar registrado antes de enviar los
              documentos a firma.
            </div>
            {canCreateClient ? (
              <button className="btn btn-ghost" style={{ marginTop: 14 }} onClick={goCreateClient}>
                Crear cliente <svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
              </button>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
                No tienes permisos para crear clientes. Solicita al administrador que lo registre.
              </div>
            )}
          </div>
        )}

        {!client && !searching && documentConfirmed && consentSection}

        {error && <p style={{ color: '#c62828', fontSize: 12, margin: '10px 2px' }}>{error}</p>}
      </div>

      {/* Variante 'modal': el check del pie abre el pad en un modal. */}
      {CONSENT_UI_MODE === 'modal' && consentCard}

      <div className="action-bar credit-actions">
        <div className="credit-form-actions">
          <button className="btn btn-primary" disabled={!clientReady || submitting} onClick={goToConfirmation}>
            {submitting ? 'Validando…' : 'Revisar solicitud'}
            <svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <div className="bhelp">
            {step1b.pendingKeys.length > 0
              ? `Faltan ${step1b.pendingKeys.length} dato${step1b.pendingKeys.length === 1 ? '' : 's'} para continuar`
              : step1b.invalidKeys.length > 0
                ? 'Corrige los errores para continuar'
                : `Se habilita al validar el ${idName}, confirmarlo y firmar la autorización de datos.`}
          </div>
        </div>
      </div>

      {isPhone && (
        <SignatureFullscreen
          open={showConsent}
          title="Autorización de datos personales"
          confirmLabel="Confirmar autorización"
          onCancel={() => setShowConsent(false)}
          onConfirm={(data) => {
            setSignatureData(data);
            setShowConsent(false);
            step1b.touch('signature');
          }}
        >
          El cliente autoriza a la empresa a tratar sus datos personales y a consultar centrales de riesgo. La
          firma queda archivada como documento del expediente.
        </SignatureFullscreen>
      )}

      {CONSENT_UI_MODE === 'modal' && !isPhone && (
        <Modal open={showConsent} onClose={() => setShowConsent(false)}>
          <div className="sectitle">Autorización de datos personales</div>
          <div className="note" style={{ marginBottom: 13 }}>
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
            <p>
              El cliente autoriza a la empresa a tratar sus datos personales y a consultar centrales de
              riesgo. La firma queda archivada como documento del expediente.
            </p>
          </div>
          <SignaturePad onChange={(data) => { setSignatureData(data); step1b.touch('signature'); }} />
          {consentSigned && (
            <img className="sigthumb" src={signatureData as string} alt="Firma registrada" />
          )}
          <div className="action-bar stacked" style={{ position: 'static', boxShadow: 'none', padding: 0 }}>
            <button
              className="btn btn-primary"
              disabled={!consentSigned}
              onClick={() => setShowConsent(false)}
            >
              {consentSigned ? 'Confirmar autorización' : 'Firme para autorizar'}
              <svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
}
