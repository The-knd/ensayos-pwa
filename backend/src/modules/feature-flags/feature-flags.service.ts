import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeatureFlag } from './entities/feature-flag.entity';

@Injectable()
export class FeatureFlagsService {
  constructor(@InjectRepository(FeatureFlag) private repo: Repository<FeatureFlag>) {}

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
}
