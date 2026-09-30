# BCR-0009 — Rename the project from starsky to starsky

Status: accepted (2026-09-30)
Owner: you
Date: 2026-09-30

## Current behavior

The project is named `starsky` throughout: the Python package (`src/starsky/`), the
distribution name, the CLI's display name, the environment-variable prefix
(`STARSKY__*`), container and volume names (`starsky-tools`, `starsky-cache`), the
site package name (`starsky-site`), and prose across docs and specs.

The name is a portmanteau of *star* and *py*. When Python was the whole product
that fit; **it no longer does.** Since BCR-0001 and BCR-0005 removed the Gradio
app and the Python renderer, the browser is the entire application and Python is
a small CLI that builds the sky data. The name now advertises the secondary tool
as if it were the product.

## Proposed behavior

Rename the project to **`starsky`** everywhere:

| Layer | From | To |
|---|---|---|
| Python package | `src/starsky/` | `src/starsky/` |
| Distribution | `starsky` | `starsky` |
| CLI display | `starsky:` | `starsky:` |
| Env prefix | `STARSKY__*` | `STARSKY__*` |
| Containers / volumes | `starsky-tools`, `starsky-cache`, … | `starsky-*` |
| Site package | `starsky-site` | `starsky-site` |
| Repo | `lucasvmigotto/starsky` | `lucasvmigotto/starsky` — **already done by the owner** |
| Registries | `ghcr.io/…/starsky`, Docker Hub `…/starsky` | follow `github.repository`, so automatic |
| Docs and specs | prose | `starsky` |

**The env prefix changes cleanly** — no deprecated alias (owner's decision,
2026-09-30). Anyone self-hosting must update their `.env`; the migration note in
the README covers it.

## Why

The name should describe the product. `starsky` names the artifact (a sky poster)
rather than the toolchain that builds its data, and it survives the next change
of implementation language.

## Impacts

- **Users and self-hosters**: `STARSKY__*` variables stop being read. This is the
  breaking part, and the only one. Recorded in the README as a migration note.
- **The Python CLI**: `python -m starsky` replaces `python -m starsky`. Command
  behaviour is otherwise untouched.
- **GHCR / Docker Hub**: images follow `github.repository`, so the rename is
  automatic once the repo is renamed (done). The old packages remain until
  deleted by hand.
- **R2**: the bucket name comes from the `CLOUDFLARE_R2_BUCKET` secret; the
  object prefix inside it is the owner's to change, outside this repository.
- **History**: BCRs 0001–0008, `refactor.md` and `introspec.md` keep the old name
  where they describe the past. Editing them would falsify the record.

## Data migration

None. There is no database; the exported JSON and the share payload (`v1`) carry
no project name.

## Tests that will prove it

- The full existing suite passes unchanged after the rename — the rename changes
  names, not behaviour. Structurally: a Python test asserts the package imports
  as `starsky`; a site test asserts the export path is unaffected.
- `grep -r starsky` finds only the historical artifacts listed above.
- `STARSKY__CATALOG__CACHE_DIR` is honoured; `STARSKY__CATALOG__CACHE_DIR` is not.
