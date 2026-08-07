# Konkuwan Herbs — single production image.
#
# Mirrors the Cloudflare deployment: one process serving the SPA and the API on
# the same origin, so there is no CORS to configure and VITE_API_URL stays as a
# relative /api. Cloudflare remains the primary target; this image exists for
# self-hosting and for production-like local testing.
 
# ── Stage 1: build the SPA ──────────────────────────────────────────────────
FROM node:22-alpine AS client-build
WORKDIR /build/client
 
# VITE_* values are compiled INTO the bundle, so they are build arguments and
# not runtime environment variables. The anon key is designed to be public
# (Supabase enforces access with RLS and the JWT), but the URL is still required
# at build time — vite-plugin-headers derives the Content-Security-Policy from
# it and fails the build if it is missing.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL=/api
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_API_URL=$VITE_API_URL
 
# Copy manifests first so the dependency layer is reused when only source changes.
COPY client/package*.json ./
RUN npm ci
 
COPY client/ ./
RUN npm run build
 
# ── Stage 2: server dependencies ────────────────────────────────────────────
FROM node:22-alpine AS server-deps
WORKDIR /build/server
COPY server/package*.json ./
# --omit=dev leaves out eslint, jest, nodemon and supertest.
RUN npm ci --omit=dev && npm cache clean --force
 
# ── Stage 3: runtime ────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
 
# dumb-init reaps zombies and forwards SIGTERM to node, so the graceful
# shutdown in server/src/server.js actually runs on `docker stop`.
RUN apk add --no-cache dumb-init
 
ENV NODE_ENV=production \
    PORT=8080
 
WORKDIR /app
 
# node:alpine ships a `node` user (uid 1000). Running as root inside a container
# means a container escape starts as root on the host.
COPY --chown=node:node --from=server-deps /build/server/node_modules ./server/node_modules
COPY --chown=node:node server/package*.json ./server/
COPY --chown=node:node server/src ./server/src
COPY --chown=node:node --from=client-build /build/client/dist ./client/dist
 
USER node
 
EXPOSE 8080
 
# The health endpoint is unauthenticated and touches no database, so it reports
# "the process is up and routing" without depending on Supabase being reachable.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
 
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server/src/server.js"]