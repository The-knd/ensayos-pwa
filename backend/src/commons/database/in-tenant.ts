import { DataSource, EntityManager } from 'typeorm';

/**
 * Ejecuta `work` en una transacción con `app.current_company_id` fijado SOLO
 * para ella (`set_config(..., true)`), para que las políticas RLS vean el
 * tenant. Es lo que necesita todo acceso fuera de un request de esa empresa:
 * pollers y workers (no hay TenantContextInterceptor) y endpoints del
 * superadmin (su token no tiene empresa, el interceptor deja el GUC en NULL).
 *
 * El `true` es obligatorio: con `false` la empresa quedaría pegada a la
 * conexión del pool y la heredaría el siguiente que la use. Sigue haciendo
 * falta filtrar por `companyId` en cada consulta: RLS es la segunda capa.
 */
export function inTenant<T>(dataSource: DataSource, companyId: string, work: (m: EntityManager) => Promise<T>): Promise<T> {
  return dataSource.transaction(async (m) => {
    await m.query(`SELECT set_config('app.current_company_id', $1, true)`, [companyId]);
    return work(m);
  });
}
