import { Controller, Get, Inject, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../commons/guards/permissions.guard';
import { Permissions } from '../../commons/decorators/permissions.decorator';

@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(Redis) private readonly redis: Redis,
  ) {}

  /** Liveness: el proceso está vivo. No toca dependencias. */
  @Get()
  check() {
    return { status: 'ok' };
  }

  /** Liveness explícito (mismo que /health, alias para orquestadores que lo piden). */
  @Get('live')
  checkLive() {
    return { status: 'ok' };
  }

  /** Readiness: proceso + DB + Redis OK. Es lo que Kong/K8s deben usar antes de enrutar tráfico. */
  @Get('ready')
  async checkReady() {
    const checks: Record<string, 'up' | 'down'> = {};
    let ok = true;

    try {
      await this.dataSource.query('SELECT 1');
      checks.db = 'up';
    } catch {
      ok = false;
      checks.db = 'down';
    }

    try {
      await this.redis.ping();
      checks.redis = 'up';
    } catch {
      ok = false;
      checks.redis = 'down';
    }

    if (!ok) {
      throw new ServiceUnavailableException({ status: 'error', checks });
    }
    return { status: 'ok', checks };
  }

  @Get('secure')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('clients.read')
  checkSecure() {
    return { status: 'ok-secure' };
  }
}