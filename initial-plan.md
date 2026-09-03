# Plan Técnico de Implementación — PWA Multi-Empresa

> Documento autocontenido. Incluye comandos exactos, código, estructura de archivos y configuración necesarios para implementar el sistema sin requerir contexto adicional de conversaciones previas.
>
> **Placeholders explícitos:** donde el campo depende de archivos de `Anexos/` no disponibles (`creacion_clientes`, `flujocredito`), se usa una estructura mínima razonable marcada con `// PLACEHOLDER — ajustar según Anexos`. Reemplazar antes de dar por cerrada esa fase.

**Stack de versiones de referencia:**
- Node.js 20 LTS
- NestJS 10.x
- TypeORM 0.3.x
- PostgreSQL 16
- Kong 3.x (modo DB-less)
- React 18 + Vite + TypeScript
- Redis 7

---

## ÍNDICE

0. Estructura de repositorio y arranque
1. Fase 0 — Infraestructura Docker
2. Fase 1 — Modelo de datos y migraciones
3. Fase 2 — Núcleo transversal (`commons`)
4. Fase 3 — Módulo de Autenticación
5. Fase 4 — Configuración de Kong
6. Fase 5 — Módulos de negocio (Users, Config, Clients)
7. Fase 6 — Frontend: base y autenticación
8. Fase 7 — Frontend: vistas de negocio
9. Fase 8 — Módulo de Créditos
10. Fase 9 — Verificación final

---

## 0. Estructura de repositorio

```
pwa-app/
├── bd/
│   └── init/                          # scripts opcionales de bootstrap de Postgres
├── backend/
│   ├── src/
│   │   ├── commons/
│   │   │   ├── decorators/
│   │   │   ├── guards/
│   │   │   ├── interceptors/
│   │   │   ├── filters/
│   │   │   ├── pipes/
│   │   │   ├── middlewares/
│   │   │   ├── entities/
│   │   │   ├── interfaces/
│   │   │   ├── constants/
│   │   │   ├── config/
│   │   │   └── logger/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── rbac/
│   │   │   ├── feature-flags/
│   │   │   ├── users/
│   │   │   ├── clients/
│   │   │   ├── config/
│   │   │   └── credits/
│   │   ├── database/
│   │   │   ├── data-source.ts
│   │   │   └── migrations/
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── test/
│   ├── kong/
│   │   └── kong.yml
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── shared/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── clients/
│   │   │   ├── users/
│   │   │   ├── config/
│   │   │   └── credits/
│   │   ├── main.tsx
│   │   └── App.tsx
│   ├── Dockerfile
│   └── package.json
├── Anexos/
└── docker-compose.yml
```

---

## 1. FASE 0 — Infraestructura Docker

### 1.1 `docker-compose.yml` (raíz del proyecto)

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    container_name: pwa-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: pwa_user
      POSTGRES_PASSWORD: pwa_pass
      POSTGRES_DB: pwa_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U pwa_user -d pwa_db"]
      interval: 5s
      timeout: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    container_name: pwa-redis
    restart: unless-stopped
    ports:
      - "6379:6379"

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: pwa-backend
    restart: unless-stopped
    env_file:
      - ./backend/.env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    ports:
      - "3000:3000"
    volumes:
      - ./backend:/app
      - /app/node_modules

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: pwa-frontend
    restart: unless-stopped
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend

  kong:
    image: kong:3.6
    container_name: pwa-kong
    restart: unless-stopped
    environment:
      KONG_DATABASE: "off"
      KONG_DECLARATIVE_CONFIG: /kong/kong.yml
      KONG_PROXY_LISTEN: "0.0.0.0:8000"
      KONG_ADMIN_LISTEN: "0.0.0.0:8001"
    volumes:
      - ./backend/kong/kong.yml:/kong/kong.yml
    ports:
      - "8000:8000"
      - "8001:8001"
    depends_on:
      - backend

volumes:
  pgdata:
```

### 1.2 `backend/.env.example`

```env
NODE_ENV=development
PORT=3000

DB_HOST=postgres
DB_PORT=5432
DB_USER=pwa_user
DB_PASSWORD=pwa_pass
DB_NAME=pwa_db

REDIS_HOST=redis
REDIS_PORT=6379

JWT_ACCESS_SECRET=change_me_access_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN_DAYS=7

WEBAUTHN_RP_ID=localhost
WEBAUTHN_RP_NAME=PWA App
WEBAUTHN_ORIGIN=http://localhost:5173
```

### 1.3 `backend/Dockerfile`

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start:dev"]
```

### 1.4 Instalación de dependencias base del backend

```bash
cd backend
npm install @nestjs/typeorm typeorm pg
npm install @nestjs/config joi
npm install @nestjs/jwt passport passport-jwt
npm install bcrypt
npm install @simplewebauthn/server
npm install ioredis @nestjs-modules/ioredis
npm install nestjs-pino pino-http pino-pretty
npm install class-validator class-transformer
npm install --save-dev @types/passport-jwt @types/bcrypt
```

### 1.5 Validación de variables de entorno

`backend/src/commons/config/env.validation.ts`

```typescript
import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),
  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN_DAYS: Joi.number().default(7),
  WEBAUTHN_RP_ID: Joi.string().required(),
  WEBAUTHN_RP_NAME: Joi.string().required(),
  WEBAUTHN_ORIGIN: Joi.string().required(),
});
```

Uso en `app.module.ts`:

```typescript
ConfigModule.forRoot({
  isGlobal: true,
  validationSchema: envValidationSchema,
});
```

### 1.6 Interfaz de bus de eventos (preparación para RabbitMQ)

`backend/src/commons/interfaces/event-bus.interface.ts`

```typescript
export interface DomainEvent<T = unknown> {
  name: string;
  payload: T;
  companyId: string;
  occurredAt: Date;
}

export interface EventBusPort {
  publish<T>(event: DomainEvent<T>): Promise<void>;
  subscribe<T>(eventName: string, handler: (event: DomainEvent<T>) => Promise<void>): void;
}

export const EVENT_BUS = Symbol('EVENT_BUS');
```

