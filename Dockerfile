FROM node:24-alpine AS base

RUN apk add --no-cache \
    postgresql16-client \
    mysql-client \
    docker-cli \
    tar \
    gzip \
    python3 \
    make \
    g++

WORKDIR /app

# ─── Dependencies stage ─────────────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm install

# ─── Build stage ────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
ARG SENTRY_AUTH_TOKEN
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ─── Production stage ───────────────────────────────────────────────────────
FROM base AS production
WORKDIR /app

ENV NODE_ENV=production
ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000

COPY --from=builder /app/.output ./.output
COPY --from=builder /app/server/database/migrations ./server/database/migrations

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nuxt -u 1001 && \
    chown -R nuxt:nodejs /app

USER nuxt

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", ".output/server/index.mjs"]
