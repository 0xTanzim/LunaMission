# Multi-stage Dockerfile for LunaMission
# Stage 1: Build environment
FROM oven/bun:1.2-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json bun.lock bunfig.toml ./
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/config/package.json ./packages/config/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install dependencies with frozen lockfile
RUN bun install --frozen-lockfile

# Copy application source code and data assets
COPY packages/ ./packages/
COPY apps/ ./apps/
COPY data/ ./data/

# Build Web presentation client and API calculation microservice
RUN bun --filter "@luna/web" build
RUN bun --filter "@luna/api" build

# Stage 2: NextRush API Calculation Microservice
FROM oven/bun:1.2-alpine AS api

WORKDIR /app

# Copy production runtime files
COPY --from=builder /app/package.json /app/bun.lock ./
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/data/ ./data/
COPY --from=builder /app/apps/api/dist/ ./apps/api/dist/
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/node_modules/ ./node_modules/

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

EXPOSE 3001

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

CMD ["bun", "run", "apps/api/dist/index.js"]

# Stage 3: Web Presentation Client (Nginx)
FROM nginx:1.27-alpine AS web

# Copy custom Nginx configuration
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static frontend assets
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/nginx-health || exit 1

CMD ["nginx", "-g", "daemon off;"]