Implementación in-memory: `backend/src/commons/infrastructure/in-memory-event-bus.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventBusPort, DomainEvent } from '../interfaces/event-bus.interface';

@Injectable()
export class InMemoryEventBus implements EventBusPort {
  constructor(private readonly emitter: EventEmitter2) {}

  async publish<T>(event: DomainEvent<T>): Promise<void> {
    this.emitter.emit(event.name, event);
  }

  subscribe<T>(eventName: string, handler: (event: DomainEvent<T>) => Promise<void>): void {
    this.emitter.on(eventName, handler);
  }
}
```

Registro en `app.module.ts`:

```typescript
import { EventEmitterModule } from '@nestjs/event-emitter';
// ...
EventEmitterModule.forRoot(),
{
  provide: EVENT_BUS,
  useClass: InMemoryEventBus,
}
```

*(El día que se decida activar RabbitMQ, se crea `RabbitMqEventBus implements EventBusPort` y se cambia el `useClass` — ningún módulo de negocio se modifica.)*

**Entregable verificable:** `docker compose up --build` levanta los 5 contenedores; `curl http://localhost:3000/health` responde 200 (crear un `HealthController` mínimo con `@Get('health') check() { return { status: 'ok' } }`).

---

## 2. FASE 1 — Modelo de datos y migraciones

### 2.1 `backend/src/database/data-source.ts`

```typescript
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false, // SIEMPRE false — todo cambio de esquema pasa por migración
  logging: process.env.NODE_ENV === 'development',
});
```

Scripts en `package.json`:

```json
{
  "scripts": {
    "typeorm": "typeorm-ts-node-commonjs -d src/database/data-source.ts",
    "migration:generate": "npm run typeorm -- migration:generate",
    "migration:run": "npm run typeorm -- migration:run",
    "migration:revert": "npm run typeorm -- migration:revert"
  }
}
```

### 2.2 `BaseEntity` común

`backend/src/commons/entities/base.entity.ts`

```typescript
import { PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
```

### 2.3 Entidades — código completo

**`Company`** — `modules/config/entities/company.entity.ts`

```typescript
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../commons/entities/base.entity';

export enum AuthStrategyType {
  LOCAL = 'local',
  PASSKEY = 'passkey',
  MICROSOFT = 'microsoft',
}

@Entity('companies')
export class Company extends BaseEntity {
  @Column({ length: 150 })
  name: string;

  @Column({ name: 'logo_url', nullable: true })
  logoUrl: string;

  @Column({ name: 'primary_color', length: 7, default: '#0057B8' })
  primaryColor: string;

  @Column({
    name: 'auth_strategy',
    type: 'enum',
    enum: AuthStrategyType,
    default: AuthStrategyType.LOCAL,
  })
  authStrategy: AuthStrategyType;
}
```

**`Permission`** — `modules/rbac/entities/permission.entity.ts`

```typescript
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../commons/entities/base.entity';

@Entity('permissions')
export class Permission extends BaseEntity {
  @Column()
  resource: string; // ej: "clients"

  @Column()
  action: string; // ej: "create"

  @Column({ type: 'jsonb', nullable: true })
  condition: Record<string, unknown> | null;

  @Column({ unique: true })
  code: string; // ej: "clients.create"
}
```

**`Profile`** — `modules/rbac/entities/profile.entity.ts`

```typescript
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../commons/entities/base.entity';
import { Company } from '../../config/entities/company.entity';

@Entity('profiles')
export class Profile extends BaseEntity {
  @Column({ name: 'company_id', nullable: true })
  companyId: string | null; // null = perfil plantilla, reutilizable

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company: Company | null;

  @Column({ length: 100 })
  name: string; // ej: "vendedor"

  @Column({ name: 'is_system_role', default: false })
  isSystemRole: boolean;
}
```

**`ProfilePermission`** — `modules/rbac/entities/profile-permission.entity.ts`

```typescript
import { Entity, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { Profile } from './profile.entity';
import { Permission } from './permission.entity';

@Entity('profile_permissions')
export class ProfilePermission {
  @PrimaryColumn({ name: 'profile_id' })
  profileId: string;

  @PrimaryColumn({ name: 'permission_id' })
  permissionId: string;

  @ManyToOne(() => Profile)
  @JoinColumn({ name: 'profile_id' })
  profile: Profile;

  @ManyToOne(() => Permission)
  @JoinColumn({ name: 'permission_id' })
  permission: Permission;
}
```

**`User`** — `modules/users/entities/user.entity.ts`

```typescript
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../commons/entities/base.entity';
import { Company } from '../../config/entities/company.entity';
import { Profile } from '../../rbac/entities/profile.entity';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked',
}

@Entity('users')
export class User extends BaseEntity {
  @Column({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'profile_id' })
  profileId: string;

  @ManyToOne(() => Profile)
  @JoinColumn({ name: 'profile_id' })
  profile: Profile;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash', nullable: true })
  passwordHash: string | null;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ name: 'permissions_version', default: 0 })
  permissionsVersion: number;

  @Column({ name: 'full_name', length: 200 })
  fullName: string;
}
```

**`FeatureFlag`** — `modules/feature-flags/entities/feature-flag.entity.ts`

```typescript
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../commons/entities/base.entity';
import { Company } from '../../config/entities/company.entity';

@Entity('feature_flags')
export class FeatureFlag extends BaseEntity {
  @Column({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'user_id', nullable: true })
  userId: string | null; // null = aplica a toda la empresa

  @Column()
  key: string; // ej: "newCreditFlow"

  @Column({ default: false })
  enabled: boolean;
}
```

**`Device`** — `modules/auth/entities/device.entity.ts`

```typescript
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../commons/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('devices')
export class Device extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'credential_id', unique: true })
  credentialId: string;

  @Column({ name: 'public_key', type: 'text' })
  publicKey: string;

  @Column({ type: 'int', default: 0 })
  counter: number;

  @Column({ name: 'device_name', nullable: true })
  deviceName: string;
}
```

