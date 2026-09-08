FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
RUN pnpm install

# ── dev target -- what local `docker compose up` builds (see
# agentforge-infra/docker-compose.yml's `build.target: dev`). Unchanged
# behavior from before this file gained a production target: hot reload,
# no build step, NEXT_PUBLIC_* read at container start via the environment
# block.
FROM deps AS dev
COPY . .
EXPOSE 3000
CMD ["pnpm", "dev"]

# ── builder -- compiles the production bundle. NEXT_PUBLIC_* vars must be
# present as build ARGs here (not just runtime env) because `next build`
# inlines them into the client bundle at build time, unlike `next dev`
# which reads them at server start -- getting this wrong would silently
# bake in whatever value happened to be set (or unset) at image-build
# time, the same class of bug as docker-compose.yml's formerly-hardcoded
# localhost URLs.
FROM deps AS builder
ARG NEXT_PUBLIC_CONTROL_PLANE_URL
ARG NEXT_PUBLIC_EXECUTION_PLANE_URL
ARG NEXT_PUBLIC_DEV_BEARER_TOKEN
ENV NEXT_PUBLIC_CONTROL_PLANE_URL=$NEXT_PUBLIC_CONTROL_PLANE_URL \
    NEXT_PUBLIC_EXECUTION_PLANE_URL=$NEXT_PUBLIC_EXECUTION_PLANE_URL \
    NEXT_PUBLIC_DEV_BEARER_TOKEN=$NEXT_PUBLIC_DEV_BEARER_TOKEN
COPY . .
# next.config.ts sets output: "standalone" -- produces a self-contained
# .next/standalone (pruned node_modules + a server.js entrypoint) rather
# than needing the full node_modules + `next start` CLI in the final image.
RUN mkdir -p public && pnpm build

# ── runner -- production target (see the EC2 deploy's
# docker-compose.override.yml, which sets `target: runner`). No pnpm, no
# source, no dev dependencies -- just the standalone server output.
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
