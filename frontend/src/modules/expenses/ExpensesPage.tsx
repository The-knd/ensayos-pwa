import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Can } from '../../shared/components/Can';
import { FormField } from '../../shared/components/FormField';
import { FormSummary } from '../../shared/components/FormSummary';
import './ExpensesPage.css';
import { useBackTarget } from '../../shared/layout/TopBarContext';
import { useFieldErrors } from '../../shared/validation/useFieldErrors';

// ── DATOS MOCK ──
// TODO(real-data): catálogo de dependencias desde GET /api/expenses/dependencies
const DEPENDENCIES = ['Comercial', 'Mercadeo', 'Logística', 'Administrativa'];

const LABELS = {
  route: 'Ruta',
  startDate: 'Fecha inicio',
  endDate: 'Fecha fin',
  advance: 'Valor anticipo',
};

export function ExpensesPage() {
  const navigate = useNavigate();
  useBackTarget('/home');
  const { moduleContexts } = useAuth();
  const permissions = moduleContexts.expenses?.permissions || [];

  const [route, setRoute] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [advance, setAdvance] = useState('');
  const [dependency, setDependency] = useState(DEPENDENCIES[0]);

  const fields = useFieldErrors<'route' | 'startDate' | 'endDate' | 'advance'>({
    values: { route, startDate, endDate, advance },
    required: ['route', 'startDate', 'endDate'],
    validate: (values) => ({
      route: values.route ? '' : 'Describe la ruta',
      startDate: values.startDate ? '' : 'Selecciona la fecha de inicio',
      endDate: values.endDate ? '' : 'Selecciona la fecha de fin',
      advance:
        values.advance === '' || values.advance == null
          ? ''
          : Number(values.advance) >= 0 && Number(values.advance) <= 20
            ? ''
            : 'El anticipo debe estar entre 0 y 20',
    }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fields.touchAll();
    if (!fields.isValid) return;
    // TODO(real-data): POST /api/expenses con {dependency, route, startDate, endDate, advance}
    window.alert('Gasto registrado (mock)');
  };

  return (
    <div className="s2">
      <div className="s2-head">
        <h1 className="page-title">Gastos de viaje</h1>
      </div>

      <div className="s2-body">
        <form onSubmit={handleSubmit} className="expenses-form">
          <FormSummary
            pending={fields.pendingKeys.map((k) => ({ key: k, label: LABELS[k] }))}
            errors={fields.invalidKeys.map((k) => ({ key: k, label: LABELS[k], message: fields.errors[k] }))}
          />

          <div className="field">
            <label>Dependencia</label>
            <div className="sel">
              <select value={dependency} onChange={(e) => setDependency(e.target.value)}>
                {DEPENDENCIES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <svg className="cv" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>

          <FormField
            id="expense-route"
            label="Ruta"
            required
            status={fields.status.route}
            error={fields.errors.route}
          >
            <div className="inp">
              <input
                id="expense-route"
                type="text"
                value={route}
                maxLength={500}
                placeholder="Describe la ruta"
                onChange={(e) => { setRoute(e.target.value); fields.touch('route'); }}
                onBlur={() => fields.touch('route')}
              />
              <span className="inp-counter">{route.length}/500</span>
            </div>
          </FormField>

          <div className="row2">
            <FormField
              id="expense-start-date"
              label="Fecha inicio"
              required
              status={fields.status.startDate}
              error={fields.errors.startDate}
              className="field"
            >
              <div className="inp"><input id="expense-start-date" type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); fields.touch('startDate'); }} onBlur={() => fields.touch('startDate')} /></div>
            </FormField>
            <FormField
              id="expense-end-date"
              label="Fecha fin"
              required
              status={fields.status.endDate}
              error={fields.errors.endDate}
              className="field"
            >
              <div className="inp"><input id="expense-end-date" type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); fields.touch('endDate'); }} onBlur={() => fields.touch('endDate')} /></div>
            </FormField>
          </div>

          <FormField
            id="expense-advance"
            label="Valor anticipo"
            status={fields.status.advance}
            error={fields.errors.advance}
          >
            <div className="inp">
              <input
                id="expense-advance"
                type="number"
                min={0}
                max={20}
                value={advance}
                placeholder="0"
                onChange={(e) => { setAdvance(e.target.value); fields.touch('advance'); }}
                onBlur={() => fields.touch('advance')}
              />
              <span className="inp-counter">{advance ? `${advance}/20` : '0/20'}</span>
            </div>
          </FormField>

          <Can permission="expenses.create" permissions={permissions}>
            <div className="rowbtn">
              <button type="button" className="btn btn-ghost" onClick={() => navigate('/home')}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Aceptar</button>
            </div>
          </Can>
        </form>
      </div>

      <Can permission="expenses.create" permissions={permissions}>
        <div className="fab-stack">
          <button type="button" className="fab" aria-label="Nuevo gasto" onClick={() => undefined}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </Can>
    </div>
  );
}
