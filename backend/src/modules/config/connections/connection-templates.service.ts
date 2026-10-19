import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpsertConnectionSystemDto, UpsertConnectionTemplateDto } from './dto/connection-template.dto';
import { ConnectionSystem } from './entities/connection-system.entity';
import { ConnectionTemplate } from './entities/connection-template.entity';

/**
 * Catálogo de sistemas externos y plantillas de conexión (ambos globales, sin
 * empresa ni RLS). Los administra el superadmin desde Configuración global →
 * Conexiones → Plantillas. No conocen sistemas concretos: una plantilla declara
 * campos de `settings` y secretos para cualquier `systemKey` del catálogo.
 */
@Injectable()
export class ConnectionTemplatesService {
  constructor(
    @InjectRepository(ConnectionSystem) private readonly systems: Repository<ConnectionSystem>,
    @InjectRepository(ConnectionTemplate) private readonly templates: Repository<ConnectionTemplate>,
  ) {}

  listSystems(): Promise<ConnectionSystem[]> {
    return this.systems.find({ order: { sortOrder: 'ASC', key: 'ASC' } });
  }

  listTemplates(): Promise<ConnectionTemplate[]> {
    return this.templates.find({ order: { systemKey: 'ASC', label: 'ASC' } });
  }

  findTemplate(id: string): Promise<ConnectionTemplate | null> {
    return this.templates.findOne({ where: { id } });
  }

  /** Plantilla habilitada de un sistema (la primera), para resolver al crear sin `templateId`. */
  findTemplateForSystem(systemKey: string): Promise<ConnectionTemplate | null> {
    return this.templates.findOne({ where: { systemKey, enabled: true }, order: { createdAt: 'ASC' } });
  }

  /** Crea/actualiza el sistema en el catálogo (para que la plantilla siempre tenga su fila). */
  async ensureSystem(key: string, label?: string): Promise<void> {
    const existing = await this.systems.findOne({ where: { key } });
    if (!existing) await this.systems.save(this.systems.create({ key, label: label ?? key }));
  }

  async createSystem(dto: UpsertConnectionSystemDto): Promise<ConnectionSystem> {
    const existing = await this.systems.findOne({ where: { key: dto.key } });
    if (existing) throw new BadRequestException(`El sistema '${dto.key}' ya existe`);
    return this.systems.save(this.systems.create({ key: dto.key, label: dto.label, enabled: dto.enabled ?? true }));
  }

  async createTemplate(dto: UpsertConnectionTemplateDto): Promise<ConnectionTemplate> {
    this.assertUniqueKeys(dto);
    await this.ensureSystem(dto.systemKey);
    return this.templates.save(
      this.templates.create({
        systemKey: dto.systemKey,
        label: dto.label,
        settingsFields: dto.settingsFields,
        secretFields: dto.secretFields,
        authType: dto.authType ?? null,
        enabled: dto.enabled ?? true,
      }),
    );
  }

  async updateTemplate(id: string, dto: UpsertConnectionTemplateDto): Promise<ConnectionTemplate> {
    const template = await this.templates.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Plantilla no encontrada');
    this.assertUniqueKeys(dto);
    await this.ensureSystem(dto.systemKey);

    template.systemKey = dto.systemKey;
    template.label = dto.label;
    template.settingsFields = dto.settingsFields as ConnectionTemplate['settingsFields'];
    template.secretFields = dto.secretFields as ConnectionTemplate['secretFields'];
    template.authType = dto.authType ?? null;
    if (dto.enabled !== undefined) template.enabled = dto.enabled;
    return this.templates.save(template);
  }

  async removeTemplate(id: string): Promise<{ deleted: true }> {
    const res = await this.templates.delete({ id });
    if (!res.affected) throw new NotFoundException('Plantilla no encontrada');
    return { deleted: true };
  }

  /** Las claves de `settings` y de secretos no se pueden repetir. */
  private assertUniqueKeys(dto: UpsertConnectionTemplateDto): void {
    const dup = (keys: string[]) => keys.find((k, i) => keys.indexOf(k) !== i);
    const settingsDup = dup(dto.settingsFields.map((f) => f.key));
    if (settingsDup) throw new BadRequestException(`Campo de settings repetido: ${settingsDup}`);
    const secretDup = dup(dto.secretFields.map((f) => f.key));
    if (secretDup) throw new BadRequestException(`Secreto repetido: ${secretDup}`);
  }
}
