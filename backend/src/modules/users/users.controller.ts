import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../commons/guards/permissions.guard';
import { Permissions } from '../../commons/decorators/permissions.decorator';
import { CurrentTenant } from '../../commons/decorators/current-tenant.decorator';
import { CurrentUser } from '../../commons/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { RbacService } from '../rbac/rbac.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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
  findAll(@CurrentUser() user, @CurrentTenant() companyId: string, @Query('companyId') requestedCompanyId?: string) {
    const isSuperAdmin = user.profileId === 'aaaaaaaa-0000-0000-0000-000000000001';
    const effectiveCompanyId = (requestedCompanyId && isSuperAdmin) ? requestedCompanyId : companyId;
    return this.service.findAll(effectiveCompanyId);
  }

  @Post()
  @Permissions('users.create')
  create(@CurrentTenant() companyId: string, @Body() dto: CreateUserDto) {
    return this.service.create(companyId, dto);
  }

  @Patch(':id')
  @Permissions('users.update')
  update(@Param('id') id: string, @CurrentTenant() companyId: string, @Body() dto: UpdateUserDto) {
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
