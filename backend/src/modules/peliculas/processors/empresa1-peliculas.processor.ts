import { Injectable } from '@nestjs/common';
import { IntegrationError } from '../../config/connections/http/integration.errors';
import { Movie } from '../peliculas.types';
import { asObject, toMovie } from './movie.util';
import { PeliculasProcessor } from './peliculas-processor';

/**
 * Estrategia de una empresa con su propio API: responde en español
 *   { "resultados": [ { "codigo", "nombre", "anio", "genero" }, … ] }
 *
 * Demuestra el patrón "otra empresa, otra lógica": se registra igual que la
 * `default` y cada empresa apunta a ella con `settings.strategy = 'empresa1'`.
 * No hay `if (companyId === …)`: la diferencia vive en la estrategia elegida.
 */
@Injectable()
export class Empresa1PeliculasProcessor implements PeliculasProcessor {
  readonly key = 'empresa1';

  process(raw: unknown): Movie[] {
    const body = asObject(raw, '{ resultados: [...] }');
    const items = body.resultados;
    if (!Array.isArray(items)) {
      throw new IntegrationError('definitive', 'Formato inesperado del API: se esperaba { resultados: [...] }');
    }
    return items.map((item) => {
      const row = asObject(item, 'una película');
      return toMovie({ id: row.codigo, title: row.nombre, year: row.anio, genre: row.genero });
    });
  }
}
