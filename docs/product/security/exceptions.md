# Security exceptions

Every accepted risk, with an owner and an expiry. An **expired** entry fails the
build, so these cannot rot silently (`devsecops:supply-chain`).

Format: one section per exception, using the finding's own id.

## How to add one

1. Add a section below with the finding id, why it is accepted, who owns it and
   a date by which it must be revisited.
2. Reference it from the scanner config (`SECURITY_EXCEPTIONS` in
   `.github/workflows/security.yml`) so the gate stops failing on it.
3. Remind the owner before the expiry — an exception is a loan, not a waiver.

## Active exceptions

_None._ Trivy reports no critical or high vulnerabilities with a fix available
as of 2026-09-29 (the jsPDF cluster was fixed by upgrading to 4.2.1 — see
`docs/product/security/finding-jspdf-cves.md`).
