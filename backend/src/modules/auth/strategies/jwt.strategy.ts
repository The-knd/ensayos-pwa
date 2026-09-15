import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { User, UserStatus } from '../../users/entities/user.entity';
import Redis from 'ioredis';

/**
 * Validación del access token (firma + exp + audience). Además verifica que el
 * usuario siga ACTIVE: un token no revive a un usuario deshabilitado/bloqueado.
 * Para no penalizar cada request con un hit a BD se cachea el estado en Redis
 * (TTL 60s); si Redis falla se consulta la BD (fail-open, al estilo Kong).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(User) private userRepo: Repository<User>,
    @Inject(Redis) private redis: Redis,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.access_token ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET'),
      issuer: 'pwa-frontend-key',
      audience: 'pwa-frontend',
    });
  }

  async validate(payload: any) {
    if (!payload?.sub) throw new UnauthorizedException();

    let status: UserStatus | null = null;
    const cacheKey = `auth:user:status:${payload.sub}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        status = JSON.parse(cached) as UserStatus;
      } else {
        const user = await this.userRepo.findOne({ where: { id: payload.sub } });
        if (!user) throw new UnauthorizedException();
        status = user.status;
        try {
          await this.redis.set(cacheKey, JSON.stringify(status), 'EX', 60);
        } catch {
          // el cache falla pero ya tenemos el estado en memoria para esta request
        }
      }
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      // Redis caído: se consulta la BD directamente.
      const user = await this.userRepo
        .findOne({ where: { id: payload.sub } })
        .catch(() => null);
      if (!user) throw new UnauthorizedException();
      status = user.status;
    }

    if (status !== UserStatus.ACTIVE) throw new UnauthorizedException();

    return {
      sub: payload.sub,
      companyId: payload.companyId,
      permissionsVersion: payload.permissionsVersion,
      profileId: payload.profileId,
    };
  }
}