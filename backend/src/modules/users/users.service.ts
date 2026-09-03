import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from './entities/user.entity';
import { Profile } from '../rbac/entities/profile.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private repo: Repository<User>,
    @InjectRepository(Profile) private profileRepo: Repository<Profile>,
  ) {}

  findAll(companyId: string) {
    return this.repo.find({
      where: { companyId },
      select: ['id', 'email', 'fullName', 'status', 'profileId', 'createdAt'],
    });
  }

  findProfiles() {
    return this.profileRepo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string, companyId: string) {
    const user = await this.repo.findOne({ where: { id, companyId } });
    if (!user) throw new NotFoundException();
    return user;
  }

  async create(companyId: string, data: { email: string; password: string; fullName: string; profileId: string }) {
    const passwordHash = await bcrypt.hash(data.password, 10);
    return this.repo.save(
      this.repo.create({
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        profileId: data.profileId,
        companyId,
      }),
    );
  }

  async update(id: string, companyId: string, data: Partial<User>) {
    const user = await this.repo.findOne({ where: { id, companyId } });
    if (!user) throw new NotFoundException();
    if (data.email !== undefined) user.email = data.email;
    if (data.fullName !== undefined) user.fullName = data.fullName;
    if (data.profileId !== undefined) user.profileId = data.profileId;
    if (data.status !== undefined) user.status = data.status;
    return this.repo.save(user);
  }

  async toggleStatus(id: string, companyId: string) {
    const user = await this.repo.findOne({ where: { id, companyId } });
    if (!user) throw new NotFoundException();
    user.status = user.status === UserStatus.ACTIVE ? UserStatus.INACTIVE : UserStatus.ACTIVE;
    return this.repo.save(user);
  }

  async remove(id: string, companyId: string) {
    const user = await this.repo.findOne({ where: { id, companyId } });
    if (!user) throw new NotFoundException();
    await this.repo.softRemove(user);
    return { success: true };
  }
}
