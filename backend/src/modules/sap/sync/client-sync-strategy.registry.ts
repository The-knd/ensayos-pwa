import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { IntegrationError } from '../http/integration.errors';
import { IntegrationSystem } from '../integration.types';
import { CLIENT_SYNC_STRATEGIES, ClientSyncSettingsDto, ClientSyncStrategy } from './client-sync.strategy';

/**
 * Resuelve la estrategia de una conexión por (sistema, settings.strategy).
 * Una estrategia nueva se registra en CLIENT_SYNC_STRATEGIES (SapModule);
 * si no, una conexión que la nombre se rechaza al guardarla.
 */
@Injectable()
export class ClientSyncStrategyRegistry {
  constructor(@Inject(CLIENT_SYNC_STRATEGIES) private readonly strategies: ClientSyncStrategy[]) {}

  keysFor(system: IntegrationSystem): string[] {
    return this.strategies.filter((s) => s.system === system).map((s) => s.key);
  }

  /** Para el worker: una conexión guardada siempre debería resolver; si no, es un error de configuración. */
  resolve(system: IntegrationSystem, key: unknown): ClientSyncStrategy {
    const strategy = this.strategies.find((s) => s.system === system && s.key === key);
    if (!strategy) throw new IntegrationError('definitive', `Estrategia no registrada: ${system}/${String(key)}`);
    return strategy;
  }

  /**
   * Valida `settings` contra el DTO de su estrategia al guardar la conexión:
   * un error de configuración aparece en la GUI, no en la sincronización.
   * Devuelve los settings limpios (sin campos desconocidos).
   */
  validateSettings(system: IntegrationSystem, settings: Record<string, unknown>): Record<string, unknown> {
    const strategy = this.strategies.find((s) => s.system === system && s.key === settings.strategy);
    if (!strategy) {
      throw new BadRequestException(`settings.strategy debe ser una de: ${this.keysFor(system).join(', ') || '(ninguna registrada)'}`);
    }
    const instance = plainToInstance(strategy.settingsDto, settings) as ClientSyncSettingsDto;
    const errors = validateSync(instance, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length > 0) {
      const messages = errors.flatMap((e) => flatten(e, 'settings'));
      throw new BadRequestException(messages);
    }
    return JSON.parse(JSON.stringify(instance));
  }
}

function flatten(error: { property: string; constraints?: Record<string, string>; children?: any[] }, prefix: string): string[] {
  const path = `${prefix}.${error.property}`;
  const own = Object.values(error.constraints ?? {}).map((m) => `${path}: ${m}`);
  return [...own, ...(error.children ?? []).flatMap((c) => flatten(c, path))];
}
