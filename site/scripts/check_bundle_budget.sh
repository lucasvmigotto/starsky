#!/usr/bin/env bash
# Bundle and data budgets (008-site-delivery T011, contracts/delivery.md).
#
# Fails when the shipped bytes exceed budget, measured as brotli:
#   bundle (dist JS+CSS, fonts excluded) > 500 KB
#   data   (data/*.json)                 > 400 KB
#
# Fonts are excluded from the bundle by design: the poster face is a fixed
# first-party asset (BCR-0006), not code that grows with features.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUNDLE_BUDGET=$((500 * 1024))
DATA_BUDGET=$((400 * 1024))

if [ ! -d "$ROOT/dist" ]; then
  echo "FAIL: $ROOT/dist missing — run 'bun run build' first" >&2
  exit 1
fi

# Prefer the built bytes; fall back to public/ when dist/data was not emitted
# (e.g. the sky data was never exported — itself a failure, reported below).
DATA_DIR=""
if [ -d "$ROOT/dist/data" ]; then
  DATA_DIR="$ROOT/dist/data"
elif [ -d "$ROOT/public/data" ]; then
  DATA_DIR="$ROOT/public/data"
fi

if [ -z "$DATA_DIR" ] || [ -z "$(ls "$DATA_DIR"/*.json 2>/dev/null)" ]; then
  echo "FAIL: no data/*.json in dist/ or public/ — run 'starsky catalog' first" >&2
  exit 1
fi

sizes() {
  bun -e '
    const { readdirSync, readFileSync, statSync } = require("node:fs");
    const { join } = require("node:path");
    const { brotliCompressSync, constants } = require("node:zlib");
    const files = [];
    for (const dir of process.argv.slice(2)) {
      let entries = [];
      try { entries = readdirSync(dir); } catch { continue; }
      for (const e of entries) {
        const p = join(dir, e);
        try { if (statSync(p).isFile()) files.push(p); } catch {}
      }
    }
    let total = 0;
    for (const f of files) {
      total += brotliCompressSync(readFileSync(f), {
        params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
      }).length;
    }
    console.log(total);
  ' "$@"
}

bundle=$(sizes "$ROOT/dist/assets")

echo "bundle brotli: $((bundle / 1024)) KB (budget $((BUNDLE_BUDGET / 1024)) KB, fonts excluded)"

fail=0
if [ "$bundle" -gt "$BUNDLE_BUDGET" ]; then
  echo "FAIL: bundle $bundle bytes > budget $BUNDLE_BUDGET bytes" >&2
  fail=1
fi

data=0
data=$(sizes "$DATA_DIR")
echo "data brotli:   $((data / 1024)) KB (budget $((DATA_BUDGET / 1024)) KB) from $DATA_DIR"
if [ "$data" -gt "$DATA_BUDGET" ]; then
  echo "FAIL: data $data bytes > budget $DATA_BUDGET bytes" >&2
  fail=1
fi
exit "$fail"
