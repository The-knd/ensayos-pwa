import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../commons/guards/permissions.guard';
import { Permissions } from '../../commons/decorators/permissions.decorator';
import { CurrentTenant } from '../../commons/decorators/current-tenant.decorator';
import { FeatureFlagsService } from './feature-flags.service';

@Controller('feature-flags')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FeatureFlagsController {
  constructor(private service: FeatureFlagsService) {}

  @Get()
  @Permissions('feature-flags.read')
  findAll(@CurrentTenant() companyId: string) {
    return this.service.findAll(companyId);
  }

  @Post()
  @Permissions('feature-flags.create')
  create(@CurrentTenant() companyId: string, @Body() dto: { key: string; enabled?: boolean }) {
    return this.service.create(companyId, dto);
  }

  @Patch(':id')
  @Permissions('feature-flags.update')
  update(@Param('id') id: string, @CurrentTenant() companyId: string, @Body() dto: { enabled?: boolean; key?: string }) {
    return this.service.update(id, companyId, dto);
  }

  @Delete(':id')
  @Permissions('feature-flags.delete')
  remove(@Param('id') id: string, @CurrentTenant() companyId: string) {
    return this.service.remove(id, companyId);
  }
}