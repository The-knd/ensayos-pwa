import { BadRequestException, Injectable } from '@nestjs/common';
import { IntegrationConnection } from './entities/integration-connection.entity';
import { IntegrationCredentials } from './integration.types';

/**
 * Puerto que implementa cada adaptador de sistema externo (p. ej. SAP) para que
 * `config/connections` pueda validar ajustes y probar la conexión SIN conocer
 * el vocabulario del sistema ni el de clientes. Solo declara:
 *   - `system`: el identificador abierto que el adaptador se atribuye.
 *   - `module` (opcional): si el adaptador es propio de un módulo de la app (p.
 *     ej. `peliculas` dentro del sistema genérico `api`), lo declara aquí; la
 *     clave del registro pasa a ser `system.module` y pueden coexistir varios
 *     adaptadores sobre un mismo sistema.
 *   - `validateSettings`: sanea/valida `settings` al guardar la conexión.
 *   - `test`: abre y cierra una sesión real; lanza `IntegrationError`.
 */
export interface ConnectionPlugin {
  readonly system: string;

  /** Módulo de la app cuyo adaptador es (vacío = aplica al sistema entero, p. ej. SAP). */
  readonly module?: string;

  validateSettings(settings: Record<string, unknown>): Record<string, unknown>;

  test(connection: IntegrationConnection, credentials: IntegrationCredentials): Promise<void>;
}

/**
 * Registro de plugins en tiempo de ejecución. Los adaptadores se dan de alta con
 * `register()` (vía `onModuleInit`), así que añadir un sistema no requiere
 * tocar este módulo ni ningún enum.
 *
 * Clave: `system` (adaptador del sistema entero) o `system.module` (adaptador
 * de un módulo concreto). Al buscar por (sistema, módulo) se mira primero el
 * específico del módulo y, en su defecto, el del sistema; sin módulo se acepta
 * cualquier adaptador del sistema (p. ej. `has('api')` con solo `api.peliculas`).
 */
@Injectable()
export class ConnectionPluginsRegistry {
  private readonly byKey = new Map<string, ConnectionPlugin>();

  private static keyOf(system: string, module?: string): string {
    return module ? `${system}.${module}` : system;
  }

  register(plugin: ConnectionPlugin) {
    this.byKey.set(ConnectionPluginsRegistry.keyOf(plugin.system, plugin.module), plugin);
  }

  /** Sistemas con plugin registrado (lo que la GUI puede pintar). */
  systems(): string[] {
    return [...new Set([...this.byKey.values()].map((plugin) => plugin.system))];
  }

  /** ¿Hay adaptador de código para este sistema (y módulo, si se indica)? (validar/probar reales). */
  has(system: string, module?: string): boolean {
    if (module) return this.byKey.has(ConnectionPluginsRegistry.keyOf(system, module)) || this.byKey.has(system);
    return this.byKey.has(system) || [...this.byKey.keys()].some((key) => key.startsWith(`${system}.`));
  }

  get(system: string, module?: string): ConnectionPlugin {
    if (module) {
      const specific = this.byKey.get(ConnectionPluginsRegistry.keyOf(system, module));
      if (specific) return specific;
    }
    const plugin = this.byKey.get(system);
    if (!plugin) {
      throw new BadRequestException(
        `Sistema no soportado: ${system}${module ? ` (módulo ${module})` : ''}. Registrados: ${this.systems().join(', ') || '(ninguno)'}`,
      );
    }
    return plugin;
  }
}
