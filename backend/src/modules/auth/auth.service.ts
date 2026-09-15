import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response, Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { RefreshToken } from './entities/refresh-token.entity';
import { User, UserStatus } from '../users/entities/user.entity';
import { Device } from './entities/device.entity';
import { Company } from '../config/entities/company.entity';
import { RbacService } from '../rbac/rbac.service';
import { SUPER_ADMIN_PROFILE_ID } from '../../commons/constants';
import { StructuredLogger } from '../../commons/logger/structured-logger.service';
import Redis from 'ioredis';

/**
 * Lógica de sesión/tokens extraída de AuthController: emisión y rotación de
 * cookies, listado de empresas activas y el chequeo público de passkeys. La
 * gestión de dispositivos passkey (registro/listado/borrado) se deja fuera
 * a propósito — se mezcla con cómo PasskeyAuthStrategy se inyecta fuera del
 * flujo authenticate(), que es un problema de diseño distinto.
 */
@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(RefreshToken) private refreshRepo: Repository<RefreshToken>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Device) private deviceRepo: Repository<Device>,
    @InjectRepository(Company) private companyRepo: Repository<Company>,
    private rbacService: RbacService,
    private config: ConfigService,
    @Inject(Redis) private redis: Redis,
    private logger: StructuredLogger,
  ) {}

  /** Los refresh tokens se guardan SOLO como SHA-256 (nunca en texto plano). */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Cache del estado del usuario para JwtStrategy (TTL 60s, evita un hit a BD por request). */
  private async cacheUserStatus(userId: string, status: UserStatus): Promise<void> {
    try {
      await this.redis.set(`auth:user:status:${userId}`, JSON.stringify(status), 'EX', 60);
    } catch (e) {
      this.logger.warn('Redis no disponible al cachear estado de usuario', { err: (e as Error)?.message });
    }
  }

  private setAccessTokenCookie(res: Response, accessToken: string) {
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });
  }

  private setRefreshTokenCookie(res: Response, refreshTokenValue: string) {
    res.cookie('refresh_token', refreshTokenValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth/refresh',
      maxAge: Number(this.config.get('JWT_REFRESH_EXPIRES_IN_DAYS')) * 24 * 60 * 60 * 1000,
    });
  }

  /**
   * Token CSRF double-submit: SIEMPRE con expires en el ciclo de sesión y NO
   * httpOnly para que el SPA lo lea y lo devuelva en X-CSRF-Token (ver
   * CsrfMiddleware). Se emite al iniciar sesión y NO se rota en refresh.
   */
  private setCsrfTokenCookie(res: Response) {
    res.cookie('csrf_token', randomBytes(24).toString('base64url'), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: Number(this.config.get('JWT_REFRESH_EXPIRES_IN_DAYS')) * 24 * 60 * 60 * 1000,
    });
  }

  /** Crea un refresh token nuevo en BD (hash) y lo devuelve (sin cookie). */
  private async issueRefreshToken(userId: string): Promise<string> {
    const refreshTokenValue = randomBytes(48).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Number(this.config.get('JWT_REFRESH_EXPIRES_IN_DAYS')));
    await this.refreshRepo.save(
      this.refreshRepo.create({
        userId,
        tokenHash: this.hashToken(refreshTokenValue),
        expiresAt,
      }),
    );
    return refreshTokenValue;
  }

  private signAccessToken(user: User, companyId: string | null): string {
    return this.jwtService.sign({
      sub: user.id,
      companyId,
      permissionsVersion: user.permissionsVersion,
      profileId: user.profileId,
      jti: randomUUID(),
    });
  }

  /** companyId null = sesión de superadmin (selector global o acceso a otra empresa). */
  async issueTokensRes(userId: string, companyId: string | null, permissionsVersion: number, res: Response) {
    const user = await this.userRepo.findOneByOrFail({ id: userId });
    const accessToken = this.signAccessToken(user, companyId);

    const refreshTokenValue = await this.issueRefreshToken(userId);

    this.setAccessTokenCookie(res, accessToken);
    this.setRefreshTokenCookie(res, refreshTokenValue);
    this.setCsrfTokenCookie(res);
    await this.rbacService.invalidateCache(userId);
    await this.cacheUserStatus(userId, user.status);

    this.logger.audit('auth.tokens.issued', {
      actor: userId,
      companyId,
      meta: { profileId: user.profileId },
    });
  }

  /** Switch de empresa del superadmin: entra a una empresa concreta (companyId) o vuelve al selector global (null). */
  async switchCompany(user: { sub: string; profileId: string; permissionsVersion: number }, companyId: string | null, res: Response) {
    if (user.profileId !== SUPER_ADMIN_PROFILE_ID) {
      throw new UnauthorizedException('Solo el superadmin puede cambiar de empresa');
    }
    if (companyId) {
      const company = await this.companyRepo.findOne({ where: { id: companyId, isActive: true } });
      if (!company) throw new UnauthorizedException('Empresa no encontrada o inactiva');
    }
    const clean = companyId ?? null;
    await this.issueTokensRes(user.sub, clean, user.permissionsVersion, res);

    this.logger.audit('auth.switch_company', {
      actor: user.sub,
      companyId: clean,
      meta: { from: user.profileId },
    });
    return { success: true, companyId: clean };
  }

  listActiveCompanies() {
    return this.companyRepo.find({
      where: { isActive: true },
      select: ['id', 'name', 'logoUrl', 'primaryColor'],
      order: { name: 'ASC' },
    });
  }

  async refresh(req: Request, res: Response) {
    const token = req.cookies?.refresh_token;
    if (!token) throw new UnauthorizedException();

    const stored = await this.refreshRepo.findOne({ where: { tokenHash: this.hashToken(token) } });
    if (!stored) throw new UnauthorizedException();

    if (stored.revoked) {
      // Reutilización de un refresh token ya rotado/revocado: posible robo del token.
      // Se revocan todos los tokens del usuario para forzar re-autenticación en todos los dispositivos.
      await this.refreshRepo.update({ userId: stored.userId, revoked: false }, { revoked: true });
      this.logger.audit('auth.refresh.reuse', { actor: stored.userId, meta: { reason: 'reuse' } });
      throw new UnauthorizedException();
    }

    if (stored.expiresAt < new Date()) {
      await this.refreshRepo.update({ id: stored.id }, { revoked: true });
      throw new UnauthorizedException();
    }

    const user = await this.userRepo.findOneByOrFail({ id: stored.userId });
    if (user.status !== UserStatus.ACTIVE) throw new UnauthorizedException();

    // Rotación: el token usado queda inservible y se emite uno nuevo.
    await this.refreshRepo.update({ id: stored.id }, { revoked: true });
    const newRefreshToken = await this.issueRefreshToken(user.id);

    const accessToken = this.signAccessToken(
      user,
      user.profileId === SUPER_ADMIN_PROFILE_ID ? null : user.companyId,
    );

    this.setAccessTokenCookie(res, accessToken);
    this.setRefreshTokenCookie(res, newRefreshToken);
    await this.cacheUserStatus(user.id, user.status);

    this.logger.audit('auth.refresh.submitted', { actor: user.id });
    return { success: true };
  }

  async logout(req: Request, res: Response) {
    const token = req.cookies?.refresh_token;
    if (token) {
      await this.refreshRepo.update({ tokenHash: this.hashToken(token) }, { revoked: true });
      this.logger.audit('auth.logout', {
        actor: (req as any).user?.sub,
        meta: { tokenPresent: true },
      });
    } else {
      this.logger.audit('auth.logout', {
        actor: (req as any).user?.sub,
        meta: { tokenPresent: false },
      });
    }
    res.clearCookie('access_token');
    res.clearCookie('refresh_token', { path: '/api/auth/refresh' });
    res.clearCookie('csrf_token');
    return { success: true };
  }

  async checkPasskeys(body: { email: string }) {
    if (!body?.email) {
      return { hasPasskeys: false };
    }
    const user = await this.userRepo.findOne({
      where: { email: body.email, status: UserStatus.ACTIVE },
    });
    if (!user) return { hasPasskeys: false };
    const count = await this.deviceRepo.count({ where: { userId: user.id } });
    return { hasPasskeys: count > 0 };
  }
}
