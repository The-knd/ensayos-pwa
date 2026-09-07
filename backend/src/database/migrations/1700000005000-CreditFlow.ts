import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreditFlow1700000005000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "public"."credits_status_enum" ADD VALUE IF NOT EXISTS 'signed';`);
    await queryRunner.query(`ALTER TYPE "public"."credits_status_enum" ADD VALUE IF NOT EXISTS 'disbursed';`);

    await queryRunner.query(`ALTER TABLE "credits" ADD "application_number" character varying(30);`);
    await queryRunner.query(`ALTER TABLE "credits" ADD "nit" character varying(20);`);
    await queryRunner.query(`ALTER TABLE "credits" ADD "consent_data" boolean NOT NULL DEFAULT false;`);
    await queryRunner.query(`ALTER TABLE "credits" ADD "approved_limit" numeric(12,2);`);
    await queryRunner.query(`ALTER TABLE "credits" ADD "monthly_income" numeric(14,2);`);
    await queryRunner.query(`ALTER TABLE "credits" ADD "monthly_expenses" numeric(14,2);`);
    await queryRunner.query(`ALTER TABLE "credits" ADD "assets_value" numeric(14,2);`);
    await queryRunner.query(`ALTER TABLE "credits" ADD "liabilities_value" numeric(14,2);`);
    await queryRunner.query(`ALTER TABLE "credits" ADD "foundation_date" date;`);
    await queryRunner.query(`ALTER TABLE "credits" ADD "signature_date" timestamp;`);
    await queryRunner.query(`ALTER TABLE "credits" ADD "disbursement_date" timestamp;`);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_credits_application_number" ON "credits" ("application_number");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_credits_company_status" ON "credits" ("company_id", "status");`,
    );

    await queryRunner.query(
      `CREATE TABLE "credit_documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "company_id" uuid NOT NULL, "credit_id" uuid NOT NULL, "code" character varying(50) NOT NULL, "name" character varying(200) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'pending', "url" character varying, "signed_at" TIMESTAMP, CONSTRAINT "PK_credit_documents" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `ALTER TABLE "credit_documents" ADD CONSTRAINT "FK_credit_documents_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;`,
    );
    await queryRunner.query(
      `ALTER TABLE "credit_documents" ADD CONSTRAINT "FK_credit_documents_credit" FOREIGN KEY ("credit_id") REFERENCES "credits"("id") ON DELETE CASCADE ON UPDATE NO ACTION;`,
    );

    await queryRunner.query(`CREATE INDEX "IDX_credit_documents_credit" ON "credit_documents" ("credit_id");`);

    await queryRunner.query(`ALTER TABLE "credit_documents" ENABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation_credit_documents ON "credit_documents"
      USING (company_id = current_setting('app.current_company_id', true)::uuid)
      WITH CHECK (company_id = current_setting('app.current_company_id', true)::uuid);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_credit_documents ON "credit_documents";`);
    await queryRunner.query(`ALTER TABLE "credit_documents" DISABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`DROP INDEX "IDX_credit_documents_credit";`);
    await queryRunner.query(`ALTER TABLE "credit_documents" DROP CONSTRAINT "FK_credit_documents_credit";`);
    await queryRunner.query(`ALTER TABLE "credit_documents" DROP CONSTRAINT "FK_credit_documents_company";`);
    await queryRunner.query(`DROP TABLE "credit_documents";`);

    await queryRunner.query(`DROP INDEX "IDX_credits_company_status";`);
    await queryRunner.query(`DROP INDEX "UQ_credits_application_number";`);
    await queryRunner.query(`ALTER TABLE "credits" DROP COLUMN "disbursement_date";`);
    await queryRunner.query(`ALTER TABLE "credits" DROP COLUMN "signature_date";`);
    await queryRunner.query(`ALTER TABLE "credits" DROP COLUMN "foundation_date";`);
    await queryRunner.query(`ALTER TABLE "credits" DROP COLUMN "liabilities_value";`);
    await queryRunner.query(`ALTER TABLE "credits" DROP COLUMN "assets_value";`);
    await queryRunner.query(`ALTER TABLE "credits" DROP COLUMN "monthly_expenses";`);
    await queryRunner.query(`ALTER TABLE "credits" DROP COLUMN "monthly_income";`);
    await queryRunner.query(`ALTER TABLE "credits" DROP COLUMN "approved_limit";`);
    await queryRunner.query(`ALTER TABLE "credits" DROP COLUMN "consent_data";`);
    await queryRunner.query(`ALTER TABLE "credits" DROP COLUMN "nit";`);
    await queryRunner.query(`ALTER TABLE "credits" DROP COLUMN "application_number";`);
  }
}