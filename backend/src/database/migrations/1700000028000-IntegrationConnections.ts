import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Integraciones con sistemas externos (SAP Business One primero):
 *
 *   integration_connections  conexión por (empresa, sistema, entorno): URL y
 *                            ajustes en claro, credenciales cifradas
 *                            (AES-256-GCM, ver commons/crypto/credentials.cipher.ts).
 *   integration_jobs         cola, estado y auditoría de las sincronizaciones.
 *   client_external_refs     enlace entre un cliente de la app y su registro en
 *                            el sistema externo, por empresa.
 *
 * RLS estricta (sin rama `company_id IS NULL`): nada de esto es global. El
 * superadmin escribe con `inTenant(companyId)`; el worker igual.
 *
 * `NULLIF(…, '')`: TenantContextInterceptor fija el GUC a NULL para el
 * superadmin y Postgres lo guarda como ''. Sin NULLIF, `''::uuid` lanza
 * "invalid input syntax for type uuid" con el rol de aplicación en vez de
 * devolver 0 filas.
 *
 * Los permisos del rol de aplicación los cubren los DEFAULT PRIVILEGES de
 * 1700000014500-RlsHardening (estas tablas las crea el owner).
 */
export class IntegrationConnections1700000028000 implements MigrationInterface {
  name = 'IntegrationConnections1700000028000';

  private readonly tables = ['integration_connections', 'integration_jobs', 'client_external_refs'];

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'integration_connections_auth_type_enum') THEN
        CREATE TYPE integration_connections_auth_type_enum AS ENUM ('token', 'basic', 'session');
      END IF;
    END $$;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS integration_connections (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        system varchar(40) NOT NULL,
        environment varchar(20) NOT NULL DEFAULT 'production' CHECK (environment IN ('production', 'test')),
        enabled boolean NOT NULL DEFAULT false,
        auth_type integration_connections_auth_type_enum NOT NULL,
        base_url text NOT NULL,
        settings jsonb NOT NULL DEFAULT '{}'::jsonb,
        credentials_encrypted text,
        key_version smallint NOT NULL DEFAULT 1,
        credentials_updated_at timestamptz,
        expires_at timestamptz,
        last_test_at timestamptz,
        last_test_status varchar(20),
        updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_integration_connections_company_system_env" UNIQUE (company_id, system, environment),
        CONSTRAINT "CK_integration_connections_enabled_has_creds" CHECK (NOT enabled OR credentials_encrypted IS NOT NULL)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS integration_jobs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        system varchar(40) NOT NULL,
        environment varchar(20) NOT NULL,
        operation varchar(60) NOT NULL,
        trigger varchar(20) NOT NULL CHECK (trigger IN ('manual', 'schedule')),
        launched_by uuid REFERENCES users(id) ON DELETE SET NULL,
        status varchar(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'failed')),
        attempts int NOT NULL DEFAULT 0,
        next_attempt_at timestamptz NOT NULL DEFAULT now(),
        started_at timestamptz,
        finished_at timestamptz,
        cursor jsonb,
        result jsonb,
        error jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    // Un solo job activo por empresa y operación: doble clic, otra instancia o
    // el programador no duplican la sincronización.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_integration_jobs_active"
        ON integration_jobs (company_id, system, operation)
        WHERE status IN ('queued', 'running');
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_integration_jobs_company_created ON integration_jobs (company_id, created_at DESC);`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS client_external_refs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        system varchar(40) NOT NULL,
        external_id varchar(100) NOT NULL,
        client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        source_hash char(64),
        last_synced_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_client_external_refs_external" UNIQUE (company_id, system, external_id),
        CONSTRAINT "UQ_client_external_refs_client" UNIQUE (company_id, system, client_id)
      );
    `);

    for (const table of this.tables) {
      await queryRunner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
      await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_${table} ON ${table}`);
      await queryRunner.query(`
        CREATE POLICY tenant_isolation_${table} ON ${table}
        USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid)
        WITH CHECK (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [...this.tables].reverse()) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${table}`);
    }
    await queryRunner.query(`DROP TYPE IF EXISTS integration_connections_auth_type_enum`);
  }
}
