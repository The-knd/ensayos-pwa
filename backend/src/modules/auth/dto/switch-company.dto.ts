import { IsUUID, IsOptional, ValidateIf } from 'class-validator';

export class SwitchCompanyDto {
  @ValidateIf((o) => o.companyId !== null && o.companyId !== undefined)
  @IsUUID()
  companyId?: string | null;
}