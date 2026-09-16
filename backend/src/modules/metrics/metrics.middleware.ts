import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';

/**
 * Normaliza una URL a "ruta" de cardinalidad acotada para las etiquetas de
 * Prometheus: los UUIDs y números se convierten en :id/:num para evitar
 * cardinalidad ilimitada.
 */
function normalizeRoute(rawUrl: string): string {
  const pathOnly = rawUrl.split('?')[0];
  return pathOnly
    .split('/')
    .map((seg) => {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)) return ':id';
      if (/^\d+$/.test(seg)) return ':num';
      return seg;
    })
    .join('/');
}

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metrics: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const started = Date.now();
    res.on('finish', () => {
      const route = normalizeRoute(req.originalUrl || req.url);
      this.metrics.recordRequest(req.method, route, res.statusCode, Date.now() - started);
    });
    next();
  }
}