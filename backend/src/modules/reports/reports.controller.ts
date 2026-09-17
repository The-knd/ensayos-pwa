import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../commons/guards/permissions.guard';
import { Permissions } from '../../commons/decorators/permissions.decorator';
import { CurrentTenant } from '../../commons/decorators/current-tenant.decorator';
import { CurrentUser } from '../../commons/decorators/current-user.decorator';
import { RbacService } from '../rbac/rbac.service';
import { ReportsService } from './reports.service';
import { GenerateReportDto } from './dto/generate-report.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(
    private service: ReportsService,
    private rbacService: RbacService,
  ) {}

  @Get('context')
  async getContext(@CurrentUser() user, @CurrentTenant() companyId: string) {
    const permissions = await this.rbacService.getPermissionsByPrefix(user.sub, companyId, 'reports');
    return { permissions, featureFlags: {} };
  }

  @Get('dashboard')
  @Permissions('reports.ver')
  dashboard() {
    return this.service.dashboard();
  }

  @Post('generar')
  @Permissions('reports.generar')
  generate(@Body() dto: GenerateReportDto) {
    return this.service.generate(dto);
  }
}