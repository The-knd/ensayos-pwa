import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../commons/guards/permissions.guard';
import { Permissions } from '../../commons/decorators/permissions.decorator';
import { CurrentTenant } from '../../commons/decorators/current-tenant.decorator';
import { CurrentUser } from '../../commons/decorators/current-user.decorator';
import { RbacService } from '../rbac/rbac.service';
import { CatalogService } from './catalog.service';
import { CatalogItemDto } from './dto/catalog-item.dto';

@Controller('catalog')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CatalogController {
  constructor(
    private service: CatalogService,
    private rbacService: RbacService,
  ) {}

  @Get('context')
  async getContext(@CurrentUser() user, @CurrentTenant() companyId: string) {
    const permissions = await this.rbacService.getPermissionsByPrefix(user.sub, companyId, 'catalog');
    return { permissions, featureFlags: {} };
  }

  @Get('items')
  @Permissions('catalog.ver')
  list() {
    return this.service.list();
  }

  @Post('items')
  @Permissions('catalog.cargar')
  add(@Body() dto: CatalogItemDto) {
    const item = this.service.add(dto);
    return { created: 1, item };
  }
}