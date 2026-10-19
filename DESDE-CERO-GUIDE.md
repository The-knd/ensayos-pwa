# Guía desde cero: crear, conectar y probar `peliculas` y `mascotas`

Esta guía lleva el sistema desde una **base de datos vacía** hasta las dos funcionalidades
funcionando y verificadas, paso a paso y sin conocimiento previo del proyecto:

1. **`peliculas`** — módulo *de GUI*: pantalla propia, permiso `peliculas.read`, ruta `/peliculas`
   y una **conexión por empresa** (creada desde la GUI con una plantilla del sistema `api`) que
   apunta a un API externo. La empresa 1 puede tener una **estrategia** distinta.
2. **`mascotas`** — módulo *de sistema*: sin pantalla, sin permiso y sin conexión por empresa; una
   sola consulta a un endpoint **fijo en código** (`GET /mascotas` en `MASCOTAS_API_URL`), disparada
   desde un botón del panel de superadmin y mostrada como **JSON crudo** en un modal.

Qué cubre y qué no:

| Cubre | No cubre |
| --- | --- |
| Levantar entorno, migrar y arrancar backend/frontend nativos | Escribir el código de un módulo nuevo (eso es [MODULE-GUIDE.md](MODULE-GUIDE.md)) |
| Registrar el módulo, plantilla, conexión, prueba y activación | Despliegue a producción (Kong, proxy del host, HTTPS) |
| API externa real o *mocks* locales, permisos y verificación E2E | Migraciones nuevas (estos dos módulos no necesitan ninguna) |

Guías relacionadas:

- [MODULE-GUIDE.md](MODULE-GUIDE.md) — crear un módulo de GUI desde cero (y §0.4 sobre sistemas,
  conexiones y estrategias).
- [CONECTIONS-GUIDE.md](CONECTIONS-GUIDE.md) — modelo de conexiones (catálogos, plantillas, cifrado).
- [CONNECTION-TEMPLATES-GUIDE.md](CONNECTION-TEMPLATES-GUIDE.md) — plantillas y conexiones en la GUI.
- [STRATEGY-GUIDE.md](STRATEGY-GUIDE.md) — cómo se define y registra una estrategia por empresa.
- [TEST-GUIDE.md](TEST-GUIDE.md) — credenciales y pruebas generales del sistema.

---

## 0. Resumen: qué vas a montar

```
   GUI (navegador :5173)                       Backend NestJS (:3000)                 Sistema externo
 ┌────────────────────────┐               ┌─────────────────────────────┐        ┌─────────────────────┐
 │ Config. global → Módulos│  registro     │ PeliculasController         │        │ API demo (apis-base)│
 │  · módulo `peliculas`   │──────────────►│  GET /api/peliculas/movies  │        │  :8005              │
 │ Config. global →        │               │   · conexión (api+peliculas)│        │  POST /login        │
 │  Conexiones (plantilla  │  plantilla    │   · login → consulta → logout├───────►│  POST /logout       │
 │   + conexión + prueba)  │──────────────►│   · estrategia (procesador) │  HTTP  │  GET  /peliculas    │
 │ Home → tile Películas   │               │ MascotasController          │        │  GET  /mascotas     │
 │ Home → botón Mascotas   │──────────────►│  GET /api/mascotas/consultar├───────►│  (mismo servicio)   │
 └────────────────────────┘               └─────────────────────────────┘        └─────────────────────┘
        superadmin / admin empresa 1             superadmin (mascotas)                  HTTP directo
```

| Pieza | `peliculas` | `mascotas` |
| --- | --- | --- |
| Tipo de módulo | De GUI | De sistema |
| Fila en `modules` | Sí (GUI) | No |
| Permiso | `peliculas.read` | Ninguno (solo superadmin) |
| Pantalla | `/peliculas` (Home tile) | Modal desde el Home de superadmin |
| Endpoint backend | `GET /api/peliculas/movies` | `GET /api/mascotas/consultar` |
| Sistema externo | `api` (vía conexión por empresa) | ninguna conexión |
| Endpoint externo | según `baseUrl` de la conexión | `MASCOTAS_API_URL` + `/mascotas` |
| Credenciales | usuario/contraseña cifrados en la conexión | ningunas |
| Estrategia | `default` y `empresa1` (`settings.strategy`) | no aplica |

