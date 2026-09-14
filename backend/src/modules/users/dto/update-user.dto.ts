import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { UserStatus } from '../entities/user.entity';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  fullName?: string;

  @IsOptional()
  @IsUUID()
  profileId?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  /** Solo aplicable por el superadmin (reasignar la empresa principal del usuario). */
  @IsOptional()
  @IsUUID()
  companyId?: string;
}