import { IsEmail, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTOs de passkey: tipan los bodies que antes eran `{ response: any }`.
 * El inner response (WebAuthn credential JSON) es un shape variable y no se
 * valida en profundidad; la verificación criptográfica real la hace
 * @simplewebauthn en la estrategia. El ValidationPipe global sigue rechazando
 * propiedades inesperadas en el nivel superior.
 */
export class PasskeyCheckDto {
  @IsEmail()
  email: string;
}

export class PasskeyLoginOptionsDto {
  @IsEmail()
  email: string;
}

export class PasskeyLoginVerifyDto {
  @IsEmail()
  email: string;

  @IsObject()
  response: Record<string, unknown>;
}

export class PasskeyRegisterVerifyDto {
  @IsObject()
  response: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceName?: string;
}