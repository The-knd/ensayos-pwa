import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../commons/guards/super-admin.guard';
import { MascotasService } from './mascotas.service';

/**
 * Módulo de sistema "Mascotas": una única consulta al servicio externo.
 *
 * No tiene permisos propios (`@Permissions`): se protege solo con
 * `JwtAuthGuard + SuperAdminGuard` (el botón vive en el panel superadmin, pero
 * la autorización real es aquí). No hay empresa de por medio: la URL es global.
 */
@Controller('mascotas')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class MascotasController {
  constructor(private readonly service: MascotasService) {}

  @Get('consultar')
  consultar() {
    return this.service.consultar();
  }
}
