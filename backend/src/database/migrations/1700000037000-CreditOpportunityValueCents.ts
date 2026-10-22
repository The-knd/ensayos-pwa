import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * El monto de oportunidad (`credits.opportunity_value`) pasa a admitir
 * centavos. Antes era `bigint` (pesos enteros); ahora es `numeric(14,2)`.
 *
 * La restricción `CHK_credits_opportunity_value` (>= 0) sobrevive al cambio de
 * tipo y Postgres la revalida automáticamente.
 */
export class CreditOpportunityValueCents1700000037000 implements MigrationInterface {
  name = "CreditOpportunityValueCents1700000037000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "credits" ALTER COLUMN "opportunity_value" TYPE numeric(14,2) USING "opportunity_value"::numeric`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Volver a bigint redondea/trunca los centavos existentes.
    await queryRunner.query(
      `ALTER TABLE "credits" ALTER COLUMN "opportunity_value" TYPE bigint USING "opportunity_value"::bigint`,
    );
  }
}
