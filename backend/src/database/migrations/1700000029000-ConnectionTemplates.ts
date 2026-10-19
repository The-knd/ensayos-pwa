import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Conexiones agnósticas, por plantilla de sistema:
 *
 *   connection_systems    catálogo global de sistemas externos (sap, api, …).
 *   connection_templates  plantilla por sistema: campos de `settings` y
 *                         secretos que declara el superadmin (global).
 *   integration_connections  gana `module` (módulo que la consume), `label`
 *                         (nombre visible) y `template_id`; la unicidad deja de
 *                         ser (empresa, sistema, entorno) para pasar a
 *                         (empresa, label), permitiendo varias conexiones del
 *                         mismo sistema por empresa.
 *
 * Las credenciales existentes se conservan: el AAD pasó de
 * `empresa:sistema:entorno` a `empresa:id`, y el servicio reintenta con el AAD
 * legado al descifrar, así que no hay que recargarlas.
 *
 * `connection_systems` y `connection_templates` son globales (sin RLS). Sus
 * permisos para el rol de aplicación los cubren los DEFAULT PRIVILEGES de
 * 1700000014500-RlsHardening.
 */
export class ConnectionTemplates1700000029000 implements MigrationInterface {
  name = 'ConnectionTemplates1700000029000';

  private readonly sapTemplate = {
    settingsFields: [
      { key: 'strategy', label: 'Estrategia', type: 'select', required: true, default: 'sap-b1', options: ['sap-b1', 'sap-b1-empresa1', 'sap-b1-empresa2'] },
      { key: 'companyDb', label: 'Base de la compañía (CompanyDB)', type: 'text', required: true },
      { key: 'cardType', label: 'Tipo de socio', type: 'select', required: false, options: ['cCustomer', 'cLid'] },
      { key: 'pageSize', label: 'Registros por página', type: 'number', required: false, default: 200, operational: true },
      { key: 'schedule', label: 'Sincronización programada', type: 'json', required: false, operational: true },
      { key: 'ownedFields', label: 'Datos que manda el sistema', type: 'multiselect', required: false, operational: true, options: ['fullName', 'commercialName', 'legalName', 'billingEmail', 'phone', 'email', 'status'] },
    ],
    secretFields: [
      { key: 'username', label: 'Usuario', required: true },
      { key: 'password', label: 'Contraseña', required: true },
    ],
  };

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS connection_systems (
        key varchar(40) PRIMARY KEY,
        label varchar(120) NOT NULL,
        enabled boolean NOT NULL DEFAULT true,
        sort_order int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS connection_templates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        system_key varchar(40) NOT NULL REFERENCES connection_systems(key) ON DELETE CASCADE,
        label varchar(120) NOT NULL,
        settings_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
        secret_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
        auth_type varchar(20),
        enabled boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_connection_templates_system_label" UNIQUE (system_key, label)
      );
    `);

    await queryRunner.query(`ALTER TABLE integration_connections ADD COLUMN IF NOT EXISTS module varchar(60);`);
    await queryRunner.query(`ALTER TABLE integration_connections ADD COLUMN IF NOT EXISTS label varchar(120);`);
    await queryRunner.query(
      `ALTER TABLE integration_connections ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES connection_templates(id) ON DELETE SET NULL;`,
    );

    // Backfill de las conexiones existentes (SAP → módulo de clientes).
    await queryRunner.query(`UPDATE integration_connections SET module = 'clients' WHERE module IS NULL;`);
    await queryRunner.query(`UPDATE integration_connections SET label = system || ' · ' || environment WHERE label IS NULL;`);

    await queryRunner.query(`ALTER TABLE integration_connections ALTER COLUMN module SET NOT NULL;`);
    await queryRunner.query(`ALTER TABLE integration_connections ALTER COLUMN label SET NOT NULL;`);

    await queryRunner.query(`ALTER TABLE integration_connections DROP CONSTRAINT IF EXISTS "UQ_integration_connections_company_system_env";`);
    await queryRunner.query(`ALTER TABLE integration_connections DROP CONSTRAINT IF EXISTS "UQ_integration_connections_company_label";`);
    await queryRunner.query(
      `ALTER TABLE integration_connections ADD CONSTRAINT "UQ_integration_connections_company_label" UNIQUE (company_id, label);`,
    );
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_integration_connections_company_module ON integration_connections (company_id, module);`);

    // Semilla del catálogo de sistemas y de la plantilla de SAP.
    await queryRunner.query(`
      INSERT INTO connection_systems (key, label, sort_order) VALUES
        ('sap', 'SAP Business One', 10),
        ('api', 'API genérica', 20),
        ('copilot-chat-agent', 'Copilot Chat Agent', 30)
      ON CONFLICT (key) DO NOTHING;
    `);
    await queryRunner.query(
      `INSERT INTO connection_templates (system_key, label, settings_fields, secret_fields, auth_type)
       VALUES ('sap', 'SAP Business One (clientes)', $1::jsonb, $2::jsonb, 'session')
       ON CONFLICT (system_key, label) DO NOTHING;`,
      [JSON.stringify(this.sapTemplate.settingsFields), JSON.stringify(this.sapTemplate.secretFields)],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_integration_connections_company_module;`);
    await queryRunner.query(`ALTER TABLE integration_connections DROP CONSTRAINT IF EXISTS "UQ_integration_connections_company_label";`);
    // Si hubiera varias conexiones por (empresa, sistema, entorno), restaurar el
    // UNIQUE antiguo es imposible sin duplicados: se dejan las más recientes.
    await queryRunner.query(`
      DELETE FROM integration_connections a
      USING integration_connections b
      WHERE a.company_id = b.company_id AND a.system = b.system AND a.environment = b.environment
        AND a.created_at < b.created_at;
    `);
    await queryRunner.query(
      `ALTER TABLE integration_connections ADD CONSTRAINT "UQ_integration_connections_company_system_env" UNIQUE (company_id, system, environment);`,
    );
    await queryRunner.query(`ALTER TABLE integration_connections DROP COLUMN IF EXISTS template_id;`);
    await queryRunner.query(`ALTER TABLE integration_connections DROP COLUMN IF EXISTS label;`);
    await queryRunner.query(`ALTER TABLE integration_connections DROP COLUMN IF EXISTS module;`);
    await queryRunner.query(`DROP TABLE IF EXISTS connection_templates;`);
    await queryRunner.query(`DROP TABLE IF EXISTS connection_systems;`);
  }
}
