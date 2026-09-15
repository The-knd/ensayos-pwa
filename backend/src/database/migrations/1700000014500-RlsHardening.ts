import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hardening RLS (OWASP A01, ISO 27001 A.9.1.2):
 *
 * - Crea un rol de aplicación NO owner (NOBYPASSRLS) con permisos CRUD sobre
 *   todas las tablas + secuencias + default privileges para tablas futuras.
 *   Solo se crea si DB_APP_USER/DB_APP_PASSWORD están definidos al ejecutar la
 *   migración (dev suele quedarse con el owner como hoy; prod adopta el rol).
 * - Aplica FORCE ROW LEVEL SECURITY sobre todas las tablas tenant-scoped para
 *   que las políticas se apliquen a cualquier rol no-owner (incluido el de
 *   aplicación), de modo que RLS deje de ser decorativo cuando el runtime se
 *   conecta con el rol de aplicación.
 *
 * Nota: el tabla owner sigue exento de RLS por diseño de Postgres; por eso al
 * backend hay que conectarlo con el rol de aplicación (DB_APP_USER), no con el
 * owner pwa_user. El scoping por companyId en el código sigue siendo la frontera
 * principal; RLS es la segunda capa.
 */
export class RlsHardening1700000014500 implements MigrationInterface {
  private readonly tenantTables = [
    'users',
    'clients',
    'feature_flags',
    'client_directions',
    'client_references',
    'credits',
    'credit_documents',
    'client_tax_settings',
    'module_assignments',
    'modules',
    'module_variants',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    const appUser = (process.env.DB_APP_USER || '').trim();
    const appPassword = (process.env.DB_APP_PASSWORD || '').trim();

    if (appUser && appPassword) {
      const safePassword = appPassword.replace(/'/g, "''");
      await queryRunner.query(`DO $rls$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = '${appUser}') THEN
            CREATE ROLE "${appUser}" LOGIN NOBYPASSRLS PASSWORD '${safePassword}';
          END IF;
        END $rls$;`);

      await queryRunner.query(`GRANT USAGE ON SCHEMA public TO "${appUser}"`);
      await queryRunner.query(
        `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${appUser}"`,
      );
      await queryRunner.query(
        `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${appUser}"`,
      );
      await queryRunner.query(
        `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "${appUser}"`,
      );
      await queryRunner.query(
        `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO "${appUser}"`,
      );
    }

    for (const table of this.tenantTables) {
      await queryRunner.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tenantTables) {
      await queryRunner.query(`ALTER TABLE ${table} NO FORCE ROW LEVEL SECURITY`);
    }
  }
}