FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/processing-engine/package.json ./packages/processing-engine/
RUN pnpm install --frozen-lockfile --filter @pdfcleaner/web...

FROM base AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/processing-engine/node_modules ./packages/processing-engine/node_modules
COPY . .
RUN pnpm --filter @pdfcleaner/shared build
RUN pnpm --filter @pdfcleaner/processing-engine build
RUN pnpm --filter @pdfcleaner/web build
RUN pnpm deploy --filter @pdfcleaner/web --prod /prod/web

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && addgroup -S nodejs && adduser -S pdfcleaner -G nodejs
COPY --from=builder --chown=pdfcleaner:nodejs /prod/web ./
COPY --from=builder --chown=pdfcleaner:nodejs /app/apps/web/.next ./.next
COPY --from=builder --chown=pdfcleaner:nodejs /app/apps/web/public ./public
USER pdfcleaner
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["pnpm", "start"]
