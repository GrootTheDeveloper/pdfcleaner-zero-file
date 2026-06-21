# Architecture

PDFCleaner is a monorepo with a browser-first document processing pipeline.

## Workspaces

- `apps/web`: Next.js frontend and browser workflows.
- `apps/api`: NestJS backend control plane.
- `packages/shared`: shared types, constants, and preset configuration.
- `packages/processing-engine`: OpenCV.js processing pipeline and worker contract.

## Processing Flow

1. The user selects a PDF/image in the browser.
2. PDF.js extracts pages when needed.
3. ImageData is sent to a Web Worker.
4. OpenCV.js WebAssembly runs cleanup stages.
5. The browser reconstructs PDF/image/ZIP outputs.
6. Optional local history is saved in IndexedDB.

The backend is intentionally not in the file-processing path. It handles auth, presets, telemetry, engine limits/config, and admin endpoints.
