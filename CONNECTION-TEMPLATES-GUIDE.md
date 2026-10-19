# Guía: Configurar plantillas y conexiones

Esta guía explica, paso a paso, cómo configurar **catálogo de sistemas**, **plantillas** y **conexiones** desde la GUI (superadmin). El objetivo es que una empresa pueda usar un módulo que consuma conexiones externas (como `peliculas`) sin tocar código.

## 1. Conceptos

| Concepto | Alcance | Descripción |
| --- | --- | --- |
| **Sistema (`connection_systems`)** | Global | Clave abierta (`sap`, `api`, `copilot-chat-agent`). Representa un tipo de sistema externo. El catálogo se alimenta desde la migración y puede ampliarse desde GUI. |
| **Plantilla (`connection_templates`)** | Global | Define qué campos NO secretos (`settingsFields`) y qué secretos (`secretFields`) tiene una conexión de ese sistema, más `authType` por defecto. El formulario de alta de conexión se arma desde la plantilla. |
| **Conexión (`integration_connections`)** | Por empresa | Instancia concreta: `label` (único por empresa), `system` + `module` (qué consume la conexión), `baseUrl`, `environment`, `authType`, `settings`, `credentials` (cifrados) y `enabled`. Una empresa puede tener varias conexiones (distintas por `label`). |

**Nota clave:** con el nuevo modelo, las conexiones se resuelven por `(system, module, company, environment, enabled)`. Para `peliculas`, `system = 'api'`, `module = 'peliculas'`.

## 2. Requisitos previos

- Rol **superadmin**.
- Integraciones habilitadas en servidor: `INTEGRATIONS_ENABLED=true` (y `CREDENTIALS_KEY` válido si se van a guardar credenciales).
- Para probar con un endpoint local, `INTEGRATIONS_ALLOWED_HOSTS` debe incluir el host del mock (p. ej. `localhost:8005`, `localhost:8006` o `host.docker.internal:8005`). Si el backend corre nativo sin proxy, no pasa por squid (el egress-proxy de Docker solo permite HTTPS/443).

## 3. Configurar plantilla para `api` + módulo `peliculas`

Ir a: **Configuración global → Conexiones → pestaña “Plantillas para sistemas” → “+ Nueva plantilla”**.

Crear una plantilla con:

- **Sistema:** `api` (clave del catálogo; se escribe o se elige de la lista)
- **Nombre (label):** `API Películas`
- **Tipo de autenticación por defecto:** `session` (login → token → logout)
- **Estado:** Habilitada
- **Campos de settings:** añadir el campo `strategy`

```json
{
  "key": "strategy",
  "label": "Estrategia",
  "type": "select",
  "required": true,
  "default": "default",
  "options": ["default", "empresa1"]
}
```

En la GUI ese campo se rellena así: clave `strategy`, etiqueta `Estrategia`, tipo `select`,
marcar *Obligatorio*, opciones `default, empresa1`, valor por defecto `default`.

- **secretFields:** usuario/contraseña

```json
[
  { "key": "username", "label": "Usuario", "required": true },
  { "key": "password", "label": "Contraseña", "required": true }
]
```

Guardar. La plantilla queda disponible para crear conexiones con `system = api`. Sin al menos una
plantilla **habilitada**, el botón “+ Agregar conexión” aparece deshabilitado.

## 4. Crear conexión por empresa

Ir a: **Configuración global → Conexiones → pestaña “Empresas”**. Expandir la empresa destino.

Crear conexión (“+ Agregar conexión”):

- **Plantilla del sistema:** `API Películas` (fija el `system = api`)
- **Nombre de la conexión:** `Películas demo` (único por empresa)
- **Módulo (module):** `peliculas` (el módulo frontend/consumidor registrado en la GUI)
- **URL base (baseUrl):** `http://localhost:8005` (API demo `apis-base`) · `http://localhost:8006` (mock de Películas) · `https://mi-api.empresa.com` (producción)
- **Entorno (environment):** `Producción` (o `Pruebas`)
- **Ajustes (settings):** `{"strategy": "default"}` (o `empresa1`)
- **Credenciales (credentials):** `{"username": "ana", "password": "ana123"}` (usuarios de la API demo)

