_format_version: "3.0"

# Un único servicio backend. strip_path:false porque el backend ya expone
# el prefijo global "api" (app.setGlobalPrefix('api')) — Kong reenvía el
# path completo tal cual, sin reescrituras.
services:
  - name: backend-service
    url: http://backend:3000
    routes:
      # Endpoints de auth que deben ser accesibles SIN token (login, listar
      # empresas, refresh de cookie, logout, chequeo/login de passkeys).
      - name: auth-public-route
        paths:
          - /api/auth/login
          - /api/auth/companies
          - /api/auth/refresh
          - /api/auth/logout
          - /api/auth/passkeys/check
          - /api/auth/passkeys/login
        strip_path: false
        plugins:
          - name: cors
            config:
              origins: __CORS_ORIGINS__
              credentials: true
              methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
          - name: rate-limiting
            config:
              minute: 10
              policy: redis
              # Falla cerrado: si Redis no responde, se bloquea el login en vez
              # de dejarlo sin límite.
              fault_tolerant: false
              redis_host: redis
              redis_port: 6379
              redis_password: __REDIS_PASSWORD__

      # Archivos servidos públicamente (logos de empresa, etc.).
      - name: uploads-route
        paths:
          - /api/uploads
        strip_path: false
        plugins:
          - name: cors
            config:
              origins: __CORS_ORIGINS__
              credentials: true
              methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]

      # Healthcheck de infraestructura (docker/orquestador). Regex exacta para
      # que NO matchee /api/health/secure, que sí requiere JWT.
      - name: health-public-route
        paths:
          - "~/api/health$"
        strip_path: false
        plugins:
          - name: cors
            config:
              origins: __CORS_ORIGINS__
              credentials: true
              methods: ["GET", "OPTIONS"]

      # Todo lo demás bajo /api requiere JWT válido en la cookie access_token.
      # Esto incluye /api/auth/passkeys/register|list|:id (no matchean el
      # prefijo público de arriba) y /api/health/secure.
      - name: api-route
        paths:
          - /api
        strip_path: false
        plugins:
          - name: jwt
            config:
              claims_to_verify: ["exp"]
              cookie_names: ["access_token"]
          - name: cors
            config:
              origins: __CORS_ORIGINS__
              credentials: true
              methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
          - name: rate-limiting
            config:
              minute: 100
              policy: redis
              # Tolerante: un problema pasajero de Redis no debe tumbar toda la API.
              fault_tolerant: true
              redis_host: redis
              redis_port: 6379
              redis_password: __REDIS_PASSWORD__
          - name: correlation-id
            config:
              header_name: X-Correlation-ID
              generator: uuid
              echo_downstream: true

# El JWT de Kong es defensa en profundidad: valida firma + exp en el gateway
# antes de reenviar al backend, que mantiene sus propios JwtAuthGuard/RBAC.
consumers:
  - username: pwa-frontend
    jwt_secrets:
      - key: pwa-frontend-key
        algorithm: HS256
        secret: __JWT_SECRET__
