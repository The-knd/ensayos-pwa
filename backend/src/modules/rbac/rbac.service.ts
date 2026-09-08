import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Profile } from './entities/profile.entity';
import { Permission } from './entities/permission.entity';
import { ProfilePermission } from './entities/profile-permission.entity';
import Redis from 'ioredis';

@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Profile) private profileRepo: Repository<Profile>,
    @InjectRepository(Permission) private permissionRepo: Repository<Permission>,
    @InjectRepository(ProfilePermission) private profilePermRepo: Repository<ProfilePermission>,
    @Inject(Redis) private redis: Redis,
  ) {}

  private cacheKey(userId: string): string {
    return `rbac:permissions:${userId}`;
  }

  async getPermissions(userId: string, companyId: string): Promise<string[]> {
    const cached = await this.redis.get(this.cacheKey(userId));
    if (cached) return JSON.parse(cached);

    // Mismo alcance que la query cruda anterior: si el usuario no existe o no
    // pertenece a companyId, no hay permisos (nunca se filtran por perfil de
    // otra empresa).
    const user = await this.userRepo.findOne({ where: { id: userId, companyId } });
    const permissions = user ? await this.getProfilePermissions(user.profileId) : [];
    const codes = permissions.map((p) => p.code);

    await this.redis.set(this.cacheKey(userId), JSON.stringify(codes), 'EX', 120);
    return codes;
  }

  async invalidateCache(userId: string): Promise<void> {
    await this.redis.del(this.cacheKey(userId));
  }

  /** Permisos del usuario que empiezan por `${prefix}.` — usado por los endpoints GET .../context de cada módulo. */
  async getPermissionsByPrefix(userId: string, companyId: string, prefix: string): Promise<string[]> {
    const all = await this.getPermissions(userId, companyId);
    return all.filter((p) => p.startsWith(`${prefix}.`));
  }

  /* ---------- Profiles ---------- */

  findProfiles(companyId: string) {
    return this.profileRepo.find({
      where: [
        { companyId },
        { companyId: IsNull() },
      ],
      order: { name: 'ASC' },
    });
  }

  async createProfile(companyId: string, name: string) {
    const exists = await this.profileRepo.findOne({ where: { name, companyId } });
    if (exists) throw new ConflictException('Ya existe un perfil con ese nombre');
    return this.profileRepo.save(this.profileRepo.create({ name, companyId }));
  }

  async updateProfile(id: string, companyId: string, name: string) {
    const profile = await this.profileRepo.findOne({ where: { id, companyId } });
    if (!profile) throw new NotFoundException('Perfil no encontrado');
    profile.name = name;
    return this.profileRepo.save(profile);
  }

  async deleteProfile(id: string, companyId: string) {
    const profile = await this.profileRepo.findOne({ where: { id, companyId } });
    if (!profile) throw new NotFoundException('Perfil no encontrado');
    const usersCount = await this.userRepo.count({ where: { profileId: id } });
    if (usersCount > 0) throw new ConflictException('No se puede eliminar: hay usuarios asignados a este perfil');
    await this.profileRepo.remove(profile);
    return { success: true };
  }

  /* ---------- Profile Permissions ---------- */

  async getProfilePermissions(profileId: string) {
    const rows = await this.profilePermRepo.find({ where: { profileId }, relations: ['permission'] });
    return rows.map((r) => r.permission);
  }

  async assignPermission(profileId: string, permissionId: string) {
    const exists = await this.profilePermRepo.findOne({ where: { profileId, permissionId } });
    if (exists) return exists;
    return this.profilePermRepo.save(this.profilePermRepo.create({ profileId, permissionId }));
  }

  async removePermission(profileId: string, permissionId: string) {
    const row = await this.profilePermRepo.findOne({ where: { profileId, permissionId } });
    if (!row) throw new NotFoundException('Permiso no asignado');
    await this.profilePermRepo.remove(row);
    return { success: true };
  }

  findAllPermissions() {
    return this.permissionRepo.find({ order: { code: 'ASC' } });
  }
}
