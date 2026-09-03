import { Controller, Post, Body, Res, Req, UnauthorizedException } from '@nestjs/common';
import { Response, Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { AuthStrategyResolver } from './auth-strategy.resolver';
import { LoginDto } from './dto/login.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { User, UserStatus } from '../users/entities/user.entity';
import { RbacService } from '../rbac/rbac.service';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private resolver: AuthStrategyResolver,
    private jwtService: JwtService,
    @InjectRepository(RefreshToken) private refreshRepo: Repository<RefreshToken>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private rbacService: RbacService,
    private config: ConfigService,
  ) {}

  @Post('login')
  async login(
    @Body() dto: LoginDto & { companyId: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const strategy = await this.resolver.resolve(dto.companyId);
    const result = await strategy.authenticate(dto, dto.companyId);

    const accessToken = this.jwtService.sign({
      sub: result.userId,
      companyId: result.companyId,
      permissionsVersion: result.permissionsVersion,
    });

    const refreshTokenValue = randomBytes(48).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Number(this.config.get('JWT_REFRESH_EXPIRES_IN_DAYS')));

    await this.refreshRepo.save(
      this.refreshRepo.create({ userId: result.userId, token: refreshTokenValue, expiresAt }),
    );

    res.cookie('access_token', accessToken, {
      httpOnly: true, secure: true, sameSite: 'lax', maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', refreshTokenValue, {
      httpOnly: true, secure: true, sameSite: 'strict', path: '/api/auth/refresh',
      maxAge: Number(this.config.get('JWT_REFRESH_EXPIRES_IN_DAYS')) * 24 * 60 * 60 * 1000,
    });

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
    });

    res.cookie('access_token', accessToken, {
      httpOnly: true, secure: true, sameSite: 'lax', maxAge: 15 * 60 * 1000,
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
    res.clearCookie('refresh_token');
    return { success: true };
  }
}
