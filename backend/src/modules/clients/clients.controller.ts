import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query, ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../commons/guards/permissions.guard';
import { Permissions } from '../../commons/decorators/permissions.decorator';
import { CurrentTenant } from '../../commons/decorators/current-tenant.decorator';
import { CurrentUser } from '../../commons/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../commons/dto/pagination.dto';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { RbacService } from '../rbac/rbac.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';

@Controller('clients')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClientsController {
  constructor(
    private service: ClientsService,
    private rbacService: RbacService,
    private flagsService: FeatureFlagsService,
  ) {}

  @Get('context')
  async getContext(@CurrentUser() user, @CurrentTenant() companyId: string) {
    const permissions = await this.rbacService.getPermissionsByPrefix(user.sub, companyId, 'clients');
    const allFlags = await this.flagsService.getFlags(companyId, user.sub);
    const featureFlags = Object.fromEntries(
      Object.entries(allFlags).filter(([k]) => k.toLowerCase().includes('client')),
    );
    return { permissions, featureFlags };
  }

  @Get()
  @Permissions('clients.read')
  findAll(@CurrentTenant() companyId: string, @Query() query: PaginationQueryDto) {
    return this.service.findAll(companyId, query);
  }

  @Get(':id')
  @Permissions('clients.read')
  findOne(@Param('id', new ParseUUIDPipe()) id: string, @CurrentTenant() companyId: string) {
    return this.service.findOne(id, companyId);
  }

  @Post()
  @Permissions('clients.create')
  create(@CurrentTenant() companyId: string, @Body() dto: CreateClientDto) {
    return this.service.create(companyId, dto);
  }

  @Patch(':id')
  @Permissions('clients.update')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentTenant() companyId: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.service.update(id, companyId, dto);
  }

  @Patch(':id/status')
  @Permissions('clients.update')
  toggleStatus(@Param('id', new ParseUUIDPipe()) id: string, @CurrentTenant() companyId: string) {
    return this.service.toggleStatus(id, companyId);
  }

  @Delete(':id')
  @Permissions('clients.delete')
  remove(@Param('id', new ParseUUIDPipe()) id: string, @CurrentTenant() companyId: string) {
    return this.service.remove(id, companyId);
  }
}
