import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { DataSource } from 'typeorm';
import { logContext } from '../logger/log-context';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private dataSource: DataSource) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const companyId = request.user?.companyId ?? null;

    // El GUC se setea SIEMPRE (incluyendo NULL) sobre la conexión del pool que
    // toque este request, para que una conexión reutilizada nunca arrastre el
    // tenant de un request anterior (p. ej. rutas globales/superadmin que no
    // definen empresa). RLS sigue siendo defensa en profundidad: la frontera
    // real del aislamiento multi-tenant es el scoping por companyId en cada
    // consulta (ver CLAUDE.md, "Opción B").
    await this.dataSource.query(`SELECT set_config('app.current_company_id', $1, false)`, [
      companyId,
    ]);

    // Pobla el contexto de logging del request actual.
    const store = logContext.getStore();
    if (store && request.user) {
      store.userId = request.user.sub;
      store.companyId = request.user.companyId ?? null;
    }

    return next.handle();
  }
}