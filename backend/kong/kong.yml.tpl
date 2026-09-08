_format_version: "3.0"

services:
  - name: auth-service
    url: http://backend:3000/api/auth
    routes:
      - name: auth-route
        paths: ["/api/auth"]
        strip_path: true
    plugins:
      - name: cors
        config:
          origins: __CORS_ORIGINS__
          credentials: true
          methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]

  - name: uploads-service
    url: http://backend:3000/api/uploads
    routes:
      - name: uploads-route
        paths: ["/api/uploads"]
        strip_path: true
    plugins:
      - name: cors
        config:
          origins: __CORS_ORIGINS__
          credentials: true
          methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]

  - name: backend-service
    url: http://backend:3000/api
    routes:
      - name: backend-route
        paths: ["/api"]
        strip_path: true
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
          policy: local
      - name: correlation-id
        config:
          header_name: X-Correlation-ID
          generator: uuid
          echo_downstream: true

consumers:
  - username: pwa-frontend
    jwt_secrets:
      - key: pwa-frontend-key
        algorithm: HS256
        secret: __JWT_SECRET__