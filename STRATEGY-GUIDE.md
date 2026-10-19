# Guía: Crear y registrar estrategias

Este documento explica cómo añadir estrategias (lógica configurable por empresa) en dos lugares del sistema:

1. **Estrategias de sincronización de clientes** (`clients/sync`) — usadas por adaptadores de sistemas externos para mapear datos del origen (p. ej. SAP) al vocabulario de `clients`. Patrón `ClientSyncStrategy`.
2. **Procesadores por empresa** (`peliculas/processors`) — traducen la respuesta cruda de un API externo al modelo interno (`Movie[]`). Patrón `PeliculasProcessor` (ejemplo demostrativo).

## 1. Qué es una "estrategia"

Una estrategia encapsula la lógica que **varía entre empresas**, evitando `if (companyId === ...)` en el código. La empresa elige qué estrategia usa con `settings.strategy` en su conexión:

- **SAP**: `settings.strategy` ∈ [`sap-b1`, `sap-b1-empresa1`, `sap-b1-empresa2`] — define qué filtros/mapa aplica al leer BusinessPartners.
- **Películas**: `settings.strategy` ∈ [`default`, `empresa1`] — define cómo parsear el JSON crudo del API externo.

La elección de estrategia **no es operativa**: cambiar `settings.strategy` invalida la prueba de conexión (`lastTestStatus` pasa a `null`), forzando a probarla de nuevo antes de reactivarla.

## 2. Principios comunes

- **Nunca leer configuración/variables de entorno** dentro de la estrategia: todo llega por parámetros (`ctx`, `settings`, `session`).
- **Sin condicionales por empresa**: la diferencia entre empresas está en la clase + en `settings.strategy`.
- **Registro en tiempo de ejecución**: cada estrategia se `register()` en su registry (vía `OnModuleInit` de su *registrar*), no se lee de enums.
- **Validación al guardar**: al crear/editar una conexión, `validateSettings` rechaza `settings.strategy` si no está registrada (`settings.strategy debe ser una de: ...`).
- **Deterministas**: dos empresas con misma estrategia y mismos ajustes obtienen el mismo resultado.

## 3. Caso A: Estrategias de sincronización de clientes (`ClientSyncStrategy`)

### 3.1 Interfaz (`client-sync.strategy.ts`)

```ts
export interface ClientSyncStrategy {
  readonly system: string;        // p. ej. 'sap'
  readonly key: string;            // p. ej. 'sap-b1-empresa1'
  readonly settingsDto: Type<ClientSyncSettingsDto>;
  open(connection, credentials): Promise<Session>;
  fetch(session, cursor): Promise<SyncPage<ExternalClient>>;
  close(session): Promise<void>;
  toCursor(raw): SyncCursor | null;
}
```

La estrategia abre/cierra sesión y lee páginas (`fetch`) devolviendo `ExternalClient[]` (vocabulario común de `clients`). El mapeo del origen vive aquí.

### 3.2 Registry (`ClientSyncStrategyRegistry`)

- `register(strategy)`
- `all()` → lista `{system,key}`
- `keysFor(system)` → claves para ese sistema
- `resolve(system, key)` → lanza `IntegrationError('definitive', ...)` si no existe
- `validateSettings(system, settings)` → valida `strategy` contra claves registradas + valida DTO con `class-validator` (whitelist=true, forbidNonWhitelisted=true) → devuelve settings limpios

### 3.3 Registrar (adaptador del sistema)

Ejemplo SAP: `SapIntegrationRegistrar implements OnModuleInit`:

```ts
constructor(
  private readonly plugins: ConnectionPluginsRegistry,
  private readonly strategies: ClientSyncStrategyRegistry,
  private readonly plugin: SapConnectionPlugin,
  private readonly base: SapB1ClientSyncStrategy,
  private readonly empresa1: SapEmpresa1ClientSyncStrategy,
  private readonly empresa2: SapEmpresa2ClientSyncStrategy,
) {}

onModuleInit() {
  this.plugins.register(this.plugin);
  for (const s of [this.base, empresa1, empresa2]) this.strategies.register(s);
}
```

El `SapConnectionPlugin` delega `validateSettings`/`test` al registry/estrategias.

### 3.4 Añadir una nueva estrategia SAP

1. Crear clase `XxxClientSyncStrategy` que implemente/extienda `SapB1ClientSyncStrategy` (o implemente `ClientSyncStrategy` directamente).
2. Sobrescribir solo lo necesario: `key`, `settingsDto` (opcional), `buildFilters()`, `selectFields()`, `mapBusinessPartner()` etc.
3. Añadirla a `providers` de `SapModule`.
4. Añadirla al constructor + bucle de `SapIntegrationRegistrar`.
5. (Opcional) Añadir su `key` a las opciones del campo `strategy` en la plantilla `sap` (GUI → Configuración global → Plantillas de conexión). No es obligatorio para que funcione, pero sí para que aparezca en el selector.

