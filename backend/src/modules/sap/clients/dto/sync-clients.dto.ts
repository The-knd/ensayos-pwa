import { IsOptional, IsUUID } from 'class-validator';

/**
 * Cuerpo opcional del POST /clients/sap/sync.
 *
 * `companyId` solo aplica al superadmin (que no tiene empresa en su token): es
 * el contexto de la empresa sobre la que opera el módulo. Para un usuario
 * normal se ignora.
 */
export class SyncClientsDto {
  @IsOptional()
  @IsUUID()
  companyId?: string;
}
