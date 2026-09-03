import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';
import { CurrentUser } from '../../commons/decorators/current-user.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Company } from '../config/entities/company.entity';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Company) private companyRepo: Repository<Company>,
  ) {}

  @Get('bootstrap')
  async bootstrap(@CurrentUser() authUser: { sub: string; companyId: string }) {
    const user = await this.userRepo.findOneByOrFail({ id: authUser.sub });
    const company = await this.companyRepo.findOneByOrFail({ id: authUser.companyId });

    return {
      user: { id: user.id, name: user.fullName, email: user.email },
      company: {
        id: company.id,
        theme: { primaryColor: company.primaryColor, logoUrl: company.logoUrl },
      },
    };
  }
}
