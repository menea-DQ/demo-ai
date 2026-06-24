# Immagine di produzione per l'app Next.js (output standalone).
# Build: docker build -t aurora-wiki .  (dalla root del repo)

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# --- dipendenze ---
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# --- build ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `prebuild` rigenera content/graph.json dalle pagine wiki (nessun LLM); poi next build.
RUN pnpm build

# --- runtime ---
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app
RUN addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -S nextjs

# Output standalone: server minimale + asset statici.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