**`Client`** — `modules/clients/entities/client.entity.ts`

```typescript
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../commons/entities/base.entity';
import { Company } from '../../config/entities/company.entity';

export enum ClientStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

// PLACEHOLDER — reemplazar campos según Anexos/creacion_clientes al recibir el archivo
@Entity('clients')
export class Client extends BaseEntity {
  @Column({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ length: 200 })
  fullName: string;

  @Column({ length: 20, unique: true })
  documentNumber: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ type: 'enum', enum: ClientStatus, default: ClientStatus.ACTIVE })
  status: ClientStatus;
}
```

### 2.4 Migraciones

Generar automáticamente tras registrar cada entidad en el módulo correspondiente:

```bash
npm run migration:generate -- src/database/migrations/CreateCompanies
npm run migration:generate -- src/database/migrations/CreatePermissions
npm run migration:generate -- src/database/migrations/CreateProfiles
npm run migration:generate -- src/database/migrations/CreateProfilePermissions
npm run migration:generate -- src/database/migrations/CreateUsers
npm run migration:generate -- src/database/migrations/CreateFeatureFlags
npm run migration:generate -- src/database/migrations/CreateDevices
npm run migration:generate -- src/database/migrations/CreateClients
```

**Migración de seed manual** (no autogenerada) — `src/database/migrations/1700000001000-SeedBaseData.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class SeedBaseData1700000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Empresas
    await queryRunner.query(`
      INSERT INTO companies (id, name, logo_url, primary_color, auth_strategy)
      VALUES
        ('11111111-1111-1111-1111-111111111111', 'Empresa Uno', 'https://cdn.example.com/logo1.png', '#0057B8', 'local'),
        ('22222222-2222-2222-2222-222222222222', 'Empresa Dos', 'https://cdn.example.com/logo2.png', '#C0392B', 'local'),
        ('33333333-3333-3333-3333-333333333333', 'Empresa Tres', 'https://cdn.example.com/logo3.png', '#27AE60', 'local');
    `);

    // 2. Permisos (catálogo por módulo x acción)
    const modules = ['config', 'clients', 'users', 'credits'];
    const actions = ['read', 'create', 'update', 'delete'];
    for (const resource of modules) {
      for (const action of actions) {
        await queryRunner.query(
          `INSERT INTO permissions (id, resource, action, code) VALUES (gen_random_uuid(), $1, $2, $3)`,
          [resource, action, `${resource}.${action}`],
        );
      }
    }
    // Permiso especial de estudio de crédito
    await queryRunner.query(
      `INSERT INTO permissions (id, resource, action, code) VALUES (gen_random_uuid(), 'credits', 'study', 'credits.study')`,
    );

    // 3. Perfiles (plantilla, company_id null)
    await queryRunner.query(`
      INSERT INTO profiles (id, company_id, name, is_system_role) VALUES
        ('aaaaaaaa-0000-0000-0000-000000000001', NULL, 'super_admin', true),
        ('aaaaaaaa-0000-0000-0000-000000000002', NULL, 'admin', true),
        ('aaaaaaaa-0000-0000-0000-000000000003', NULL, 'vendedor', true);
    `);

    // 4. Relación perfil-permiso
    // super_admin: todos los permisos
    await queryRunner.query(`
      INSERT INTO profile_permissions (profile_id, permission_id)
      SELECT 'aaaaaaaa-0000-0000-0000-000000000001', id FROM permissions;
    `);
    // admin: todo menos config
    await queryRunner.query(`
      INSERT INTO profile_permissions (profile_id, permission_id)
      SELECT 'aaaaaaaa-0000-0000-0000-000000000002', id FROM permissions WHERE resource != 'config';
    `);
    // vendedor: clients (todo) + credits.read + credits.study
    await queryRunner.query(`
      INSERT INTO profile_permissions (profile_id, permission_id)
      SELECT 'aaaaaaaa-0000-0000-0000-000000000003', id FROM permissions
      WHERE resource = 'clients' OR code IN ('credits.read', 'credits.study');
    `);

    // 5. Usuarios de prueba (password: "Password123!" hasheado)
    const passwordHash = await bcrypt.hash('Password123!', 10);
    await queryRunner.query(
      `INSERT INTO users (id, company_id, profile_id, email, password_hash, status, full_name)
       VALUES
       (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001', 'superadmin@empresa1.com', $1, 'active', 'Super Admin Uno'),
       (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000002', 'admin@empresa1.com', $1, 'active', 'Admin Uno'),
       (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000003', 'vendedor@empresa1.com', $1, 'active', 'Vendedor Uno')`,
      [passwordHash],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM users`);
    await queryRunner.query(`DELETE FROM profile_permissions`);
    await queryRunner.query(`DELETE FROM profiles`);
    await queryRunner.query(`DELETE FROM permissions`);
    await queryRunner.query(`DELETE FROM companies`);
  }
}
```

### 2.5 Activación de RLS

`src/database/migrations/1700000002000-EnableRLS.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnableRLS1700000002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tenantTables = ['users', 'clients', 'feature_flags'];
    for (const table of tenantTables) {
      await queryRunner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
      await queryRunner.query(`
        CREATE POLICY tenant_isolation_${table} ON ${table}
        USING (company_id = current_setting('app.current_company_id', true)::uuid);
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tenantTables = ['users', 'clients', 'feature_flags'];
    for (const table of tenantTables) {
      await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_${table} ON ${table};`);
      await queryRunner.query(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`);
    }
  }
}
```

**Ejecutar todo:**

```bash
npm run migration:run
```

**Verificación:**

```sql
SELECT email, full_name FROM users;
SELECT code FROM permissions WHERE resource = 'clients';
SELECT p.name, count(pp.permission_id) FROM profiles p
  JOIN profile_permissions pp ON pp.profile_id = p.id GROUP BY p.name;
```

---

## 3. FASE 2 — Núcleo transversal (`commons`)

### 3.1 `RbacService`

`src/modules/rbac/rbac.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import Redis from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';

