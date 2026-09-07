import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClientTaxSettings1700000006000 implements MigrationInterface {
  name = 'CreateClientTaxSettings1700000006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "client_tax_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "company_id" uuid NOT NULL,
        "client_id" uuid NOT NULL,
        "regimen_responsable_iva" boolean NOT NULL DEFAULT false,
        "regimen_simplificado" boolean NOT NULL DEFAULT false,
        "gran_contribuyente" boolean NOT NULL DEFAULT false,
        "autorretenedor" boolean NOT NULL DEFAULT false,
        "iva_19" boolean NOT NULL DEFAULT false,
        "iva_5" boolean NOT NULL DEFAULT false,
        "iva_exento_excluido" boolean NOT NULL DEFAULT false,
        "inc" boolean NOT NULL DEFAULT false,
        "ica_sujeto" boolean NOT NULL DEFAULT false,
        "gmf_sujeto" boolean NOT NULL DEFAULT false,
        "timbre_sujeto" boolean NOT NULL DEFAULT false,
        "rtefuente_honorarios" boolean NOT NULL DEFAULT false,
        "rtefuente_servicios" boolean NOT NULL DEFAULT false,
        "rtefuente_compras" boolean NOT NULL DEFAULT false,
        "rtefuente_arrendamiento" boolean NOT NULL DEFAULT false,
        "rtefuente_transporte" boolean NOT NULL DEFAULT false,
        "rtefuente_intereses" boolean NOT NULL DEFAULT false,
        "rtefuente_dividendos" boolean NOT NULL DEFAULT false,
        "reteiva_15" boolean NOT NULL DEFAULT false,
        "reteiva_50" boolean NOT NULL DEFAULT false,
        "reteiva_100" boolean NOT NULL DEFAULT false,
        "reteica" boolean NOT NULL DEFAULT false,
        "retencion_timbre" boolean NOT NULL DEFAULT false,
        "retencion_gmf" boolean NOT NULL DEFAULT false,
        "autorretencion_fuente" boolean NOT NULL DEFAULT false,
        "autorretencion_ica" boolean NOT NULL DEFAULT false,
        CONSTRAINT "UQ_client_tax_settings_client" UNIQUE ("client_id"),
        CONSTRAINT "PK_client_tax_settings" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "client_tax_settings"
      ADD CONSTRAINT "FK_client_tax_settings_company"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "client_tax_settings"
      ADD CONSTRAINT "FK_client_tax_settings_client"
      FOREIGN KEY ("client_id") REFERENCES "clients"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`ALTER TABLE "client_tax_settings" ENABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation_client_tax_settings ON "client_tax_settings"
      USING (company_id = current_setting('app.current_company_id', true)::uuid)
      WITH CHECK (company_id = current_setting('app.current_company_id', true)::uuid);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_client_tax_settings ON "client_tax_settings";`);
    await queryRunner.query(`ALTER TABLE "client_tax_settings" DISABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`ALTER TABLE "client_tax_settings" DROP CONSTRAINT "FK_client_tax_settings_client";`);
    await queryRunner.query(`ALTER TABLE "client_tax_settings" DROP CONSTRAINT "FK_client_tax_settings_company";`);
    await queryRunner.query(`DROP TABLE "client_tax_settings";`);
  }
}