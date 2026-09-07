# Vela — Dokploy / any Node host.
# Build emits a Nitro Node server. On start, scripts/start.mjs creates the
# database from DATABASE_URL (if missing) and applies migrations/*.sql.
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ENV NITRO_PRESET=node-server
ENV VITE_AUTH_ENABLED=true
RUN node scripts/with-app-env.mjs vite build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NITRO_PRESET=node-server

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/.output ./.output
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/scripts ./scripts

EXPOSE 3000
CMD ["node", "scripts/start.mjs"]
