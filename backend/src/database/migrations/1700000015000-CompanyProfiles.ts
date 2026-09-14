import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Perfiles por empresa: `admin` y `vendedor` dejan de ser perfiles globales
 * compartidos y pasan a clonarse por empresa (mismo nombre, permisos
 * independientes). Los perfiles globales originales quedan como plantillas
 * ocultas para clonar las que crean nuevas empresas.
 *
 * 1. Para cada empresa que no tenga un perfil `admin`/`vendedor` propio, se
 *    clona el perfil global (is_system_role = true -> protegido en la UI).
 * 2. El clon hereda los permisos actuales de la plantilla (instantánea).
 * 3. Los usuarios de cada empresa que apuntaban al perfil global pasan al
 *    perfil clon de su empresa.
 *
 * Idempotente: las empresas que ya tengan un perfil con ese nombre no se
 * tocan. Los templates globales se mantienen (no se devuelven por findProfiles)
 * y se usan como base para perfiles de empresas creadas en runtime.
 */
export class CompanyProfiles1700000015000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Clonar admin/vendedor por empresa (si falta).
    await queryRunner.query(`
      INSERT INTO profiles (id, company_id, name, is_system_role)
      SELECT gen_random_uuid(), c.id, t.name, true
      FROM companies c
      CROSS JOIN (VALUES ('admin'), ('vendedor')) AS t(name)
      WHERE NOT EXISTS (
        SELECT 1 FROM profiles p WHERE p.company_id = c.id AND p.name = t.name
      );
    `);

    // 2. Heredar los permisos de la plantilla global (instantánea actual).
    await queryRunner.query(`
      INSERT INTO profile_permissions (profile_id, permission_id)
      SELECT cnv.id, pp.permission_id
      FROM profiles tpl
      JOIN profile_permissions pp ON pp.profile_id = tpl.id
      JOIN profiles cnv ON cnv.company_id IS NOT NULL
                        AND cnv.name = tpl.name
                        AND cnv.is_system_role = true
      WHERE tpl.company_id IS NULL AND tpl.name IN ('admin', 'vendedor')
        AND cnv.id = (
          SELECT q.id FROM profiles q
          WHERE q.company_id = cnv.company_id AND q.name = tpl.name AND q.is_system_role = true
          ORDER BY q.created_at LIMIT 1
        )
      ON CONFLICT DO NOTHING;
    `);

    // 3. Re-apuntar usuarios de cada empresa al perfil clon de su empresa.
    await queryRunner.query(`
      UPDATE users u
      SET profile_id = clone.id
      FROM profiles tpl
      JOIN profiles clone ON clone.company_id IS NOT NULL AND clone.name = tpl.name
      WHERE tpl.company_id IS NULL
        AND tpl.name IN ('admin', 'vendedor')
        AND u.company_id = clone.company_id
        AND u.profile_id = tpl.id
        AND clone.id = (
          SELECT q.id FROM profiles q
          WHERE q.company_id = clone.company_id AND q.name = tpl.name
          ORDER BY q.created_at LIMIT 1
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir: volver los usuarios a la plantilla global y borrar los clones.
    await queryRunner.query(`
      UPDATE users u
      SET profile_id = tpl.id
      FROM profiles tpl
      WHERE tpl.company_id IS NULL
        AND tpl.name IN ('admin', 'vendedor')
        AND u.profile_id IN (
          SELECT cnv.id FROM profiles cnv
          WHERE cnv.company_id = u.company_id AND cnv.name = tpl.name
        );
    `);
    await queryRunner.query(`
      DELETE FROM profile_permissions WHERE profile_id IN (
        SELECT id FROM profiles
        WHERE company_id IS NOT NULL AND is_system_role = true
          AND name IN ('admin', 'vendedor')
      );
    `);
    await queryRunner.query(`
      DELETE FROM profiles
      WHERE company_id IS NOT NULL AND is_system_role = true
        AND name IN ('admin', 'vendedor');
    `);
  }
}