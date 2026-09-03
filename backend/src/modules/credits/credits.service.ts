import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Credit } from './entities/credit.entity';
import { CreateCreditDto } from './dto/create-credit.dto';

@Injectable()
export class CreditsService {
  constructor(@InjectRepository(Credit) private repo: Repository<Credit>) {}

  findAll(companyId: string, query: { page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return this.repo.findAndCount({
      where: { companyId },
      relations: ['client'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
  }

  create(companyId: string, dto: CreateCreditDto) {
    return this.repo.save(this.repo.create({ ...dto, companyId }));
  }

  async updateStatus(id: string, companyId: string, status: string) {
    const credit = await this.repo.findOne({ where: { id, companyId } });
    if (!credit) throw new NotFoundException();
    credit.status = status as any;
    return this.repo.save(credit);
  }
}
