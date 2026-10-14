import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * El estudio de crédito ya no exige un cliente registrado: basta con el
 * documento digitado dos veces. Esos créditos quedan con `client_id` null
 * hasta que se registre el cliente (se vincula al enviar a firma).
 */
export class CreditOptionalClient1700000027000 implements MigrationInterface {
  name = 'CreditOptionalClient1700000027000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "credits" ALTER COLUMN "client_id" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Falla si quedan créditos sin cliente: hay que vincularlos o borrarlos antes.
    await queryRunner.query(`ALTER TABLE "credits" ALTER COLUMN "client_id" SET NOT NULL`);
  }
}
