import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Endpoints públicos previos a la sesión: aún no existe cookie csrf_token.
// logout se exime para que el cierre de sesión siga funcionando aunque el
// token CSRF haya expirado junto con la sesión (cierre de sesión expirada).
const CSRF_EXEMPT_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/passkeys/check',
  '/api/auth/passkeys/login/options',
  '/api/auth/passkeys/login/verify',
]);

function tokensMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/**
 * Mitigación CSRF en dos capas (OWASP A01 / A08, ISO 27001 A.13.1.3):
 *
 * 1. Header custom: toda mutación exige `X-Requested-With: XMLHttpRequest`
 *    (un <form> cross-site no puede fijar headers custom).
 * 2. Doble envío (double-submit): toda mutación debe incluir además
 *    `X-CSRF-Token` con el mismo valor que la cookie `csrf_token` emitida al
 *    iniciar sesión. Comparación en tiempo constante.
 *
 * Las cookies de sesión son httpOnly + sameSite. `csrf_token` NO es httpOnly
 * (para que el SPA lo lea) pero se valida contra el header antes de actuar.
 */
@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    if (SAFE_METHODS.has(req.method)) {
      return next();
    }
    if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
      throw new ForbiddenException('Falta el header X-Requested-With');
    }

    const path = (req.originalUrl || req.url).split('?')[0];
    if (!CSRF_EXEMPT_PATHS.has(path)) {
      const cookieToken = (req.cookies?.csrf_token as string) ?? '';
      const headerToken = (req.headers['x-csrf-token'] as string) ?? '';
      if (!cookieToken || !headerToken || !tokensMatch(cookieToken, headerToken)) {
        throw new ForbiddenException('Falta o no coincide el token CSRF');
      }
    }
    next();
  }
}