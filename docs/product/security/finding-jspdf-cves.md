# Security finding — jsPDF 3.0.4 has critical and high CVEs

Status: **fixed** — upgraded to a patched release (see *Resolution* below)
Found by: `devsecops:supply-chain`, Trivy filesystem scan, 2026-09-29
Severity: **CRITICAL** (2) and **HIGH** (3), all with a fix available

## What was found

`site/bun.lock` pinned **jsPDF 3.0.4**, which carries five advisories:

| Severity | CVE (as reported) | Issue | Fixed in |
|---|---|---|---|
| CRITICAL | CVE-2026-24133 | arbitrary allocation from crafted input | 4.0.0 |
| CRITICAL | CVE-2026-31898 | arbitrary code execution via unsanitized input in `createAnnotation` | 4.2.1 |
| HIGH | CVE-2026-24737 | arbitrary code execution via unsanitized input in the Acroform module | 4.2.0 |
| HIGH | CVE-2026-25755 | PDF object injection via `addJS` | 4.2.1 |
| HIGH | CVE-2026-25535 | denial of service via malicious GIF dimensions | 4.2.1 |

## Why it matters here

jsPDF is **shipped to the browser** — it is the PDF half of the poster export
(`site/src/lib/render/export.ts:172`, dynamically imported so it loads only when
a visitor clicks PDF). The advisories are about *crafted input* to jsPDF's
own APIs: annotation, Acroform and `addJS`. This app never calls those — it
hands jsPDF an SVG built from `render-spec.json` tokens — so the practical
exposure is low. It is still a critical dependency with a one-line fix, and the
gate's rule is to block on critical-with-fix rather than reason about reachability
in a shipped bundle.

## Resolution

Upgraded jsPDF to a patched release and verified the PDF export still works
(size, magic bytes, and the browser e2e journey). The full e2e suite covers the
export, so a regression in the upgrade would fail the run.

## Why this is worth recording

This is the first finding of the supply-chain pass and it was **not** visible
from the manifest — `^3.0.1` looked harmless. It only appeared once the
lockfile was actually scanned, which is the argument for having the gate at all.
