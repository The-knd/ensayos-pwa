import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Variantes por empresa de un módulo compartido.
 *
 * Un mismo módulo (global o de empresa) puede tener comportamientos distintos
 * según la empresa: esto se registra en module_variants, keyed por
 * (module_id, company_id). Cada variante permite:
 *   - sobrescribir label/icon/path (adaptación visual/navegación),
 *   - indicar qué operaciones del módulo están activas en esa empresa
 *     (enabled_operations; [] = todas),
 *   - guardar config arbitraria (config jsonb) para que el frontend/backend
 *     del módulo adapte su comportamiento por empresa.
 */
export class ModuleVariants1700000014000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS module_variants (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
        company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        label varchar(120),
        icon varchar(500),
        path varchar(200),
        config jsonb NOT NULL DEFAULT '{}'::jsonb,
        enabled_operations jsonb NOT NULL DEFAULT '[]'::jsonb,
        UNIQUE (module_id, company_id)
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_module_variants_company ON module_variants (company_id);`,
    );

    await queryRunner.query(`ALTER TABLE module_variants ENABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation_module_variants ON module_variants
      USING (company_id = current_setting('app.current_company_id', true)::uuid)
      WITH CHECK (company_id = current_setting('app.current_company_id', true)::uuid);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_module_variants ON module_variants;`);
    await queryRunner.query(`ALTER TABLE module_variants DISABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_module_variants_company;`);
    await queryRunner.query(`DROP TABLE IF EXISTS module_variants;`);
  }
}