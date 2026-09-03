import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../commons/guards/permissions.guard';
import { Permissions } from '../../commons/decorators/permissions.decorator';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }

  @Get('secure')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('clients.read')
  checkSecure() {
    return { status: 'ok-secure' };
  }
}
