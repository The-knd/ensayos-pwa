import { IsEmail, IsString, IsUUID, Length, MinLength } from 'class-validator';

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
}