@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRedis() private redis: Redis,
  ) {}

  private cacheKey(userId: string): string {
    return `rbac:permissions:${userId}`;
  }

  async getPermissions(userId: string, companyId: string): Promise<string[]> {
    const cached = await this.redis.get(this.cacheKey(userId));
    if (cached) return JSON.parse(cached);

    const result: { code: string }[] = await this.userRepo.query(
      `
      SELECT DISTINCT p.code
      FROM users u
      JOIN profile_permissions pp ON pp.profile_id = u.profile_id
      JOIN permissions p ON p.id = pp.permission_id
      WHERE u.id = $1 AND u.company_id = $2
      `,
      [userId, companyId],
    );

    const codes = result.map((r) => r.code);
    await this.redis.set(this.cacheKey(userId), JSON.stringify(codes), 'EX', 120); // TTL 2 min
    return codes;
  }

  async invalidateCache(userId: string): Promise<void> {
    await this.redis.del(this.cacheKey(userId));
  }
}
```

### 3.2 Decorador y Guard de permisos

`src/commons/decorators/permissions.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);
```

`src/commons/guards/permissions.guard.ts`

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { RbacService } from '../../modules/rbac/rbac.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.get<string[]>(PERMISSIONS_KEY, context.getHandler());
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user; // inyectado por JwtAuthGuard

    if (!user) throw new ForbiddenException('No autenticado');

    // SIEMPRE se recalcula desde la base de datos — nunca se confía en el request
    const userPermissions = await this.rbacService.getPermissions(user.sub, user.companyId);

    const hasAll = required.every((perm) => userPermissions.includes(perm));
    if (!hasAll) {
      throw new ForbiddenException('Permisos insuficientes');
    }
    return true;
  }
}
```

### 3.3 `JwtAuthGuard` + decoradores de usuario/tenant

`src/commons/guards/jwt-auth.guard.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

`src/modules/auth/strategies/jwt.strategy.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.access_token ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: any) {
    // Lo que retorne aquí queda disponible en request.user
    return {
      sub: payload.sub,
      companyId: payload.companyId,
      permissionsVersion: payload.permissionsVersion,
    };
  }
}
```

`src/commons/decorators/current-user.decorator.ts`

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
```

`src/commons/decorators/current-tenant.decorator.ts`

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentTenant = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user?.companyId;
});
```

### 3.4 `TenantContextInterceptor` (activa RLS por petición)

`src/commons/interceptors/tenant-context.interceptor.ts`

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { DataSource } from 'typeorm';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private dataSource: DataSource) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const companyId = request.user?.companyId;

    if (companyId) {
      await this.dataSource.query(`SET app.current_company_id = '${companyId}'`);
    }

    return next.handle();
  }
}
```

> **Nota técnica importante:** en producción con pool de conexiones compartido, `SET` a nivel de sesión puede filtrarse entre requests concurrentes. La forma robusta es usar `SET LOCAL` dentro de una transacción explícita por request, o un `QueryRunner` dedicado por request. Para fase 1, con volumen bajo, el enfoque de arriba es aceptable — documentarlo como deuda técnica a resolver antes de producción con alta concurrencia.

### 3.5 `FeatureFlagService` (con filtro de `false` incorporado)

`src/modules/feature-flags/feature-flags.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeatureFlag } from './entities/feature-flag.entity';

@Injectable()
export class FeatureFlagsService {
  constructor(@InjectRepository(FeatureFlag) private repo: Repository<FeatureFlag>) {}

  async getFlags(companyId: string, userId?: string): Promise<Record<string, boolean>> {
    const flags = await this.repo.find({
      where: [{ companyId, userId: null as any }, ...(userId ? [{ companyId, userId }] : [])],
    });

    const merged: Record<string, boolean> = {};
    for (const flag of flags) {
      merged[flag.key] = flag.enabled; // override de usuario pisa el de empresa si viene después
    }

    // Solo se devuelven los flags activos — se omiten los `false`
    return Object.fromEntries(Object.entries(merged).filter(([, v]) => v === true));
  }
}
```

### 3.6 Filtro global de excepciones

`src/commons/filters/http-exception.filter.ts`

```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : 'Error interno del servidor';

    response.status(status).json({
      statusCode: status,
      path: request.url,
      correlationId: (request as any).correlationId,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### 3.7 Middleware de Correlation ID

`src/commons/middlewares/correlation-id.middleware.ts`

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const id = (req.headers['x-correlation-id'] as string) || randomUUID();
    (req as any).correlationId = id;
    res.setHeader('X-Correlation-ID', id);
    next();
  }
}
```

Registro en `app.module.ts`:

```typescript
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
```

### 3.8 Registro global de Guards/Interceptors/Filters

`src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './commons/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.enableCors({ origin: process.env.WEBAUTHN_ORIGIN, credentials: true });
  app.useGlobalFilters(new HttpExceptionFilter());
  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
```

`JwtAuthGuard` y `PermissionsGuard` se aplican **por controlador/endpoint** (no global), para poder excluir rutas de login:

```typescript
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('clients')
export class ClientsController { ... }
```

### 3.9 Prueba de humo del Guard

`src/modules/health/health.controller.ts`

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../commons/guards/permissions.guard';
import { Permissions } from '../../commons/decorators/permissions.decorator';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }

  @Get('secure')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('clients.read')
  checkSecure() {
    return { status: 'ok-secure' };
  }
}
```

Prueba manual:
```bash
# Sin cookie válida → 401
curl -i http://localhost:3000/api/health/secure

# Con cookie de un usuario sin permiso "clients.read" → 403
# Con cookie de un usuario con el permiso → 200
```

---

## 4. FASE 3 — Módulo de Autenticación

### 4.1 DTOs

`src/modules/auth/dto/login.dto.ts`

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

### 4.2 Interfaz Strategy

`src/modules/auth/interfaces/auth-strategy.interface.ts`

```typescript
export interface AuthResult {
  userId: string;
  companyId: string;
  permissionsVersion: number;
}

