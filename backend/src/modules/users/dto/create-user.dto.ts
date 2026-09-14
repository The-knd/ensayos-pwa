import { IsEmail, IsString, IsUUID, IsOptional, Length, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(1, 200)
  fullName: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsUUID()
  profileId: string;

  /** Empresa de asignación principal. Solo tiene efecto en creación hecha por el superadmin; el admin siemppre crea en su propia empresa. */
  @IsOptional()
  @IsUUID()
  companyId?: string;
}