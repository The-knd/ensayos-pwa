import { Injectable } from '@nestjs/common';
import { ConnectionPlugin } from '../config/connections/connection-plugins';
import { IntegrationConnection } from '../config/connections/entities/integration-connection.entity';
import { IntegrationCredentials } from '../config/connections/integration.types';
import { PeliculasClient } from './client/peliculas.client';
import { PeliculasProcessorRegistry } from './processors/peliculas-processor.registry';
import { PELICULAS, PELICULAS_SYSTEM } from './peliculas.types';

/**
 * Adaptador de conexión de Películas: implementa el puerto `ConnectionPlugin`
 * que define `config/connections`, atado al sistema genérico `api` y al módulo
 * `peliculas`.
 *
 * - `validateSettings` delega en el registro de estrategias: los ajustes de una
 *   conexión de Películas son, precisamente, su `settings.strategy`.
 * - `test` abre y cierra una sesión (login + logout); no ejecuta la consulta
 *   completa. La GUI lo usa con "Probar conexión".
 */
@Injectable()
export class PeliculasConnectionPlugin implements ConnectionPlugin {
  readonly system = PELICULAS_SYSTEM;
  readonly module = PELICULAS;

  constructor(
    private readonly processors: PeliculasProcessorRegistry,
    private readonly client: PeliculasClient,
  ) {}

  validateSettings(settings: Record<string, unknown>): Record<string, unknown> {
    return this.processors.validateSettings(settings);
  }

  async test(connection: IntegrationConnection, credentials: IntegrationCredentials): Promise<void> {
    const session = await this.client.login(connection.baseUrl, credentials);
    await this.client.logout(session);
  }
}
