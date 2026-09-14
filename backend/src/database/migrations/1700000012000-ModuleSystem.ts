import { MigrationInterface, QueryRunner } from 'typeorm';

export class ModuleSystem1700000012000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Tabla de definición de módulos (company_id NULL = módulo global)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS modules (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
        key varchar NOT NULL,
        module varchar NOT NULL,
        label varchar NOT NULL,
        icon varchar(500),
        path varchar NOT NULL,
        operations jsonb NOT NULL DEFAULT '[]'::jsonb,
        flag varchar,
        enabled boolean NOT NULL DEFAULT true
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uq_modules_global_key ON modules (key) WHERE company_id IS NULL;
    `);

    await queryRunner.query(`ALTER TABLE modules ENABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation_modules ON modules
      USING (company_id IS NULL OR company_id = current_setting('app.current_company_id', true)::uuid)
      WITH CHECK (company_id IS NULL OR company_id = current_setting('app.current_company_id', true)::uuid);
    `);

    // 2. Tabla de asignaciones módulo-empresa (visibilidad por empresa)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS module_assignments (
        module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
        company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        placement varchar NOT NULL DEFAULT 'grid',
        position int NOT NULL DEFAULT 0,
        enabled boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (module_id, company_id),
        CONSTRAINT chk_assignment_placement CHECK (placement IN ('grid', 'fab'))
      );
    `);

    await queryRunner.query(`ALTER TABLE module_assignments ENABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation_module_assignments ON module_assignments
      USING (company_id = current_setting('app.current_company_id', true)::uuid)
      WITH CHECK (company_id = current_setting('app.current_company_id', true)::uuid);
    `);

    // 3. Backfill desde module_placements (definición única por módulo + operación)
    await queryRunner.query(`
      INSERT INTO modules (id, company_id, key, module, label, path, operations, flag, enabled)
      SELECT mp.id, mp.company_id, mp.key, mp.module, mp.label, mp.path,
             jsonb_build_array(jsonb_build_object(
               'action', split_part(mp.perm, '.', 2),
               'name', CASE split_part(mp.perm, '.', 2)
                 WHEN 'read' THEN 'Leer'
                 WHEN 'create' THEN 'Crear'
                 WHEN 'update' THEN 'Editar'
                 WHEN 'delete' THEN 'Eliminar'
                 ELSE split_part(mp.perm, '.', 2)
               END
             )),
             mp.flag, mp.enabled
      FROM module_placements mp
      ON CONFLICT (id) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO module_assignments (module_id, company_id, placement, position, enabled)
      SELECT id, company_id, placement, position, enabled
      FROM module_placements
      ON CONFLICT (module_id, company_id) DO NOTHING;
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS module_placements;`);

    // 4. admin obtiene config.read/config.update para administrar módulos de su empresa
    await queryRunner.query(`
      INSERT INTO profile_permissions (profile_id, permission_id)
      SELECT 'aaaaaaaa-0000-4000-8000-000000000002', id
      FROM permissions
      WHERE resource = 'config'
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS module_placements (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        key varchar NOT NULL,
        module varchar NOT NULL,
        label varchar NOT NULL,
        placement varchar NOT NULL DEFAULT 'grid',
        position int NOT NULL DEFAULT 0,
        path varchar NOT NULL,
        perm varchar NOT NULL,
        flag varchar,
        logo_url varchar,
        enabled boolean NOT NULL DEFAULT true,
        CONSTRAINT chk_placement CHECK (placement IN ('grid', 'fab'))
      );
    `);
    await queryRunner.query(`
      INSERT INTO module_placements (id, company_id, key, module, label, placement, position, path, perm, flag, enabled)
      SELECT ma.module_id, ma.company_id, m.key, m.module, m.label, ma.placement, ma.position, m.path,
             m.module || '.' || COALESCE((m.operations->>0)::jsonb->>'action', 'read')::text, m.flag, ma.enabled
      FROM module_assignments ma
      JOIN modules m ON m.id = ma.module_id;
    `);

    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_module_assignments ON module_assignments;`);
    await queryRunner.query(`ALTER TABLE module_assignments DISABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`DROP TABLE IF EXISTS module_assignments;`);

    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_modules ON modules;`);
    await queryRunner.query(`ALTER TABLE modules DISABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`DROP TABLE IF EXISTS modules;`);
  }
}