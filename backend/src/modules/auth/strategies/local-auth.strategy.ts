import { Injectable, Inject, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import Redis from 'ioredis';
import { User, UserStatus } from '../../users/entities/user.entity';
import { AuthStrategy, AuthResult } from '../interfaces/auth-strategy.interface';
import { SUPER_ADMIN_PROFILE_ID } from '../../../commons/constants';

const LOCK_MAX_ATTEMPTS = 5;
const LOCK_WINDOW_SECONDS = 15 * 60;

/**
 * Lockout por cuenta (además del rate-limit por IP de Kong/NestJS): tras 5
 * intentos fallidos de un mismo email, la cuenta queda bloqueada 15 minutos
 * (Redis). Mitiga fuerza bruta distribuida desde varias IPs contra un solo
 * usuario (ISO 27001 A.9.4.2).
 */
@Injectable()
export class LocalAuthStrategy implements AuthStrategy {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @Inject(Redis) private redis: Redis,
  ) {}

  /** El email es único global: no se necesita selección de empresa para identificar al usuario. */
  async authenticate(
    credentials: { email: string; password: string },
    _companyId?: string,
  ): Promise<AuthResult> {
    const email = credentials.email.trim().toLowerCase();
    const lockKey = `auth:lockout:${email}`;

    const remaining = await this.remainingLockout(lockKey);
    if (remaining > 0) {
      throw new HttpException(
        `Demasiados intentos fallidos. Inténtalo de nuevo en ${Math.ceil(remaining / 60)} min`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.userRepo.findOne({ where: { email } });

    if (!user || user.status !== UserStatus.ACTIVE) {
      await this.registerFailedAttempt(lockKey);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(credentials.password, user.passwordHash || '');
    if (!valid) {
      await this.registerFailedAttempt(lockKey);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.redis.del(lockKey).catch(() => undefined);

    return {
      userId: user.id,
      companyId: user.profileId === SUPER_ADMIN_PROFILE_ID ? null : user.companyId,
      permissionsVersion: user.permissionsVersion,
    };
  }

  private async registerFailedAttempt(lockKey: string): Promise<void> {
    try {
      const count = await this.redis.incr(lockKey);
      if (count === 1) {
        await this.redis.expire(lockKey, LOCK_WINDOW_SECONDS);
      }
    } catch {
      // Redis caído: se degrada a solo rate-limit por IP (defensa en profundidad).
    }
  }

  private async remainingLockout(lockKey: string): Promise<number> {
    try {
      const count = Number((await this.redis.get(lockKey)) ?? '0');
      if (count < LOCK_MAX_ATTEMPTS) return 0;
      const ttl = await this.redis.ttl(lockKey);
      return ttl > 0 ? ttl : 0;
    } catch {
      return 0;
    }
  }
}