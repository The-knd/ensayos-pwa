import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../commons/guards/permissions.guard';
import { Permissions } from '../../commons/decorators/permissions.decorator';
import { CurrentTenant } from '../../commons/decorators/current-tenant.decorator';
import { CurrentUser } from '../../commons/decorators/current-user.decorator';
import { RbacService } from '../rbac/rbac.service';
import { CalculatorService } from './calculator.service';
import { SumDto } from './dto/sum.dto';

@Controller('calculator')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CalculatorController {
  constructor(
    private service: CalculatorService,
    private rbacService: RbacService,
  ) {}

  @Get('context')
  async getContext(@CurrentUser() user, @CurrentTenant() companyId: string) {
    const permissions = await this.rbacService.getPermissionsByPrefix(user.sub, companyId, 'calculator');
    return { permissions, featureFlags: {} };
  }

  @Post('sum')
  @Permissions('calculator.read')
  sum(@Body() dto: SumDto) {
    return this.service.sum(dto);
  }
}