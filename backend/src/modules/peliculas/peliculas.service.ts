import { Injectable } from '@nestjs/common';
import { ConnectionsService } from '../config/connections/connections.service';
import { IntegrationEnvironment } from '../config/connections/integration.types';
import { IntegrationError } from '../config/connections/http/integration.errors';
import { PeliculasClient } from './client/peliculas.client';
import { PeliculasProcessorRegistry } from './processors/peliculas-processor.registry';
import { MoviesResult, PELICULAS, PELICULAS_SYSTEM } from './peliculas.types';

/**
 * Orquesta una consulta de Películas para una empresa:
 *   1. Carga su conexión habilitada (sistema `api`, módulo `peliculas`).
 *   2. Login en el API externo (credenciales descifradas por connections).
 *   3. Consulta (respuesta cruda).
 *   4. Logout (siempre, mejor esfuerzo).
 *   5. Traduce la respuesta con la estrategia de la conexión (`settings.strategy`).
 *
 * Igual que la sincronización de clientes, solo usa la conexión de PRODUCCIÓN;
 * si la empresa solo tiene una de TEST, se usa esa (útil para pruebas desde
 * cero). Un cambio de `settings.strategy` invalida la prueba de conexión.
 */
@Injectable()
export class PeliculasService {
  constructor(
    private readonly connections: ConnectionsService,
    private readonly client: PeliculasClient,
    private readonly processors: PeliculasProcessorRegistry,
  ) {}

  async list(companyId: string): Promise<MoviesResult> {
    this.connections.ensureEnabled();
    const { connection, credentials } = await this.loadConnection(companyId);
    const processor = this.processors.resolve(connection.settings.strategy);
    const session = await this.client.login(connection.baseUrl, credentials);
    try {
      const raw = await this.client.query(session);
      return { strategy: processor.key, movies: processor.process(raw) };
    } finally {
      await this.client.logout(session);
    }
  }

  /**
   * Conexión de (empresa, `api`, `peliculas`): primero producción y, si no hay,
   * pruebas. Si no existe ninguna, un error claro que apunta a dónde crearla.
   */
  private async loadConnection(companyId: string) {
    for (const environment of [IntegrationEnvironment.PRODUCTION, IntegrationEnvironment.TEST]) {
      try {
        return await this.connections.loadForUse(companyId, PELICULAS_SYSTEM, environment, PELICULAS);
      } catch (err) {
        // 'No hay conexión configurada' = este entorno no la tiene; se prueba el
        // siguiente. Cualquier otro error (credencial que no descifra, etc.) se
        // propaga tal cual.
        if (!(err instanceof IntegrationError) || err.message !== 'No hay conexión configurada') throw err;
      }
    }
    throw new IntegrationError(
      'definitive',
      `No hay conexión de Películas habilitada para esta empresa. ` +
        `Configúrala en Configuración global → Conexiones (sistema "${PELICULAS_SYSTEM}", módulo "${PELICULAS}").`,
    );
  }
}
