import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../commons/dto/pagination.dto';

/**
 * Filtros del listado de créditos. Se mantiene la paginación heredada y se
 * agrega el término de búsqueda `q` para filtrar por NIT, nombre del cliente o
 * id de la solicitud.
 */
export class ListCreditsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;
}
