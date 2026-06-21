# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-06-19

### Added

- **Monorepo scaffolding**: Setup workspace configuration using PNPM and Turborepo.
- **Frontend Web App MVP**: Modern glassmorphism UI with Dark Mode, drag-and-drop zone, privacy banners, and PDF rendering using PDF.js.
- **Client-Side Image Processing Engine**:
  - OpenCV.js WebAssembly integration running in background Web Workers.
  - Multi-stage image cleaning pipeline (Grayscale, Gaussian/Median noise reduction, background normalization, Gamma LUT correction, contrast stretch, adaptive binarization, morphological cleanup).
  - High-fidelity color preservation mode using BGR and LAB color space background normalization.
  - Advanced Auto-Deskew algorithm with Otsu binarization and background pre-normalization to handle shadowed inputs.
- **NestJS API Control Plane**:
  - Secure JWT cookie-based session management (`/auth/register`, `/auth/login`, `/auth/me`, `/auth/logout`).
  - Personal preset CRUD operations with ownership checks and invalidation of Redis-cached public presets.
  - Performance telemetry (`POST /telemetry`) and error reporting (`POST /errors`) with local PII-path sanitization.
  - Sliding Window rate limiting using Redis transaction Sorted Sets (ZSET).
  - Admin endpoints for telemetry reports and limits configuration overrides.
- **Testing & Quality assurance**:
  - Vitest configuration and unit tests for client-side API client and Telemetry queue manager.
  - Vitest tests for OpenCV.js pipeline operations with full mocking.
  - Jest E2E tests for auth, rate limiting, telemetry, and preset management.
  - Automated Privacy Compliance Regression tests ensuring no upload libraries (`multer`/`busboy`) or file tables exist in the codebase.
- **CI/CD & Deployment**:
  - Multi-stage Dockerfiles for both `@pdfcleaner/web` and `@pdfcleaner/api` workspaces.
  - Complete production Docker Compose stack (`docker-compose.prod.yml`) running Next.js, NestJS, Postgres, and Redis.
  - GitHub Actions CI pipeline running linter, typechecks, unit tests, and builds on push/PR.
