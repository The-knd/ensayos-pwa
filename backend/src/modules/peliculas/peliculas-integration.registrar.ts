import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConnectionPluginsRegistry } from '../config/connections/connection-plugins';
import { PeliculasConnectionPlugin } from './PeliculasConnectionPlugin';
import { DefaultPeliculasProcessor } from './processors/default-peliculas.processor';
import { Empresa1PeliculasProcessor } from './processors/empresa1-peliculas.processor';
import { PeliculasProcessorRegistry } from './processors/peliculas-processor.registry';

/**
 * Da de alta el adaptador de Películas en los registros genéricos al arrancar:
 * el plugin de conexión (clave `api.peliculas`) y las estrategias (procesadores).
 *
 * **Añadir una estrategia nueva** (p. ej. otra empresa): crear la clase, añadirla
 * a `providers` de `PeliculasModule` y a la lista de abajo. No hay que tocar ni
 * `config/connections` ni `PeliculasService`. Ver `STRATEGY-GUIDE.md`.
 */
@Injectable()
export class PeliculasIntegrationRegistrar implements OnModuleInit {
  constructor(
    private readonly plugins: ConnectionPluginsRegistry,
    private readonly processors: PeliculasProcessorRegistry,
    private readonly plugin: PeliculasConnectionPlugin,
    private readonly base: DefaultPeliculasProcessor,
    private readonly empresa1: Empresa1PeliculasProcessor,
  ) {}

  onModuleInit() {
    this.plugins.register(this.plugin);
    for (const processor of [this.base, this.empresa1]) {
      this.processors.register(processor);
    }
  }
}