export interface AuthStrategy {
  authenticate(credentials: unknown, companyId: string): Promise<AuthResult>;
}
```

`src/modules/auth/strategies/local-auth.strategy.ts`

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserStatus } from '../../users/entities/user.entity';
import { AuthStrategy, AuthResult } from '../interfaces/auth-strategy.interface';

@Injectable()
export class LocalAuthStrategy implements AuthStrategy {
  constructor(@InjectRepository(User) private userRepo: Repository<User>) {}

  async authenticate(
    credentials: { email: string; password: string },
    companyId: string,
  ): Promise<AuthResult> {
    const user = await this.userRepo.findOne({
      where: { email: credentials.email, companyId },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(credentials.password, user.passwordHash || '');
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    return {
      userId: user.id,
      companyId: user.companyId,
      permissionsVersion: user.permissionsVersion,
    };
  }
}
```

### 4.3 Resolver de estrategia

`src/modules/auth/auth-strategy.resolver.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company, AuthStrategyType } from '../config/entities/company.entity';
import { AuthStrategy } from './interfaces/auth-strategy.interface';
import { LocalAuthStrategy } from './strategies/local-auth.strategy';
import { PasskeyAuthStrategy } from './strategies/passkey-auth.strategy';

@Injectable()
export class AuthStrategyResolver {
  constructor(
    @InjectRepository(Company) private companyRepo: Repository<Company>,
    private localStrategy: LocalAuthStrategy,
    private passkeyStrategy: PasskeyAuthStrategy,
    // private microsoftStrategy: MicrosoftAuthStrategy, // preparado para el futuro, no implementado aún
  ) {}

  async resolve(companyId: string): Promise<AuthStrategy> {
    const company = await this.companyRepo.findOneByOrFail({ id: companyId });

    switch (company.authStrategy) {
      case AuthStrategyType.PASSKEY:
        return this.passkeyStrategy;
      case AuthStrategyType.MICROSOFT:
        throw new Error('Microsoft auth strategy no implementada todavía');
      case AuthStrategyType.LOCAL:
      default:
        return this.localStrategy;
    }
  }
}
```

### 4.4 Estrategia Passkey (WebAuthn)

`src/modules/auth/strategies/passkey-auth.strategy.ts`

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { Device } from '../entities/device.entity';
import { User } from '../../users/entities/user.entity';
import { AuthStrategy, AuthResult } from '../interfaces/auth-strategy.interface';

@Injectable()
export class PasskeyAuthStrategy implements AuthStrategy {
  constructor(
    @InjectRepository(Device) private deviceRepo: Repository<Device>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private config: ConfigService,
  ) {}

  async getRegistrationOptions(userId: string) {
    const user = await this.userRepo.findOneByOrFail({ id: userId });
    const existingDevices = await this.deviceRepo.find({ where: { userId } });

    return generateRegistrationOptions({
      rpName: this.config.get('WEBAUTHN_RP_NAME')!,
      rpID: this.config.get('WEBAUTHN_RP_ID')!,
      userID: user.id,
      userName: user.email,
      excludeCredentials: existingDevices.map((d) => ({
        id: d.credentialId,
        type: 'public-key',
      })),
    });
  }

  async verifyRegistration(userId: string, response: any, expectedChallenge: string) {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.config.get('WEBAUTHN_ORIGIN')!,
      expectedRPID: this.config.get('WEBAUTHN_RP_ID')!,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new UnauthorizedException('No se pudo verificar el registro del dispositivo');
    }

    const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

    await this.deviceRepo.save(
      this.deviceRepo.create({
        userId,
        credentialId: Buffer.from(credentialID).toString('base64url'),
        publicKey: Buffer.from(credentialPublicKey).toString('base64url'),
        counter,
      }),
    );

    return { verified: true };
  }

  async getAuthenticationOptions(email: string, companyId: string) {
    const user = await this.userRepo.findOneOrFail({ where: { email, companyId } });
    const devices = await this.deviceRepo.find({ where: { userId: user.id } });

    return generateAuthenticationOptions({
      rpID: this.config.get('WEBAUTHN_RP_ID')!,
      allowCredentials: devices.map((d) => ({ id: d.credentialId, type: 'public-key' })),
    });
  }

  async authenticate(
    credentials: { response: any; expectedChallenge: string; email: string },
    companyId: string,
  ): Promise<AuthResult> {
    const user = await this.userRepo.findOneOrFail({
      where: { email: credentials.email, companyId },
    });
    const device = await this.deviceRepo.findOneOrFail({
      where: { credentialId: credentials.response.id },
    });

    const verification = await verifyAuthenticationResponse({
      response: credentials.response,
      expectedChallenge: credentials.expectedChallenge,
      expectedOrigin: this.config.get('WEBAUTHN_ORIGIN')!,
      expectedRPID: this.config.get('WEBAUTHN_RP_ID')!,
      authenticator: {
        credentialID: Buffer.from(device.credentialId, 'base64url'),
        credentialPublicKey: Buffer.from(device.publicKey, 'base64url'),
        counter: device.counter,
      },
    });

    if (!verification.verified) throw new UnauthorizedException('Passkey inválida');

    device.counter = verification.authenticationInfo.newCounter;
    await this.deviceRepo.save(device);

    return {
      userId: user.id,
      companyId: user.companyId,
      permissionsVersion: user.permissionsVersion,
    };
  }
}
```

### 4.5 `RefreshToken` — entidad + servicio

`src/modules/auth/entities/refresh-token.entity.ts`

```typescript
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../commons/entities/base.entity';

