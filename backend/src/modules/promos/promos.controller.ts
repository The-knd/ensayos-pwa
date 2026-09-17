import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../commons/guards/permissions.guard';
import { Permissions } from '../../commons/decorators/permissions.decorator';
import { CurrentTenant } from '../../commons/decorators/current-tenant.decorator';
import { CurrentUser } from '../../commons/decorators/current-user.decorator';
import { RbacService } from '../rbac/rbac.service';
import { PromosService } from './promos.service';
import { CreatePromoDto } from './dto/create-promo.dto';

@Controller('promos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PromosController {
  constructor(
    private service: PromosService,
    private rbacService: RbacService,
  ) {}

  @Get('context')
  async getContext(@CurrentUser() user, @CurrentTenant() companyId: string) {
    const permissions = await this.rbacService.getPermissionsByPrefix(user.sub, companyId, 'promos');
    return { permissions, featureFlags: {} };
  }

  @Get()
  @Permissions('promos.ver')
  list() {
    return this.service.list();
  }

  @Post('create')
  @Permissions('promos.crear')
  create(@Body() dto: CreatePromoDto) {
    const promo = this.service.create(dto);
    return { created: 1, promo };
  }

  @Get(':id/detalle')
  @Permissions('promos.detalle')
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }
}