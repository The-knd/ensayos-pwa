import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { webcrypto } from 'crypto';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './commons/filters/http-exception.filter';

if (!(globalThis as any).crypto) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1);
  app.use(cookieParser());
  app.use(
    helmet({
      // La CSP del SPA la gestiona nginx; el API solo sirve JSON.
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
