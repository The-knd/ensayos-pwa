import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { Permissions } from '../../commons/decorators/permissions.decorator';
import { PermissionsGuard } from '../../commons/guards/permissions.guard';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';
import { CurrentTenant } from '../../commons/decorators/current-tenant.decorator';
import { RbacService } from './rbac.service';
import { IsString, IsUUID, Length } from 'class-validator';

class CreateProfileDto {
  @IsString()
  @Length(1, 100)
  name: string;
}

class UpdateProfileDto {
  @IsString()
  @Length(1, 100)
  name: string;
}

class AssignPermissionDto {
  @IsUUID()
  permissionId: string;
}

@Controller('profiles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProfilesController {
  constructor(private readonly rbacService: RbacService) {}

  @Get()
  @Permissions('profiles.read')
  findAll(@CurrentTenant() companyId: string) {
    return this.rbacService.findProfiles(companyId);
  }

  @Get('permissions')
  @Permissions('profiles.read')
  findAllPermissions() {
    return this.rbacService.findAllPermissions();
  }

  @Post()
  @Permissions('profiles.create')
  create(@Body() dto: CreateProfileDto, @CurrentTenant() companyId: string) {
    return this.rbacService.createProfile(companyId, dto.name);
  }

  @Patch(':id')
  @Permissions('profiles.update')
  update(@Param('id') id: string, @Body() dto: UpdateProfileDto, @CurrentTenant() companyId: string) {
    return this.rbacService.updateProfile(id, companyId, dto.name);
  }

  @Delete(':id')
  @Permissions('profiles.delete')
  remove(@Param('id') id: string, @CurrentTenant() companyId: string) {
    return this.rbacService.deleteProfile(id, companyId);
  }

  @Get(':id/permissions')
  @Permissions('profiles.read')
  getPermissions(@Param('id') id: string) {
    return this.rbacService.getProfilePermissions(id);
  }

  @Post(':id/permissions')
  @Permissions('profiles.update')
  assignPermission(@Param('id') id: string, @Body() dto: AssignPermissionDto) {
    return this.rbacService.assignPermission(id, dto.permissionId);
  }

  @Delete(':id/permissions/:permissionId')
  @Permissions('profiles.update')
  removePermission(@Param('id') id: string, @Param('permissionId') permissionId: string) {
    return this.rbacService.removePermission(id, permissionId);
  }
}