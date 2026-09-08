import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class SeedMoreUsers1700000008000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Usuarios demo (password conocida: Password123!) — nunca en producción.
    if (process.env.SEED_DEMO_DATA === 'false') return;

    const passwordHash = await bcrypt.hash('Password123!', 10);

    const users = [
      // Adylog
      { company: '22222222-2222-2222-8222-222222222222', profile: 'aaaaaaaa-0000-4000-8000-000000000001', email: 'superadmin@empresa2.com', name: 'Super Admin Dos' },
      { company: '22222222-2222-2222-8222-222222222222', profile: 'aaaaaaaa-0000-4000-8000-000000000002', email: 'admin@empresa2.com', name: 'Admin Dos' },
      { company: '22222222-2222-2222-8222-222222222222', profile: 'aaaaaaaa-0000-4000-8000-000000000003', email: 'vendedor@empresa2.com', name: 'Vendedor Dos' },
      // Toptec
      { company: '33333333-3333-3333-8333-333333333333', profile: 'aaaaaaaa-0000-4000-8000-000000000001', email: 'superadmin@empresa3.com', name: 'Super Admin Tres' },
      { company: '33333333-3333-3333-8333-333333333333', profile: 'aaaaaaaa-0000-4000-8000-000000000002', email: 'admin@empresa3.com', name: 'Admin Tres' },
      { company: '33333333-3333-3333-8333-333333333333', profile: 'aaaaaaaa-0000-4000-8000-000000000003', email: 'vendedor@empresa3.com', name: 'Vendedor Tres' },
    ];

    for (const u of users) {
      await queryRunner.query(
        `INSERT INTO users (id, company_id, profile_id, email, password_hash, status, full_name)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 'active', $5)
         ON CONFLICT (email) DO NOTHING`,
        [u.company, u.profile, u.email, passwordHash, u.name],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM users WHERE email IN (
        'superadmin@empresa2.com','admin@empresa2.com','vendedor@empresa2.com',
        'superadmin@empresa3.com','admin@empresa3.com','vendedor@empresa3.com'
      )`,
    );
  }
}