---

## 1. Requisitos previos

| Requisito | Detalle |
| --- | --- |
| Docker | Solo para **Postgres** y **Redis** (infraestructura). |
| Node ≥ 20 (o bun) | Backend, frontend y los *mocks* de esta guía. |
| Puertos libres | `5433` Postgres · `6379` Redis · `3000` backend · `5173` frontend · `8005` API demo · `8006` mock de Películas. |
| Credenciales demo | `superadmin@empresa1.com` / `Password123!` (superadmin) y `admin@empresa1.com` / `Password123!` (admin de empresa). Ver [TEST-GUIDE.md](TEST-GUIDE.md). |
| API externa | La **API demo** (`apis-base`) en `:8005`, o los *mocks* de `mocks/` (§3). |

> Los usuarios demo los crean las migraciones salvo que se ejecuten con `SEED_DEMO_DATA=false`.
> Si tu base ya existía y no los tienes, revisa las migraciones `…SeedBaseData` y `…SeedMoreUsers`.

---

## 2. Levantar el entorno desde cero

### 2.1 Infraestructura (Postgres + Redis)

```bash
docker compose up -d postgres redis
```

### 2.2 Migraciones (una sola vez)

```bash
cd backend
DB_HOST=127.0.0.1 DB_PORT=5433 REDIS_HOST=127.0.0.1 npm run migration:run
cd ..
```

Crea el esquema, el catálogo de sistemas (`sap`, `api`, `copilot-chat-agent`), los permisos base y,
si no se desactiva el seed, las empresas y usuarios demo. **No hay migración nueva para `peliculas`
ni `mascotas`:** ambos se apoyan en lo existente.

### 2.3 Variables de integraciones (una sola vez)

Las integraciones vienen **apagadas** por defecto (`INTEGRATIONS_ENABLED=false`). Para probar
conexiones hay que activarlas, dar una clave de cifrado y autorizar el host externo:

```bash
# Solo la primera vez. ¡Conserva CREDENTIALS_KEY! Si la regeneras, las
# credenciales ya guardadas dejan de descifrarse.
cat > ~/.pwa-integrations.env <<EOF
INTEGRATIONS_ENABLED=true
CREDENTIALS_KEY=$(openssl rand -base64 32)
INTEGRATIONS_ALLOWED_HOSTS=localhost:8005,localhost:8006
EOF
```

| Variable | Para qué |
| --- | --- |
| `INTEGRATIONS_ENABLED=true` | Habilita la administración de conexiones y el worker. Sin esto, `ensureEnabled()` corta toda consulta. |
| `CREDENTIALS_KEY` | AES-256 (32 bytes en base64) con el que se cifran las credenciales de cada conexión. Debe ser **estable**. |
| `INTEGRATIONS_ALLOWED_HOSTS` | Lista blanca de hosts permitidos en `base_url`. Formato host o host:puerto, separados por coma. |
| `MASCOTAS_API_URL` | Opcional: URL del servicio de mascotas. Por defecto `http://localhost:8005` (nativo), así que en local no hay que tocarla. |

### 2.4 Backend nativo

```bash
cd backend
set -a; source ~/.pwa-integrations.env; set +a
DB_HOST=127.0.0.1 DB_PORT=5433 REDIS_HOST=127.0.0.1 npm run start:dev
```

Comprobación:

```bash
curl -s localhost:3000/api/health        # → {"status":"ok",...}
```

