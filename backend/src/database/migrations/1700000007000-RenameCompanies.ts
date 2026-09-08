import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameCompanies1700000007000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE companies
      SET name = CASE id
        WHEN '11111111-1111-1111-8111-111111111111' THEN 'Herragro'
        WHEN '22222222-2222-2222-8222-222222222222' THEN 'Adylog'
        WHEN '33333333-3333-3333-8333-333333333333' THEN 'Toptec'
      END,
      primary_color = CASE id
        WHEN '11111111-1111-1111-8111-111111111111' THEN '#1565C0'
        WHEN '22222222-2222-2222-8222-222222222222' THEN '#E2602B'
        WHEN '33333333-3333-3333-8333-333333333333' THEN '#27AE60'
      END,
      logo_url = NULL
      WHERE id IN (
        '11111111-1111-1111-8111-111111111111',
        '22222222-2222-2222-8222-222222222222',
        '33333333-3333-3333-8333-333333333333'
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE companies
      SET name = CASE id
        WHEN '11111111-1111-1111-8111-111111111111' THEN 'Impulsa Ferretero'
        WHEN '22222222-2222-2222-8222-222222222222' THEN 'Empresa Dos'
        WHEN '33333333-3333-3333-8333-333333333333' THEN 'Empresa Tres'
      END,
      primary_color = CASE id
        WHEN '11111111-1111-1111-8111-111111111111' THEN '#E2602B'
        WHEN '22222222-2222-2222-8222-222222222222' THEN '#C0392B'
        WHEN '33333333-3333-3333-8333-333333333333' THEN '#27AE60'
      END
      WHERE id IN (
        '11111111-1111-1111-8111-111111111111',
        '22222222-2222-2222-8222-222222222222',
        '33333333-3333-3333-8333-333333333333'
      );
    `);
  }
}