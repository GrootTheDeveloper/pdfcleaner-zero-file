# Security Policy

## Privacy Commitment

PDFCleaner is designed with a **Privacy-by-Design** model. All document cleaning, PDF compilation, image extraction, and pixel manipulation occur **strictly in the user's browser**.

- The NestJS backend control plane does not accept, store, or process files.
- Telemetry events and error reporting do not contain any file content, file names, or Personally Identifiable Information (PII).
- Local paths (e.g. `C:\Users\username\...`) are stripped from stack traces in the client before reports are sent to the server.

---

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it immediately.

Please **do not** report security vulnerabilities through public GitHub issues. Instead, use a
private GitHub security advisory for this repository or contact the maintainers directly.

Please include the following information in your report:

- A description of the vulnerability and its potential impact.
- Step-by-step instructions to reproduce the issue (including sample payloads or scripts if applicable).
- Any proposed remediation or fixes.

We will acknowledge receipt of your report as soon as possible and work with you to release a patch
in a timely manner.
