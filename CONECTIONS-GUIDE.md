# Integraciones — Guía de configuración y uso

Módulo de superadmin para **configurar conexiones de cada empresa con sistemas
externos** (credenciales cifradas) y, con SAP Business One, **sincronizar sus
clientes** desde el maestro de SAP.

El alta de conexiones es **agnóstica y guiada por plantillas**: no está atada a
SAP. Un *sistema* (SAP, una API, Copilot Chat Agent…) es una clave del catálogo
`connection_systems`; una *plantilla* (`connection_templates`) declara qué campos
de `settings` y qué secretos tiene una conexión de ese sistema, y la interfaz se
arma sola.

Código, por capas:

- `backend/src/modules/config/connections/` — **genérico**: conexiones (URL,
  credenciales cifradas, ajustes), catálogo de sistemas y plantillas, y la
  administración del superadmin. No conoce a SAP ni el vocabulario de clientes;
  expone el puerto `ConnectionPlugin`.
- `backend/src/modules/clients/sync/` — **genérico**: estrategias de lectura
  (puerto `ClientSyncStrategy`), cola de jobs, worker y disparo manual.
- `backend/src/modules/sap/` — **adaptador SAP**: implementa ambos puertos
  (`SapConnectionPlugin`, `SapB1ClientSyncStrategy`). Único lugar donde vive el
  identificador `'sap'`.

Interfaz: *Configuración global → pestaña **Conexiones*** con dos pestañas:
**Conexiones Empresas** y **Plantillas para sistemas**
(`frontend/src/modules/global/`).

### Modelo de datos

- `connection_systems` (global) — catálogo de sistemas: `key`, `label`,
  `enabled`, `sort_order`. Sembrado con `sap`, `api`, `copilot-chat-agent`.
- `connection_templates` (global) — plantilla por sistema: `system_key`, `label`,
  `settings_fields` (jsonb), `secret_fields` (jsonb), `auth_type`, `enabled`.
- `integration_connections` (por empresa, con RLS) — `module` (módulo de la app
  que la usa, p. ej. `clients`), `label` (nombre visible, único por empresa),
  `template_id`, `system`, `environment`, `base_url`, `settings` y
  `credentials_encrypted` (blob cifrado que guarda **varios** secretos).

---

## 1. Requisitos previos

1. **Migraciones aplicadas** (crean `integration_connections`, `integration_jobs`
   y `client_external_refs` con RLS). Ver §2.
2. **Variables de entorno** en `backend/.env` (dev) o `backend/.env.prod` (prod).
   Ver §3.
3. **Host de SAP autorizado** en el proxy de salida `egress-proxy/squid.conf`.
   Ver §4.
4. **Backend reiniciado** para tomar `.env` y código nuevos:
   `docker compose up -d --build backend`.

> El módulo viene **apagado** (`INTEGRATIONS_ENABLED=false`). Con el módulo
> apagado la pestaña se ve, pero no se puede guardar, probar ni sincronizar.

---

## 2. Aplicar las migraciones

La migración relevante es `1700000028000-IntegrationConnections` (esquema base)
y `1700000029000-ConnectionTemplates` (catálogo de sistemas, plantillas y los
campos `module`/`label`/`template_id` en `integration_connections`). Si falta
alguna previa, `migration:run` las aplica todas en orden.

> Las **credenciales existentes no se invalidan**: el AAD del cifrado pasó de
> `empresa:sistema:entorno` a `empresa:id`, y al descifrar se reintenta con el
> AAD anterior. Una conexión antigua sigue conectando sin recargar nada; al
> editarla y reenviar sus secretos, se re-cifra con el AAD nuevo.
>
> La migración da de alta las conexiones existentes como `module = 'clients'` y
> `label = '<sistema> · <entorno>'`.

**Dev (host → Postgres de Docker):**
```bash
cd backend
DB_HOST=127.0.0.1 DB_PORT=5433 REDIS_HOST=127.0.0.1 npm run migration:run
```

