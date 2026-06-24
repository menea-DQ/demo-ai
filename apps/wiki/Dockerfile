# Immagine di produzione per l'app WIKI in monorepo pnpm.
# Va buildata dal CONTESTO della root del workspace (per risolvere @donq/security):
#   docker build -f apps/wiki/Dockerfile -t donq-wiki .
FROM node:22-alpine
RUN corepack enable
WORKDIR /repo

# Workspace completo (il .dockerignore esclude node_modules/.next/segreti).
COPY . .
RUN pnpm install --frozen-lockfile
# `prebuild` rigenera content/graph.json dalle pagine wiki (nessun LLM); poi next build.
RUN pnpm --filter @donq/wiki build

WORKDIR /repo/apps/wiki
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["pnpm", "start"]
