import { useEffect, useState } from 'react';
import { getApiError } from '../../shared/api/apiError';
import { useAuth } from '../auth/AuthContext';
import { fetchMovies, MoviesResponse } from './peliculas.api';

export function PeliculasPage() {
  const { moduleContexts, loadModuleContext } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<MoviesResponse | null>(null);

  const module = 'peliculas';
  const ctx = moduleContexts[module];
  const perms = ctx?.permissions ?? [];
  const canRead = perms.includes('peliculas.read');

  useEffect(() => {
    loadModuleContext(module).catch(() => undefined);
  }, [loadModuleContext]);

  async function handleFetch() {
    setError('');
    setLoading(true);
    try {
      const res = await fetchMovies();
      setData(res);
    } catch (err: unknown) {
      setError(getApiError(err)?.message || 'No se pudieron obtener las películas');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="s2">
      <div className="s2-head">
        <h1 className="page-title">Películas</h1>
        <p className="lead below">Consulta las películas desde el API externo, según la conexión de la empresa.</p>
      </div>
      <div className="s2-body">
        <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="rowbtn" style={{ justifyContent: 'flex-start' }}>
            <button className="btn" type="button" onClick={handleFetch} disabled={loading || !canRead}>
              {loading ? 'Consultando...' : 'Consultar películas'}
            </button>
            {!canRead && <span className="empty-state">Necesitas el permiso peliculas.read</span>}
          </div>

          {error && <div style={{ color: '#b00020', fontSize: 12 }}>{error}</div>}

          {data && (
            <>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                Estrategia usada: {data.strategy}
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Título</th>
                      <th>Año</th>
                      <th>Género</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.movies.map((m) => (
                      <tr key={m.id}>
                        <td>{m.id}</td>
                        <td>{m.title}</td>
                        <td>{m.year ?? '—'}</td>
                        <td>{m.genre ?? '—'}</td>
                      </tr>
                    ))}
                    {data.movies.length === 0 && (
                      <tr>
                        <td colSpan={4} className="empty-state">
                          No hay películas en la respuesta
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