**Dev (dentro del contenedor, si el 5433 no está publicado en el host):**
```bash
docker exec pwa-backend npm run migration:run
```

**Producción:** es automático en cada deploy (`docker-compose.prod.yml`:
`DB_MIGRATE_AS_OWNER=true npx typeorm migration:run -d dist/database/data-source.js && node dist/main`).

Verificar:
```bash
docker exec pwa-postgres psql -U pwa_user -d pwa_db \
  -c "SELECT name FROM migrations ORDER BY id DESC LIMIT 3;" \
  -c "\dt integration_*" -c "\dt client_external_refs" \
  -c "\dt connection_*" -c "SELECT key, label FROM connection_systems ORDER BY sort_order;"
```

Revertir la última: `npm run migration:revert`.

---

## 3. Variables de entorno

Añádelas a `backend/.env` (o `.env.prod`). Solo **`CREDENTIALS_KEY`** es
obligatoria, y **solo si enciendes el módulo**.

```env
INTEGRATIONS_ENABLED=true
CREDENTIALS_KEY=<openssl rand -base64 32>
INTEGRATIONS_ALLOWED_HOSTS=sap.tuempresa.com #Separadas por ","
EGRESS_HTTPS_PROXY=
INTEGRATIONS_REQUEST_TIMEOUT_MS=15000
INTEGRATIONS_AUTH_PAUSE_MS=300000
CLIENT_SYNC_POLL_INTERVAL_MS=60000
CLIENT_SYNC_MAX_ATTEMPTS=5
```

| Variable | Valor | Notas |
|---|---|---|
| `INTEGRATIONS_ENABLED` | `true`/`false` | Interruptor maestro (default `false`). |
| `CREDENTIALS_KEY` | `openssl rand -base64 32` | 32 bytes base64. **Si se pierde, las credenciales guardadas quedan ilegibles.** |
| `INTEGRATIONS_ALLOWED_HOSTS` | `sap.tuempresa.com`, `sap.tuempresa.com:50000` o `.tuempresa.com` | Hosts de `base_url` (anti-SSRF). Formato `host` o `host:puerto`; sin puerto se admite cualquiera; `.dominio` admite subdominios. Debe coincidir con `squid.conf`. |
| `EGRESS_HTTPS_PROXY` | vacío | En Docker déjala vacía: cae a `SAMAN_HTTPS_PROXY` (`http://egress-proxy:3128`). |
| `INTEGRATIONS_REQUEST_TIMEOUT_MS` | `15000` | Timeout por llamada. |
| `INTEGRATIONS_AUTH_PAUSE_MS` | `300000` | Tras 401/403, pausa de esa empresa (5 min). |
| `CLIENT_SYNC_POLL_INTERVAL_MS` | `60000` | Cada cuánto el worker revisa jobs (0 = apagado). |
| `CLIENT_SYNC_MAX_ATTEMPTS` | `5` | Reintentos ante error transitorio (backoff 30 s → 15 min). |

---

## 4. Autorizar el host en el proxy de salida

El backend **no tiene salida directa a Internet**: todo sale por `egress-proxy`
(squid) con lista blanca. Edita `egress-proxy/squid.conf`:

```apache
acl allowed_hosts dstdomain saman-eng.net
acl allowed_hosts dstdomain sap.tuempresa.com
```

Si el Service Layer no usa 443 sino el puerto típico **50000**, amplía el puerto
permitido:

```apache
acl SSL_port port 443 50000
```

Reinicia el proxy: `docker compose restart egress-proxy`. El host debe estar
tanto aquí como en `INTEGRATIONS_ALLOWED_HOSTS`.

---

## 5. Configurar conexiones (UI)

Entra como **superadmin** → *Configuración global* → pestaña **Conexiones**. Hay
dos pestañas:

### 5.1 Plantillas para sistemas

Define, por sistema, qué campos y secretos tendrá una conexión. Es **global**.

1. Arriba se listan los **sistemas** del catálogo (chip con `✓` = tiene adaptador
   de código, se puede *Probar*).
