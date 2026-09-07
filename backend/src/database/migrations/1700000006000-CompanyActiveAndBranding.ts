import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompanyActiveAndBranding1700000006000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;`,
    );
    await queryRunner.query(
      `UPDATE companies SET name = 'Impulsa Ferretero', primary_color = '#E2602B', logo_url = NULL WHERE id = '11111111-1111-1111-1111-111111111111';`,
    );
    await queryRunner.query(
      `UPDATE companies SET logo_url = NULL WHERE id IN ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333');`,
    );
    await queryRunner.query(
      `UPDATE companies SET is_active = true WHERE is_active IS NULL;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE companies DROP COLUMN IF EXISTS is_active;`);
  }
}