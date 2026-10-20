import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, ForbiddenException, BadRequestException, ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../commons/guards/permissions.guard';
import { SuperAdminGuard } from '../../commons/guards/super-admin.guard';
import { Permissions } from '../../commons/decorators/permissions.decorator';
import { CurrentTenant } from '../../commons/decorators/current-tenant.decorator';
import { CurrentUser } from '../../commons/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { RbacService } from '../rbac/rbac.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SUPER_ADMIN_PROFILE_ID } from '../../commons/constants';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(
    private service: UsersService,
    private rbacService: RbacService,
  ) {}

  @Get('context')
  async getContext(@CurrentUser() user, @CurrentTenant() companyId: string) {
    const permissions = await this.rbacService.getPermissionsByPrefix(user.sub, companyId, 'users');
    return { permissions, featureFlags: {} };
  }

  @Get('profiles')
  @Permissions('users.read')
  findProfiles(@CurrentTenant() companyId: string) {
    // Fuente única de verdad: RbacService.findProfiles ya filtra por tenant
    // (companyId propio + perfiles de sistema con companyId NULL).
    return this.rbacService.findProfiles(companyId);
  }

  @Get()
  @Permissions('users.read')
  findAll(@CurrentUser() user, @CurrentTenant() companyId: string) {
    return this.service.findAll(companyId);
  }

  /**
   * Listado global (panel de configuración global): todos los usuarios de
   * todas las empresas. Reservado al superadmin.
   */
  @Get('global')
  @Permissions('users.read')
  findGlobal(@CurrentUser() user) {
    if (user.profileId !== SUPER_ADMIN_PROFILE_ID) {
      throw new ForbiddenException('Solo el superadmin puede ver el listado global de usuarios');
    }
    return this.service.findAllGlobal();
  }

  /**
   * Creación de usuarios globales (sin empresa) desde el portal global:
   * super_admin o un perfil global de sistema. Solo el superadmin puede hacerla.
   */
  @Post('global')
  @Permissions('users.create')
  @UseGuards(SuperAdminGuard)
  async createGlobal(@Body() dto: CreateUserDto) {
    await this.rbacService.assertGlobalSystemProfile(dto.profileId);
    return this.service.create(null, dto);
  }

  @Post()
  @Permissions('users.create')
  async create(
    @CurrentUser() user,
    @CurrentTenant() companyId: string | null,
    @Body() dto: CreateUserDto,
  ) {
    const isSuperAdmin = user.profileId === SUPER_ADMIN_PROFILE_ID;
    // Sesión global sin empresa: solo el superadmin crea usuarios (portal o
    // con perfil super_admin); una cuenta de sistema no debería.
    if (!isSuperAdmin && !companyId) {
      throw new ForbiddenException('Solo el superadmin puede crear usuarios desde la sesión global');
    }
    // El super_admin es un rol de sistema: solo el superadmin puede asignarlo
    // y nunca lleva empresa vinculada.
    if (!isSuperAdmin && dto.profileId === SUPER_ADMIN_PROFILE_ID) {
      throw new ForbiddenException('El perfil super_admin es de sistema; solo el superadmin puede asignarlo');
    }
    if (dto.profileId === SUPER_ADMIN_PROFILE_ID) {
      return this.service.create(null, dto);
    }
    if (isSuperAdmin) {
      if (!dto.companyId) {
        throw new BadRequestException('El superadmin debe indicar la empresa principal del usuario');
      }
      return this.service.create(dto.companyId, dto);
    }
    // Admin de empresa: el perfil elegido debe ser de SU empresa (el dropdown
    // filtra en cliente, aquí se valida de verdad contra la BD).
    await this.rbacService.assertCompanyProfile(dto.profileId, companyId);
    return this.service.create(companyId, dto);
  }

  @Patch(':id')
  @Permissions('users.update')
  async update(
    @CurrentUser() user,
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentTenant() companyId: string | null,
    @Body() dto: UpdateUserDto,
  ) {
    const isSuperAdmin = user.profileId === SUPER_ADMIN_PROFILE_ID;
    if (!isSuperAdmin && !companyId) {
      throw new ForbiddenException('Solo el superadmin opera sobre usuarios globales');
    }
    if (dto.companyId !== undefined && !isSuperAdmin) {
      throw new ForbiddenException('Solo el superadmin puede reasignar la empresa de un usuario');
    }
    if (!isSuperAdmin && dto.profileId === SUPER_ADMIN_PROFILE_ID) {
      throw new ForbiddenException('El perfil super_admin es de sistema; solo el superadmin puede asignarlo');
    }
    if (dto.profileId !== undefined && !isSuperAdmin) {
      await this.rbacService.assertCompanyProfile(dto.profileId, companyId);
    }
    return this.service.update(id, companyId, dto);
  }

  @Patch(':id/status')
  @Permissions('users.update')
  toggleStatus(
    @CurrentUser() user,
    @Param('id', new ParseUUIDPipe()) id,
    @CurrentTenant() companyId: string | null,
  ) {
    // El superadmin (sesión global, companyId null) opera sin filtro de empresa.
    const isSuperAdmin = user.profileId === SUPER_ADMIN_PROFILE_ID;
    if (!isSuperAdmin && !companyId) {
      throw new ForbiddenException('Solo el superadmin opera sobre usuarios globales');
    }
    return this.service.toggleStatus(id, companyId, isSuperAdmin);
  }

  /**
   * Reset de contraseña por administración (no requiere la actual).
   * El superadmin puede resetear cualquier usuario (panel global); un admin
   * solo los de su propia empresa.
   */
  @Patch(':id/password')
  @Permissions('users.update')
  resetPassword(
    @CurrentUser() user,
    @Param('id', new ParseUUIDPipe()) id,
    @CurrentTenant() companyId: string | null,
    @Body() dto: ResetPasswordDto,
  ) {
    const isSuperAdmin = user.profileId === SUPER_ADMIN_PROFILE_ID;
    if (!isSuperAdmin && !companyId) {
      throw new ForbiddenException('Solo el superadmin opera sobre usuarios globales');
    }
    return this.service.resetPassword(id, companyId, dto.password, isSuperAdmin);
  }

  @Delete(':id')
  @Permissions('users.delete')
  remove(
    @CurrentUser() user,
    @Param('id', new ParseUUIDPipe()) id,
    @CurrentTenant() companyId: string | null,
  ) {
    const isSuperAdmin = user.profileId === SUPER_ADMIN_PROFILE_ID;
    if (!isSuperAdmin && !companyId) {
      throw new ForbiddenException('Solo el superadmin opera sobre usuarios globales');
    }
    return this.service.remove(id, companyId);
  }
}
