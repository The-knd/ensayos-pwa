import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { httpClient } from '../../shared/api/httpClient';
import { useBackTarget } from '../../shared/layout/TopBarContext';
import { canCancel, resumePath, statusMeta } from './creditStatus';

interface CreditClient {
  fullName: string;
  legalName?: string | null;
  documentNumber?: string | null;
}

interface Credit {
  id: string;
  clientId: string | null;
  nit?: string | null;
  applicationNumber?: string | null;
  approvedLimit: string | null;
  status: string;
  client?: CreditClient | null;
  algorithmResult?: { error?: { type: string; streak?: number } | null } | null;
}

const LIMIT = 20;

/** Errores de Saman que el asesor debe ver en la lista (el transitorio se reintenta solo). */
const ALGORITHM_ERROR_LABEL: Record<string, { text: string; color: string }> = {
  definitive: { text: 'Error de validación', color: '#b00020' },
  failed: { text: 'Estudio fallido', color: '#8a6d00' },
  auth: { text: 'Servicio no disponible', color: '#8a6d00' },
  offline: { text: 'Sin conexión con Saman', color: '#8a6d00' },
};

/** Cupo de la tarjeta: el aprobado; en borrador aún se evalúa; rechazado/cancelado no tiene. */
function approvedLimitText(c: Credit): string {
  if (c.approvedLimit != null && !['rejected', 'cancelled'].includes(c.status)) {
    return `$${Number(c.approvedLimit).toLocaleString('es-CO')}`;
  }
  return c.status === 'draft' ? 'En evaluación' : '—';
}

/** Un error de red aislado se reintenta solo; desde 3 seguidos se avisa "sin conexión". */
const algorithmErrorKey = (error?: { type: string; streak?: number } | null) =>
  error?.type === 'transient' ? ((error.streak ?? 1) >= 3 ? 'offline' : '') : (error?.type ?? '');

