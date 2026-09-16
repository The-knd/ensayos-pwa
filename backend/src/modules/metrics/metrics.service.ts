import { Injectable } from '@nestjs/common';
import { Registry, collectDefaultMetrics, Counter, Histogram } from 'prom-client';

/**
 * Métricas en formato Prometheus (ISO 27001 A.12.4 — monitorización):
 * métricas default de Node (event loop, memoria, cpu) + contadores/histogramas
 * propios de HTTP. El endpoint /api/metrics queda protegido en Kong con
 * key-auth (token dedicado, NO público).
 */
@Injectable()
export class MetricsService {
  private readonly registry: Registry;
  private readonly httpRequests: Counter<string>;
  private readonly httpDuration: Histogram<string>;
  private readonly authFailures: Counter<string>;

  constructor() {
    this.registry = new Registry();
    collectDefaultMetrics({
      register: this.registry,
      prefix: 'pwa_node_',
      eventLoopMonitoringPrecision: 10,
    });

    this.httpRequests = new Counter({
      name: 'pwa_http_requests_total',
      help: 'Total de peticiones HTTP procesadas',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry],
    });

    this.httpDuration = new Histogram({
      name: 'pwa_http_request_duration_seconds',
      help: 'Duración de las peticiones HTTP',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.authFailures = new Counter({
      name: 'pwa_auth_failures_total',
      help: 'Intentos de autenticación fallidos',
      labelNames: ['strategy'],
      registers: [this.registry],
    });
  }

  recordRequest(method: string, route: string, status: number, durationMs: number): void {
    this.httpRequests.inc({ method, route, status: String(status) });
    this.httpDuration.observe(
      { method, route, status: String(status) },
      durationMs / 1000,
    );
  }

  incAuthFailure(strategy = 'local'): void {
    this.authFailures.inc({ strategy });
  }

  async metrics(): Promise<string> {
    return this.registry.metrics();
  }
}