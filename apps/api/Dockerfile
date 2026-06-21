FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile --filter @pdfcleaner/api...

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY . .
RUN pnpm --filter @pdfcleaner/shared build
RUN pnpm --filter @pdfcleaner/api exec prisma generate
RUN pnpm --filter @pdfcleaner/api build
RUN pnpm deploy --filter @pdfcleaner/api --prod /prod/api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && addgroup -S nodejs && adduser -S pdfcleaner -G nodejs
COPY --from=builder --chown=pdfcleaner:nodejs /prod/api ./
COPY --from=builder --chown=pdfcleaner:nodejs /app/apps/api/prisma ./prisma
USER pdfcleaner
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:3001/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/main.js"]
