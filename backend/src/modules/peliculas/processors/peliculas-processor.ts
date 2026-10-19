import { Movie } from '../peliculas.types';

/**
 * Puerto de las estrategias de Películas: traduce la respuesta **cruda** del API
 * externo al vocabulario de la app. Es el equivalente de `ClientSyncStrategy`
 * (clients/sync) pero para este módulo, y demuestra el mismo patrón:
 *
 *   - La conexión de cada empresa elige su estrategia con `settings.strategy`.
 *   - Una estrategia nueva se registra en `PeliculasProcessorRegistry`
 *     (vía `PelículasIntegrationRegistrar`); ni `config/connections` ni el
 *     servicio de Películas cambian.
 *
 * La estrategia NO lee configuración ni variables de entorno: solo recibe la
 * respuesta cruda. Los errores de formato se lanzan como
 * `IntegrationError('definitive', …)` para que la UI los muestre.
 */
export interface PeliculasProcessor {
  /** Clave que la conexión guarda en `settings.strategy` (p. ej. `default`). */
  readonly key: string;

  process(raw: unknown): Movie[];
}
