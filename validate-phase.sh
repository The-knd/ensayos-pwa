#!/bin/bash

# Script de validación por fases del plan PWA Multi-Empresa
# Uso: ./validate-phase.sh [fase_numero]
# Si no se especifica fase, valida todas las fases

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
BOLD='\033[1m'

PASS=0
FAIL=0
WARN=0

check_file() {
    local file=$1
    local description=$2
    if [ -f "$file" ]; then
        echo -e "  ${GREEN}✓${NC} $description"
        ((PASS++))
    else
        echo -e "  ${RED}✗${NC} $description (missing: $file)"
        ((FAIL++))
    fi
}

check_contains() {
    local file=$1
    local pattern=$2
    local description=$3
    if [ -f "$file" ] && grep -q "$pattern" "$file" 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} $description"
        ((PASS++))
    else
        echo -e "  ${RED}✗${NC} $description"
        ((FAIL++))
    fi
}

validate_phase0() {
    echo -e "\n${BOLD}=== FASE 0 - Infraestructura Docker ===${NC}"
    
    check_file "docker-compose.yml" "docker-compose.yml existe"
    check_file "backend/Dockerfile" "Backend Dockerfile existe"
    check_file "backend/.env.example" ".env.example existe"
    check_file "backend/package.json" "Backend package.json existe"
    
    if [ -f "docker-compose.yml" ]; then
        check_contains "docker-compose.yml" "postgres:16" "PostgreSQL 16 configurado"
        check_contains "docker-compose.yml" "redis:7" "Redis 7 configurado"
        check_contains "docker-compose.yml" "kong:3.6" "Kong 3.6 configurado"
        check_contains "docker-compose.yml" "pwa-backend" "Backend service configurado"
        check_contains "docker-compose.yml" "pwa-frontend" "Frontend service configurado"
        check_contains "docker-compose.yml" "healthcheck" "Healthcheck configurado"
    fi
    
    if [ -f "backend/.env.example" ]; then
        check_contains "backend/.env.example" "JWT_ACCESS_SECRET" "JWT secret configurado"
        check_contains "backend/.env.example" "DB_HOST" "DB config completa"
        check_contains "backend/.env.example" "REDIS_HOST" "Redis config completa"
    fi
    
    if [ -f "backend/package.json" ]; then
        check_contains "backend/package.json" "@nestjs/typeorm" "NestJS TypeORM instalado"
        check_contains "backend/package.json" "@nestjs/jwt" "NestJS JWT instalado"
        check_contains "backend/package.json" "passport" "Passport instalado"
        check_contains "backend/package.json" "ioredis" "Redis client instalado"
    fi
    
    check_file "backend/src/commons/config/env.validation.ts" "Env validation schema existe"
    check_file "backend/src/commons/interfaces/event-bus.interface.ts" "Event bus interface existe"
    check_file "backend/src/commons/infrastructure/in-memory-event-bus.ts" "In-memory event bus existe"
}

