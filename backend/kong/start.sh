#!/bin/sh
set -e

: "${JWT_ACCESS_SECRET:?JWT_ACCESS_SECRET no definido (ponlo en el .env raiz del proyecto)}"
: "${KONG_CORS_ORIGINS:?KONG_CORS_ORIGINS no definido}"
: "${REDIS_PASSWORD:?REDIS_PASSWORD no definido (ponlo en el .env raiz del proyecto)}"

sed "s|__JWT_SECRET__|${JWT_ACCESS_SECRET}|g" /kong/kong.yml.tpl > /kong/kong.yml
sed -i "s|__CORS_ORIGINS__|${KONG_CORS_ORIGINS}|g" /kong/kong.yml
sed -i "s|__REDIS_PASSWORD__|${REDIS_PASSWORD}|g" /kong/kong.yml

exec /docker-entrypoint.sh kong start