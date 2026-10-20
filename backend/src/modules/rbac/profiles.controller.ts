import { Controller, Get, Post, Patch, Delete, Body, Param, ParseUUIDPipe, UseGuards, ForbiddenException } from '@nestjs/common';
import { Permissions } from '../../commons/decorators/permissions.decorator';
import { PermissionsGuard } from '../../commons/guards/permissions.guard';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../commons/guards/super-admin.guard';
import { CurrentTenant } from '../../commons/decorators/current-tenant.decorator';
import { CurrentUser } from '../../commons/decorators/current-user.decorator';
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

  @Get('context')
  async getContext(@CurrentUser() user, @CurrentTenant() companyId: string) {
    const permissions = await this.rbacService.getPermissionsByPrefix(user.sub, companyId, 'profiles');
    return { permissions, featureFlags: {} };
  }

  @Get()
  @Permissions('profiles.read')
  findAll(@CurrentTenant() companyId: string) {
    return this.rbacService.findProfiles(companyId);
  }

  /* ---------- Perfiles globales de sistema: solo el portal del superadmin ---------- */

  @Get('global')
  @Permissions('profiles.read')
  @UseGuards(SuperAdminGuard)
  findGlobal() {
    return this.rbacService.findGlobalSystemProfiles();
  }

  @Post('global')
  @Permissions('profiles.create')
  @UseGuards(SuperAdminGuard)
  createGlobal(@Body() dto: CreateProfileDto) {
    return this.rbacService.createGlobalSystemProfile(dto.name);
  }

  @Patch('global/:id')
  @Permissions('profiles.update')
  @UseGuards(SuperAdminGuard)
  updateGlobal(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.rbacService.updateGlobalSystemProfile(id, dto.name);
  }

  @Delete('global/:id')
  @Permissions('profiles.delete')
  @UseGuards(SuperAdminGuard)
  removeGlobal(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.rbacService.deleteGlobalSystemProfile(id);
  }

  @Get('permissions')
  @Permissions('profiles.read')
  findAllPermissions() {
    return this.rbacService.findAllPermissions();
  }

  @Post()
  @Permissions('profiles.create')
  create(@Body() dto: CreateProfileDto, @CurrentTenant() companyId: string) {
    if (!companyId) {
      // Sesión global sin empresa: los perfiles globales se crean solo desde el
      // portal (POST /profiles/global), así no quedan perfiles huérfanos.
      throw new ForbiddenException('Usá POST /profiles/global para crear perfiles de sistema globales');
    }
    return this.rbacService.createProfile(companyId, dto.name);
  }

  @Patch(':id')
  @Permissions('profiles.update')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProfileDto,
    @CurrentTenant() companyId: string,
  ) {
    if (!companyId) throw new ForbiddenException('Usá PATCH /profiles/global/:id para perfiles de sistema globales');
    return this.rbacService.updateProfile(id, companyId, dto.name);
  }

  @Delete(':id')
  @Permissions('profiles.delete')
  remove(@Param('id', new ParseUUIDPipe()) id: string, @CurrentTenant() companyId: string) {
    if (!companyId) throw new ForbiddenException('Usá DELETE /profiles/global/:id para perfiles de sistema globales');
    return this.rbacService.deleteProfile(id, companyId);
  }

  @Get(':id/permissions')
  @Permissions('profiles.read')
  getPermissions(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentTenant() companyId: string,
    @CurrentUser() user,
  ) {
    return this.rbacService.getProfilePermissions(id, companyId, { profileId: user.profileId });
  }

  @Post(':id/permissions')
  @Permissions('profiles.update')
  assignPermission(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AssignPermissionDto,
    @CurrentTenant() companyId: string,
    @CurrentUser() user,
  ) {
    return this.rbacService.assignPermission(
      id,
      dto.permissionId,
      companyId,
      { profileId: user.profileId },
    );
  }

  @Delete(':id/permissions/:permissionId')
  @Permissions('profiles.update')
  removePermission(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('permissionId', new ParseUUIDPipe()) permissionId: string,
    @CurrentTenant() companyId: string,
    @CurrentUser() user,
  ) {
    return this.rbacService.removePermission(
      id,
      permissionId,
      companyId,
      { profileId: user.profileId },
    );
  }
}