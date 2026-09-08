import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Mitigación pragmática de CSRF sin depender de `csurf` (deprecado).
 *
 * Las cookies de sesión (`access_token`/`refresh_token`) son httpOnly + sameSite,
 * lo cual ya bloquea la mayoría de escenarios. Como refuerzo, exigimos que toda
 * mutación (POST/PUT/PATCH/DELETE) incluya `X-Requested-With: XMLHttpRequest`:
 * un <form> cross-site no puede fijar headers custom, así que esto basta para
 * descartar los ataques CSRF clásicos basados en formularios/imágenes.
 *
 * El cliente HTTP del frontend (httpClient.ts) agrega este header por defecto
 * a toda request hecha con axios, así que no requiere cambios por endpoint.
 */
@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (SAFE_METHODS.has(req.method)) {
      return next();
    }
    if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
      throw new ForbiddenException('Falta el header X-Requested-With');
    }
    next();
  }
}
