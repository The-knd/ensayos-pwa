import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../../commons/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../commons/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../../commons/guards/super-admin.guard';
import { ConnectionPluginsRegistry } from './connection-plugins';
import { ConnectionTemplatesService } from './connection-templates.service';
import { ConnectionsService } from './connections.service';
import { CreateConnectionDto, UpdateConnectionDto } from './dto/connection.dto';
import { UpsertConnectionSystemDto, UpsertConnectionTemplateDto } from './dto/connection-template.dto';
import { IntegrationAuthType, IntegrationEnvironment } from './integration.types';

/**
 * Administración de conexiones, solo superadmin (Configuración global →
 * Conexiones). La empresa va en la ruta y el autor sale del token.
 *
 * Dos bloques:
 *   - Catálogo (`/connections/systems`) y plantillas (`/connections/templates`),
 *     globales, que definen los campos de cada sistema.
 *   - Conexiones por empresa (`/connections/companies/:companyId[/:id]`), que se
 *     identifican por `id` (una empresa puede tener varias del mismo sistema).
 *
 * El sistema es un string abierto: el servicio lo valida contra la plantilla y,
 * si hay adaptador registrado, contra su plugin. Los jobs y el disparo de
 * sincronización viven en `clients/sync` (ClientSyncController).
 */
@Controller('connections')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class ConnectionsAdminController {
  constructor(
    private readonly connections: ConnectionsService,
    private readonly templates: ConnectionTemplatesService,
    private readonly plugins: ConnectionPluginsRegistry,
  ) {}

  /** Lo que la GUI necesita para pintar el formulario de alta. */
  @Get('meta')
  async meta() {
    const systems = await this.templates.listSystems();
    return {
      enabled: this.connections.enabled,
      systems: systems.map((s) => ({ key: s.key, label: s.label, testable: this.plugins.has(s.key) })),
      environments: Object.values(IntegrationEnvironment),
      authTypes: Object.values(IntegrationAuthType),
    };
  }

  // --- Plantillas de conexión y catálogo de sistemas (globales) ---

  @Get('templates')
  listTemplates() {
    return this.templates.listTemplates();
  }

  @Post('templates')
  createTemplate(@Body() dto: UpsertConnectionTemplateDto) {
    return this.templates.createTemplate(dto);
  }

  @Put('templates/:id')
  updateTemplate(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpsertConnectionTemplateDto) {
    return this.templates.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  removeTemplate(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.templates.removeTemplate(id);
  }

  @Post('systems')
  createSystem(@Body() dto: UpsertConnectionSystemDto) {
    return this.templates.createSystem(dto);
  }

  // --- Conexiones por empresa ---

  @Get('companies/:companyId')
  list(@Param('companyId', new ParseUUIDPipe()) companyId: string) {
    return this.connections.list(companyId);
  }

  @Post('companies/:companyId')
  create(
    @Param('companyId', new ParseUUIDPipe()) companyId: string,
    @Body() dto: CreateConnectionDto,
    @CurrentUser() user,
  ) {
    return this.connections.create(companyId, dto, user.sub);
  }

  @Get('companies/:companyId/:id')
  get(@Param('companyId', new ParseUUIDPipe()) companyId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.connections.get(companyId, id);
  }

  @Put('companies/:companyId/:id')
  update(
    @Param('companyId', new ParseUUIDPipe()) companyId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateConnectionDto,
    @CurrentUser() user,
  ) {
    return this.connections.update(companyId, id, dto, user.sub);
  }

  @Delete('companies/:companyId/:id')
  remove(
    @Param('companyId', new ParseUUIDPipe()) companyId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user,
  ) {
    return this.connections.remove(companyId, id, user.sub);
  }

  @Post('companies/:companyId/:id/test')
  test(
    @Param('companyId', new ParseUUIDPipe()) companyId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user,
  ) {
    return this.connections.test(companyId, id, user.sub);
  }
}
