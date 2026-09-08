import { MigrationInterface, QueryRunner } from 'typeorm';

export class ModulePlacements1700000011000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Crear tabla
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

    // 2. RLS
    await queryRunner.query(`ALTER TABLE module_placements ENABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation_module_placements ON module_placements
      USING (company_id = current_setting('app.current_company_id', true)::uuid)
      WITH CHECK (company_id = current_setting('app.current_company_id', true)::uuid);
    `);

    // 3. Seed placements para las 3 empresas (solo módulos implementados)
    const companies = [
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
      '33333333-3333-3333-3333-333333333333',
    ];

    const placements = [
      { key: 'cliente', module: 'clients', label: 'Cliente', placement: 'grid', position: 1, path: '/clients', perm: 'clients.read', flag: null, enabled: true },
      { key: 'crear', module: 'clients', label: 'Crear cliente', placement: 'grid', position: 2, path: '/clients/new', perm: 'clients.create', flag: null, enabled: true },
      { key: 'creditos', module: 'credits', label: 'Créditos', placement: 'grid', position: 3, path: '/credits', perm: 'credits.read', flag: 'module.credits', enabled: true },
      { key: 'usuarios', module: 'users', label: 'Usuarios', placement: 'grid', position: 4, path: '/users', perm: 'users.read', flag: null, enabled: true },
      { key: 'perfiles', module: 'profiles', label: 'Perfiles', placement: 'grid', position: 5, path: '/profiles', perm: 'profiles.read', flag: null, enabled: true },
      { key: 'config', module: 'config', label: 'Configuración', placement: 'grid', position: 6, path: '/config', perm: 'config.read', flag: null, enabled: true },
    ];

    for (const cid of companies) {
      for (const p of placements) {
        await queryRunner.query(
          `INSERT INTO module_placements (company_id, key, module, label, placement, position, path, perm, flag, enabled)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [cid, p.key, p.module, p.label, p.placement, p.position, p.path, p.perm, p.flag, p.enabled],
        );
      }
    }

    // 4. Seed feature flag module.credits enabled para las 3 empresas
    for (const cid of companies) {
      await queryRunner.query(
        `INSERT INTO feature_flags (company_id, key, enabled) VALUES ($1, 'module.credits', true)`,
        [cid],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_module_placements ON module_placements;`);
    await queryRunner.query(`ALTER TABLE module_placements DISABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`DROP TABLE IF EXISTS module_placements;`);
    await queryRunner.query(`DELETE FROM feature_flags WHERE key = 'module.credits';`);
  }
}
