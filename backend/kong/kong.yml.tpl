_format_version: "3.0"

# Un único servicio backend. strip_path:false porque el backend ya expone
# el prefijo global "api" (app.setGlobalPrefix('api')) — Kong reenvía el
# path completo tal cual, sin reescrituras.
services:
  - name: backend-service
    url: http://backend:3000
    routes:
      # Endpoints públicos de auth, cada uno con su PROPIO bucket de rate-limit
      # (M-1): así un atacante que agota el límite de login/passkeys NO priva
      # del refresh a los usuarios legítimos (evita el DoS de sesión).
      - name: auth-login-route
        paths:
          - /api/auth/login
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

      - name: auth-companies-route
        paths:
          - /api/auth/companies
        strip_path: false
        plugins:
          - name: cors
            config:
              origins: __CORS_ORIGINS__
              credentials: true
              methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
          - name: rate-limiting
            config:
              minute: 60
              policy: redis
              fault_tolerant: false
              redis_host: redis
              redis_port: 6379
              redis_password: __REDIS_PASSWORD__

      - name: auth-refresh-route
        paths:
          - /api/auth/refresh
        strip_path: false
        plugins:
          - name: cors
            config:
              origins: __CORS_ORIGINS__
              credentials: true
              methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
          - name: rate-limiting
            config:
              minute: 60
              policy: redis
              fault_tolerant: false
              redis_host: redis
              redis_port: 6379
              redis_password: __REDIS_PASSWORD__

      - name: auth-logout-route
        paths:
          - /api/auth/logout
        strip_path: false
        plugins:
          - name: cors
            config:
              origins: __CORS_ORIGINS__
              credentials: true
              methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
          - name: rate-limiting
            config:
              minute: 60
              policy: redis
              fault_tolerant: false
              redis_host: redis
              redis_port: 6379
              redis_password: __REDIS_PASSWORD__

      - name: auth-passkeys-check-route
        paths:
          - /api/auth/passkeys/check
        strip_path: false
        plugins:
          - name: cors
            config:
              origins: __CORS_ORIGINS__
              credentials: true
              methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
          - name: rate-limiting
            config:
              minute: 20
              policy: redis
              fault_tolerant: false
              redis_host: redis
              redis_port: 6379
              redis_password: __REDIS_PASSWORD__

      - name: auth-passkeys-login-route
        paths:
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
#
# Production: el rate-limit depende de KONG_TRUSTED_IPS y KONG_REAL_IP_HEADER
# (variables de entorno del contenedor kong en docker-compose.prod.yml) para
# extraer la IP real del X-Forwarded-For que envía el reverse proxy del host.
# Sin esas variables, todos los clientes verían 127.0.0.1 como IP y
# compartirían un único contador de rate-limiting.
consumers:
  - username: pwa-frontend
    jwt_secrets:
      - key: pwa-frontend-key
        algorithm: HS256
        secret: __JWT_SECRET__