@Entity('refresh_tokens')
export class RefreshToken extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: string;

  @Column({ unique: true })
  token: string;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @Column({ default: false })
  revoked: boolean;
}
```

### 4.6 `AuthController`

```typescript
import { Controller, Post, Body, Res, Req, UnauthorizedException } from '@nestjs/common';
import { Response, Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { AuthStrategyResolver } from './auth-strategy.resolver';
import { LoginDto } from './dto/login.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';
import { RbacService } from '../rbac/rbac.service';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private resolver: AuthStrategyResolver,
    private jwtService: JwtService,
    @InjectRepository(RefreshToken) private refreshRepo: Repository<RefreshToken>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private rbacService: RbacService,
    private config: ConfigService,
  ) {}

  @Post('login')
  async login(
    @Body() dto: LoginDto & { companyId: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const strategy = await this.resolver.resolve(dto.companyId);
    const result = await strategy.authenticate(dto, dto.companyId);

    const accessToken = this.jwtService.sign({
      sub: result.userId,
      companyId: result.companyId,
      permissionsVersion: result.permissionsVersion,
    });

    const refreshTokenValue = randomBytes(48).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Number(this.config.get('JWT_REFRESH_EXPIRES_IN_DAYS')));

    await this.refreshRepo.save(
      this.refreshRepo.create({ userId: result.userId, token: refreshTokenValue, expiresAt }),
    );

    res.cookie('access_token', accessToken, {
      httpOnly: true, secure: true, sameSite: 'lax', maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', refreshTokenValue, {
      httpOnly: true, secure: true, sameSite: 'strict', path: '/api/auth/refresh',
      maxAge: Number(this.config.get('JWT_REFRESH_EXPIRES_IN_DAYS')) * 24 * 60 * 60 * 1000,
    });

    return { success: true };
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.refresh_token;
    if (!token) throw new UnauthorizedException();

    const stored = await this.refreshRepo.findOne({ where: { token, revoked: false } });
    if (!stored || stored.expiresAt < new Date()) throw new UnauthorizedException();

    const user = await this.userRepo.findOneByOrFail({ id: stored.userId });

    const accessToken = this.jwtService.sign({
      sub: user.id,
      companyId: user.companyId,
      permissionsVersion: user.permissionsVersion,
    });

    res.cookie('access_token', accessToken, {
      httpOnly: true, secure: true, sameSite: 'lax', maxAge: 15 * 60 * 1000,
    });

    return { success: true };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.refresh_token;
    if (token) {
      await this.refreshRepo.update({ token }, { revoked: true });
    }
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    return { success: true };
  }
}
```

### 4.7 `MeController` — endpoint bootstrap

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';
import { CurrentUser } from '../../commons/decorators/current-user.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Company } from '../config/entities/company.entity';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Company) private companyRepo: Repository<Company>,
  ) {}

  @Get('bootstrap')
  async bootstrap(@CurrentUser() authUser: { sub: string; companyId: string }) {
    const user = await this.userRepo.findOneByOrFail({ id: authUser.sub });
    const company = await this.companyRepo.findOneByOrFail({ id: authUser.companyId });

    return {
      user: { id: user.id, name: user.fullName, email: user.email },
      company: {
        id: company.id,
        theme: { primaryColor: company.primaryColor, logoUrl: company.logoUrl },
      },
    };
  }
}
```

### 4.8 Registro del módulo

`src/modules/auth/auth.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { MeController } from './me.controller';
import { AuthStrategyResolver } from './auth-strategy.resolver';
import { LocalAuthStrategy } from './strategies/local-auth.strategy';
import { PasskeyAuthStrategy } from './strategies/passkey-auth.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from '../users/entities/user.entity';
import { Company } from '../config/entities/company.entity';
import { Device } from './entities/device.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RbacModule } from '../rbac/rbac.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Company, Device, RefreshToken]),
    PassportModule,
    RbacModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: config.get('JWT_ACCESS_EXPIRES_IN') },
      }),
    }),
  ],
  controllers: [AuthController, MeController],
  providers: [AuthStrategyResolver, LocalAuthStrategy, PasskeyAuthStrategy, JwtStrategy],
  exports: [],
})
export class AuthModule {}
```

**Entregable de fase — pruebas manuales:**

```bash
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"vendedor@empresa1.com","password":"Password123!","companyId":"11111111-1111-1111-1111-111111111111"}'

curl -b cookies.txt http://localhost:3000/api/me/bootstrap
```

---

## 5. FASE 4 — Configuración de Kong

`backend/kong/kong.yml`

```yaml
_format_version: "3.0"

services:
  - name: auth-service
    url: http://backend:3000/api/auth
    routes:
      - name: auth-route
        paths: ["/api/auth"]
        strip_path: false
    # SIN plugin jwt — aquí todavía no hay token

  - name: backend-service
    url: http://backend:3000/api
    routes:
      - name: backend-route
        paths: ["/api"]
        strip_path: false
    plugins:
      - name: jwt
        config:
          claims_to_verify: ["exp"]
          cookie_names: ["access_token"]
      - name: cors
        config:
          origins: ["http://localhost:5173"]
          credentials: true
          methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
      - name: rate-limiting
        config:
          minute: 100
          policy: local
      - name: correlation-id
        config:
          header_name: X-Correlation-ID
          generator: uuid
          echo_downstream: true

consumers:
  - username: pwa-frontend
    jwt_secrets:
      - key: pwa-frontend-key
        algorithm: HS256
        secret: change_me_access_secret   # DEBE coincidir con JWT_ACCESS_SECRET del backend
```

> **Nota:** el plugin `jwt` de Kong estándar verifica el token vía header `Authorization` por defecto. Para verificar desde cookie httpOnly, usar el plugin comunitario `jwt` con soporte de `cookie_names`, o —alternativa más simple para fase 1— dejar que Kong solo haga rate-limiting/CORS/correlation-id, y que la verificación completa de JWT quede 100% en el `JwtAuthGuard` de NestJS (que ya la hace). Decidir esto según la versión exacta de Kong disponible en el entorno.

**Reiniciar Kong tras cambios:**
```bash
docker compose restart kong
curl -i http://localhost:8000/api/health
```

---

## 6. FASE 5 — Módulos de negocio

### 6.1 `ClientsController` (patrón a replicar en Users/Config)