> **¿Por qué nativo y no todo en Docker?** El backend en Docker sale a Internet por `egress-proxy`
> (Squid), que **solo** permite túneles `CONNECT` a **HTTPS/443**: un `http://localhost:8006` no
> puede atravesarlo. Con el backend nativo no hay proxy (`EGRESS_HTTPS_PROXY`/`SAMAN_HTTPS_PROXY`
> vacíos) y las llamadas salen directas, que es justo lo que necesitas para probar contra un API
> local. En producción (HTTPS/443 con host de la lista blanca) el proxy sí se usa, y el `extra_hosts:
> host.docker.internal` de `docker-compose.yml` cubre el caso de correr todo en Docker contra un
> servicio del host.

### 2.5 Frontend nativo

```bash
cd frontend
VITE_PROXY_TARGET=http://localhost:3000 npm run dev
```

Abre <http://localhost:5173> y entra con `superadmin@empresa1.com` / `Password123!`.

`VITE_PROXY_TARGET` redirige `/api` del Vite al backend nativo, saltando Kong (que no está
levantado). Sin esa variable el proxy apunta a Kong en `:8000`.

---

## 3. La API externa (sirve a los dos módulos)

La API demo `apis-base` (FastAPI, fuera de Docker) expone tanto `/peliculas` como `/mascotas` en el
mismo puerto. **Es la ruta recomendada**; si no la tienes, usa los *mocks* de §3.2.

### 3.1 API demo real (`:8005`)

```bash
curl -s localhost:8005/openapi.json | head -c 80     # si responde, está viva
curl -s localhost:8005/mascotas                      # {"total":3,"mascotas":[...]}
```

Contrato:

| Método y ruta | Autenticación | Respuesta |
| --- | --- | --- |
| `POST /login` `{username,password}` | — | `{access_token, token_type, expires_in, usuario}` · `401` si fallan |
| `POST /logout` | `Authorization: Bearer <token>` | `{mensaje}` · `401` sin sesión |
| `GET /peliculas` | `Authorization: Bearer <token>` | `{usuario,total,peliculas:[{id,titulo}]}` · `401` sin sesión |
| `GET /mascotas` | — | `{total,mascotas:[{id,nombre,tipo}]}` |

Usuarios de demostración (cada uno ve sus películas): `ana/ana123`, `luis/luis123`,
`maria/maria123`, `pedro/pedro123`.

Verificación de la parte de Películas:

```bash
TOKEN=$(curl -s -X POST localhost:8005/login -H 'Content-Type: application/json' \
  -d '{"username":"ana","password":"ana123"}' | sed -E 's/.*"access_token":"([^"]+)".*/\1/')
curl -s localhost:8005/peliculas -H "Authorization: Bearer $TOKEN"
curl -s -X POST localhost:8005/logout -H "Authorization: Bearer $TOKEN"
```

### 3.2 *Mocks* locales (`mocks/`, sin dependencias)

Si **no** tienes la API demo corriendo:

```bash
# Réplica de la API demo (login/logout/peliculas), en :8006.
# Añade /empresa1/peliculas con OTRO formato → sirve para la estrategia `empresa1`.
node mocks/mock-peliculas.mjs

# Solo el servicio de mascotas, en :8005 (el que espera MASCOTAS_API_URL por defecto).
node mocks/mock-mascotas.mjs
```

`mocks/mock-peliculas.mjs` es una réplica fiel de la API demo (mismos usuarios y mismo formato),
así que todo lo que sigue funciona igual apuntando a `http://localhost:8006`; además responde a la
ruta `/empresa1/peliculas` (véase §4.8).

> El mock de mascotas **solo** se arranca si el puerto `8005` está libre. Si ya tienes la API demo
> real sirviendo `/mascotas`, no lo arranques (daría `EADDRINUSE`).

---

## 4. Módulo `peliculas`, paso a paso

> Los pasos GUI se hacen como **superadmin** (`superadmin@empresa1.com`), que ve *Configuración
> global*, donde viven módulos, plantillas y conexiones (son globales).

### 4.1 Qué hay en el repo

