import { MigrationInterface, QueryRunner } from 'typeorm';

export class RLSFull1700000004000 implements MigrationInterface {
  private readonly tenantTables = ['users', 'clients', 'feature_flags'];
  private readonly dependentTables = ['client_directions', 'client_references', 'credits'];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Recrea las políticas existentes añadiendo WITH CHECK para que también
    // se valide el tenant al hacer INSERT/UPDATE (Option B: sin FORCE RLS).
    for (const table of this.tenantTables) {
      await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_${table} ON ${table};`);
      await queryRunner.query(`
        CREATE POLICY tenant_isolation_${table} ON ${table}
        USING (company_id = current_setting('app.current_company_id', true)::uuid)
        WITH CHECK (company_id = current_setting('app.current_company_id', true)::uuid);
      `);
    }

    // Habilita RLS sobre las tablas dependientes que aún no lo tenían.
    for (const table of this.dependentTables) {
      await queryRunner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
      await queryRunner.query(`
        CREATE POLICY tenant_isolation_${table} ON ${table}
        USING (company_id = current_setting('app.current_company_id', true)::uuid)
        WITH CHECK (company_id = current_setting('app.current_company_id', true)::uuid);
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.dependentTables) {
      await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_${table} ON ${table};`);
      await queryRunner.query(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`);
    }

    for (const table of this.tenantTables) {
      await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_${table} ON ${table};`);
      await queryRunner.query(`
        CREATE POLICY tenant_isolation_${table} ON ${table}
        USING (company_id = current_setting('app.current_company_id', true)::uuid);
      `);
    }
  }
}