/**
 * Helpers de SEED fuera de la carpeta de migraciones:
 * TypeORM escanea TODOS los exports de los ficheros en migrations/* como
 * migraciones candidatas, así que una función aquí NO puede estar ahí.
 */
export function demoPassword(): string {
  return process.env.SEED_DEMO_PASSWORD || 'Password123!';
}