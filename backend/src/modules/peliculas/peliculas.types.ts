/**
 * Identificadores del adaptador de Películas, declarados EXCLUSIVAMENTE aquí
 * (nada de 'api'/'peliculas' en los módulos genéricos):
 *
 *   - `PELICULAS_SYSTEM`: clave del catálogo `connection_systems` (sistema
 *     externo genérico). Es el `IntegrationConnection.system`.
 *   - `PELICULAS`: módulo de la app que consume la conexión. Es el
 *     `IntegrationConnection.module` y forma con el sistema la clave del
 *     registro de plugins (`api.peliculas`).
 */
export const PELICULAS_SYSTEM = 'api';
export const PELICULAS = 'peliculas';

/** Una película, ya traducida al vocabulario de la app desde la respuesta del API. */
export interface Movie {
  id: string;
  title: string;
  year: number | null;
  genre: string | null;
}

/** Respuesta de `GET /api/peliculas/movies`: estrategia aplicada + películas normalizadas. */
export interface MoviesResult {
  strategy: string;
  movies: Movie[];
}
