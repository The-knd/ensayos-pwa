import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserStatus } from '../../users/entities/user.entity';
import { AuthStrategy, AuthResult } from '../interfaces/auth-strategy.interface';

@Injectable()
export class LocalAuthStrategy implements AuthStrategy {
  constructor(@InjectRepository(User) private userRepo: Repository<User>) {}

  async authenticate(
    credentials: { email: string; password: string },
    companyId: string,
  ): Promise<AuthResult> {
    const user = await this.userRepo.findOne({
      where: { email: credentials.email, companyId },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(credentials.password, user.passwordHash || '');
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    return {
      userId: user.id,
      companyId: user.companyId,
      permissionsVersion: user.permissionsVersion,
    };
  }
}
