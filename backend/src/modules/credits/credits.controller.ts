import { Controller, Get, Post, Patch, Param, Body, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../commons/guards/permissions.guard';
import { Permissions } from '../../commons/decorators/permissions.decorator';
import { CurrentTenant } from '../../commons/decorators/current-tenant.decorator';
import { CurrentUser } from '../../commons/decorators/current-user.decorator';
import { CreditsService } from './credits.service';
import { CreateCreditDto } from './dto/create-credit.dto';
import { StudyCreditDto } from './dto/study-credit.dto';
import { CreditResultDto } from './dto/credit-result.dto';
import { CreditStatus } from './entities/credit.entity';
import { RbacService } from '../rbac/rbac.service';

@Controller('credits')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CreditsController {
  constructor(
    private service: CreditsService,
    private rbacService: RbacService,
  ) {}

  @Get('context')
  async getContext(@CurrentUser() user, @CurrentTenant() companyId: string) {
    const permissions = (await this.rbacService.getPermissions(user.sub, companyId)).filter(
      (p) => p.startsWith('credits.'),
    );
    return { permissions, featureFlags: {} };
  }

  @Get()
  @Permissions('credits.read')
  findAll(@CurrentTenant() companyId: string, @Query() query: any) {
    return this.service.findAll(companyId, query);
  }

  @Get(':id/documents')
  @Permissions('credits.read')
  documents(@Param('id') id: string, @CurrentTenant() companyId: string) {
    return this.service.listDocuments(id, companyId);
  }

  @Get(':id')
  @Permissions('credits.read')
  findOne(@Param('id') id: string, @CurrentTenant() companyId: string) {
    return this.service.findOne(id, companyId);
  }

  @Post('study')
  @Permissions('credits.study')
  study(@CurrentTenant() companyId: string, @Body() dto: StudyCreditDto) {
    return this.service.study(companyId, dto);
  }

  @Post()
  @Permissions('credits.create')
  create(@CurrentTenant() companyId: string, @Body() dto: CreateCreditDto) {
    return this.service.create(companyId, dto);
  }

  @Post(':id/result')
  @Permissions('credits.study')
  result(@Param('id') id: string, @CurrentTenant() companyId: string, @Body() dto: CreditResultDto) {
    return this.service.result(id, companyId, dto);
  }

  @Post(':id/sign')
  @Permissions('credits.study')
  sign(@Param('id') id: string, @CurrentTenant() companyId: string) {
    return this.service.sign(id, companyId);
  }

  @Post(':id/finalize')
  @Permissions('credits.study')
  finalize(@Param('id') id: string, @CurrentTenant() companyId: string) {
    return this.service.finalize(id, companyId);
  }

  @Patch(':id/study')
  @Permissions('credits.study')
  studyStatus(@Param('id') id: string, @CurrentTenant() companyId: string) {
    return this.service.updateStatus(id, companyId, CreditStatus.IN_STUDY);
  }

  @Patch(':id/approve')
  @Permissions('credits.update')
  approve(@Param('id') id: string, @CurrentTenant() companyId: string) {
    return this.service.updateStatus(id, companyId, CreditStatus.APPROVED);
  }

  @Patch(':id/reject')
  @Permissions('credits.update')
  reject(@Param('id') id: string, @CurrentTenant() companyId: string) {
    return this.service.updateStatus(id, companyId, CreditStatus.REJECTED);
  }
}