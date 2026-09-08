import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModulePlacement } from './entities/module-placement.entity';
import { CreatePlacementDto } from './dto/create-placement.dto';
import { UpdatePlacementDto } from './dto/update-placement.dto';

@Injectable()
export class ModulePlacementsService {
  constructor(
    @InjectRepository(ModulePlacement)
    private repo: Repository<ModulePlacement>,
  ) {}

  findByCompany(companyId: string) {
    return this.repo.find({
      where: { companyId },
      order: { position: 'ASC', label: 'ASC' },
    });
  }

  async create(companyId: string, dto: CreatePlacementDto) {
    const entity = this.repo.create({ ...dto, companyId });
    return this.repo.save(entity);
  }

  async update(id: string, companyId: string, dto: UpdatePlacementDto) {
    const entity = await this.repo.findOne({ where: { id, companyId } });
    if (!entity) throw new NotFoundException('Ubicación no encontrada');
    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  async remove(id: string, companyId: string) {
    const entity = await this.repo.findOne({ where: { id, companyId } });
    if (!entity) throw new NotFoundException('Ubicación no encontrada');
    return this.repo.remove(entity);
  }
}
