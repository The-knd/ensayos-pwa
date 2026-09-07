import { MigrationInterface, QueryRunner } from 'typeorm';

export class FeatureFlagsPermissions1700000009000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Crear permisos de feature-flags
    await queryRunner.query(
      `INSERT INTO permissions (id, resource, action, code) VALUES
        (gen_random_uuid(), 'feature-flags', 'read',  'feature-flags.read'),
        (gen_random_uuid(), 'feature-flags', 'create','feature-flags.create'),
        (gen_random_uuid(), 'feature-flags', 'update','feature-flags.update'),
        (gen_random_uuid(), 'feature-flags', 'delete','feature-flags.delete')`,
    );

    // 2. Asignar a super_admin (todos los permisos, incluidos los nuevos)
    await queryRunner.query(
      `INSERT INTO profile_permissions (profile_id, permission_id)
       SELECT 'aaaaaaaa-0000-0000-0000-000000000001', id FROM permissions
       WHERE resource = 'feature-flags'`,
    );

    // 3. Asignar a admin (todos los permisos de feature-flags excepto delete)
    await queryRunner.query(
      `INSERT INTO profile_permissions (profile_id, permission_id)
       SELECT 'aaaaaaaa-0000-0000-0000-000000000002', id FROM permissions
       WHERE resource = 'feature-flags' AND action != 'delete'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM profile_permissions WHERE permission_id IN (
        SELECT id FROM permissions WHERE resource = 'feature-flags'
      )`,
    );
    await queryRunner.query(`DELETE FROM permissions WHERE resource = 'feature-flags'`);
  }
}