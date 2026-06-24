# Immagine di produzione per l'app FINANCE in monorepo pnpm.
# Va buildata dal CONTESTO della root del workspace:
#   docker build -f apps/finance/Dockerfile -t donq-finance .
FROM node:22-alpine
RUN corepack enable
WORKDIR /repo

COPY . .
RUN pnpm install --frozen-lockfile
# `prebuild` esegue il seed di data/finance.db (resta nell'immagine, letto a runtime); poi next build.
RUN pnpm --filter @donq/finance build

WORKDIR /repo/apps/finance
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["pnpm", "start"]
