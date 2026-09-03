import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company, AuthStrategyType } from '../config/entities/company.entity';
import { AuthStrategy } from './interfaces/auth-strategy.interface';
import { LocalAuthStrategy } from './strategies/local-auth.strategy';
import { PasskeyAuthStrategy } from './strategies/passkey-auth.strategy';

@Injectable()
export class AuthStrategyResolver {
  constructor(
    @InjectRepository(Company) private companyRepo: Repository<Company>,
    private localStrategy: LocalAuthStrategy,
    private passkeyStrategy: PasskeyAuthStrategy,
  ) {}

  async resolve(companyId: string): Promise<AuthStrategy> {
    const company = await this.companyRepo.findOneByOrFail({ id: companyId });

    switch (company.authStrategy) {
      case AuthStrategyType.PASSKEY:
        return this.passkeyStrategy;
      case AuthStrategyType.MICROSOFT:
        throw new Error('Microsoft auth strategy no implementada todavía');
      case AuthStrategyType.LOCAL:
      default:
        return this.localStrategy;
    }
  }
}
