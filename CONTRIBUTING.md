# Contributing to PDFCleaner

Thank you for taking the time to contribute.

PDFCleaner is a privacy-first project. The most important rule is that user PDF files,
page images, OCR text, and document content must stay out of the backend.

## Monorepo Overview

This repository uses pnpm workspaces and Turborepo:

- `apps/web`: Next.js frontend UI.
- `apps/api`: NestJS API control plane.
- `packages/shared`: shared types, constants, and preset configuration.
- `packages/processing-engine`: OpenCV.js processing pipeline and Web Worker contract.

## Getting Started

```bash
git clone https://github.com/your-username/PDFCleaner.git
cd PDFCleaner
pnpm install
cp .env.example .env
pnpm docker:up
pnpm db:generate
pnpm db:migrate
pnpm dev
```

## Development Checks

Run these before opening a pull request:

```bash
pnpm lint
pnpm typecheck
pnpm test:ci
pnpm build
```

You can also run the full local gate:

```bash
pnpm release:check
```

API e2e tests need PostgreSQL and Redis:

```bash
pnpm docker:up
pnpm test:e2e
```

## Code Style

- Use TypeScript for application and package code.
- Keep React stateful workflows in hooks or focused components.
- Prefer shared types from `packages/shared` for cross-package contracts.
- Run `pnpm format` when making broad formatting changes.
- Keep comments short and useful.

## Privacy Requirements

Do not add:

- Backend upload routes.
- Server-side document storage.
- File content, OCR text, filenames, or page images in telemetry payloads.
- Cloud storage dependencies for user documents.

Privacy regression tests live in `apps/api/test/privacy.e2e-spec.ts`.

## Pull Request Checklist

- Dependencies install successfully with `pnpm install`.
- Lint, typecheck, test, and build pass.
- New behavior has tests where practical.
- Privacy expectations are preserved.
- Documentation is updated when setup, scripts, environment variables, or behavior change.
