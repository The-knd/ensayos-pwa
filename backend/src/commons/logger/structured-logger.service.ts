import { Injectable, LoggerService } from '@nestjs/common';
import { logContext } from './log-context';

type Level = 'audit' | 'info' | 'warn' | 'error';

interface LogMeta {
  [key: string]: unknown;
}

/**
 * Logger estructurado tipo JSON a stdout/stderr (requisito ISO 27001 §12.4:
 * logging y monitorización). Cada línea incluye correlationId y el actor
 * (userId/companyId) del request actual vía AsyncLocalStorage, listo para ser
 * ingerido por cualquier collector (Loki/ELK) por línea JSON.
 */
@Injectable()
export class StructuredLogger implements LoggerService {
  private write(level: Level, message: string, meta: LogMeta = {}): void {
    const entry: LogMeta = {
      level,
      time: new Date().toISOString(),
      msg: message,
      ...logContext.getStore(),
      ...meta,
    };
    const line = JSON.stringify(entry);
    if (level === 'error' || level === 'warn') {
      process.stderr.write(`${line}\n`);
    } else {
      process.stdout.write(`${line}\n`);
    }
  }

  /** Evento de auditoría (login, refresh, logout, cambios de permisos, etc.). */
  audit(action: string, meta: LogMeta = {}): void {
    this.write('audit', action, meta);
  }

  log(message: any, ...optionalParams: any[]): void {
    this.info(message, ...optionalParams);
  }

  info(message: any, ...optionalParams: any[]): void {
    this.write('info', String(message), this.asMeta(optionalParams));
  }

  warn(message: any, ...optionalParams: any[]): void {
    this.write('warn', String(message), this.asMeta(optionalParams));
  }

  error(message: any, ...optionalParams: any[]): void {
    this.write('error', String(message), this.asMeta(optionalParams));
  }

  debug(message: any, ...optionalParams: any[]): void {
    this.write('info', String(message), this.asMeta(optionalParams));
  }

  verbose(message: any, ...optionalParams: any[]): void {
    this.write('info', String(message), this.asMeta(optionalParams));
  }

  private asMeta(params: any[]): LogMeta {
    if (params.length === 0) return {};
    if (typeof params[0] === 'object' && params[0] !== null) return params[0] as LogMeta;
    return { context: String(params[0]) };
  }
}