## 5. Probar y activar

1. Pulsar **Probar conexión**. El backend llamará al adaptador `api.peliculas`, que hace `login` → `logout` contra el API externo. Debe responder **Conexión correcta**.
2. Si la prueba pasa, activar (**Activar**). Una conexión solo se activa tras prueba correcta.
3. Cambiar `baseUrl`, credenciales, entorno o `settings.strategy` invalida la prueba anterior → hay que probar y activar de nuevo.

> Montaje completo, con API real o *mocks* y verificación end-to-end, en
> [DESDE-CERO-GUIDE.md](DESDE-CERO-GUIDE.md).

## 6. Validación y resolución

- **Resolución del plugin:** `ConnectionPluginsRegistry.get(system, module)` primero busca `api.peliculas`; si no existe, busca `api` genérico. Para `peliculas` existe `api.peliculas`.
- **Validación de strategy:** al guardar, si hay plugin específico (`api.peliculas`), se delega a `PeliculasProcessorRegistry.validateSettings` → exige `strategy` ∈ `default, empresa1`.
- **meta() GUI:** `plugins.has(s.key)` con módulo ausente devuelve `true` si existe cualquier adaptador para ese sistema → el sistema `api` aparecerá como *testeable* (hay `api.peliculas`).
- **loadForUse:** el servicio de Películas intenta primero `production`, luego `test` (mismo módulo `peliculas`).

## 7. Errores frecuentes

| Error | Causa | Solución |
| --- | --- | --- |
| `Sistema no soportado: api (módulo peliculas)` | No se ha registrado el plugin (módulo backend no arrancado/importado). | Comprobar que `PeliculasModule` esté en `app.module.ts` y el servidor levantado sin errores. |
| `settings.strategy debe ser una de: default, empresa1` | Estrategia no permitida por plantilla/plugin. | Ajustar `settings.strategy` a un valor registrado. Añadir el key al campo `options` de la plantilla. |
| `El host ... no está permitido` | `INTEGRATIONS_ALLOWED_HOSTS` no incluye ese host/puerto. | Añadir el host (o `.dominio`) a `INTEGRATIONS_ALLOWED_HOSTS` (coma separado). |
| `La conexión de Películas no tiene usuario/contraseña configurados` | Credenciales vacíos al guardar. | Rellenar `username`/`password` en la conexión. |
| `No hay conexión de Películas habilitada para esta empresa.` | La empresa no tiene conexión `api`+`peliculas` habilitada. | Crearla en Configuración global → Conexiones (pestaña Empresas), probarla y activarla. |
| `Formato inesperado del API: se esperaba { peliculas: [...] }` | La respuesta del API no coincide con la estrategia. | Ajustar `settings.strategy` y/o `baseUrl` al contrato real del sistema. |
| HTTP 400 `Películas Login: Usuario o contraseña incorrectos` | Credenciales de la conexión no válidas en el API externo. | Corregir usuario/contraseña (en los usuarios demo: `ana/ana123`). |
| HTTP 502 `Películas ...` | El API externo no responde (host/puerto o servicio caído). | Comprobar `baseUrl` con `curl`, que el servicio esté arriba y que el host esté en la lista blanca; en Docker con proxy, usar HTTPS/443 o el backend nativo. |

## 8. Referencias

- `backend/src/modules/config/connections/*`
- `backend/src/modules/peliculas/*` (plugin + procesadores + cliente)
- `backend/src/modules/config/connections/dto/connection.dto.ts` (validación `baseUrl` http/https)
- `frontend/src/modules/global/ConnectionsManagement.tsx`, `ConnectionForm.tsx`
- [DESDE-CERO-GUIDE.md](DESDE-CERO-GUIDE.md) — recorrido completo: registro del módulo, plantilla,
  conexión, prueba, activación y verificación.
- [STRATEGY-GUIDE.md](STRATEGY-GUIDE.md) — contratos de `default` y `empresa1`.
