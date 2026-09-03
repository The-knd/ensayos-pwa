import { Controller, Get, Post, Patch, Param, Body, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../commons/guards/permissions.guard';
import { Permissions } from '../../commons/decorators/permissions.decorator';
import { CurrentTenant } from '../../commons/decorators/current-tenant.decorator';
import { CurrentUser } from '../../commons/decorators/current-user.decorator';
import { CreditsService } from './credits.service';
import { CreateCreditDto } from './dto/create-credit.dto';
import { RbacService } from '../rbac/rbac.service';

@Controller('credits')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CreditsController {
  constructor(
    private service: CreditsService,
    private rbacService: RbacService,
  ) {}

  @Get('context')
  async getContext(@CurrentUser() user, @CurrentTenant() companyId: string) {
    const permissions = (await this.rbacService.getPermissions(user.sub, companyId)).filter(
      (p) => p.startsWith('credits.'),
    );
    return { permissions, featureFlags: {} };
  }

  @Get()
  @Permissions('credits.read')
  findAll(@CurrentTenant() companyId: string, @Query() query: any) {
    return this.service.findAll(companyId, query);
  }

  @Post()
  @Permissions('credits.create')
  create(@CurrentTenant() companyId: string, @Body() dto: CreateCreditDto) {
    return this.service.create(companyId, dto);
  }

  @Patch(':id/study')
  @Permissions('credits.study')
  study(@Param('id') id: string, @CurrentTenant() companyId: string) {
    return this.service.updateStatus(id, companyId, 'in_study');
  }

  @Patch(':id/approve')
  @Permissions('credits.update')
  approve(@Param('id') id: string, @CurrentTenant() companyId: string) {
    return this.service.updateStatus(id, companyId, 'approved');
  }

  @Patch(':id/reject')
  @Permissions('credits.update')
  reject(@Param('id') id: string, @CurrentTenant() companyId: string) {
    return this.service.updateStatus(id, companyId, 'rejected');
  }
}
