import { MigrationInterface, QueryRunner } from 'typeorm';
import { createHash } from 'crypto';

/**
 * Los refresh tokens se guardan como SHA-256 del valor real (que viaja solo
 * en la cookie httpOnly). Si la BD se filtra, los tokens opacos ya no son
 * reutilizables directamente. Migra las filas existentes y reemplaza la
 * columna `token` (texto plano) por `token_hash`.
 */
export class HashRefreshTokens1700000016000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE refresh_tokens ADD COLUMN token_hash varchar(64)`);

    const rows = await queryRunner.query(
      `SELECT id, token FROM refresh_tokens WHERE token_hash IS NULL`,
    );
    for (const row of rows) {
      const hash = createHash('sha256').update(row.token).digest('hex');
      await queryRunner.query(`UPDATE refresh_tokens SET token_hash = $1 WHERE id = $2`, [
        hash,
        row.id,
      ]);
    }

    await queryRunner.query(`ALTER TABLE refresh_tokens ALTER COLUMN token_hash SET NOT NULL`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_refresh_tokens_token_hash ON refresh_tokens (token_hash)`,
    );
    await queryRunner.query(`ALTER TABLE refresh_tokens DROP COLUMN token`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Los tokens en texto plano ya no existen (solo su hash): el rollback
    // restaura el esquema pero no puede recuperar los valores originales.
    await queryRunner.query(`ALTER TABLE refresh_tokens ADD COLUMN token varchar`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_refresh_tokens_token_hash`);
    await queryRunner.query(`ALTER TABLE refresh_tokens DROP COLUMN token_hash`);
  }
}