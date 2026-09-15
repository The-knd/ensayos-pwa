import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logContext } from '../logger/log-context';
import { StructuredLogger } from '../logger/structured-logger.service';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  constructor(private readonly logger: StructuredLogger) {}

  use(req: Request, res: Response, next: NextFunction) {
    const id = (req.headers['x-correlation-id'] as string) || randomUUID();
    (req as any).correlationId = id;
    res.setHeader('X-Correlation-ID', id);

    const started = Date.now();
    res.on('finish', () => {
      this.logger.info('http', {
        method: req.method,
        path: req.originalUrl || req.url,
        status: res.statusCode,
        durationMs: Date.now() - started,
      });
    });

    logContext.run({ correlationId: id }, () => next());
  }
}