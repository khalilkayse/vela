# Vela — Dokploy / any Node host.
# Build emits a Nitro Node server. On start, scripts/start.mjs creates the
# database from DATABASE_URL (if missing) and applies migrations/*.sql.
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
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

# Reuse the build-stage install. A second `npm ci --omit=dev` fails on this
# lockfile (ajv 6 vs 8 peer conflict) even when the full install succeeds.
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.output ./.output
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/scripts ./scripts

EXPOSE 3000
CMD ["node", "scripts/start.mjs"]
