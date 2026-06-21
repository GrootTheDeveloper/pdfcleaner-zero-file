# Deployment Guide

PDFCleaner can run as a browser-first app with an optional API, or as the full stack: Next.js, NestJS, PostgreSQL, and Redis.

## Required Production Environment

Use `.env.production.example` as the reference. Never commit real production secrets.

Required values:

- `NEXT_PUBLIC_API_URL`
- `CORS_ORIGIN`
- `DATABASE_URL`
- `POSTGRES_PASSWORD`
- `JWT_SECRET`

## Docker Compose Production

```bash
cp .env.production.example .env.production
# Edit .env.production with real values
set -a && source .env.production && set +a
docker-compose -f docker-compose.prod.yml up -d --build
```

On Windows PowerShell, set variables with `$env:NAME = "value"` or use your deployment platform's secret manager.

## Database Migrations

The API container runs `prisma migrate deploy` before starting. For managed environments, you can also run:

```bash
pnpm db:deploy
```

## Health Checks

- Web: `GET /`
- API: `GET /api/v1/health`

## Production Notes

- Swagger is disabled in production unless `ENABLE_SWAGGER=true`.
- `JWT_SECRET` is required in production.
- `ALLOW_FIRST_USER_ADMIN` should normally be `false` in production.
- Configure TLS and reverse proxy headers at your platform/proxy layer.
