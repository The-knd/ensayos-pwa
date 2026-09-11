import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../commons/guards/permissions.guard';
import { Permissions } from '../../commons/decorators/permissions.decorator';
import { CurrentTenant } from '../../commons/decorators/current-tenant.decorator';
import { CurrentUser } from '../../commons/decorators/current-user.decorator';
import { ModulePlacementsService } from './module-placements.service';
import { CreatePlacementDto } from './dto/create-placement.dto';
import { UpdatePlacementDto } from './dto/update-placement.dto';

@Controller('config/modules')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ModulePlacementsController {
  constructor(private service: ModulePlacementsService) {}

  @Get()
  @Permissions('config.read')
  findAll(@CurrentTenant() companyId: string) {
    return this.service.findByCompany(companyId);
  }

  @Post()
  @Permissions('config.update')
  create(@CurrentUser() user, @CurrentTenant() companyId: string, @Body() dto: CreatePlacementDto) {
    return this.service.create(companyId, dto, user.sub);
  }

  @Patch(':id')
  @Permissions('config.update')
  update(
    @Param('id') id: string,
    @CurrentTenant() companyId: string,
    @Body() dto: UpdatePlacementDto,
  ) {
    return this.service.update(id, companyId, dto);
  }

  @Delete(':id')
  @Permissions('config.update')
  remove(@Param('id') id: string, @CurrentTenant() companyId: string) {
    return this.service.remove(id, companyId);
  }
}
