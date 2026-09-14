import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response, Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { RefreshToken } from './entities/refresh-token.entity';
import { User, UserStatus } from '../users/entities/user.entity';
import { Device } from './entities/device.entity';
import { Company } from '../config/entities/company.entity';
import { RbacService } from '../rbac/rbac.service';
import { SUPER_ADMIN_PROFILE_ID } from '../../commons/constants';

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
  ) {}

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

  /** Crea un refresh token nuevo en BD para el usuario y lo devuelve (sin cookie). */
  private async issueRefreshToken(userId: string): Promise<string> {
    const refreshTokenValue = randomBytes(48).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Number(this.config.get('JWT_REFRESH_EXPIRES_IN_DAYS')));
    await this.refreshRepo.save(
      this.refreshRepo.create({ userId, token: refreshTokenValue, expiresAt }),
    );
    return refreshTokenValue;
  }

  /** companyId null = sesión de superadmin (selector global o acceso a otra empresa). */
  async issueTokensRes(userId: string, companyId: string | null, permissionsVersion: number, res: Response) {
    const user = await this.userRepo.findOneByOrFail({ id: userId });
    const accessToken = this.jwtService.sign({
      sub: userId,
      companyId,
      permissionsVersion,
      profileId: user.profileId,
    });

    const refreshTokenValue = await this.issueRefreshToken(userId);

    this.setAccessTokenCookie(res, accessToken);
    this.setRefreshTokenCookie(res, refreshTokenValue);
    await this.rbacService.invalidateCache(userId);
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

    const stored = await this.refreshRepo.findOne({ where: { token } });
    if (!stored) throw new UnauthorizedException();

    if (stored.revoked) {
      // Reutilización de un refresh token ya rotado/revocado: posible robo del token.
      // Se revocan todos los tokens del usuario para forzar re-autenticación en todos los dispositivos.
      await this.refreshRepo.update({ userId: stored.userId, revoked: false }, { revoked: true });
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

    const accessToken = this.jwtService.sign({
      sub: user.id,
      companyId: user.profileId === SUPER_ADMIN_PROFILE_ID ? null : user.companyId,
      permissionsVersion: user.permissionsVersion,
      profileId: user.profileId,
    });

    this.setAccessTokenCookie(res, accessToken);
    this.setRefreshTokenCookie(res, newRefreshToken);

    return { success: true };
  }

  async logout(req: Request, res: Response) {
    const token = req.cookies?.refresh_token;
    if (token) {
      await this.refreshRepo.update({ token }, { revoked: true });
    }
    res.clearCookie('access_token');
    res.clearCookie('refresh_token', { path: '/api/auth/refresh' });
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
