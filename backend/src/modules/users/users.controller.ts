import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../commons/guards/permissions.guard';
import { Permissions } from '../../commons/decorators/permissions.decorator';
import { CurrentTenant } from '../../commons/decorators/current-tenant.decorator';
import { CurrentUser } from '../../commons/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { RbacService } from '../rbac/rbac.service';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(
    private service: UsersService,
    private rbacService: RbacService,
  ) {}

  @Get('context')
  async getContext(@CurrentUser() user, @CurrentTenant() companyId: string) {
    const permissions = (await this.rbacService.getPermissions(user.sub, companyId)).filter(
      (p) => p.startsWith('users.'),
    );
    return { permissions, featureFlags: {} };
  }

  @Get('profiles')
  @Permissions('users.read')
  findProfiles() {
    return this.service.findProfiles();
  }

  @Get()
  @Permissions('users.read')
  findAll(@CurrentTenant() companyId: string) {
    return this.service.findAll(companyId);
  }

  @Post()
  @Permissions('users.create')
  create(@CurrentTenant() companyId: string, @Body() dto: any) {
    return this.service.create(companyId, dto);
  }

  @Patch(':id')
  @Permissions('users.update')
  update(@Param('id') id: string, @CurrentTenant() companyId: string, @Body() dto: any) {
    return this.service.update(id, companyId, dto);
  }

  @Patch(':id/status')
  @Permissions('users.update')
  toggleStatus(@Param('id') id: string, @CurrentTenant() companyId: string) {
    return this.service.toggleStatus(id, companyId);
  }

  @Delete(':id')
  @Permissions('users.delete')
  remove(@Param('id') id: string, @CurrentTenant() companyId: string) {
    return this.service.remove(id, companyId);
  }
}
