import { Module } from '@nestjs/common';
import { ConnectionsModule } from '../config/connections/connections.module';
import { PeliculasClient } from './client/peliculas.client';
import { DefaultPeliculasProcessor } from './processors/default-peliculas.processor';
import { Empresa1PeliculasProcessor } from './processors/empresa1-peliculas.processor';
import { PeliculasProcessorRegistry } from './processors/peliculas-processor.registry';
import { PeliculasConnectionPlugin } from './PeliculasConnectionPlugin';
import { PeliculasController } from './peliculas.controller';
import { PeliculasIntegrationRegistrar } from './peliculas-integration.registrar';
import { PeliculasService } from './peliculas.service';

/**
 * Módulo funcional de Películas (backend NestJS).
 *
 * - Frontend: pantalla única `/peliculas` (permiso `peliculas.read`).
 * - Integración: se apoya en `config/connections` (conexión + credenciales
 *   cifradas por empresa) y declara su adaptador (`api` + `peliculas`) y sus
 *   estrategias por empresa.
 *
 * Estrategia nueva: añadirla a `providers` y a la lista del registrar. La
 * conexión de cada empresa la elige con `settings.strategy`.
 */
@Module({
  imports: [ConnectionsModule],
  controllers: [PeliculasController],
  providers: [
    PeliculasClient,
    DefaultPeliculasProcessor,
    Empresa1PeliculasProcessor,
    PeliculasProcessorRegistry,
    PeliculasConnectionPlugin,
    PeliculasService,
    PeliculasIntegrationRegistrar,
  ],
})
export class PeliculasModule {}
