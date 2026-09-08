import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ClientsModule } from './modules/clients/clients.module';
import { ConfigModule as AppConfigModule } from './modules/config/config.module';
import { CreditsModule } from './modules/credits/credits.module';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module';
import { HealthModule } from './modules/health/health.module';
import { RedisModule } from './modules/redis/redis.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { ModulePlacementsModule } from './modules/placements/module-placements.module';
import { CorrelationIdMiddleware } from './commons/middlewares/correlation-id.middleware';
import { envValidationSchema } from './commons/config/env.validation';
import { EVENT_BUS } from './commons/interfaces/event-bus.interface';
import { InMemoryEventBus } from './commons/infrastructure/in-memory-event-bus';
import { TenantContextInterceptor } from './commons/interceptors/tenant-context.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: config.get('DB_PORT'),
        username: config.get('DB_USER'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_NAME'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    EventEmitterModule.forRoot(),
    RedisModule,
    RbacModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    AppConfigModule,
    CreditsModule,
    FeatureFlagsModule,
    ModulePlacementsModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantContextInterceptor,
    },
    {
      provide: EVENT_BUS,
      useClass: InMemoryEventBus,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
