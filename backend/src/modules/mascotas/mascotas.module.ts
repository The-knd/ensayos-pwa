import { Module } from '@nestjs/common';
import { MascotasController } from './mascotas.controller';
import { MascotasService } from './mascotas.service';

/**
 * Módulo de sistema "Mascotas" (ver Anexo B de MODULE-GUIDE.md): sin pantallas
 * propias, sin permisos ni fila en `modules`; solo un endpoint que consulta un
 * servicio externo del mismo host y que se lanza desde el panel superadmin.
 */
@Module({
  controllers: [MascotasController],
  providers: [MascotasService],
})
export class MascotasModule {}
