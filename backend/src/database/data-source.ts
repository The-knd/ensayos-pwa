import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

// Migraciones SIEMPRE como DB_USER (owner): los DDL necesitan crear/alterar
// tablas y el rol de aplicación (DB_APP_USER) es NOBYPASSRLS/least-privilege.
// DB_MIGRATE_AS_OWNER=true lo fuerza en el comando de migración de prod,
// manteniendo DB_APP_USER visible en el entorno para que la migración
// 1700000014500-RlsHardening pueda crear el rol.
const migrationMode = process.env.DB_MIGRATE_AS_OWNER === 'true';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: migrationMode ? process.env.DB_USER : process.env.DB_APP_USER || process.env.DB_USER,
  password: migrationMode ? process.env.DB_PASSWORD : process.env.DB_APP_PASSWORD || process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // Globs duales: funcionan tanto corriendo con ts-node sobre src/ (dev,
  // migration:generate/run) como ya compilado en dist/ (producción, ver
  // migration:run:prod y el CMD del Dockerfile).
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
