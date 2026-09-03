import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { MeController } from './me.controller';
import { AuthStrategyResolver } from './auth-strategy.resolver';
import { LocalAuthStrategy } from './strategies/local-auth.strategy';
import { PasskeyAuthStrategy } from './strategies/passkey-auth.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from '../users/entities/user.entity';
import { Company } from '../config/entities/company.entity';
import { Device } from './entities/device.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RbacModule } from '../rbac/rbac.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Company, Device, RefreshToken]),
    PassportModule,
    RbacModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: config.get('JWT_ACCESS_EXPIRES_IN'),
          issuer: 'pwa-frontend-key',
        },
      }),
    }),
  ],
  controllers: [AuthController, MeController],
  providers: [AuthStrategyResolver, LocalAuthStrategy, PasskeyAuthStrategy, JwtStrategy],
  exports: [],
})
export class AuthModule {}
