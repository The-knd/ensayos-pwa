import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeatureFlag } from './entities/feature-flag.entity';

@Injectable()
export class FeatureFlagsService {
  constructor(@InjectRepository(FeatureFlag) private repo: Repository<FeatureFlag>) {}

  async findAll(companyId: string): Promise<FeatureFlag[]> {
    return this.repo.find({ where: { companyId }, order: { key: 'ASC' } });
  }

  async getFlags(companyId: string, userId?: string): Promise<Record<string, boolean>> {
    const flags = await this.repo.find({
      where: [{ companyId, userId: null as any }, ...(userId ? [{ companyId, userId }] : [])],
    });

    const merged: Record<string, boolean> = {};
    for (const flag of flags) {
      merged[flag.key] = flag.enabled;
    }

    return Object.fromEntries(Object.entries(merged).filter(([, v]) => v === true));
  }

  async create(companyId: string, dto: { key: string; enabled?: boolean; userId?: string | null }) {
    const where: any = { companyId, key: dto.key };
    if (dto.userId) where.userId = dto.userId;
    else where.userId = null;
    const existing = await this.repo.findOne({ where });
    if (existing) throw new NotFoundException('Ya existe un feature flag con esa clave');
    return this.repo.save(this.repo.create({ companyId, key: dto.key, enabled: dto.enabled ?? false, userId: dto.userId ?? null }));
  }

  async update(id: string, companyId: string, dto: { enabled?: boolean; key?: string }) {
    const flag = await this.repo.findOne({ where: { id, companyId } });
    if (!flag) throw new NotFoundException('Feature flag no encontrado');
    if (dto.enabled !== undefined) flag.enabled = dto.enabled;
    if (dto.key !== undefined) flag.key = dto.key;
    return this.repo.save(flag);
  }

  async remove(id: string, companyId: string) {
    const flag = await this.repo.findOne({ where: { id, companyId } });
    if (!flag) throw new NotFoundException('Feature flag no encontrado');
    await this.repo.remove(flag);
    return { success: true };
  }
}