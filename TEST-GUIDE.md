# Ensayos PWA — Guía de pruebas

Estado: build backend OK, migraciones aplicadas, backend corriendo en `http://localhost:3000`,
frontend (vite) en `http://localhost:5173`.

## 1. Credenciales

| Empresa | Email | Contraseña | Rol |
| --- | --- | --- | --- |
| Impulsa Ferretero (11111111-…-1111) | `superadmin@empresa1.com` | `Password123!` | super_admin |
| Impulsa Ferretero | `admin@empresa1.com` | `Password123!` | admin |
| Impulsa Ferretero | `vendedor@empresa1.com` | `Password123!` | vendedor |
| Empresa Dos (22222222-…-2222) | `superadmin@empresa2.com` | `Password123!` | super_admin |

El frontend lista las empresas **activas** en el login (GET `/api/auth/companies`).
"Impulsa Ferretero" es el tenant principal con tema naranja `#E2602B` (migración
`1700000006000-CompanyActiveAndBranding`).

## 2. Rebuild completo (desde cero)

```bash
# 1. Infraestructura (Postgres en 5433, Redis en 6379). Docker Desktop debe estar iniciado.
"/mnt/c/Program Files/Docker/Docker/resources/bin/docker" compose up -d
# o en docker-compose.yml del repo según tu instalación.

# 2. Migraciones (solo si faltan)
cd backend
DB_HOST=127.0.0.1 DB_PORT=5433 REDIS_HOST=127.0.0.1 \
  /home/admin33/.bun/bin/bunx typeorm-ts-node-commonjs migration:run \
  --dataSource src/database/data-source.ts

# 3. Build y arranque del backend
/home/admin33/.bun/bin/bun run build
DB_HOST=127.0.0.1 DB_PORT=5433 REDIS_HOST=127.0.0.1 /home/admin33/.bun/bin/bun run start
# comprobar: curl localhost:3000/api/health

# 4. Frontend (en otra terminal)
cd ../frontend
/home/admin33/.bun/bin/bun install
/home/admin33/.bun/bin/bun run dev   # → http://localhost:5173
```

Notas de entorno (WSL):
- `npm` de Windows está roto; usar siempre `/home/admin33/.bun/bin/bun`.
- Ejecución nativa del backend requiere las variables `DB_HOST=127.0.0.1 DB_PORT=5433
  REDIS_HOST=127.0.0.1` (el `.env` usa nombres Docker). NO editar `backend/.env`.
- CORS del backend ya permite `http://localhost:5173` con cookies (WEBAUTHN_ORIGIN).
- WebAuthn requiere contexto seguro: funciona en `localhost` sin problema.

## 3. Flujo principal (rápido)

1. Abrir `http://localhost:5173`.
2. En el login elegir **Impulsa Ferretero**, entrar con
   `superadmin@empresa1.com` / `Password123!`.
3. Barra inferior: Home (métricas), Clientes, Créditos, Configuración (y Vista de Pruebas).
4. Home muestra el nombre "Impulsa Ferretero" y el color `#E2602B`.

## 4. Passkeys / dispositivos

Registro:
1. Ingresar con contraseña.
2. Perfil → "Registrar dispositivo" (nombre opcional) → el navegador pide huella/rostro/llave.
3. El dispositivo aparece en la lista. (Datos: Autorithacute…— desafío en Redis, credencial
   guardada cifrada; passkey respaldada por el navegador.)

Login con passkey:
1. Cerrar sesión. En el login escribir el email, elegir la empresa y pulsar "Iniciar con passkey".
2. Si el usuario no tiene dispositivos, se muestra un aviso (sin error 500).
3. Con dispositivo: pasa el gesto → entra directo (cookies igual que login).

Eliminar: Perfil → "Eliminar".

Comprobación técnica:
```bash
curl -s -c /tmp/cj -X POST localhost:3000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"superadmin@empresa1.com","password":"Password123!","companyId":"11111111-1111-1111-1111-111111111111"}' -o /dev/null -w '%{http_code}\n'        # 201
curl -s -b /tmp/cj -X POST localhost:3000/api/auth/passkeys/register/options -H 'Content-Type: application/json' -d '{}' -o /dev/null -w '%{http_code}\n'  # 201
curl -s -X POST localhost:3000/api/auth/passkeys/login/options -H 'Content-Type: application/json' \
  -d '{"email":"nobody@x.co","companyId":"11111111-1111-1111-1111-111111111111"}' -o /dev/null -w '%{http_code}\n'  # 201 (allowCredentials:[])
curl -s -b /tmp/cj localhost:3000/api/auth/passkeys | head -c 200   # lista de dispositivos
```
Passkey inválida devuelve 401 (no 500).

