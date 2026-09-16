import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { webcrypto } from 'crypto';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './commons/filters/http-exception.filter';
import { StructuredLogger } from './commons/logger/structured-logger.service';

if (!(globalThis as any).crypto) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Graceful shutdown: SIGTERM/SIGINT drenan peticiones en curso y cierran
  // pool de DB y conexiones a Redis antes de salir.
  app.enableShutdownHooks();
  app.useLogger(new StructuredLogger());
  app.set('trust proxy', 1);
  app.use(cookieParser());

  // Límite explícito del body JSON: se rechazan payloads desproporcionados
  // antes de que lleguen a validación (OWASP A01/A05, ISO 27001 A.12.6.1).
  app.useBodyParser('json', { limit: '1mb' });
  app.useBodyParser('urlencoded', { limit: '1mb', extended: true });

  app.use(
    helmet({
      // La CSP del SPA la gestiona nginx; el API solo sirve JSON. Los archivos
      // subidos se sirven con headers propios (uploads.controller.ts).
      contentSecurityPolicy: false,
    }),
  );

  // Kong es la única capa de CORS en producción (una sola vez, sin duplicar
  // Access-Control-Allow-Origin, lo que rompe a los browsers). En dev, todo
  // pasa igual por Kong/Vite-proxy, así que esto puede quedar apagado por
  // defecto; se deja como escape de emergencia vía ENABLE_NESTJS_CORS=true
  // (p. ej. para pegarle al backend directo en :3000 durante debugging).
  if (process.env.ENABLE_NESTJS_CORS === 'true') {
    app.enableCors({ origin: process.env.WEBAUTHN_ORIGIN, credentials: true });
  }

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
