import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Búsqueda de texto en la lista de créditos. Se agregan índices GIN con
 * trigramas para acelerar los ILIKE parciales por NIT, nombre del cliente e
 * id de solicitud. La extensión `pg_trgm` se habilita si aún no existe.
 */
export class CreditSearchTrgm1700000038000 implements MigrationInterface {
  name = "CreditSearchTrgm1700000038000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_credits_nit_trgm" ON "credits" USING gin ("nit" gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_credits_application_number_trgm" ON "credits" USING gin ("application_number" gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_clients_full_name_trgm" ON "clients" USING gin ("full_name" gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_clients_legal_name_trgm" ON "clients" USING gin ("legal_name" gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_clients_document_number_trgm" ON "clients" USING gin ("document_number" gin_trgm_ops)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_credits_nit_trgm"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_credits_application_number_trgm"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_clients_full_name_trgm"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_clients_legal_name_trgm"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_clients_document_number_trgm"`,
    );
  }
}
