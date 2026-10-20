import { Injectable, Inject, OnModuleInit, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository, In, IsNull, Not } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Profile } from './entities/profile.entity';
import { Permission } from './entities/permission.entity';
import { ProfilePermission } from './entities/profile-permission.entity';
import { SUPER_ADMIN_PROFILE_ID, ADMIN_PROFILE_ID, VENDEDOR_PROFILE_ID } from '../../commons/constants';
import { HIDDEN_SYSTEM_MODULES } from '../../commons/system-modules';
import Redis from 'ioredis';
import { StructuredLogger } from '../../commons/logger/structured-logger.service';

@Injectable()
export class RbacService implements OnModuleInit {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Profile) private profileRepo: Repository<Profile>,
    @InjectRepository(Permission) private permissionRepo: Repository<Permission>,
    @InjectRepository(ProfilePermission) private profilePermRepo: Repository<ProfilePermission>,
    @Inject(Redis) private redis: Redis,
    private logger: StructuredLogger,
  ) {}

  /** Registra al arrancar los permisos de los módulos ocultos (sin UI). Idempotente. */
  async onModuleInit(): Promise<void> {
    for (const mod of HIDDEN_SYSTEM_MODULES) {
      await this.registerModulePermissions(mod.resource, mod.actions);
    }
  }

  private cacheKey(userId: string): string {
    return `rbac:permissions:${userId}`;
  }

  /**
   * Auto-registro de permisos al crear/actualizar un módulo: hace upsert de
   * `resource.action` en permissions (code UNIQUE). Por defecto **no asigna a
   * ningún perfil**: los permisos recién registrados quedan deshabilitados para
   * todos los usuarios y se habilitan a mano desde la gestión de perfiles
   * (`/profiles/:id/permissions`, superadmin en todas las empresas o el admin de
   * su propia empresa). El superadmin ya accede a todo de forma directa.
   * Idempotente.
   *
   * Acepta un `manager` opcional (EntityManager de transacción): los callers que
   * operan dentro de `dataSource.transaction` lo pasan para que la creación del
   * placement y el registro de permisos sean atómicos.
   */
  async registerModulePermissions(
    resource: string,
    actions: string[],
    profileIds?: string[],
    manager?: EntityManager,
  ): Promise<void> {
    // Se registra UNA permisión por cada acción del módulo (CRUD u operación
    // custom como `sumar`/`restar`), pero sin otorgarla a ningún perfil: queda
    // a disposición para que el admin la asigne (idempotente vía code UNIQUE).
    const targets = Array.from(new Set(actions));
    if (targets.length === 0) return;

    const em = manager ?? this.permissionRepo.manager;
    const profileTargets = profileIds ?? [];

    for (const action of targets) {
      const code = `${resource}.${action}`;
      let permission = await em.findOne(Permission, { where: { code } });
      if (!permission) {
        permission = await em.save(em.create(Permission, { resource, action, code }));
      }
      for (const profileId of profileTargets) {
        const exists = await em.findOne(ProfilePermission, {
          where: { profileId, permissionId: permission.id },
        });
        if (!exists) {
          await em.save(em.create(ProfilePermission, { profileId, permissionId: permission.id }));
        }
      }
    }
  }

  async getPermissions(userId: string, companyId: string | null): Promise<string[]> {
    const cached = await this.redis.get(this.cacheKey(userId));
    if (cached) return JSON.parse(cached);

    // companyId null == sesión de superadmin (selector global) o superadmin
    // operando sobre otra empresa: el perfil se resuelve por id del usuario.
    // Un superadmin dentro de una empresa ajena no está en la lista de usuarios
    // de esa empresa, así que si la búsqueda por (id, company) falla, se busca
    // por id únicamente (no hay escalada: los tokens fijan la empresa del usuario).
    const user =
      (companyId &&
        (await this.userRepo.findOne({ where: { id: userId, companyId } }))) ||
      (await this.userRepo.findOne({ where: { id: userId } }));

    let permissions: Permission[];
    if (user && user.profileId === SUPER_ADMIN_PROFILE_ID) {
      permissions = await this.permissionRepo.find();
    } else {
      permissions = user ? await this.getProfilePermissions(user.profileId, companyId) : [];
    }
    const codes = permissions.map((p) => p.code);

    await this.redis.set(this.cacheKey(userId), JSON.stringify(codes), 'EX', 120);
    return codes;
  }

  async invalidateCache(userId: string): Promise<void> {
    await this.redis.del(this.cacheKey(userId));
  }

  /** Permisos del usuario que empiezan por `${prefix}.` — usado por los endpoints GET .../context de cada módulo. */
  async getPermissionsByPrefix(userId: string, companyId: string | null, prefix: string): Promise<string[]> {
    const all = await this.getPermissions(userId, companyId);
    return all.filter((p) => p.startsWith(`${prefix}.`));
  }

  /* ---------- Profiles ---------- */

  findProfiles(companyId: string | null) {
    // Perfiles de sistema: super_admin y los perfiles globales creados desde el
    // portal; admin/vendedor ahora son POR EMPRESA (clones con mismo nombre,
    // permisos independientes); sus plantillas globales quedan ocultas y se usan
    // solo para clonar.
    if (companyId) {
      return this.profileRepo.find({
        where: [
          { companyId },
          { companyId: IsNull(), id: SUPER_ADMIN_PROFILE_ID },
        ],
        order: { name: 'ASC' },
      });
    }
    return this.findGlobalSystemProfiles();
  }

  /**
   * Perfiles globales de sistema (company_id NULL): super_admin y los creados
   * desde el portal global. Excluye las plantillas admin/vendedor, que siguen
   * ocultas (solo se usan para clonar en `ensureCompanyProfiles`).
   */
  findGlobalSystemProfiles() {
    return this.profileRepo.find({
      where: {
        companyId: IsNull(),
        id: Not(In([ADMIN_PROFILE_ID, VENDEDOR_PROFILE_ID])),
      },
      order: { name: 'ASC' },
    });
  }

  /**
   * Asegura los perfiles de sistema `admin` y `vendedor` de una empresa, creados
   * como clones de la plantilla global (cada empresa configura los suyos). Se
   * invoca al crear una empresa en runtime. Idempotente.
   */
  async ensureCompanyProfiles(companyId: string): Promise<void> {
    for (const template of [
      { id: ADMIN_PROFILE_ID, name: 'admin' },
      { id: VENDEDOR_PROFILE_ID, name: 'vendedor' },
    ]) {
      const existing = await this.profileRepo.findOne({ where: { name: template.name, companyId } });
      if (existing) continue;
      const tpl = await this.profileRepo.findOne({ where: { id: template.id } });
      if (!tpl) continue;
      const clone = await this.profileRepo.save(
        this.profileRepo.create({ name: template.name, companyId, isSystemRole: true }),
      );
      const grants = await this.profilePermRepo.find({ where: { profileId: template.id } });
      if (grants.length) {
        await this.profilePermRepo.save(
          grants.map((g) => this.profilePermRepo.create({ profileId: clone.id, permissionId: g.permissionId })),
        );
      }
    }
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

  /* ---------- Perfiles globales de sistema (portal del superadmin) ---------- */

  /**
   * Perfil global editable: company_id NULL y no es una plantilla de sistema
   * (super_admin, admin ni vendedor), que son inmutables por API.
   */
  private async findEditableGlobalProfile(id: string): Promise<Profile> {
    const profile = await this.profileRepo.findOne({ where: { id } });
    if (!profile || profile.companyId !== null) throw new NotFoundException('Perfil no encontrado');
    if (profile.id === SUPER_ADMIN_PROFILE_ID || profile.id === ADMIN_PROFILE_ID || profile.id === VENDEDOR_PROFILE_ID) {
      throw new ForbiddenException('Este perfil de sistema no se puede modificar ni eliminar');
    }
    return profile;
  }

  /** Crea un perfil de sistema global (sin empresa), visible solo en el portal. */
  async createGlobalSystemProfile(name: string) {
    const exists = await this.profileRepo.findOne({ where: { name, companyId: IsNull() } });
    if (exists) throw new ConflictException('Ya existe un perfil con ese nombre');
    return this.profileRepo.save(
      this.profileRepo.create({ name, companyId: null, isSystemRole: true }),
    );
  }

  async updateGlobalSystemProfile(id: string, name: string) {
    const profile = await this.findEditableGlobalProfile(id);
    profile.name = name;
    return this.profileRepo.save(profile);
  }

  async deleteGlobalSystemProfile(id: string) {
    const profile = await this.findEditableGlobalProfile(id);
    const usersCount = await this.userRepo.count({ where: { profileId: id } });
    if (usersCount > 0) throw new ConflictException('No se puede eliminar: hay usuarios asignados a este perfil');
    await this.profileRepo.remove(profile);
    return { success: true };
  }

  /**
   * El perfil debe existir y pertenecer a la empresa indicada (nunca global ni
   * plantilla de sistema): evita que un admin asigne vía API perfiles de otra
   * empresa u ocultos (OWASP A01:2021). Solo para callers de empresa.
   */
  async assertCompanyProfile(profileId: string, companyId: string | null): Promise<void> {
    const profile = await this.profileRepo.findOne({ where: { id: profileId } });
    if (!companyId || !profile || profile.companyId !== companyId) {
      throw new ForbiddenException('El perfil no pertenece a esta empresa');
    }
  }

  /**
   * El perfil debe ser un perfil global de sistema (company_id NULL, sin ser
   * una plantilla oculta): usado al crear usuarios globales desde el portal.
   */
  async assertGlobalSystemProfile(profileId: string): Promise<void> {
    const profile = await this.profileRepo.findOne({ where: { id: profileId } });
    if (
      !profile ||
      profile.companyId !== null ||
      profile.id === ADMIN_PROFILE_ID ||
      profile.id === VENDEDOR_PROFILE_ID
    ) {
      throw new ForbiddenException('El perfil debe ser un perfil global de sistema');
    }
  }

  /* ---------- Profile Permissions ---------- */

  /**
   * El perfil objetivo debe pertenecer a la empresa del caller, o ser un perfil
   * global de sistema operado por el superadmin. Las plantillas globales
   * admin/vendedor quedan excluidas: nadie las toca por API (OWASP A01:2021).
   */
  private async assertAccessibleProfile(
    profileId: string,
    companyId: string | null,
    actor?: { profileId: string },
  ): Promise<Profile> {
    const profile = await this.profileRepo.findOne({ where: { id: profileId } });
    if (!profile) throw new NotFoundException('Perfil no encontrado');

    const isTemplate =
      profile.id === ADMIN_PROFILE_ID || profile.id === VENDEDOR_PROFILE_ID;
    if (isTemplate) throw new NotFoundException('Perfil no encontrado');

    const isGlobalSystem = profile.companyId === null;
    const isCompanyProfile = companyId !== null && profile.companyId === companyId;

    if (!isGlobalSystem && !isCompanyProfile) {
      throw new NotFoundException('Perfil no encontrado');
    }
    if (isGlobalSystem && actor?.profileId !== SUPER_ADMIN_PROFILE_ID) {
      throw new ForbiddenException('Solo el superadmin puede operar sobre perfiles globales de sistema');
    }
    return profile;
  }

  private async invalidateProfileCache(profileId: string): Promise<void> {
    const users = await this.userRepo.find({ where: { profileId }, select: { id: true } });
    await Promise.all(users.map((u) => this.redis.del(this.cacheKey(u.id))));
  }

  async getProfilePermissions(profileId: string, companyId: string | null, actor?: { profileId: string }) {
    await this.assertAccessibleProfile(profileId, companyId, actor);
    const rows = await this.profilePermRepo.find({ where: { profileId }, relations: ['permission'] });
    return rows.map((r) => r.permission);
  }

  async assignPermission(
    profileId: string,
    permissionId: string,
    companyId: string | null,
    actor?: { profileId: string },
  ) {
    await this.assertAccessibleProfile(profileId, companyId, actor);
    const permission = await this.permissionRepo.findOne({ where: { id: permissionId } });
    if (!permission) throw new NotFoundException('Permiso no encontrado');

    const exists = await this.profilePermRepo.findOne({ where: { profileId, permissionId } });
    if (exists) return exists;

    const saved = await this.profilePermRepo.save(
      this.profilePermRepo.create({ profileId, permissionId }),
    );
    await this.invalidateProfileCache(profileId);

    this.logger.audit('rbac.permission.granted', {
      actor: actor?.profileId,
      meta: { profileId, permissionId: permission.code },
    });
    return saved;
  }

  async removePermission(
    profileId: string,
    permissionId: string,
    companyId: string | null,
    actor?: { profileId: string },
  ) {
    await this.assertAccessibleProfile(profileId, companyId, actor);

    const row = await this.profilePermRepo.findOne({ where: { profileId, permissionId } });
    if (!row) throw new NotFoundException('Permiso no asignado');
    await this.profilePermRepo.remove(row);
    await this.invalidateProfileCache(profileId);

    const permission = await this.permissionRepo.findOne({ where: { id: permissionId } });
    this.logger.audit('rbac.permission.revoked', {
      actor: actor?.profileId,
      meta: { profileId, permissionId: permission?.code ?? permissionId },
    });
    return { success: true };
  }

  findAllPermissions() {
    return this.permissionRepo.find({ order: { code: 'ASC' } });
  }

  /**
   * Revoca los permisos `resource.*` de los perfiles de TODAS las empresas
   * excepto `exceptCompanyId`. Usado al convertir un módulo global a empresa
   * propia, para que los usuarios de las demás empresas pierdan los permisos
   * del módulo (sin tocar los de la empresa dueña).
   *
   * NO borra las permisiones del catálogo (`permissions`): el módulo de la
   * empresa dueña las sigue usando. Tampoco toca perfiles de sistema
   * (`company_id NULL`: plantillas admin/vendedor y super_admin). Invalida la
   * caché RBAC de los usuarios afectados.
   */
  async revokeModulePermissionsFromCompanies(
    resource: string,
    exceptCompanyId: string,
  ): Promise<void> {
    const permissions = await this.permissionRepo.find({ where: { resource } });
    if (permissions.length === 0) return;
    const permissionIds = permissions.map((p) => p.id);

    // `Not(except)` excluye en SQL los company_id NULL (plantillas/superadmin);
    // el filtro extra descarta cualquier fila NULL que quedara.
    const profiles = (await this.profileRepo.find({ where: { companyId: Not(exceptCompanyId) } }))
      .filter((p) => p.companyId !== null && p.companyId !== exceptCompanyId);
    if (profiles.length === 0) return;

    const affectedIds = profiles.map((p) => p.id);
    const result = await this.profilePermRepo.delete({
      profileId: In(affectedIds),
      permissionId: In(permissionIds),
    });

    for (const profileId of affectedIds) {
      await this.invalidateProfileCache(profileId);
    }

    this.logger.audit('rbac.module.permissions.revoked', {
      meta: { resource, exceptCompanyId, deleted: result.affected ?? 0 },
    });
  }
}
