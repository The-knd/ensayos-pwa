import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ModulePlacement } from './entities/module-placement.entity';
import { CreatePlacementDto } from './dto/create-placement.dto';
import { UpdatePlacementDto } from './dto/update-placement.dto';
import { RbacService } from '../rbac/rbac.service';

@Injectable()
export class ModulePlacementsService {
  constructor(
    @InjectRepository(ModulePlacement)
    private repo: Repository<ModulePlacement>,
    @InjectDataSource() private dataSource: DataSource,
    private rbacService: RbacService,
  ) {}

  findByCompany(companyId: string) {
    return this.repo.find({
      where: { companyId },
      order: { position: 'ASC', label: 'ASC' },
    });
  }

  /**
   * Creación atómica: placement + permisos `module.action` + asignación a los
   * perfiles de sistema se persisten en la misma transacción (todo o nada).
   * La invalidación de la caché RBAC del creador se hace después del commit;
   * si Redis falla, el peor caso es ver el módulo con hasta 120s de retraso.
   */
  async create(companyId: string, dto: CreatePlacementDto, userId: string) {
    const { actions, ...rest } = dto;
    const entity = await this.dataSource.transaction(async (manager) => {
      if (actions && actions.length > 0) {
        await this.rbacService.registerModulePermissions(dto.module, actions, undefined, manager);
      }
      return manager.save(manager.create(ModulePlacement, { ...rest, companyId }));
    });

    if (actions && actions.length > 0) {
      await this.rbacService.invalidateCache(userId);
    }

    return entity;
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
