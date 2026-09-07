import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { AuthStrategyResolver } from './auth-strategy.resolver';
import { LoginDto } from './dto/login.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { User, UserStatus } from '../users/entities/user.entity';
import { Device } from './entities/device.entity';
import { Company } from '../config/entities/company.entity';
import { RbacService } from '../rbac/rbac.service';
import { ConfigService } from '@nestjs/config';
import { PasskeyAuthStrategy } from './strategies/passkey-auth.strategy';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';
import Redis from 'ioredis';
import { CurrentUser } from '../../commons/decorators/current-user.decorator';

const CHALLENGE_TTL = 300;

@Controller('auth')
export class AuthController {
  constructor(
    private resolver: AuthStrategyResolver,
    private jwtService: JwtService,
    @InjectRepository(RefreshToken) private refreshRepo: Repository<RefreshToken>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Device) private deviceRepo: Repository<Device>,
    @InjectRepository(Company) private companyRepo: Repository<Company>,
    @Inject(Redis) private redis: Redis,
    private passkeyStrategy: PasskeyAuthStrategy,
    private rbacService: RbacService,
    private config: ConfigService,
  ) {}

  private async registerChallenge(userId: string, challenge: string): Promise<void> {
    await this.redis.set(`webauthn:reg:${userId}`, challenge, 'EX', CHALLENGE_TTL);
  }

  private async consumeRegisterChallenge(userId: string): Promise<string> {
    const challenge = await this.redis.get(`webauthn:reg:${userId}`);
    if (!challenge) throw new BadRequestException('Desafío no encontrado o expirado');
    await this.redis.del(`webauthn:reg:${userId}`);
    return challenge;
  }

  private async saveLoginChallenge(key: string, challenge: string): Promise<void> {
    await this.redis.set(`webauthn:login:${key}`, challenge, 'EX', CHALLENGE_TTL);
  }

  private async consumeLoginChallenge(key: string): Promise<string> {
    const challenge = await this.redis.get(`webauthn:login:${key}`);
    if (!challenge) throw new BadRequestException('Desafío no encontrado o expirado');
    await this.redis.del(`webauthn:login:${key}`);
    return challenge;
  }

  private async issueTokensRes(userId: string, companyId: string, permissionsVersion: number, res: Response) {
    const user = await this.userRepo.findOneByOrFail({ id: userId });
    const accessToken = this.jwtService.sign({
      sub: userId,
      companyId,
      permissionsVersion,
      profileId: user.profileId,
    });

    const refreshTokenValue = randomBytes(48).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Number(this.config.get('JWT_REFRESH_EXPIRES_IN_DAYS')));

    await this.refreshRepo.save(
      this.refreshRepo.create({ userId, token: refreshTokenValue, expiresAt }),
    );

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', refreshTokenValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth/refresh',
      maxAge: Number(this.config.get('JWT_REFRESH_EXPIRES_IN_DAYS')) * 24 * 60 * 60 * 1000,
    });
    await this.rbacService.invalidateCache(userId);
  }

  @Get('companies')
  listActiveCompanies() {
    return this.companyRepo.find({
      where: { isActive: true },
      select: ['id', 'name', 'logoUrl', 'primaryColor'],
      order: { name: 'ASC' },
    });
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto & { companyId: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const strategy = await this.resolver.resolve(dto.companyId);
    const result = await strategy.authenticate(dto, dto.companyId);
    await this.issueTokensRes(result.userId, result.companyId, result.permissionsVersion, res);
    return { success: true };
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.refresh_token;
    if (!token) throw new UnauthorizedException();

    const stored = await this.refreshRepo.findOne({ where: { token, revoked: false } });
    if (!stored || stored.expiresAt < new Date()) throw new UnauthorizedException();

    const user = await this.userRepo.findOneByOrFail({ id: stored.userId });
    if (user.status !== UserStatus.ACTIVE) throw new UnauthorizedException();

    const accessToken = this.jwtService.sign({
      sub: user.id,
      companyId: user.companyId,
      permissionsVersion: user.permissionsVersion,
      profileId: user.profileId,
    });

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    return { success: true };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.refresh_token;
    if (token) {
      await this.refreshRepo.update({ token }, { revoked: true });
    }
    res.clearCookie('access_token');
    res.clearCookie('refresh_token', { path: '/api/auth/refresh' });
    return { success: true };
  }

  // --- Passkeys: registro (usuario autenticado añade un dispositivo) ---

  @Post('passkeys/register/options')
  @UseGuards(JwtAuthGuard)
  async registerOptions(@CurrentUser() user) {
    const options = await this.passkeyStrategy.getRegistrationOptions(user.sub);
    await this.registerChallenge(user.sub, options.challenge);
    return options;
  }

  @Post('passkeys/register/verify')
  @UseGuards(JwtAuthGuard)
  async registerVerify(
    @CurrentUser() user,
    @Body() body: { response: any; deviceName?: string },
  ) {
    if (!body?.response) throw new BadRequestException('Falta el response de WebAuthn');
    const challenge = await this.consumeRegisterChallenge(user.sub);
    await this.passkeyStrategy.verifyRegistration(
      user.sub,
      body.response,
      challenge,
      body.deviceName,
    );
    return { verified: true };
  }

  // --- Passkeys: inicio de sesión (público) ---

  @Post('passkeys/check')
  async checkPasskeys(@Body() body: { email: string; companyId: string }) {
    if (!body?.email || !body?.companyId) {
      return { hasPasskeys: false };
    }
    const user = await this.userRepo.findOne({
      where: { email: body.email, companyId: body.companyId, status: UserStatus.ACTIVE },
    });
    if (!user) return { hasPasskeys: false };
    const count = await this.deviceRepo.count({ where: { userId: user.id } });
    return { hasPasskeys: count > 0 };
  }

  @Post('passkeys/login/options')
  async loginOptions(@Body() body: { email: string; companyId: string }) {
    if (!body?.email || !body?.companyId) {
      throw new BadRequestException('Email y companyId son obligatorios');
    }
    const options = await this.passkeyStrategy.getAuthenticationOptions(
      body.email,
      body.companyId,
    );
    await this.saveLoginChallenge(`${body.companyId}:${body.email}`, options.challenge);
    return options;
  }

  @Post('passkeys/login/verify')
  async loginVerify(
    @Body() body: { email: string; companyId: string; response: any },
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!body?.email || !body?.companyId || !body?.response) {
      throw new BadRequestException('Email, companyId y response son obligatorios');
    }
    const challenge = await this.consumeLoginChallenge(`${body.companyId}:${body.email}`);
    const result = await this.passkeyStrategy.authenticate(
      { response: body.response, expectedChallenge: challenge, email: body.email },
      body.companyId,
    );
    await this.issueTokensRes(result.userId, result.companyId, result.permissionsVersion, res);
    return { success: true };
  }

  // --- Dispositivos del usuario conectado ---

  @Get('passkeys')
  @UseGuards(JwtAuthGuard)
  async listDevices(@CurrentUser() user) {
    const devices = await this.deviceRepo.find({
      where: { userId: user.sub },
      order: { createdAt: 'DESC' },
      select: ['id', 'deviceName', 'createdAt'],
    });
    return devices.map((d) => ({ id: d.id, name: d.deviceName || 'Dispositivo', createdAt: d.createdAt }));
  }

  @Delete('passkeys/:id')
  @UseGuards(JwtAuthGuard)
  async removeDevice(@CurrentUser() user, @Param('id') id: string) {
    const device = await this.deviceRepo.findOne({ where: { id, userId: user.sub } });
    if (!device) throw new NotFoundException('Dispositivo no encontrado');
    await this.deviceRepo.remove(device);
    return { success: true };
  }
}