| Archivo | Papel |
| --- | --- |
| `backend/src/modules/peliculas/peliculas.controller.ts` | `GET /api/peliculas/movies` (`@Permissions('peliculas.read')`) y `GET /api/peliculas/context`. |
| `backend/src/modules/peliculas/peliculas.service.ts` | Carga la conexión (`api` + `peliculas`, producción y si no pruebas), login → consulta → logout, aplica la estrategia. |
| `backend/src/modules/peliculas/client/peliculas.client.ts` | Rutas **fijas** (`/login`, `/peliculas`, `/logout`) y sesión con `Bearer`. |
| `backend/src/modules/peliculas/processors/` | Estrategias: `default` y `empresa1` (+ `movie.util.ts`, registro). |
| `backend/src/modules/peliculas/PeliculasConnectionPlugin.ts` | Adaptador de conexión: clave `api.peliculas`, `validateSettings` y `test` (login + logout). |
| `frontend/src/modules/peliculas/` | Página, API y declaración de rutas (`/peliculas`, permiso `peliculas.read`). |
| `frontend/src/modules/registry/index.ts` | Registro del módulo en el frontend. |

No hace falta tocar ninguno: el trabajo de esta guía es **registrar y conectar**.

### 4.2 Paso 1 — Registrar el módulo en la GUI

**Configuración global → Módulos → “Nuevo módulo”**:

| Campo | Valor |
| --- | --- |
| Pantalla (path) | `/peliculas` (al elegirla se autocompletan *Módulo backend* = `peliculas` y el nombre) |
| `key` | `peliculas` (no editable después) |
| Nombre visible | `Películas` |
| Ícono | déjalo vacío o una clave de ícono existente |
| Alcance / empresa dueña | empresa (o global, como superadmin) |
| Ubicación / posición | `grid` (Home), posición p. ej. `50` |
| Operaciones | añadir **solo** `read` (el módulo solo consulta) |
| Módulo habilitado | ✔ |

Guardar. Al crear el módulo, el backend registra el permiso `peliculas.read` en el catálogo RBAC
(sin asignarlo a nadie todavía).

Después, en la misma lista, **Publicar** el módulo en la empresa de prueba (*Impulsa Ferretero*) para
que su tile aparezca en Home/FAB. El superadmin no necesita publicar: navega con el selector.

### 4.3 Paso 2 — Permiso `peliculas.read`

- **Superadmin:** ya tiene todos los permisos del catálogo → no hay que hacer nada.
- **Admin de empresa** (`admin@empresa1.com`): **Perfiles → Permisos** (ruta `/profiles`) y marcar
  `peliculas.read` en el perfil `admin`.

### 4.4 Paso 3 — Plantilla de conexión para `api`

**Configuración global → Conexiones → pestaña “Plantillas para sistemas” → “+ Nueva plantilla”**:

| Campo | Valor |
| --- | --- |
| Sistema (clave del catálogo) | `api` |
| Nombre | `API Películas` |
| Tipo de autenticación por defecto | `session` (login → token → logout) |
| Estado | Habilitada ✔ |

**Campos de settings** (“+ Agregar campo”):

| clave | etiqueta | tipo | obligatorio | opciones | valor por defecto |
| --- | --- | --- | --- | --- | --- |
| `strategy` | Estrategia | `select` | ✔ | `default, empresa1` | `default` |

**Secretos (credenciales)** (“+ Agregar secreto”):

| clave | etiqueta | obligatorio |
| --- | --- | --- |
| `username` | Usuario | ✔ |
| `password` | Contraseña | ✔ |

Guardar plantilla. (Sin al menos una plantilla **habilitada**, el botón “+ Agregar conexión” queda
deshabilitado.)

### 4.5 Paso 4 — Crear la conexión de la empresa

**Configuración global → Conexiones → pestaña “Empresas” → expandir la empresa → “+ Agregar conexión”**:

| Campo | Valor |
| --- | --- |
| Plantilla del sistema | `API Películas` (fija el sistema: `api`) |
| Nombre de la conexión | `Películas demo` (único por empresa) |
| Módulo | `peliculas` |
| URL base | `http://localhost:8005` (API demo) o `http://localhost:8006` (mock) |
| Entorno | `Producción` |
| Ajustes → Estrategia | `default` |
| Credenciales → Usuario / Contraseña | `ana` / `ana123` (API demo) o `ana` / `ana123` (mock) |

