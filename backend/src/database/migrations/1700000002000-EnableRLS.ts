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
