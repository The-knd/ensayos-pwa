export interface BaselineMigrationEntry {
  timestamp: number;
  name: string;
}

/**
 * Catálogo único de migraciones del baseline condensado.
 *
 * TypeORM identifica cada migración aplicada por el `name` completo; el
 * timestamp lo extrae de los últimos 13 caracteres numéricos del nombre del
 * archivo. Mantener este manifest centralizado permite:
 *  - stamp-ear la tabla `migrations` en entornos existentes sin re-ejecutarlas.
 *  - verificar que el árbol de migraciones activo coincide con el baseline.
 */
export const BASELINE_MIGRATIONS: BaselineMigrationEntry[] = [
  { timestamp: 1700000030000, name: "CoreSchema1700000030000" },
  { timestamp: 1700000030100, name: "ClientsSchema1700000030100" },
  { timestamp: 1700000030200, name: "CreditsSchema1700000030200" },
  { timestamp: 1700000030300, name: "ModuleSystemSchema1700000030300" },
  { timestamp: 1700000030400, name: "IntegrationsSchema1700000030400" },
  { timestamp: 1700000035000, name: "BaselineData1700000035000" },
  {
    timestamp: 1700000037000,
    name: "CreditOpportunityValueCents1700000037000",
  },
  { timestamp: 1700000038000, name: "CreditSearchTrgm1700000038000" },
];
