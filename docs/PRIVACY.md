# Privacy Model

PDFCleaner is designed around a zero-file backend.

## What stays in the browser

- Uploaded PDF/image files
- Extracted page images
- Processed/cleaned image data
- Reconstructed output files
- Local document history stored in IndexedDB

## What may reach the API

Only non-file control-plane data is sent to the backend:

- Authentication requests
- Saved preset metadata/configuration
- Anonymous telemetry if the user has not opted out
- Sanitized error reports
- Admin configuration requests

The API does not expose file upload endpoints and does not store document files, page images, OCR text, or file contents.
