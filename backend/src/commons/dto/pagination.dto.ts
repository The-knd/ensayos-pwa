import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Paginación acotada y tipada (OWASP A01/A05, ISO 27001 A.14.2.1):
 * page/limit con mínimos y máximos duros para evitar listados astronómicos
 * (p. ej. `limit=999999999`) que degradan la DB.
 */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export function clampPagination(query: { page?: number; limit?: number }) {
  const page = Math.max(1, Math.min(query.page ?? 1, 100000));
  const limit = Math.max(1, Math.min(query.limit ?? 20, 100));
  return { page, limit };
}