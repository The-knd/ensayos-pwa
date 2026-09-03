import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class SeedBaseData1700000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Empresas
    await queryRunner.query(`
      INSERT INTO companies (id, name, logo_url, primary_color, auth_strategy)
      VALUES
        ('11111111-1111-1111-1111-111111111111', 'Empresa Uno', 'https://cdn.example.com/logo1.png', '#0057B8', 'local'),
        ('22222222-2222-2222-2222-222222222222', 'Empresa Dos', 'https://cdn.example.com/logo2.png', '#C0392B', 'local'),
        ('33333333-3333-3333-3333-333333333333', 'Empresa Tres', 'https://cdn.example.com/logo3.png', '#27AE60', 'local');
    `);

    // 2. Permisos
    const modules = ['config', 'clients', 'users', 'credits'];
    const actions = ['read', 'create', 'update', 'delete'];
    for (const resource of modules) {
      for (const action of actions) {
        await queryRunner.query(
          `INSERT INTO permissions (id, resource, action, code) VALUES (gen_random_uuid(), $1, $2, $3)`,
          [resource, action, `${resource}.${action}`],
        );
      }
    }
    await queryRunner.query(
      `INSERT INTO permissions (id, resource, action, code) VALUES (gen_random_uuid(), 'credits', 'study', 'credits.study')`,
    );

    // 3. Perfiles
    await queryRunner.query(`
      INSERT INTO profiles (id, company_id, name, is_system_role) VALUES
        ('aaaaaaaa-0000-0000-0000-000000000001', NULL, 'super_admin', true),
        ('aaaaaaaa-0000-0000-0000-000000000002', NULL, 'admin', true),
        ('aaaaaaaa-0000-0000-0000-000000000003', NULL, 'vendedor', true);
    `);

    // 4. Relación perfil-permiso
    await queryRunner.query(`
      INSERT INTO profile_permissions (profile_id, permission_id)
      SELECT 'aaaaaaaa-0000-0000-0000-000000000001', id FROM permissions;
    `);
    await queryRunner.query(`
      INSERT INTO profile_permissions (profile_id, permission_id)
      SELECT 'aaaaaaaa-0000-0000-0000-000000000002', id FROM permissions WHERE resource != 'config';
    `);
    await queryRunner.query(`
      INSERT INTO profile_permissions (profile_id, permission_id)
      SELECT 'aaaaaaaa-0000-0000-0000-000000000003', id FROM permissions
      WHERE resource = 'clients' OR code IN ('credits.read', 'credits.study');
    `);

    // 5. Usuarios de prueba
    const passwordHash = await bcrypt.hash('Password123!', 10);
    await queryRunner.query(
      `INSERT INTO users (id, company_id, profile_id, email, password_hash, status, full_name)
       VALUES
       (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001', 'superadmin@empresa1.com', $1, 'active', 'Super Admin Uno'),
       (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000002', 'admin@empresa1.com', $1, 'active', 'Admin Uno'),
       (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000003', 'vendedor@empresa1.com', $1, 'active', 'Vendedor Uno')`,
      [passwordHash],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM users`);
    await queryRunner.query(`DELETE FROM profile_permissions`);
    await queryRunner.query(`DELETE FROM profiles`);
    await queryRunner.query(`DELETE FROM permissions`);
    await queryRunner.query(`DELETE FROM companies`);
  }
}