/** Marca en el texto las partes que coincidan con la búsqueda. */
function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const term = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${term})`, 'ig'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark
            key={i}
            style={{
              background: 'rgba(var(--accent-rgb), 0.18)',
              color: 'var(--ink)',
              borderRadius: 3,
              padding: '0 2px',
            }}
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export function CreditsListPage() {
  const { moduleContexts, loadModuleContext } = useAuth();
  const navigate = useNavigate();
  useBackTarget('/credits');

  const [query, setQuery] = useState('');
  // `state` agrupa q y page para evitar requests con page obsoleto cuando cambia el término.
  const [state, setState] = useState({ q: '', page: 1 });
  const [rows, setRows] = useState<Credit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);

  const ctx = moduleContexts['credits'];

  // Carga del contexto del módulo (permisos).
  useEffect(() => {
    loadModuleContext('credits').then(() => setInitialLoading(false));
    setInitialLoading(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce del input de búsqueda.
  useEffect(() => {
    const t = setTimeout(() => setState({ q: query.trim(), page: 1 }), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Fetch paginado.
  useEffect(() => {
    if (!ctx) return;
    setLoading(true);
    httpClient
      .get('/credits', { params: { q: state.q || undefined, page: state.page, limit: LIMIT } })
      .then((res) => {
        const data = res.data;
        const list = Array.isArray(data?.[0]) ? data[0] : [];
        const count = typeof data?.[1] === 'number' ? data[1] : 0;
        setRows((prev) => (state.page === 1 ? list : [...prev, ...list]));
        setTotal(count);
      })
      .catch(() => {
        if (state.page === 1) setRows([]);
      })
      .finally(() => setLoading(false));
  }, [ctx, state.q, state.page]);

  const hasMore = useMemo(() => rows.length < total, [rows.length, total]);

  const has = (perm: string) => ctx?.permissions.includes(perm) ?? false;

  const cancel = async (c: Credit) => {
    const name = c.client?.fullName || 'este cliente';
    if (!window.confirm(`¿Cancelar la solicitud de crédito de ${name}? Ya no se podrá retomar.`)) return;
    try {
      await httpClient.patch(`/credits/${c.id}/cancel`);
    } catch (err: any) {
      window.alert(err?.response?.data?.message?.message || 'No se pudo cancelar la solicitud');
    }
    setState((s) => ({ ...s, page: 1 }));
  };

  if (!ctx || initialLoading) return <p style={{ padding: 40 }}>Cargando...</p>;

  return (
    <div className="s2">
      <div className="s2-head">
        <h1 className="page-title">Créditos</h1>
        <p className="lead below">
          {total === 0
            ? 'Consulta el estado y el historial de las solicitudes de crédito.'
            : `${rows.length} de ${total} solicitud${total === 1 ? '' : 'es'}`}
        </p>
      </div>

      <div className="s2-body">
        <div className="inp" style={{ marginBottom: 16 }}>
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por NIT, nombre o ID de solicitud"
            aria-label="Buscar por NIT, nombre o ID de solicitud"
          />
        </div>

        {rows.length === 0 && (
          <p className="empty-state">
            {loading ? 'Cargando…' : state.q ? 'Sin resultados para esa búsqueda.' : 'No hay solicitudes de crédito.'}
          </p>
        )}

        {rows.map((c) => {
          const { label, color } = statusMeta(c.status);
          const algorithmError =
            c.status === 'draft' ? ALGORITHM_ERROR_LABEL[algorithmErrorKey(c.algorithmResult?.error)] : undefined;
          const actions: ReactNode[] = [];
          const resume = resumePath(c.id, c.status);
          const displayName = c.client?.fullName || c.client?.legalName || c.nit || c.clientId || 'Cliente no registrado';

          if (resume && has('credits.study')) {
            actions.push(
              <button key="resume" className="btn btn-primary" onClick={() => navigate(resume)}>
                {c.status === 'signed' ? 'Ver estado' : 'Retomar'}
              </button>,
            );
          }
          if (c.status === 'rejected' && has('credits.study')) {
            actions.push(
              <button key="result" className="btn btn-ghost" onClick={() => navigate(`/credits/result/${c.id}`)}>
                Ver resultado
              </button>,
            );
          }
          if (has('credits.read')) {
            actions.push(
              <button key="docs" className="btn btn-ghost" onClick={() => navigate(`/credits/${c.id}/documents`)}>
                Documentos
              </button>,
            );
          }
          if (canCancel(c.status) && has('credits.study')) {
            actions.push(
              <button key="cancel" className="btn btn-ghost" onClick={() => cancel(c)} style={{ color: '#b00020' }}>
                Cancelar
              </button>,
            );
          }

          return (
            <div key={c.id} className="info-card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', wordBreak: 'break-word' }}>
                    <Highlight text={displayName} q={state.q} />
                  </div>
                  {algorithmError && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: algorithmError.color, marginTop: 3 }}>
                      ⚠ {algorithmError.text}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 2 }}>
                    Solicitud <Highlight text={c.id.slice(0, 8)} q={state.q} />
                    {c.nit && (
                      <span style={{ marginLeft: 8 }}>
                        · NIT <Highlight text={c.nit} q={state.q} />
                      </span>
                    )}
                  </div>
                </div>
                <span
                  style={{
                    flex: 'none',
                    fontSize: 10.5,
                    fontWeight: 700,
                    color,
                    background: `${color}14`,
                    padding: '4px 10px',
                    borderRadius: 999,
                  }}
                >
                  {label}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>Cupo aprobado</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{approvedLimitText(c)}</span>
              </div>
              {actions.length > 0 && (
                <div className="rowbtn" style={{ marginTop: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  {actions}
                </div>
              )}
            </div>
          );
        })}

        {hasMore && (
          <div style={{ textAlign: 'center', marginTop: 8, marginBottom: 24 }}>
            <button
              className="btn btn-ghost"
              disabled={loading}
              onClick={() => setState((s) => ({ ...s, page: s.page + 1 }))}
              style={{ height: 46, borderRadius: 14, border: '1.6px solid var(--line)', background: 'var(--white)' }}
            >
              {loading ? 'Cargando…' : 'Ver más solicitudes'}
            </button>
          </div>
        )}
      </div>

      {has('credits.study') && (
        <button
          onClick={() => navigate('/credits/study')}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 54,
            height: 54,
            borderRadius: '50%',
            border: 0,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-deep))',
            color: '#fff',
            fontSize: 28,
            lineHeight: 1,
            cursor: 'pointer',
            boxShadow: '0 12px 22px -8px rgba(var(--accent-rgb), 0.6)',
            zIndex: 10,
          }}
          title="Nueva solicitud"
        >
          +
        </button>
      )}
    </div>
  );
}