## 4. Caso B: Procesadores de Películas (`PeliculasProcessor`)

### 4.1 Interfaz (`peliculas-processor.ts`)

```ts
export interface PeliculasProcessor {
  readonly key: string;           // p. ej. 'default' o 'empresa1'
  process(raw: unknown): Movie[];
}
```

`Movie = { id, title, year, genre }` (normalizado). El procesador transforma el JSON crudo del API externo a ese modelo.

Contratos de las dos estrategias registradas (el JSON lo fija el contrato de cada API, no la conexión):

| key | Respuesta cruda esperada | De dónde sale |
| --- | --- | --- |
| `default` | `{ usuario, total, peliculas: [{ id, titulo }] }` | API demo `apis-base` (`GET /peliculas`), la misma que sirve `/mascotas`. |
| `empresa1` | `{ resultados: [{ codigo, nombre, anio, genero }] }` | Otra empresa con otro contrato (el mock `mocks/mock-peliculas.mjs` lo expone en `GET /empresa1/peliculas`). |

Si el formato recibido no coincide con la estrategia, la consulta falla con
`Formato inesperado del API: se esperaba { peliculas: [...] }` (error `definitive`: no se reintenta).
Ver el montaje completo en [DESDE-CERO-GUIDE.md](DESDE-CERO-GUIDE.md).

### 4.2 Registry (`PeliculasProcessorRegistry`)

- `register(processor)`
- `keys()` → claves
- `resolve(key)` → lanza `IntegrationError('definitive', ...)` si no existe
- `validateSettings(settings)` → valida `settings.strategy` está entre `keys()` → devuelve limpio

### 4.3 Registrar (`peliculas-integration.registrar.ts`)

```ts
constructor(
  private readonly plugins: ConnectionPluginsRegistry,
  private readonly processors: PeliculasProcessorRegistry,
  private readonly plugin: PeliculasConnectionPlugin,
  private readonly base: DefaultPeliculasProcessor,
  private readonly empresa1: Empresa1PeliculasProcessor,
) {}

onModuleInit() {
  this.plugins.register(this.plugin);
  for (const p of [this.base, empresa1]) this.processors.register(p);
}
```

El plugin `PeliculasConnectionPlugin` usa este registry para validar y el servicio para resolver la estrategia al consultar.

### 4.4 Añadir un procesador nuevo

1. Crear `XxxPeliculasProcessor` implementando `PeliculasProcessor` (key único, `process` robusto con `asObject/toMovie` o validaciones claras; lanzar `IntegrationError('definitive', ...)` ante formato inesperado).
2. Añadirlo a `providers` de `PeliculasModule`.
3. Añadirlo al constructor + bucle de `PeliculasIntegrationRegistrar`.
4. Actualizar las opciones del campo `strategy` en la plantilla `api` (módulo `peliculas`) para incluir ese `key` (GUI).

## 5. Buenas prácticas

- **Nombres de key**: cortos, estables (`default`, `empresa1`, `sap-b1-empresa2`).
- **Tolerancia a formato**: validar tipos/arrays antes de mapear; errores de configuración/formato deben ser `definitive` (no reintentar).
- **Tests de humo**: con datos de ejemplo del origen, `process()`/`fetch()` deben devolver el modelo esperado.
- **Separación de responsabilidades**: estrategia solo mapea/traduce; autenticación/sesión vive en el cliente; orquestación en el servicio/gateway.
- **Plantillas**: el selector de `strategy` en la plantilla debe listar exactamente las claves registradas (evita inconsistencias GUI–código).

## 6. Referencias

- `backend/src/modules/clients/sync/client-sync.strategy.ts`
- `backend/src/modules/clients/sync/client-sync-strategy.registry.ts`
- `backend/src/modules/sap/sap-integration.registrar.ts`
- `backend/src/modules/peliculas/processors/peliculas-processor.ts`
- `backend/src/modules/peliculas/processors/peliculas-processor.registry.ts`
- `backend/src/modules/peliculas/peliculas-integration.registrar.ts`
- `backend/src/modules/config/connections/connection-plugins.ts` (resolución `system.module`)
- [DESDE-CERO-GUIDE.md](DESDE-CERO-GUIDE.md) — montar `peliculas` y `mascotas` desde cero (plantilla,
  conexión, estrategias y prueba end-to-end).
