import { Injectable } from '@nestjs/common';
import { IntegrationError } from '../../config/connections/http/integration.errors';
import { Movie } from '../peliculas.types';
import { asObject, toMovie } from './movie.util';
import { PeliculasProcessor } from './peliculas-processor';

/**
 * Estrategia por defecto: el API responde
 *   { "usuario": {...}, "total": 3, "peliculas": [ { "id", "titulo" }, … ] }
 *
 * Es el contrato de la API demo `apis-base` (la misma que sirve `/mascotas`)
 * y el de `mocks/mock-peliculas.mjs`. Una empresa con otro formato define su
 * propia estrategia (ver `Empresa1PeliculasProcessor`).
 */
@Injectable()
export class DefaultPeliculasProcessor implements PeliculasProcessor {
  readonly key = 'default';

  process(raw: unknown): Movie[] {
    const body = asObject(raw, '{ peliculas: [...] }');
    const items = body.peliculas;
    if (!Array.isArray(items)) {
      throw new IntegrationError('definitive', 'Formato inesperado del API: se esperaba { peliculas: [...] }');
    }
    return items.map((item) => {
      const row = asObject(item, 'una película');
      // `titulo` es el campo del API demo; `title` por si el origen usa inglés.
      return toMovie({ id: row.id, title: row.titulo ?? row.title, year: row.year, genre: row.genre });
    });
  }
}
