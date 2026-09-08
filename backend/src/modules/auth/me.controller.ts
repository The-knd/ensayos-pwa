import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';
import { CurrentUser } from '../../commons/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';
import { ConfigService as AppConfigService } from '../config/config.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { ModulePlacementsService } from '../placements/module-placements.service';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(
    private usersService: UsersService,
    private configService: AppConfigService,
    private flagsService: FeatureFlagsService,
    private placementsService: ModulePlacementsService,
  ) {}

  @Get('bootstrap')
  async bootstrap(@CurrentUser() authUser: { sub: string; companyId: string }) {
    const user = await this.usersService.findOne(authUser.sub, authUser.companyId);
    const company = await this.configService.findOne(authUser.companyId);
    const featureFlags = await this.flagsService.getFlags(authUser.companyId, authUser.sub);
    const modulePlacements = await this.placementsService.findByCompany(authUser.companyId);

    return {
      user: { id: user.id, name: user.fullName, email: user.email },
      company: {
        id: company.id,
        name: company.name,
        theme: { primaryColor: company.primaryColor, logoUrl: company.logoUrl },
      },
      featureFlags,
      modulePlacements,
    };
  }
}
