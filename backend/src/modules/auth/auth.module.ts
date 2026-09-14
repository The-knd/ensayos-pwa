import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MeController } from './me.controller';
import { LocalAuthStrategy } from './strategies/local-auth.strategy';
import { PasskeyAuthStrategy } from './strategies/passkey-auth.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from '../users/entities/user.entity';
import { Company } from '../config/entities/company.entity';
import { Device } from './entities/device.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';
import { ModulePlacementsModule } from '../placements/module-placements.module';
import { UsersModule } from '../users/users.module';
import { ConfigModule as AppConfigModule } from '../config/config.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Company, Device, RefreshToken]),
    PassportModule,
    FeatureFlagsModule,
    ModulePlacementsModule,
    UsersModule,
    AppConfigModule,
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
  providers: [AuthService, LocalAuthStrategy, PasskeyAuthStrategy, JwtStrategy],
  exports: [],
})
export class AuthModule {}