```typescript
import { Controller, Get, Post, Patch, Param, Body, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../commons/guards/permissions.guard';
import { Permissions } from '../../commons/decorators/permissions.decorator';
import { CurrentTenant } from '../../commons/decorators/current-tenant.decorator';
import { CurrentUser } from '../../commons/decorators/current-user.decorator';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { RbacService } from '../rbac/rbac.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';

@Controller('clients')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClientsController {
  constructor(
    private service: ClientsService,
    private rbacService: RbacService,
    private flagsService: FeatureFlagsService,
  ) {}

  @Get('context')
  async getContext(@CurrentUser() user, @CurrentTenant() companyId: string) {
    const all = await this.rbacService.getPermissions(user.sub, companyId);
    const permissions = all.filter((p) => p.startsWith('clients.'));
    const allFlags = await this.flagsService.getFlags(companyId, user.sub);
    const featureFlags = Object.fromEntries(
      Object.entries(allFlags).filter(([k]) => k.toLowerCase().includes('client')),
    );
    return { permissions, featureFlags };
  }

  @Get()
  @Permissions('clients.read')
  findAll(@CurrentTenant() companyId: string, @Query() query: any) {
    return this.service.findAll(companyId, query);
  }

  @Post()
  @Permissions('clients.create')
  create(@CurrentTenant() companyId: string, @Body() dto: CreateClientDto) {
    return this.service.create(companyId, dto);
  }

  @Patch(':id')
  @Permissions('clients.update')
  update(@Param('id') id: string, @CurrentTenant() companyId: string, @Body() dto: UpdateClientDto) {
    return this.service.update(id, companyId, dto);
  }

  @Patch(':id/status')
  @Permissions('clients.update')
  toggleStatus(@Param('id') id: string, @CurrentTenant() companyId: string) {
    return this.service.toggleStatus(id, companyId);
  }
}
```

### 6.2 `ClientsService`

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client, ClientStatus } from './entities/client.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(@InjectRepository(Client) private repo: Repository<Client>) {}

  findAll(companyId: string, query: { page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return this.repo.findAndCount({
      where: { companyId },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
  }

  create(companyId: string, dto: CreateClientDto) {
    return this.repo.save(this.repo.create({ ...dto, companyId }));
  }

  async update(id: string, companyId: string, dto: UpdateClientDto) {
    const client = await this.repo.findOne({ where: { id, companyId } });
    if (!client) throw new NotFoundException();
    Object.assign(client, dto);
    return this.repo.save(client);
  }

  async toggleStatus(id: string, companyId: string) {
    const client = await this.repo.findOne({ where: { id, companyId } });
    if (!client) throw new NotFoundException();
    client.status = client.status === ClientStatus.ACTIVE ? ClientStatus.INACTIVE : ClientStatus.ACTIVE;
    return this.repo.save(client);
  }
}
```

**Los módulos `Users` y `Config` siguen exactamente esta misma estructura** (controller + service + dto + entity ya definida en Fase 1), cambiando solo el recurso y las reglas específicas (ej. `Config` solo permite `config.update` al perfil `super_admin`, lo cual ya queda garantizado por la matriz de `profile_permissions` sembrada en la Fase 1).

---

## 7. FASE 6 — Frontend: base y autenticación

### 7.1 Instalación

```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install react-router-dom @tanstack/react-query axios
npm install @simplewebauthn/browser
```

### 7.2 Cliente HTTP con interceptor de refresh

`src/shared/api/httpClient.ts`

```typescript
import axios from 'axios';

export const httpClient = axios.create({
  baseURL: 'http://localhost:8000/api', // apunta a Kong
  withCredentials: true, // envía cookies httpOnly
});

let isRefreshing = false;
let queue: Array<() => void> = [];

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          await httpClient.post('/auth/refresh');
          queue.forEach((cb) => cb());
          queue = [];
        } catch (e) {
          window.location.href = '/login';
          return Promise.reject(e);
        } finally {
          isRefreshing = false;
        }
      }

      return new Promise((resolve) => {
        queue.push(() => resolve(httpClient(originalRequest)));
      });
    }
    return Promise.reject(error);
  },
);
```

### 7.3 `AuthContext`

`src/modules/auth/AuthContext.tsx`

```tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { httpClient } from '../../shared/api/httpClient';

interface BootstrapData {
  user: { id: string; name: string; email: string };
  company: { id: string; theme: { primaryColor: string; logoUrl: string } };
}

interface ModuleContext {
  permissions: string[];
  featureFlags: Record<string, boolean>;
}