validate_phase1() {
    echo -e "\n${BOLD}=== FASE 1 - Modelo de datos y migraciones ===${NC}"
    
    check_file "backend/src/database/data-source.ts" "Data source configurado"
    check_file "backend/src/commons/entities/base.entity.ts" "Base entity existe"
    
    # Entidades
    check_file "backend/src/modules/config/entities/company.entity.ts" "Company entity"
    check_file "backend/src/modules/rbac/entities/permission.entity.ts" "Permission entity"
    check_file "backend/src/modules/rbac/entities/profile.entity.ts" "Profile entity"
    check_file "backend/src/modules/rbac/entities/profile-permission.entity.ts" "ProfilePermission entity"
    check_file "backend/src/modules/users/entities/user.entity.ts" "User entity"
    check_file "backend/src/modules/feature-flags/entities/feature-flag.entity.ts" "FeatureFlag entity"
    check_file "backend/src/modules/auth/entities/device.entity.ts" "Device entity"
    check_file "backend/src/modules/clients/entities/client.entity.ts" "Client entity"
    
    # Migraciones
    if [ -d "backend/src/database/migrations" ]; then
        MIGRATIONS=$(ls backend/src/database/migrations/*.ts 2>/dev/null | wc -l)
        if [ "$MIGRATIONS" -gt 0 ]; then
            echo -e "  ${GREEN}✓${NC} $MIGRATIONS migraciones encontradas"
            ((PASS++))
        else
            echo -e "  ${RED}✗${NC} No hay migraciones"
            ((FAIL++))
        fi
    else
        echo -e "  ${RED}✗${NC} Directorio de migraciones no existe"
        ((FAIL++))
    fi
    
    # Verificar.enum en entidades
    check_contains "backend/src/modules/users/entities/user.entity.ts" "enum UserStatus" "UserStatus enum definido"
    check_contains "backend/src/modules/clients/entities/client.entity.ts" "enum ClientStatus" "ClientStatus enum definido"
    check_contains "backend/src/modules/config/entities/company.entity.ts" "enum AuthStrategyType" "AuthStrategyType enum definido"
}

validate_phase2() {
    echo -e "\n${BOLD}=== FASE 2 - Núcleo transversal (commons) ===${NC}"
    
    check_file "backend/src/modules/rbac/rbac.service.ts" "RbacService existe"
    check_file "backend/src/commons/decorators/permissions.decorator.ts" "Permissions decorator"
    check_file "backend/src/commons/guards/permissions.guard.ts" "PermissionsGuard"
    check_file "backend/src/commons/guards/jwt-auth.guard.ts" "JwtAuthGuard"
    check_file "backend/src/commons/decorators/current-user.decorator.ts" "CurrentUser decorator"
    check_file "backend/src/commons/decorators/current-tenant.decorator.ts" "CurrentTenant decorator"
    check_file "backend/src/commons/interceptors/tenant-context.interceptor.ts" "TenantContextInterceptor"
    check_file "backend/src/commons/filters/http-exception.filter.ts" "HttpExceptionFilter"
    check_file "backend/src/commons/middlewares/correlation-id.middleware.ts" "CorrelationIdMiddleware"
    
    check_file "backend/src/modules/feature-flags/feature-flags.service.ts" "FeatureFlagsService"
    check_file "backend/src/modules/health/health.controller.ts" "HealthController"
    
    check_file "backend/src/main.ts" "Main bootstrap"
    check_file "backend/src/app.module.ts" "AppModule"
    
    # Verificar integración
    if [ -f "backend/src/main.ts" ]; then
        check_contains "backend/src/main.ts" "cookieParser" "Cookie parser configurado"
        check_contains "backend/src/main.ts" "enableCors" "CORS habilitado"
        check_contains "backend/src/main.ts" "setGlobalPrefix" "Global prefix /api"
    fi
}

validate_phase3() {
    echo -e "\n${BOLD}=== FASE 3 - Módulo de Autenticación ===${NC}"
    
    check_file "backend/src/modules/auth/auth.module.ts" "AuthModule"
    check_file "backend/src/modules/auth/auth.controller.ts" "AuthController"
    check_file "backend/src/modules/auth/dto/login.dto.ts" "LoginDto"
    check_file "backend/src/modules/auth/interfaces/auth-strategy.interface.ts" "AuthStrategy interface"
    check_file "backend/src/modules/auth/auth-strategy.resolver.ts" "AuthStrategyResolver"
    check_file "backend/src/modules/auth/strategies/local-auth.strategy.ts" "LocalAuthStrategy"
    check_file "backend/src/modules/auth/strategies/passkey-auth.strategy.ts" "PasskeyAuthStrategy"
    check_file "backend/src/modules/auth/strategies/jwt.strategy.ts" "JwtStrategy"
    check_file "backend/src/modules/auth/entities/refresh-token.entity.ts" "RefreshToken entity"
    check_file "backend/src/modules/auth/me.controller.ts" "MeController"
    
    if [ -f "backend/src/modules/auth/auth.controller.ts" ]; then
        check_contains "backend/src/modules/auth/auth.controller.ts" "login" "Login endpoint"
        check_contains "backend/src/modules/auth/auth.controller.ts" "refresh" "Refresh endpoint"
        check_contains "backend/src/modules/auth/auth.controller.ts" "logout" "Logout endpoint"
    fi
}

validate_phase4() {
    echo -e "\n${BOLD}=== FASE 4 - Kong ===${NC}"
    
    check_file "backend/kong/kong.yml" "Kong config"
    
    if [ -f "backend/kong/kong.yml" ]; then
        check_contains "backend/kong/kong.yml" "_format_version" "Format version definido"
        check_contains "backend/kong/kong.yml" "auth-service" "Auth service configurado"
        check_contains "backend/kong/kong.yml" "backend-service" "Backend service configurado"
        check_contains "backend/kong/kong.yml" "rate-limiting" "Rate limiting habilitado"
        check_contains "backend/kong/kong.yml" "cors" "CORS plugin"
        check_contains "backend/kong/kong.yml" "correlation-id" "Correlation ID plugin"
    fi
}

validate_phase5() {
    echo -e "\n${BOLD}=== FASE 5 - Módulos de negocio ===${NC}"
    
    # Clients
    check_file "backend/src/modules/clients/clients.module.ts" "ClientsModule"
    check_file "backend/src/modules/clients/clients.controller.ts" "ClientsController"
    check_file "backend/src/modules/clients/clients.service.ts" "ClientsService"
    check_file "backend/src/modules/clients/dto/create-client.dto.ts" "CreateClientDto"
    check_file "backend/src/modules/clients/dto/update-client.dto.ts" "UpdateClientDto"
    
    # Users
    check_file "backend/src/modules/users/users.module.ts" "UsersModule"
    check_file "backend/src/modules/users/users.controller.ts" "UsersController"
    check_file "backend/src/modules/users/users.service.ts" "UsersService"
    
    # Config
    check_file "backend/src/modules/config/config.module.ts" "ConfigModule"
    check_file "backend/src/modules/config/config.controller.ts" "ConfigController"
    check_file "backend/src/modules/config/config.service.ts" "ConfigService"
    
    # Verificar guards
    if [ -f "backend/src/modules/clients/clients.controller.ts" ]; then
        check_contains "backend/src/modules/clients/clients.controller.ts" "UseGuards" "Guards aplicados en Clients"
    fi
    if [ -f "backend/src/modules/users/users.controller.ts" ]; then
        check_contains "backend/src/modules/users/users.controller.ts" "UseGuards" "Guards aplicados en Users"
    fi
}

validate_phase6() {
    echo -e "\n${BOLD}=== FASE 6 - Frontend base y autenticación ===${NC}"
    
    check_file "frontend/package.json" "Frontend package.json"
    check_file "frontend/src/main.tsx" "Main entry"
    check_file "frontend/src/App.tsx" "App component"
    check_file "frontend/src/shared/api/httpClient.ts" "HTTP Client"
    check_file "frontend/src/modules/auth/AuthContext.tsx" "AuthContext"
    check_file "frontend/src/modules/auth/LoginPage.tsx" "LoginPage"
    check_file "frontend/src/shared/components/Can.tsx" "Can component"
    check_file "frontend/src/shared/hooks/useFeatureFlag.ts" "useFeatureFlag hook"
    check_file "frontend/src/shared/components/Header.tsx" "Header"
    check_file "frontend/src/shared/components/Footer.tsx" "Footer"
    check_file "frontend/src/shared/components/Hero.tsx" "Hero"
    
    if [ -f "frontend/src/App.tsx" ]; then
        check_contains "frontend/src/App.tsx" "BrowserRouter" "React Router configurado"
        check_contains "frontend/src/App.tsx" "AuthProvider" "AuthProvider configurado"
    fi
    
    if [ -f "frontend/src/shared/api/httpClient.ts" ]; then
        check_contains "frontend/src/shared/api/httpClient.ts" "interceptors" "Interceptor de refresh"
    fi
}

validate_phase7() {
    echo -e "\n${BOLD}=== FASE 7 - Frontend vistas de negocio ===${NC}"
    
    check_file "frontend/src/modules/clients/ClientsListPage.tsx" "ClientsListPage"
    check_file "frontend/src/modules/home/HomePage.tsx" "HomePage"
    check_file "frontend/src/modules/profile/ProfilePage.tsx" "ProfilePage"
    
    if [ -f "frontend/src/modules/clients/ClientsListPage.tsx" ]; then
        check_contains "frontend/src/modules/clients/ClientsListPage.tsx" "Can" "Permisos en ClientsList"
        check_contains "frontend/src/modules/clients/ClientsListPage.tsx" "moduleContext" "Module context usado"
    fi
}

validate_phase8() {
    echo -e "\n${BOLD}=== FASE 8 - Módulo de Créditos ===${NC}"
    
    check_file "backend/src/modules/credits/credits.module.ts" "CreditsModule"
    check_file "backend/src/modules/credits/credits.controller.ts" "CreditsController"
    check_file "backend/src/modules/credits/credits.service.ts" "CreditsService"
    check_file "backend/src/modules/credits/entities/credit.entity.ts" "Credit entity"
    check_file "backend/src/modules/credits/dto/create-credit.dto.ts" "CreateCreditDto"
}

print_summary() {
    echo -e "\n${BOLD}========================================${NC}"
    echo -e "${BOLD}         RESUMEN DE VALIDACIÓN          ${NC}"
    echo -e "${BOLD}========================================${NC}"
    echo -e "  ${GREEN}✓ Pasaron: $PASS${NC}"
    echo -e "  ${RED}✗ Fallaron: $FAIL${NC}"
    
    if [ $FAIL -eq 0 ]; then
        echo -e "\n  ${GREEN}${BOLD}¡TODAS LAS VALIDACIONES PASARON!${NC}"
    else
        echo -e "\n  ${YELLOW}Hay $FAIL validaciones pendientes${NC}"
    fi
    echo ""
}

# Main
PHASE=${1:-all}

case $PHASE in
    0|phase0|f0) validate_phase0 ;;
    1|phase1|f1) validate_phase1 ;;
    2|phase2|f2) validate_phase2 ;;
    3|phase3|f3) validate_phase3 ;;
    4|phase4|f4) validate_phase4 ;;
    5|phase5|f5) validate_phase5 ;;
    6|phase6|f6) validate_phase6 ;;
    7|phase7|f7) validate_phase7 ;;
    8|phase8|f8) validate_phase8 ;;
    all|*)
        echo -e "${BOLD}VALIDACIÓN POR FASES - PWA Multi-Empresa${NC}"
        echo "=========================================="
        validate_phase0
        validate_phase1
        validate_phase2
        validate_phase3
        validate_phase4
        validate_phase5
        validate_phase6
        validate_phase7
        validate_phase8
        ;;
esac

print_summary
