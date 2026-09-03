import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';

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

  findAllCompanies() {
    return this.repo.find({
      select: ['id', 'name', 'logoUrl', 'primaryColor'],
      order: { name: 'ASC' },
    });
  }
}