interface AuthContextValue {
  bootstrap: BootstrapData | null;
  moduleContexts: Record<string, ModuleContext>;
  loadModuleContext: (moduleName: string) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [moduleContexts, setModuleContexts] = useState<Record<string, ModuleContext>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    httpClient
      .get('/me/bootstrap')
      .then((res) => setBootstrap(res.data))
      .catch(() => setBootstrap(null))
      .finally(() => setIsLoading(false));
  }, []);

  const loadModuleContext = async (moduleName: string) => {
    if (moduleContexts[moduleName]) return; // ya cargado, no repetir
    const res = await httpClient.get(`/${moduleName}/context`);
    setModuleContexts((prev) => ({ ...prev, [moduleName]: res.data }));
  };

  return (
    <AuthContext.Provider value={{ bootstrap, moduleContexts, loadModuleContext, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
```

### 7.4 Componente `<Can>` y hook `useFeatureFlag`

`src/shared/components/Can.tsx`

```tsx
import { ReactNode } from 'react';

interface CanProps {
  permission: string;
  permissions: string[];
  children: ReactNode;
}

export function Can({ permission, permissions, children }: CanProps) {
  if (!permissions.includes(permission)) return null;
  return <>{children}</>;
}
```

`src/shared/hooks/useFeatureFlag.ts`

```typescript
export function useFeatureFlag(flags: Record<string, boolean>, name: string): boolean {
  return flags[name] === true;
}
```

### 7.5 Vista de Login

`src/modules/auth/LoginPage.tsx`

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { httpClient } from '../../shared/api/httpClient';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyId, setCompanyId] = useState('11111111-1111-1111-1111-111111111111');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await httpClient.post('/auth/login', { email, password, companyId });
      navigate('/home');
    } catch {
      setError('Credenciales inválidas');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Contraseña"
      />
      {error && <p>{error}</p>}
      <button type="submit">Ingresar</button>
    </form>
  );
}
```

### 7.6 Header, Footer, Layout

`src/shared/components/Header.tsx`

```tsx
import { useAuth } from '../../modules/auth/AuthContext';
import { httpClient } from '../api/httpClient';
import { useNavigate } from 'react-router-dom';

export function Header() {
  const { bootstrap } = useAuth();
  const navigate = useNavigate();

  const logout = async () => {
    await httpClient.post('/auth/logout');
    navigate('/login');
  };

  return (
    <header style={{ background: '#fff', display: 'flex', justifyContent: 'space-between', padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <img src={bootstrap?.company.theme.logoUrl} alt="logo" height={32} />
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'green' }} title="En línea" />
      </div>
      <button onClick={logout}>Cerrar sesión</button>
    </header>
  );
}
```

`src/shared/components/Hero.tsx`

```tsx
import { useAuth } from '../../modules/auth/AuthContext';

export function Hero({ children }: { children?: React.ReactNode }) {
  const { bootstrap } = useAuth();
  return (
    <div style={{ background: bootstrap?.company.theme.primaryColor, padding: 24, color: '#fff' }}>
      {children}
    </div>
  );
}
```

`src/shared/components/Footer.tsx`

```tsx
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer style={{ position: 'fixed', bottom: 0, width: '100%', display: 'flex', justifyContent: 'space-around', background: '#fff', borderTop: '1px solid #eee', padding: 8 }}>
      <Link to="/home">Inicio</Link>
      <Link to="/profile">Perfil</Link>
    </footer>
  );
}
```

### 7.7 Enrutamiento

`src/App.tsx`

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './modules/auth/AuthContext';
import { LoginPage } from './modules/auth/LoginPage';
import { HomePage } from './modules/home/HomePage';
import { ClientsListPage } from './modules/clients/ClientsListPage';
import { ProfilePage } from './modules/profile/ProfilePage';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/clients" element={<ClientsListPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

---

## 8. FASE 7 — Vistas de negocio (patrón replicable)

`src/modules/clients/ClientsListPage.tsx`

```tsx
import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Can } from '../../shared/components/Can';
import { httpClient } from '../../shared/api/httpClient';
import { Header } from '../../shared/components/Header';
import { Footer } from '../../shared/components/Footer';

export function ClientsListPage() {
  const { loadModuleContext, moduleContexts } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const ctx = moduleContexts['clients'];

  useEffect(() => {
    loadModuleContext('clients').then(() => {
      httpClient.get('/clients').then((res) => setClients(res.data[0]));
    });
  }, []);

  if (!ctx) return <p>Cargando...</p>;

  return (
    <div>
      <Header />
      <table>
        <thead>
          <tr><th>Nombre</th><th>Documento</th><th>Estado</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.id}>
              <td>{c.fullName}</td>
              <td>{c.documentNumber}</td>
              <td>{c.status}</td>
              <td>
                <Can permission="clients.update" permissions={ctx.permissions}>
                  <button>Editar</button>
                  <button>Activar/Desactivar</button>
                </Can>
                <Can permission="clients.delete" permissions={ctx.permissions}>
                  <button>Eliminar</button>
                </Can>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Footer />
    </div>
  );
}
```

Las vistas de **Creación**, **Edición de Cliente**, **Home**, **Perfil** y **Vista de Pruebas** siguen el mismo patrón: cargar `moduleContext` correspondiente, renderizar condicionalmente con `<Can>`, y llamar a `httpClient` para persistir. La **Vista de Pruebas** adicionalmente expone un selector que cambia la sesión activa entre los 3 usuarios seed (reutilizando `/auth/login` con las credenciales de prueba) y muestra en pantalla el JSON crudo de `moduleContexts` para depuración visual del equipo de QA.

---

## 9. FASE 8 — Módulo de Créditos

```typescript
// PLACEHOLDER — completar con el detalle real de Anexos/flujocredito
@Entity('credits')
export class Credit extends BaseEntity {
  @Column({ name: 'company_id' })
  companyId: string;

  @Column({ name: 'client_id' })
  clientId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  requestedAmount: number;

  @Column({ default: 'pending' })
  status: string; // pending | in_study | approved | rejected
}
```

Controller/Service siguen exactamente el patrón de la sección 6.1/6.2, con el permiso adicional `credits.study` protegiendo el/los endpoints del flujo de estudio, cuyos pasos concretos se definen al recibir el Anexo.

---

## 10. FASE 9 — Verificación final (checklist ejecutable)

```bash
# 1. RLS activo en todas las tablas de tenant
psql -U pwa_user -d pwa_db -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public';"

# 2. Ningún endpoint sensible sin @Permissions — revisión manual de controllers
grep -rL "@Permissions" backend/src/modules/*/[a-z]*.controller.ts

# 3. Prueba de JWT alterado — debe fallar en Kong o en el Guard
curl -b "access_token=token_manipulado" http://localhost:8000/api/clients

# 4. Prueba de bypass de permisos vía botón forzado en frontend
# (manual: forzar en consola del navegador que aparezca un botón sin el permiso real,
#  hacer clic, confirmar 403 en Network tab)

# 5. Prueba de feature flag de negocio forzado desde el cliente
curl -b cookies.txt -X POST http://localhost:8000/api/sap/sync   # (cuando exista ese endpoint)
```

---

## Resumen de dependencias externas pendientes

1. Contenido real de `Anexos/creacion_clientes` → reemplazar entidad `Client` (sección 2.3) y DTOs.
2. Contenido real de `Anexos/flujocredito` → completar entidad `Credit` y sus endpoints (sección 9).
3. Confirmar versión exacta de Kong disponible, para decidir si el plugin `jwt` soporta verificación desde cookie o si esa validación queda exclusivamente en `JwtAuthGuard`.
4. Definir secret real de producción para `JWT_ACCESS_SECRET` (nunca usar el valor de ejemplo fuera de desarrollo).