# Build context: repository root
# Usage: docker build -f packages/backend/Dockerfile .

FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9 --activate \
    && npm install -g tsc-alias

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/

RUN pnpm install

COPY packages/shared/ packages/shared/
COPY packages/backend/ packages/backend/

RUN pnpm --filter @voca/shared build \
    && cd packages/backend \
    && npx tsc -p tsconfig.build.json \
    && npx tsc-alias -p tsconfig.build.json \
    && cp -r src/i18n/locales dist/i18n/locales

# ---- Production ----
FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/

RUN pnpm install --prod

COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/packages/backend/dist packages/backend/dist

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

WORKDIR /app/packages/backend
CMD ["node", "dist/index.js"]
