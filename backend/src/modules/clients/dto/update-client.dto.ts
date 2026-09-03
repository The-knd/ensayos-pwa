import { IsString, IsEmail, IsOptional, Length, IsEnum } from 'class-validator';
import { ClientStatus } from '../entities/client.entity';

export class UpdateClientDto {
  @IsString()
  @Length(1, 200)
  @IsOptional()
  fullName?: string;

  @IsString()
  @Length(1, 20)
  @IsOptional()
  documentNumber?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsEnum(ClientStatus)
  @IsOptional()
  status?: ClientStatus;
}
