import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  // Rol de aplicación NO owner (RLS realmente activo). Opcional: si se define,
  // el runtime se conecta con él; las migraciones siempre usan DB_USER.
  DB_APP_USER: Joi.string().allow('').optional(),
  DB_APP_PASSWORD: Joi.string().min(8).allow('').optional(),
  // Forzado por el comando de migraciones de prod para conectar como owner.
  DB_MIGRATE_AS_OWNER: Joi.boolean().default(false),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),
  REDIS_PASSWORD: Joi.string().min(8).required(),
  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN_DAYS: Joi.number().default(7),
  WEBAUTHN_RP_ID: Joi.string().required(),
  WEBAUTHN_RP_NAME: Joi.string().required(),
  WEBAUTHN_ORIGIN: Joi.string().required(),
  // Escape de emergencia: habilita CORS en NestJS aunque Kong ya lo maneje (debugging directo al :3000).
  ENABLE_NESTJS_CORS: Joi.boolean().default(false),
  // Seeds de datos de demostración: apagados por defecto (evita usuarios con
  // contraseña conocida en prod); se habilitan explícitamente en dev.
  SEED_DEMO_DATA: Joi.boolean().default(false),
  // Contraseña de los usuarios demo que crean los seeds (solo dev).
  SEED_DEMO_PASSWORD: Joi.string().min(8).default('Password123!'),
});