2. Pulsa **+ Nueva plantilla**:
   - **Sistema** — elige uno del catálogo (autocompleta) o escribe una clave
     nueva (se crea sola en el catálogo).
   - **Campos de settings** — cada fila es `clave`, `etiqueta`, `tipo`
     (`text | number | boolean | json | select | multiselect`), **Obligatorio**,
     **Operativo** y valor por defecto. `Operativo` = cambiarlo **no** obliga a
     volver a probar la conexión (p. ej. `pageSize`, `schedule`, `ownedFields`).
   - **Secretos** — cada fila es `clave`, `etiqueta`, `Obligatorio` (p. ej.
     `username`, `password`, `token`).
   - **Tipo de autenticación por defecto** — informativo para las conexiones
     nuevas.
3. Guardar. La plantilla ya está disponible para crear conexiones.

> SAP trae una plantilla sembrada por la migración (`strategy`, `companyDb`,
> `cardType`, `pageSize`, `schedule`, `ownedFields` + secretos `username`,
> `password`). Edítala si necesitas ajustar los campos, pero **`settings.strategy`
> debe ser una estrategia registrada** (`sap-b1`, `sap-b1-empresa1`,
> `sap-b1-empresa2`) o el guardado fallará.

### 5.2 Conexiones Empresas

1. Se listan las **empresas** como tarjetas. Pulsa una para **expandirla** (abrir
   una cierra la anterior).
2. Dentro verás sus conexiones y el botón **+ Agregar conexión**.
3. En el formulario (armado desde la plantilla elegida):
   - **Plantilla del sistema** — determina los campos y secretos.
   - **Nombre de la conexión** — visible, único por empresa (identifica varias
     conexiones de la misma empresa/sistema).
   - **Módulo** — módulo de la app que la usa (`clients`, …).
   - **URL base** — debe empezar por `https://` y su host estar autorizado.
   - **Entorno** — Producción (sincroniza) o Pruebas (solo probar).
   - **Ajustes** — los campos de la plantilla. Puedes añadir más pares
     clave/valor con **+ Agregar campo** (texto, número, `true/false` o JSON).
   - **Credenciales** — los secretos de la plantilla. Son **de solo escritura**:
     al editar, déjalos vacíos para conservar los guardados.
   - **Tipo de autenticación** y **Vencimiento** (avisa 15 días antes).
4. **Guardar**. Las credenciales se cifran (AES-256-GCM) y no vuelven a
   mostrarse. La conexión queda **inactiva** (tarjeta atenuada).
5. Pulsa **Probar conexión**. Si sale *Conexión correcta*, ya puedes **Activar**.
   Cambiar URL, sistema, credenciales o ajustes de conexión desactiva la conexión
   y obliga a volver a probar.
6. **Editar / Eliminar** en cada tarjeta. Las conexiones **inactivas** se ven
   atenuadas.

> Puedes tener **varias conexiones por empresa y sistema** (p. ej. SAP de dos
> bases distintas); se distinguen por su **nombre**. Un usuario con varias
> conexiones del mismo sistema en Producción: la sincronización usa la **más
> antigua activa** con estrategia registrada.

---

## 6. Sincronizar clientes

- **Manual:** botón **Sincronizar ahora** (usa siempre la conexión de
  Producción activa). La UI sigue el job cada 3 s (hasta 3 min) y muestra el
  resumen; el historial queda abajo.
- **Programada:** el worker revisa cada `CLIENT_SYNC_POLL_INTERVAL_MS` y encola
  la sincronización cuando se cumple el intervalo configurado. Un solo job
  activo por empresa/sistema (no se duplica).
- **Desde la API (usuario de empresa):** ver §6.1.

Cada job reporta: **procesados, creados, actualizados, enlazados, sin cambios y
con error**. El detalle de errores por registro se ve al pulsar la fila.

### 6.1 Disparo manual por API

Pensado para que un **usuario de empresa** (no solo el superadmin) pueda pedir la
sincronización de la suya y seguir el resultado:

