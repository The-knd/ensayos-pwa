import { BadRequestException, Injectable } from '@nestjs/common';
import { IntegrationConnection } from './entities/integration-connection.entity';
import { IntegrationCredentials } from './integration.types';

/**
 * Puerto que implementa cada adaptador de sistema externo (p. ej. SAP) para que
 * `config/connections` pueda validar ajustes y probar la conexión SIN conocer
 * el vocabulario del sistema ni el de clientes. Solo declara:
 *   - `system`: el identificador abierto que el adaptador se atribuye.
 *   - `validateSettings`: sanea/valida `settings` al guardar la conexión.
 *   - `test`: abre y cierra una sesión real; lanza `IntegrationError`.
 */
export interface ConnectionPlugin {
  readonly system: string;

  validateSettings(settings: Record<string, unknown>): Record<string, unknown>;

  test(connection: IntegrationConnection, credentials: IntegrationCredentials): Promise<void>;
}

/**
 * Registro de plugins en tiempo de ejecución. Los adaptadores se dan de alta con
 * `register()` (vía `onModuleInit`), así que añadir un sistema no requiere
 * tocar este módulo ni ningún enum.
 */
@Injectable()
export class ConnectionPluginsRegistry {
  private readonly bySystem = new Map<string, ConnectionPlugin>();

  register(plugin: ConnectionPlugin) {
    this.bySystem.set(plugin.system, plugin);
  }

  /** Sistemas con plugin registrado (lo que la GUI puede pintar). */
  systems(): string[] {
    return [...this.bySystem.keys()];
  }

  /** ¿Hay adaptador de código para este sistema? (validar/probar reales). */
  has(system: string): boolean {
    return this.bySystem.has(system);
  }

  get(system: string): ConnectionPlugin {
    const plugin = this.bySystem.get(system);
    if (!plugin) {
      throw new BadRequestException(
        `Sistema no soportado: ${system}. Registrados: ${this.systems().join(', ') || '(ninguno)'}`,
      );
    }
    return plugin;
  }
}
