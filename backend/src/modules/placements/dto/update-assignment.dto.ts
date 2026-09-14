import { IsEnum, IsInt, IsBoolean, IsOptional, IsArray, IsUUID } from 'class-validator';

export class UpdateAssignmentDto {
  @IsEnum(['grid', 'fab'])
  placement?: 'grid' | 'fab';

  @IsInt()
  @IsOptional()
  position?: number;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

export class PublishModuleDto {
  @IsArray()
  @IsUUID(undefined, { each: true, message: 'companyIds debe contener UUIDs válidos' })
  companyIds: string[];
}