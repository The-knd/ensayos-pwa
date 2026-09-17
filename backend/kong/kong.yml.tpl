_format_version: "3.0"

# Healthchecks activo (cada 5s hacia /api/health) + pasivo (circuit
# breaker sobre 5xx/429): con un único target quita/recupera backend del
# balanceo automáticamente.
upstreams:
  - name: backend
    healthchecks:
      active:
        type: http
        concurrency: 10
        timeout: 3
        http_path: /api/health
        healthy:
          interval: 5
          http_statuses: [200, 202, 404]
          successes: 2
        unhealthy:
          interval: 5
          http_statuses: [410, 429, 500, 502, 503, 504]
          tcp_failures: 2
          http_failures: 2
          timeouts: 2
      passive:
        type: http
        healthy:
          successes: 2
          http_statuses: [200, 202, 404]
        unhealthy:
          http_statuses: [429, 500, 502, 503, 504]
          tcp_failures: 1
          http_failures: 1
          timeouts: 1
      threshold: 0
    targets:
      - target: backend:3000
        weight: 100

# Un único servicio backend. strip_path:false porque el backend ya expone
# el prefijo global "api" (app.setGlobalPrefix('api')) — Kong reenvía el
# path completo tal cual, sin reescrituras. host apunta al upstream "backend".
services:
  - name: backend-service
    protocol: http
    host: backend
    port: 3000
    path: /
    # Timeouts defensivos (ISO 27001 / OWASP A04): el gateway no debe quedar
    # colgado si el backend se bloquea; 3 reintentos por request.
    retries: 3
    connect_timeout: 5000
    write_timeout: 10000
    read_timeout: 10000
    routes:
      # Endpoints públicos de auth, cada uno con su PROPIO bucket de rate-limit
      # (M-1): así un atacante que agota el límite de login/passkeys NO priva
      # del refresh a los usuarios legítimos (evita el DoS de sesión). El
      # methods[] explícito hace que OPTIONS (preflight) nunca consuma el
      # bucket ni golpee el backend.
      - name: auth-login-route
        paths:
          - /api/auth/login
        strip_path: false
        methods: [POST, OPTIONS]
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
              redis:
                host: redis
                port: 6379
                password: __REDIS_PASSWORD__

      - name: auth-companies-route
        paths:
          - /api/auth/companies
        strip_path: false
        methods: [GET, POST, OPTIONS]
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
              redis:
                host: redis
                port: 6379
                password: __REDIS_PASSWORD__

      - name: auth-refresh-route
        paths:
          - /api/auth/refresh
        strip_path: false
        methods: [POST, OPTIONS]
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
              redis:
                host: redis
                port: 6379
                password: __REDIS_PASSWORD__

      - name: auth-logout-route
        paths:
          - /api/auth/logout
        strip_path: false
        methods: [POST, OPTIONS]
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
              redis:
                host: redis
                port: 6379
                password: __REDIS_PASSWORD__

      - name: auth-passkeys-check-route
        paths:
          - /api/auth/passkeys/check
        strip_path: false
        methods: [POST, OPTIONS]
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
              redis:
                host: redis
                port: 6379
                password: __REDIS_PASSWORD__

      - name: auth-passkeys-login-route
        paths:
          - /api/auth/passkeys/login
        strip_path: false
        methods: [POST, OPTIONS]
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
              redis:
                host: redis
                port: 6379
                password: __REDIS_PASSWORD__

      # Archivos servidos públicamente (logos de empresa, etc.) — solo GET.
      - name: uploads-route
        paths:
          - /api/uploads
        strip_path: false
        methods: [GET, HEAD, OPTIONS]
        plugins:
          - name: cors
            config:
              origins: __CORS_ORIGINS__
              credentials: true
              methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]

      # Healthchecks de infraestructura (docker/orquestador). Regex exacta
      # para que NO matcheen /api/health/secure, que sí requiere JWT.
      - name: health-live-route
        paths:
          - "~/api/health/live$"
        strip_path: false
        methods: [GET, HEAD, OPTIONS]
        plugins:
          - name: cors
            config:
              origins: __CORS_ORIGINS__
              credentials: true
              methods: ["GET", "HEAD", "OPTIONS"]

      - name: health-ready-route
        paths:
          - "~/api/health/ready$"
        strip_path: false
        methods: [GET, HEAD, OPTIONS]
        plugins:
          - name: cors
            config:
              origins: __CORS_ORIGINS__
              credentials: true
              methods: ["GET", "HEAD", "OPTIONS"]

      - name: health-public-route
        paths:
          - "~/api/health$"
        strip_path: false
        methods: [GET, HEAD, OPTIONS]
        plugins:
          - name: cors
            config:
              origins: __CORS_ORIGINS__
              credentials: true
              methods: ["GET", "HEAD", "OPTIONS"]

      # Métricas Prometheus: acceso RESTRINGIDO por key-auth. NO lleva JWT:
      # lo consume Prometheus (y la persona que tenga la API key), no el
      # navegador. Sin fingerprint aquí; el límite de body está en api-route.
      - name: metrics-route
        paths:
          - /api/metrics
        strip_path: false
        methods: [GET, HEAD, OPTIONS]
        plugins:
          - name: cors
            config:
              origins: __CORS_ORIGINS__
              credentials: true
              methods: ["GET", "HEAD", "OPTIONS"]
          - name: key-auth
            config:
              key_names: [apikey]
              key_in_header: true
              key_in_query: false
              hide_credentials: true
          - name: rate-limiting
            config:
              minute: 60
              policy: redis
              fault_tolerant: true
              redis:
                host: redis
                port: 6379
                password: __REDIS_PASSWORD__

      # Todo lo demás bajo /api requiere JWT válido en la cookie access_token.
      # Esto incluye /api/auth/passkeys/register|list|:id (no matchean el
      # prefijo público de arriba) y /api/health/secure. Solo métodos con
      # sentido: sin CONNECT/etc.
      - name: api-route
        paths:
          - /api
        strip_path: false
        methods: [GET, POST, PATCH, PUT, DELETE, HEAD, OPTIONS]
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
              redis:
                host: redis
                port: 6379
                password: __REDIS_PASSWORD__
          # Límite de payload: el mayor body legítimo es el upload de logo
          # (máx 5MB backend) → 6MB a nivel gateway como tope.
          - name: request-size-limiting
            config:
              allowed_payload_size: 6
              size_unit: megabytes
              require_content_length: false
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
  # Consumidor dedicado solo para /api/metrics (key-auth). La API key se
  # inyecta desde el .env raíz (KONG_METRICS_API_KEY) vía start.sh.
  - username: pwa-monitoring
    keyauth_credentials:
      - key: __METRICS_API_KEY__