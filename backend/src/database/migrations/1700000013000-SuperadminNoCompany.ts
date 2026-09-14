import { MigrationInterface, QueryRunner } from 'typeorm';

const SUPER_ADMIN_PROFILE_ID = 'aaaaaaaa-0000-4000-8000-000000000001';
const DEMO_FALLBACK_COMPANY_ID = '11111111-1111-1111-8111-111111111111';

/**
 * El superadmin es un rol de sistema: ya no pertenece a ninguna empresa
 * (company_id NULL). Su acceso a una empresa concreta es temporal, vía el
 * switch de empresa (/auth/company), y se guarda solo en el token.
 */
export class SuperadminNoCompany1700000013000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ALTER COLUMN company_id DROP NOT NULL;`);
    await queryRunner.query(
      `UPDATE users SET company_id = NULL WHERE profile_id = $1`,
      [SUPER_ADMIN_PROFILE_ID],
    );

    // Los usuarios de sistema (company_id NULL) deben ser visibles para cualquier
    // empresa en los queries que corren como pwa_user (mismo criterio que los
    // módulos globales). La aislación real se garantiza a nivel de aplicación.
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_users ON users;`);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation_users ON users
      USING (company_id = current_setting('app.current_company_id', true)::uuid OR company_id IS NULL)
      WITH CHECK (company_id = current_setting('app.current_company_id', true)::uuid OR company_id IS NULL);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE users SET company_id = $1 WHERE company_id IS NULL`,
      [DEMO_FALLBACK_COMPANY_ID],
    );
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_users ON users;`);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation_users ON users
      USING (company_id = current_setting('app.current_company_id', true)::uuid)
      WITH CHECK (company_id = current_setting('app.current_company_id', true)::uuid);
    `);
    await queryRunner.query(`ALTER TABLE users ALTER COLUMN company_id SET NOT NULL;`);
  }
}