## 5. Configuración y logos (imagen, no URL)

Como `superadmin@empresa1.com`:
1. Configuración → "Mi empresa": editar nombre y color; "Elegir imagen" sube el **archivo**
   (PNG/JPG/SVG/WEBP).
2. Sección "Todas las empresas (super admin)": cada empresa activa tiene su tarjeta con
   preview del logo, nombre, color y botón "Subir logo".
3. Los archivos se guardan en `backend/uploads/logos/` con nombre
   `logo-<companyId>.<ext>`; al subir uno nuevo se borra el anterior.
4. El logo se sirve por `GET /api/uploads/logo-<id>.png` y aparece en el login y el header.

Comprobación técnica:
```bash
curl -s -b /tmp/cj -X POST localhost:3000/api/config/logo -F 'file=@/tmp/logo.png' | head -c 200
curl -s localhost:3000/api/auth/companies | grep -o '"logoUrl":"[^"]*"'
ls backend/uploads/logos/
```

## 6. Clientes y créditos (flujo completo)

1. Clientes → "Nuevo Cliente" (sin taxes/retenciones todavía); crear y ver detalle.
2. Créditos → "Nuevo" → estudio → solicitar; el estudio se aprueba en Vista de Pruebas;
   firmar → finalizar → queda en `disbursed` con folio (`IF-120ED`).
3. Vista de Pruebas dispara los callbacks (crédito aprobado, pagos, etc.).

## 7. Aislamiento multi-empresa

1. Cerrar sesión y entrar como `superadmin@empresa2.com` (Empresa Dos).
2. Clientes/Créditos vacíos; los datos de Impulsa Ferretero dan 404. No hay fuga entre tenants
   (RLS opción B + filtro por companyId).

## 8. Pendientes y plan

Pendientes actuales (fuera de este alcance):
- **Kong/gateway**: `frontend/src/shared/api/httpClient.ts` usa `http://localhost:3000/api`
  directo; cuando exista gateway devolver a `http://localhost:8000/api`. URL pública
  `GET /api/auth/companies` sirve para el selector de login.
- **Taxes / retenciones**: el flujo de clientes/creditos aún no las modela (fields ya
  hay `funds_origin` nullable; falta UI + cálculo).
- **ESLint**: script existente en `frontend/package.json` pero `eslint` no está en
  devDependencies.
- Logos de ejemplo reales (los de la prueba son PNG de 3 bytes).

Plan sugerido:
1. Una pasada E2E manual en navegador (passkey, logos) y corregir detalles de UI.
2. Subir `uploads/logos/` a storage externo/S3 en producción (hoy es filesystem local).
3. Agregar taxes/retenciones a cliente y cálculo de crédito.
4. Levantar Kong/gateway y re-apuntar baseURL; cerrar hole de CORS.
5. Lint + CI (github actions) con eslint sobre backend (eslint.config.mjs) y frontend.

## Notas de implementación (resumen técnico)

- Migración `1700000006000-CompanyActiveAndBranding`: `is_active` en companies, rename a
  "Impulsa Ferretero", color `#E2602B`, logo NULL. Ya aplicada.
- `ConfigService.findAllCompanies()` ordena activas primero y devuelve `isActive`;
  `findActiveCompanies()` alimenta el login público.
- Logos: `ConfigController` (own `/config/logo` y `/config/companies/:id/logo`) → `uploads/logos/`,
  sanitiza nombre/extensión; `UploadsController` los sirve.
- Passkeys: `AuthController` (options/verify para registro y login), desafíos en Redis
  (`webauthn:reg:<userId>`, `webauthn:login:<companyId>:<email>`, TTL 300); `deviceName`
  opcional en registro; passkey inexistente → 401.
- Node 18: `main.ts` agrega polyfill de `webcrypto` (elimina `MissingWebCrypto`).
- Frontend: `LoginPage` (empresas activas + passkey), `ProfilePage` (dispositivos),
  `ConfigPage` (logos + edición por empresa, sección super admin).