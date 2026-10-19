import { BadRequestException, Injectable } from '@nestjs/common';
import { IntegrationError } from '../../config/connections/http/integration.errors';
import { PeliculasProcessor } from './peliculas-processor';

/**
 * Registro de estrategias de Películas en tiempo de ejecución. Copia el patrón
 * de `ClientSyncStrategyRegistry`: las estrategias se dan de alta con
 * `register()` (vía `onModuleInit` del adaptador) y una conexión que nombre una
 * estrategia no registrada se rechaza.
 */
@Injectable()
export class PeliculasProcessorRegistry {
  private readonly list: PeliculasProcessor[] = [];

  register(processor: PeliculasProcessor) {
    this.list.push(processor);
  }

  /** Claves registradas, en orden de alta (para la plantilla y los mensajes). */
  keys(): string[] {
    return this.list.map((processor) => processor.key);
  }

  /** Resuelve la estrategia de una conexión. Error de configuración si no existe. */
  resolve(key: unknown): PeliculasProcessor {
    const processor = this.list.find((p) => p.key === key);
    if (!processor) {
      throw new IntegrationError('definitive', `Estrategia de Películas no registrada: ${String(key)}`);
    }
    return processor;
  }

  /**
   * Valida `settings` al guardar la conexión: `strategy` debe ser una estrategia
   * registrada. Un error de configuración aparece en la GUI, no al consultar.
   */
  validateSettings(settings: Record<string, unknown>): Record<string, unknown> {
    const key = settings.strategy;
    if (typeof key !== 'string' || !this.list.some((p) => p.key === key)) {
      throw new BadRequestException(`settings.strategy debe ser una de: ${this.keys().join(', ') || '(ninguna registrada)'}`);
    }
    return { ...settings, strategy: key };
  }
}
