# Integraciones (SAP Business One) — Guía de configuración y uso

Módulo de superadmin para **configurar la conexión de cada empresa con SAP B1**
(credenciales cifradas) y **sincronizar sus clientes** desde el maestro de SAP.
Código: `backend/src/modules/sap/`; interfaz: *Configuración global →
pestaña Integraciones* (`frontend/src/modules/global/`).

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

La migración relevante es `1700000028000-IntegrationConnections`. Si falta
alguna previa, `migration:run` las aplica todas en orden.

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
  -c "\dt integration_*" -c "\dt client_external_refs"
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

## 5. Configurar la conexión y las credenciales (UI)

1. Entra como **superadmin** → *Configuración global* → pestaña **Integraciones**.
2. Selecciona la **empresa** en el desplegable.
3. En la tarjeta *SAP · Producción* pulsa **Configurar** (o **Editar** si ya existe).
4. Completa el formulario:
   - **URL del Service Layer** — `https://sap.tuempresa.com:50000/b1s/v1`
   - **Base de la compañía (CompanyDB)** — p. ej. `SBO_EMPRESA`
   - **Usuario** y **Contraseña** — de SAP. Son **de solo escritura**: el servidor
     nunca los devuelve. Al editar, déjalos vacíos para conservar los guardados;
     para cambiarlos, escribe usuario **y** contraseña.
   - **Sincronizar cada (minutos)** — vacío = solo manual; mínimo 15.
   - **Registros por página** — tamaño de página OData (default 200).
   - **Vencimiento de la credencial** — opcional; avisa 15 días antes.
   - **Datos que manda SAP** — casillas de los campos que el ERP puede
     sobrescribir; el resto solo se edita en la app.
5. **Guardar**. Las credenciales se cifran (AES-256-GCM) y no vuelven a mostrarse.
   La conexión queda **inactiva** hasta que se pruebe.
6. Pulsa **Probar conexión**. Si sale *Conexión correcta*, ya puedes **Activar**.
   Cambiar URL/credenciales/ajustes de conexión desactiva la conexión y obliga a
   volver a probar.

> Hay dos entornos por empresa: **Producción** (sincroniza clientes) y
> **Pruebas** (solo sirve para *Probar conexión*; no escribe clientes).

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

### 6.1 Disparo síncrono por API

Pensado para que un **usuario de empresa** (no solo el superadmin) pueda pedir la
sincronización de la suya y esperar el resultado:

| Método y ruta | Permiso | Descripción |
|---|---|---|
| `POST /api/clients/sap/sync` | `clients.update` | Ejecuta la sincronización **y espera** a que termine; devuelve el job con su `result`. |
| `GET /api/clients/sap/sync?limit=20` | `clients.read` | Historial reciente de sincronizaciones de la empresa. |
| `GET /api/clients/sap/sync/:jobId` | `clients.read` | Estado/resultado de una sincronización. |

- **Empresa efectiva:** un usuario normal siempre sincroniza **su** empresa (se
  toma del token; cualquier `companyId` del request se ignora). El superadmin,
  que no tiene empresa, la indica en el contexto del módulo: `companyId` en el
  body (`POST`) o en el query (`GET`).
- **Una ejecución por empresa:** si ya hay una sincronización activa se responde
  **409** (`Ya hay una sincronización en curso para esta empresa`).
- **Límite por empresa:** `CompanyThrottlerGuard` aplica **3 por minuto por
  empresa**. El límite global por IP (`ThrottlerGuard`, 300/min) sigue vigente.
- **Errores:** `400` si la empresa no tiene una conexión SAP de Producción
  activa o `INTEGRATIONS_ENABLED=false`; `403` si el usuario no tiene empresa.

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
`SapModule` (providers + `CLIENT_SYNC_STRATEGIES`).

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
| El job se queda en cola | Worker apagado (`CLIENT_SYNC_POLL_INTERVAL_MS=0`) o `INTEGRATIONS_ENABLED=false`. |
| No llegan clientes nuevos | Falta en `INTEGRATIONS_ALLOWED_HOSTS`/squid; o el `UpdateDate` no supera el `last_synced_at` del enlace. |

Logs del backend: `docker logs pwa-backend` (incluye el resumen por job).
