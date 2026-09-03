import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { Device } from '../entities/device.entity';
import { User } from '../../users/entities/user.entity';
import { AuthStrategy, AuthResult } from '../interfaces/auth-strategy.interface';

@Injectable()
export class PasskeyAuthStrategy implements AuthStrategy {
  constructor(
    @InjectRepository(Device) private deviceRepo: Repository<Device>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private config: ConfigService,
  ) {}

  async getRegistrationOptions(userId: string) {
    const user = await this.userRepo.findOneByOrFail({ id: userId });
    const existingDevices = await this.deviceRepo.find({ where: { userId } });

    return generateRegistrationOptions({
      rpName: this.config.get('WEBAUTHN_RP_NAME')!,
      rpID: this.config.get('WEBAUTHN_RP_ID')!,
      userID: new TextEncoder().encode(user.id),
      userName: user.email,
      excludeCredentials: existingDevices.map((d) => ({
        id: d.credentialId,
        type: 'public-key' as const,
      })),
    });
  }

  async verifyRegistration(userId: string, response: any, expectedChallenge: string) {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.config.get('WEBAUTHN_ORIGIN')!,
      expectedRPID: this.config.get('WEBAUTHN_RP_ID')!,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new UnauthorizedException('No se pudo verificar el registro del dispositivo');
    }

    const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

    await this.deviceRepo.save(
      this.deviceRepo.create({
        userId,
        credentialId: Buffer.from(credentialID).toString('base64url'),
        publicKey: Buffer.from(credentialPublicKey).toString('base64url'),
        counter,
      }),
    );

    return { verified: true };
  }

  async getAuthenticationOptions(email: string, companyId: string) {
    const user = await this.userRepo.findOneOrFail({ where: { email, companyId } });
    const devices = await this.deviceRepo.find({ where: { userId: user.id } });

    return generateAuthenticationOptions({
      rpID: this.config.get('WEBAUTHN_RP_ID')!,
      allowCredentials: devices.map((d) => ({ id: d.credentialId, type: 'public-key' as const })),
    });
  }

  async authenticate(
    credentials: { response: any; expectedChallenge: string; email: string },
    companyId: string,
  ): Promise<AuthResult> {
    const user = await this.userRepo.findOneOrFail({
      where: { email: credentials.email, companyId },
    });
    const device = await this.deviceRepo.findOneOrFail({
      where: { credentialId: credentials.response.id },
    });

    const verification = await verifyAuthenticationResponse({
      response: credentials.response,
      expectedChallenge: credentials.expectedChallenge,
      expectedOrigin: this.config.get('WEBAUTHN_ORIGIN')!,
      expectedRPID: this.config.get('WEBAUTHN_RP_ID')!,
      authenticator: {
        credentialID: device.credentialId,
        credentialPublicKey: Buffer.from(device.publicKey, 'base64url'),
        counter: device.counter,
      },
    });

    if (!verification.verified) throw new UnauthorizedException('Passkey inválida');

    device.counter = verification.authenticationInfo.newCounter;
    await this.deviceRepo.save(device);

    return {
      userId: user.id,
      companyId: user.companyId,
      permissionsVersion: user.permissionsVersion,
    };
  }
}
