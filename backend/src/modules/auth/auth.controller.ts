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
  UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SwitchCompanyDto } from './dto/switch-company.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from './entities/device.entity';
import { LocalAuthStrategy } from './strategies/local-auth.strategy';
import { PasskeyAuthStrategy } from './strategies/passkey-auth.strategy';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';
import { CurrentUser } from '../../commons/decorators/current-user.decorator';
import Redis from 'ioredis';

const CHALLENGE_TTL = 300;

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private localStrategy: LocalAuthStrategy,
    @InjectRepository(Device) private deviceRepo: Repository<Device>,
    @Inject(Redis) private redis: Redis,
    private passkeyStrategy: PasskeyAuthStrategy,
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

  @Get('companies')
  listActiveCompanies() {
    return this.authService.listActiveCompanies();
  }

  // Defensa en profundidad: aunque Kong ya limita /api/auth/login a 10/min,
  // este límite aplica incluso si algo llega directo al backend en la red interna.
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.localStrategy.authenticate(dto);
    await this.authService.issueTokensRes(result.userId, result.companyId, result.permissionsVersion, res);
    return { success: true };
  }

  @Post('refresh')
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.refresh(req, res);
  }

  @Post('logout')
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.logout(req, res);
  }

  // --- Superadmin: cambiar de empresa (o volver al selector global) ---

  @Post('company')
  @UseGuards(JwtAuthGuard)
  async switchCompany(
    @CurrentUser() user,
    @Body() dto: SwitchCompanyDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.switchCompany(
      { sub: user.sub, profileId: user.profileId, permissionsVersion: user.permissionsVersion },
      dto.companyId ?? null,
      res,
    );
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
  checkPasskeys(@Body() body: { email: string }) {
    return this.authService.checkPasskeys(body);
  }

  @Post('passkeys/login/options')
  async loginOptions(@Body() body: { email: string }) {
    if (!body?.email) {
      throw new BadRequestException('Email es obligatorio');
    }
    const options = await this.passkeyStrategy.getAuthenticationOptions(body.email);
    await this.saveLoginChallenge(`${body.email}`, options.challenge);
    return options;
  }

  @Post('passkeys/login/verify')
  async loginVerify(
    @Body() body: { email: string; response: any },
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!body?.email || !body?.response) {
      throw new BadRequestException('Email y response son obligatorios');
    }
    const challenge = await this.consumeLoginChallenge(`${body.email}`);
    const result = await this.passkeyStrategy.authenticate({
      response: body.response,
      expectedChallenge: challenge,
      email: body.email,
    });
    await this.authService.issueTokensRes(result.userId, result.companyId, result.permissionsVersion, res);
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
