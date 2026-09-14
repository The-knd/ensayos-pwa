import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company, AuthStrategyType } from './entities/company.entity';
import { CreateCompanyDto } from './dto/company.dto';

@Injectable()
export class ConfigService {
  constructor(@InjectRepository(Company) private repo: Repository<Company>) {}

  findOne(companyId: string) {
    return this.repo.findOneByOrFail({ id: companyId });
  }

  async update(companyId: string, data: Partial<Company>) {
    const company = await this.repo.findOneByOrFail({ id: companyId });
    Object.assign(company, data);
    return this.repo.save(company);
  }

  async create(dto: CreateCompanyDto) {
    const company = this.repo.create({
      name: dto.name,
      primaryColor: dto.primaryColor ?? '#0057B8',
      authStrategy: dto.authStrategy ?? AuthStrategyType.LOCAL,
      isActive: dto.isActive ?? true,
      logoUrl: dto.logoUrl ?? '',
    });
    return this.repo.save(company);
  }

  findAllCompanies() {
    return this.repo.find({
      select: ['id', 'name', 'logoUrl', 'primaryColor', 'isActive', 'authStrategy'],
      order: { isActive: 'DESC', name: 'ASC' },
    });
  }

  findActiveCompanies() {
    return this.repo.find({
      where: { isActive: true },
      select: ['id', 'name', 'logoUrl', 'primaryColor'],
      order: { name: 'ASC' },
    });
  }
}
