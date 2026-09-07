import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { DataSource } from 'typeorm';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private dataSource: DataSource) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const companyId = request.user?.companyId;

    if (companyId) {
      await this.dataSource.query(`SELECT set_config('app.current_company_id', $1, false)`, [
        companyId,
      ]);
    }

    return next.handle();
  }
}
