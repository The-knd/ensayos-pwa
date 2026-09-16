import {
  Controller, Get, Post, Patch, Put, Delete, Body, Param, ParseUUIDPipe, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../commons/guards/permissions.guard';
import { Permissions } from '../../commons/decorators/permissions.decorator';
import { CurrentTenant } from '../../commons/decorators/current-tenant.decorator';
import { CurrentUser } from '../../commons/decorators/current-user.decorator';
import { ModulePlacementsService } from './module-placements.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { UpdateAssignmentDto, PublishModuleDto } from './dto/update-assignment.dto';
import { UpsertModuleVariantDto } from './dto/upsert-module-variant.dto';

@Controller('config/modules')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ModulePlacementsController {
  constructor(private service: ModulePlacementsService) {}

  @Get()
  @Permissions('config.read')
  findAll(@CurrentUser() user, @CurrentTenant() companyId: string | null) {
    return this.service.findAdminModules({ sub: user.sub, profileId: user.profileId, companyId });
  }

  @Post()
  @Permissions('config.update')
  create(
    @CurrentUser() user,
    @CurrentTenant() companyId: string | null,
    @Body() dto: CreateModuleDto,
  ) {
    return this.service.create(
      { sub: user.sub, profileId: user.profileId, companyId },
      companyId,
      dto,
    );
  }

  @Patch(':id')
  @Permissions('config.update')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user,
    @CurrentTenant() companyId: string | null,
    @Body() dto: UpdateModuleDto,
  ) {
    return this.service.update(
      id,
      { sub: user.sub, profileId: user.profileId, companyId },
      companyId,
      dto,
    );
  }

  @Patch(':id/assignment')
  @Permissions('config.update')
  updateAssignment(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user,
    @CurrentTenant() companyId: string | null,
    @Body() dto: UpdateAssignmentDto,
  ) {
    return this.service.updateOwnerAssignment(
      id,
      { sub: user.sub, profileId: user.profileId, companyId },
      companyId,
      dto,
    );
  }

  @Delete(':id')
  @Permissions('config.update')
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user,
    @CurrentTenant() companyId: string | null,
  ) {
    return this.service.remove(
      id,
      { sub: user.sub, profileId: user.profileId, companyId },
      companyId,
    );
  }

  @Post(':id/publications')
  @Permissions('config.update')
  publish(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user,
    @CurrentTenant() companyId: string | null,
    @Body() dto: PublishModuleDto,
  ) {
    return this.service.publish(
      id,
      { sub: user.sub, profileId: user.profileId, companyId },
      companyId,
      dto,
    );
  }

  @Delete(':id/publications/:companyId')
  @Permissions('config.update')
  unpublish(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('companyId', new ParseUUIDPipe()) targetCompanyId: string,
    @CurrentUser() user,
    @CurrentTenant() companyId: string | null,
  ) {
    return this.service.unpublish(
      id,
      targetCompanyId,
      { sub: user.sub, profileId: user.profileId, companyId },
      companyId,
    );
  }

  // --- Variantes por empresa (módulos compartidos) ---

  @Get(':id/variants')
  @Permissions('config.read')
  variants(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user,
    @CurrentTenant() companyId: string | null,
  ) {
    return this.service.getVariants(id, { sub: user.sub, profileId: user.profileId, companyId }, companyId);
  }

  @Put(':id/variants/:companyId')
  @Permissions('config.update')
  upsertVariant(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('companyId', new ParseUUIDPipe()) targetCompanyId: string,
    @CurrentUser() user,
    @CurrentTenant() companyId: string | null,
    @Body() dto: UpsertModuleVariantDto,
  ) {
    return this.service.upsertVariant(
      id,
      targetCompanyId,
      { sub: user.sub, profileId: user.profileId, companyId },
      companyId,
      dto,
    );
  }

  @Delete(':id/variants/:companyId')
  @Permissions('config.update')
  removeVariant(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('companyId', new ParseUUIDPipe()) targetCompanyId: string,
    @CurrentUser() user,
    @CurrentTenant() companyId: string | null,
  ) {
    return this.service.deleteVariant(
      id,
      targetCompanyId,
      { sub: user.sub, profileId: user.profileId, companyId },
      companyId,
    );
  }
}