Guardar. Aparecerá un aviso recordando que hay que **probar** la conexión antes de activarla.

### 4.6 Paso 5 — Probar y activar

En la tarjeta de la conexión:

1. **Probar conexión** → la GUI llama al plugin `api.peliculas`, que hace *login* y *logout* contra
   el API externo. Debe responder **Conexión correcta**.
2. **Activar** (solo disponible tras una prueba correcta).

Reglas a tener en cuenta:

- Cambiar `baseUrl`, credenciales, entorno o `settings.strategy` **invalida** la prueba: hay que
  volver a probar y activar.
- La conexión de `Producción` es la que usa la pantalla; si no existe, el servicio cae a la de
  `Pruebas` (útil para montar el módulo sin tocar producción).

### 4.7 Paso 6 — Verificar la pantalla

1. En Home, **entrar en la empresa** *Impulsa Ferretero* (selector de empresas del superadmin) —
   o cerrar sesión y entrar como `admin@empresa1.com`.
2. Abrir el tile **Películas** (o ir a <http://localhost:5173/peliculas>).
3. Pulsar **“Consultar películas”**: aparece la lista con la estrategia usada.

Equivalente por `curl` (sin navegador):

```bash
# Login del admin de empresa (cookie jar) → cookie de sesión
curl -s -c /tmp/cj -X POST localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@empresa1.com","password":"Password123!"}' -o /dev/null -w '%{http_code}\n'   # 201

curl -s -b /tmp/cj localhost:3000/api/peliculas/movies
# {"strategy":"default","movies":[{"id":1,"title":"Matrix",...}]}
```

Pruebas negativas útiles:

```bash
# Sin conexión habilitada (empresa que no la tiene) → 400 con la ruta donde crearla
# Sin permiso `peliculas.read` → 403 en /api/peliculas/movies
# Conexión mal configurada (password errónea) → 400 "Películas Login: Usuario o contraseña incorrectos"
# API externa caída (host no responde) → 502 Bad Gateway
```

### 4.8 Paso 7 (opcional) — Segunda estrategia (`empresa1`)

Demuestra el caso real “otra empresa, otro contrato de API” **sin cambiar código**, solo la conexión:

1. Arranca el mock: `node mocks/mock-peliculas.mjs` (`:8006`); ojo, su ruta
   `/empresa1/peliculas` responde `{resultados:[{codigo,nombre,anio,genero}]}`.
2. Editar la conexión (o crear otra, en entorno `Pruebas`):
   - URL base → `http://localhost:8006/empresa1`
   - Ajustes → Estrategia → `empresa1`
3. **Probar** de nuevo y **Activar** (cambió `baseUrl` y `strategy`: la prueba anterior ya no vale).
4. Consultar la pantalla: la tabla muestra ahora **año** y **género** porque el procesador
   `empresa1` traduce ese otro formato.

Si en cambio envías el formato de `empresa1` a la estrategia `default` (o al revés), verás el error
`Formato inesperado del API: se esperaba { peliculas: [...] }` — es la señal de que estrategia y
contrato no coinciden.

---

## 5. Módulo `mascotas` paso a paso

### 5.1 Piezas que ya existen en el repo

| Pieza | Archivo |
| --- | --- |
| Servicio (una sola llamada HTTP, sin conexiones) | `backend/src/modules/mascotas/mascotas.service.ts` |
| Controller (`JwtAuthGuard` + `SuperAdminGuard`) | `backend/src/modules/mascotas/mascotas.controller.ts` |
| Botón + modal (JSON crudo) en Home de superadmin | `frontend/src/modules/home/HomePage.tsx` |

### 5.2 No se registra en la GUI (a propósito)

`mascotas` es un **módulo de sistema**, no un módulo de GUI:

- **No** tiene fila en `modules`, ni permiso `<mod>.read`, ni tile, ni ruta de registro.
- Se protege con `JwtAuthGuard` + `SuperAdminGuard`: **solo superadmin**.
- Se dispara desde el panel superadmin (bloque “Administración” de Home).
- No usa conexiones por empresa: su destino es global, `MASCOTAS_API_URL`.

Por eso, aquí **no hay pasos de registro, plantilla ni conexión**: solo servicio externo y variable.

### 5.3 Servicio externo

```bash
curl -s localhost:8005/mascotas        # API demo real (o el mock en el mismo puerto)
```

Si el puerto `8005` está libre y no tienes la API demo: `node mocks/mock-mascotas.mjs`.

### 5.4 Variable `MASCOTAS_API_URL`

| Entorno | Valor |
| --- | --- |
| Backend nativo (esta guía) | por defecto `http://localhost:8005`: **nada que configurar** |
| Todo en Docker | `docker-compose.yml` ya la fija a `http://host.docker.internal:8005` y añade `extra_hosts: host.docker.internal:host-gateway` |
| Otro endpoint | exporta `MASCOTAS_API_URL=http://mi-servicio:9000` (y `MASCOTAS_REQUEST_TIMEOUT_MS` si hace falta) |

### 5.5 Verificar (GUI + curl)

GUI: entrar como `superadmin@empresa1.com` → Home → sección **Administración** → botón
**“Consultar mascotas”** → modal con el **JSON crudo** tal como lo devuelve el servicio.

Por `curl`:

```bash
# Superadmin → 200 con el JSON
curl -s -c /tmp/ks -X POST localhost:3000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"superadmin@empresa1.com","password":"Password123!"}' -o /dev/null
curl -s -b /tmp/ks localhost:3000/api/mascotas/consultar

# Un admin de empresa → 403 (el guard es real, no solo UI)
curl -s -c /tmp/ka -X POST localhost:3000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@empresa1.com","password":"Password123!"}' -o /dev/null
curl -s -b /tmp/ka -o /dev/null -w '%{http_code}\n' localhost:3000/api/mascotas/consultar   # 403
```

---

## 6. Checklist final

| # | Comprobación | Esperado |
| --- | --- | --- |
| 1 | `curl localhost:3000/api/health` | `{"status":"ok",...}` |
| 2 | `curl -b /tmp/cj localhost:3000/api/peliculas/movies` | `{"strategy":"default","movies":[...]}` |
| 3 | Pantalla `/peliculas` con `admin@empresa1.com` | lista + badge de estrategia |
| 4 | Usuario sin `peliculas.read` | `403` |
| 5 | Empresa sin conexión | `400` con el texto *“No hay conexión de Películas habilitada…”* |
| 6 | Conexión con contraseña errónea | `400` *“Películas Login: Usuario o contraseña incorrectos”* |
| 7 | API externa caída | `502` |
| 8 | Botón “Consultar mascotas” (superadmin) | modal con JSON crudo |
| 9 | `/api/mascotas/consultar` con admin | `403` |

---

## 7. Problemas frecuentes

| Síntoma | Causa | Solución |
| --- | --- | --- |
| `Las integraciones están deshabilitadas` o la pestaña Conexiones no deja guardar | `INTEGRATIONS_ENABLED=false` | Exporta `INTEGRATIONS_ENABLED=true` (y `CREDENTIALS_KEY`) y reinicia el backend. |
| `CREDENTIALS_KEY no está configurada (32 bytes en base64)` | Falta la clave | Genera `openssl rand -base64 32` y **consérvala**. |
| `El host localhost no está permitido…` | `INTEGRATIONS_ALLOWED_HOSTS` sin ese host | Añade `localhost:8005,localhost:8006` y reinicia. |
| Botón “+ Agregar conexión” deshabilitado | No hay plantilla habilitada | Crea/habilita una plantilla en “Plantillas para sistemas”. |
| El selector **Módulo** no ofrece `peliculas` | El módulo no está registrado en la GUI | Paso 4.2. |
| `Sistema no soportado: api (módulo peliculas)` | El plugin no se registró (módulo backend no importado / servidor sin reiniciar) | `PeliculasModule` en `app.module.ts` y reinicia. |
| `settings.strategy debe ser una de: default, empresa1` | Estrategia inválida | Usa `default` o `empresa1` (y añádelas a las `options` de la plantilla). |
| `No hay conexión de Películas habilitada para esta empresa.` | Sin conexión `api`+`peliculas` habilitada | Pasos 4.5–4.6. |
| `Formato inesperado del API: se esperaba { peliculas: [...] }` | Contrato externo ≠ estrategia | Ajusta `settings.strategy` (y `baseUrl`) al formato real. |
| `La conexión de Películas no tiene usuario/contraseña configurados` | Secretos vacíos | Rellena usuario/contraseña al guardar. |
| `502` en la pantalla | El API externo no responde / host o puerto mal | Verifica `baseUrl` y que el servicio esté arriba (`curl`). |
| `403` en `/peliculas` | Falta `peliculas.read` en el perfil | Paso 4.3 (y recarga el navegador para refrescar permisos). |
| `404` en la pantalla o tile “ruta inexistente” | El `path` del módulo no está en el registro frontend | Debe ser `/peliculas` (revisa `peliculas.routes.tsx` y `registry/index.ts`). |
| El botón “Consultar mascotas” da error | Servicio de mascotas caído o `MASCOTAS_API_URL` mal | `curl $MASCOTAS_API_URL/mascotas`; revisa la variable. |
| En Docker, integraciones fallan con `403`/timeout | El egress-proxy (Squid) solo tunela HTTPS/443 | Usa HTTPS con host en la lista blanca, o corre el backend nativo para pruebas locales. |

---

## 8. Reutilizar este camino en un módulo nuevo

Al crear un módulo, decide primero **qué tipo** es:

| Pregunta | Si SÍ | Si NO |
| --- | --- | --- |
| ¿Necesita pantalla, tile y permisos propios? | Módulo **de GUI** → [MODULE-GUIDE.md](MODULE-GUIDE.md) (§4–§7) | Módulo **de sistema** → §5 de esta guía (env + guard) |
| ¿Habla con un sistema externo por empresa, con credenciales? | Sistema + **plantilla** + **plugin** (`system.module`) + conexión en la GUI → [CONNECTION-TEMPLATES-GUIDE.md](CONNECTION-TEMPLATES-GUIDE.md) | Endpoint global por variable de entorno |
| ¿Cada empresa tiene otro contrato/otra lógica? | **Estrategias** (`params` o clases) → [STRATEGY-GUIDE.md](STRATEGY-GUIDE.md) | Una sola implementación |
| ¿El contrato externo es fijo y sin configuración? | Fija las rutas en código (como `peliculas.client.ts`) | Configúralas por plantilla (como SAP) |

El resto (migrar, arrancar, probar, activar, verificar con `curl`) es idéntico a lo recorrido aquí.

---

## Referencias

- [MODULE-GUIDE.md](MODULE-GUIDE.md) — módulos de GUI; §0.4 sistemas/conexiones/estrategias; Anexo B.
- [CONECTIONS-GUIDE.md](CONECTIONS-GUIDE.md) — modelo de conexiones y resolución por `(system, module)`.
- [CONNECTION-TEMPLATES-GUIDE.md](CONNECTION-TEMPLATES-GUIDE.md) — plantillas y conexiones en la GUI.
- [STRATEGY-GUIDE.md](STRATEGY-GUIDE.md) — crear y registrar estrategias.
- [TEST-GUIDE.md](TEST-GUIDE.md) — credenciales y pruebas generales.
- Código: `backend/src/modules/peliculas/`, `backend/src/modules/mascotas/`,
  `backend/src/modules/config/connections/`, `frontend/src/modules/peliculas/`.
- *Mocks*: `mocks/mock-peliculas.mjs`, `mocks/mock-mascotas.mjs`.
