import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProfilesPermissions1700000010000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Crear permisos de profiles
    await queryRunner.query(
      `INSERT INTO permissions (id, resource, action, code) VALUES
        (gen_random_uuid(), 'profiles', 'read',  'profiles.read'),
        (gen_random_uuid(), 'profiles', 'create','profiles.create'),
        (gen_random_uuid(), 'profiles', 'update','profiles.update'),
        (gen_random_uuid(), 'profiles', 'delete','profiles.delete')`,
    );

    // 2. Asignar a super_admin
    await queryRunner.query(
      `INSERT INTO profile_permissions (profile_id, permission_id)
       SELECT 'aaaaaaaa-0000-0000-0000-000000000001', id FROM permissions
       WHERE resource = 'profiles'`,
    );

    // 3. Asignar a admin (todos excepto delete)
    await queryRunner.query(
      `INSERT INTO profile_permissions (profile_id, permission_id)
       SELECT 'aaaaaaaa-0000-0000-0000-000000000002', id FROM permissions
       WHERE resource = 'profiles' AND action != 'delete'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM profile_permissions WHERE permission_id IN (
        SELECT id FROM permissions WHERE resource = 'profiles'
      )`,
    );
    await queryRunner.query(`DELETE FROM permissions WHERE resource = 'profiles'`);
  }
}