| Método y ruta | Permiso | Descripción |
|---|---|---|
| `POST /api/clients/sync` | `clients.update` | **Encola** la sincronización y devuelve `{ jobId, status, created }`. El worker la ejecuta; la UI sigue el job. |
| `GET /api/clients/sync/jobs?companyId=&limit=` | `clients.read` | Historial reciente de sincronizaciones de la empresa. |
| `GET /api/clients/sync/:jobId?companyId=` | `clients.read` | Estado/resultado de una sincronización. |
| `GET /api/clients/sync/meta` | `clients.read` | Estrategias registradas (`{ strategies: [{ system, key }] }`). |

> El historial va en `/clients/sync/jobs` (con segmento propio) porque
> `ClientsController` define `GET /clients/:id`: una ruta desnuda
> `/clients/sync` caería en ese `:id`.

Administración de conexiones (solo superadmin, `/api/connections`). Las
conexiones se identifican por **`id`** (una empresa puede tener varias del mismo
sistema):

| Método y ruta | Descripción |
|---|---|
| `GET /api/connections/meta` | `{ enabled, systems: [{key,label,testable}], environments, authTypes }`. |
| `GET /api/connections/templates` | Lista de plantillas. |
| `POST /api/connections/templates` | Crea plantilla (`systemKey`, `label`, `settingsFields`, `secretFields`, `authType?`, `enabled?`). |
| `PUT /api/connections/templates/:id` | Edita plantilla. |
| `DELETE /api/connections/templates/:id` | Elimina plantilla. |
| `POST /api/connections/systems` | Añade un sistema al catálogo (`key`, `label`). |
| `GET /api/connections/companies/:companyId` | Lista de conexiones (sin credenciales). |
| `POST /api/connections/companies/:companyId` | Crea conexión. |
| `GET /api/connections/companies/:companyId/:id` | Una conexión. |
| `PUT /api/connections/companies/:companyId/:id` | Edita conexión. |
| `DELETE /api/connections/companies/:companyId/:id` | Elimina conexión. |
| `POST /api/connections/companies/:companyId/:id/test` | Abre/cierra sesión y guarda el resultado. |

Cuerpo de alta/edición (`CreateConnectionDto` / `UpdateConnectionDto`):
`label`, `module`, `system`, `environment`, `templateId?`, `authType?`,
`baseUrl`, `settings` (objeto), `credentials?` (mapa `clave→valor`; ausente al
editar = conservar), `expiresAt?`, `enabled?`. `settings` se valida contra los
campos obligatorios de la plantilla y, si hay adaptador, contra el plugin del
sistema.

- **Empresa efectiva:** un usuario normal siempre sincroniza **su** empresa (se
  toma del token; cualquier `companyId` del request se ignora). El superadmin,
  que no tiene empresa, la indica en el contexto del módulo: `companyId` en el
  body (`POST`) o en el query (`GET`).
- **Una ejecución por empresa/sistema:** el job se encola de forma **idempotente**;
  si ya hay uno activo se devuelve **ese** (mismo `jobId`, `created: false`) para
  que la UI siga el que está en curso.
- **Límite por empresa:** `CompanyThrottlerGuard` aplica **3 por minuto por
  empresa**, solo al disparo `POST` (la operación pesada). Las lecturas
  (`GET /clients/sync/jobs`, `GET /clients/sync/:jobId`) **no** se limitan por
  empresa, porque la UI sigue el job cada pocos segundos. El límite global por
  IP (`ThrottlerGuard`, 300/min) sigue vigente para todo.
- **Errores:** `400` si la empresa no tiene una conexión de Producción activa con
  estrategia de sincronización, o si `INTEGRATIONS_ENABLED=false`; `403` si el
  usuario no tiene empresa.

### 6.2 Estrategias por empresa

La lógica de lectura de SAP es una **estrategia** que cada empresa elige con el
`settings.strategy` de **su** conexión (`integration_connections`):

