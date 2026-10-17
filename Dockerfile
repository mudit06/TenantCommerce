# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build-time placeholders (Safe for GitHub Actions)
ENV DATABASE_URI="mongodb://127.0.0.1:27017/build_placeholder"
ENV PAYLOAD_SECRET="build-only-placeholder-secret-not-for-production"
ENV ENCRYPTION_KEY="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
ENV ENCRYPTION_SALT="AAAAAAAAAAAAAAAAAAAAAA=="



# Sentry DSN baked into build
ENV NEXT_PUBLIC_SENTRY_DSN="https://650aaf0372fb3c59f137954fc0bd23ea@o4512271472590848.ingest.de.sentry.io/4512271472853072"
ENV SENTRY_DSN="https://650aaf0372fb3c59f137954fc0bd23ea@o4512271472590848.ingest.de.sentry.io/4512271472853072"

# Sentry Build Arguments
ARG SENTRY_AUTH_TOKEN
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN
ARG SENTRY_RELEASE
ENV SENTRY_RELEASE=$SENTRY_RELEASE


RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

RUN mkdir -p /app/.next/cache && chown -R nextjs:nodejs /app/.next
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]