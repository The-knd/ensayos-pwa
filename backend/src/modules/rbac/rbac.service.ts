import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import Redis from 'ioredis';

@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @Inject(Redis) private redis: Redis,
  ) {}

  private cacheKey(userId: string): string {
    return `rbac:permissions:${userId}`;
  }

  async getPermissions(userId: string, companyId: string): Promise<string[]> {
    const cached = await this.redis.get(this.cacheKey(userId));
    if (cached) return JSON.parse(cached);

    const result: { code: string }[] = await this.userRepo.query(
      `
      SELECT DISTINCT p.code
      FROM users u
      JOIN profile_permissions pp ON pp.profile_id = u.profile_id
      JOIN permissions p ON p.id = pp.permission_id
      WHERE u.id = $1 AND u.company_id = $2
      `,
      [userId, companyId],
    );

    const codes = result.map((r) => r.code);
    await this.redis.set(this.cacheKey(userId), JSON.stringify(codes), 'EX', 120);
    return codes;
  }

  async invalidateCache(userId: string): Promise<void> {
    await this.redis.del(this.cacheKey(userId));
  }
}