- `sap-b1` — base, comportamiento estándar (`SapB1ClientSyncStrategy`).
- `sap-b1-empresa1` y `sap-b1-empresa2` — puntos de extensión por empresa
  (`SapEmpresa1ClientSyncStrategy` / `SapEmpresa2ClientSyncStrategy`). Heredan la
  base y solo sobrescriben lo que difiera: `selectFields()` (campos del
  `$select`), `buildFilters()` (filtros `$filter`) o `mapBusinessPartner()`
  (traducción del socio de negocio).

No hay ningún `companyId` codificado en la estrategia: se resuelve por el
`settings.strategy` de la conexión. Una estrategia nueva se registra en
`SapModule` (providers + lista de `SapIntegrationRegistrar`).

### Qué hace con cada cliente del origen

1. Ya enlazado, sin cambios → **sin cambios**.
2. Cliente propio de la empresa (mismo documento o enlace) → actualiza solo los
   campos marcados como "de SAP" → **actualizado**.
3. Cliente del **padrón compartido** (global) → se enlaza **sin modificarlo**.
4. Documento que ya pertenece a **otra empresa** → error del registro, sin tocar nada.
5. No existe → se crea como cliente de la empresa → **creado**.

---

## 7. Sincronización incremental (UPDATE DATE vs LAST SYNC DATE)

La lectura trae **solo los campos que usa la app** (`CardCode`, `CardName`,
`CardForeignName`, `FederalTaxID`, `Phone1`, `EmailAddress`, `Valid`, `Frozen`,
`UpdateDate`) y filtra por `UpdateDate ge <marca de agua del último job>`.

Además, **por registro**: en `client_external_refs` se guarda, por empresa y
sistema, el **`external_id`** (p. ej. `CardCode`) y **`last_synced_at`** (última
sincronización). Si el `UpdateDate` del cliente en SAP **no es posterior** al
`last_synced_at` de su enlace, se descarta (ya está al día). Como SAP guarda
solo la **fecha**, los del mismo día se re-verifican con un **hash** del origen
(`source_hash`) que evita reescribir lo que no cambió.

Los campos `external_id` y `last_synced_at` ya existen en `client_external_refs`
(migración `1700000028000`); no hace falta añadirlos.

---

## 8. Cliente local que no existe en SAP

**No se toca.** La sincronización solo recorre los clientes que **devuelve SAP**;
un cliente creado o editado solo en la app (sin equivalente en el ERP) nunca se
recorre, así que no se actualiza, no se desactiva y no se elimina. Tampoco se
borran clientes locales cuando desaparecen del origen.

---

## 9. Solución de problemas

| Síntoma | Causa probable |
|---|---|
| La pestaña no deja guardar | `INTEGRATIONS_ENABLED` está en `false`. |
| `Credencial inválida para esta conexión` | `CREDENTIALS_KEY` cambió o el blob es de otra conexión. Vuelve a cargar las credenciales. |
| `El host X no está permitido` | Falta en `INTEGRATIONS_ALLOWED_HOSTS` o en `squid.conf`. |
| Prueba = *auth* | Usuario/contraseña rechazados por SAP (no reintenta; pausa la empresa). |
| Prueba = *transient* | Red/timeout/5xx: revisa el proxy de salida y el puerto. |
| `Prueba la conexión antes de activarla` | Activar exige una prueba previa correcta. |
| `El campo 'X' es obligatorio` / `El secreto 'X' es obligatorio` | Falta un campo/secreto marcado como obligatorio en la plantilla. |
| `settings.strategy debe ser una de: …` | El `strategy` no es una estrategia registrada para el sistema. |
| No aparece el botón *Agregar conexión* | No hay plantillas habilitadas: créalas en «Plantillas para sistemas». |
| El job se queda en cola | Worker apagado (`CLIENT_SYNC_POLL_INTERVAL_MS=0`) o `INTEGRATIONS_ENABLED=false`. |
| No llegan clientes nuevos | Falta en `INTEGRATIONS_ALLOWED_HOSTS`/squid; o el `UpdateDate` no supera el `last_synced_at` del enlace. |

Logs del backend: `docker logs pwa-backend` (incluye el resumen por job).
