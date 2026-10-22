import { AppDataSource } from "../src/database/data-source";
import { BASELINE_MIGRATIONS } from "../src/database/baseline-manifest";

/**
 * Stamp script: inserta los registros del baseline condensado en la tabla
 * `migrations` de TypeORM sin ejecutar los cambios de esquema/datos.
 *
 * Uso:
 *   npm run migration:stamp-baseline -- --dry-run   # solo muestra lo que haría
 *   npm run migration:stamp-baseline -- --apply     # inserta los faltantes
 *
 * En la BD de desarrollo, antes de correr este script debes aplicar el SQL
 * pendiente de 1700000037000/1700000038000 (ver comandos en la documentación
 * del baseline) para que el esquema refleje el estado final del baseline.
 */
async function main() {
  const apply = process.argv.includes("--apply");
  const dryRun = process.argv.includes("--dry-run") || !apply;

  await AppDataSource.initialize();
  const queryRunner = AppDataSource.createQueryRunner();

  try {
    const existing = await queryRunner.query(
      'SELECT "timestamp", name FROM migrations ORDER BY "timestamp"',
    );

    const byName = new Map(existing.map((r: any) => [r.name, r.timestamp]));
    const missing = BASELINE_MIGRATIONS.filter((m) => !byName.has(m.name));
    const mismatched = BASELINE_MIGRATIONS.filter(
      (m) =>
        byName.has(m.name) &&
        String(byName.get(m.name)) !== String(m.timestamp),
    );

    console.log(`Modo: ${dryRun ? "dry-run" : "apply"}`);
    console.log(`Migraciones registradas actualmente: ${existing.length}`);
    console.log(
      `Migraciones del baseline presentes:  ${BASELINE_MIGRATIONS.length - missing.length}`,
    );
    console.log(`Migraciones faltantes:               ${missing.length}`);

    if (mismatched.length > 0) {
      console.warn(
        "\n[WARNING] Estas migraciones existen con timestamp distinto:",
      );
      for (const m of mismatched) {
        console.warn(
          `  - ${m.name}: manifest=${m.timestamp}, db=${byName.get(m.name)}`,
        );
      }
    }

    if (missing.length === 0) {
      console.log("\nNo hay migraciones faltantes del baseline.");
      return;
    }

    console.log("\nMigraciones faltantes:");
    for (const m of missing) {
      console.log(
        `  INSERT INTO migrations ("timestamp", name) VALUES (${m.timestamp}, '${m.name}');`,
      );
    }

    if (dryRun) {
      console.log(
        "\nEjecuta con --apply para insertar los registros faltantes.",
      );
      return;
    }

    for (const m of missing) {
      await queryRunner.query(
        'INSERT INTO migrations ("timestamp", name) VALUES ($1, $2)',
        [m.timestamp, m.name],
      );
    }

    console.log(`\n${missing.length} registro(s) insertado(s) en migrations.`);
    console.log(
      'Ahora "npm run migration:run" debe reportar: No migrations are pending.',
    );
  } finally {
    await queryRunner.release();
    await AppDataSource.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
