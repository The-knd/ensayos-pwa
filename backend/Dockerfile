# =========================================================
# Build stage
# =========================================================
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache python3 make g++ \
    && npm ci \
    && npm rebuild bcrypt --build-from-source
COPY . .
RUN npm run build

# =========================================================
# Production stage
# =========================================================
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache python3 make g++ \
    && npm ci --omit=dev \
    && npm rebuild bcrypt --build-from-source \
    && apk del python3 make g++
COPY --from=builder /app/dist ./dist
RUN chown -R node:node /app \
    && chmod -R o-w /app
USER node
EXPOSE 3000
CMD ["node", "dist/main"]

# =========================================================
# Development stage (default)
# =========================================================
FROM node:20-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache python3 make g++ \
    && npm ci \
    && npm rebuild bcrypt --build-from-source
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start:dev"]