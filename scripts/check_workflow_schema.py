#!/usr/bin/env python3
"""Fail a workflow file that Actions would reject before creating a job.

The bug this exists for: `.github/workflows/static_r2.yml` shipped a bare
`with:` under its `setup-uv` step — a key with a null value. GitHub requires
`with:` to be a *mapping*, so the file failed validation at pre-dispatch. The
signature is unlike any ordinary failure: the run is created, then dies in 0s
with **zero check runs and zero jobs**, and the run page says only "This run
likely failed because of a workflow file issue." Nothing in the logs points at
the line. It stayed red on every push from 2026-09-30 to 2026-10-01, and cost
real time to diagnose: the failing check suite exposed no check run, so there
was no annotation to read and no step to blame.

So these are the checks whose failure mode is *invisible from the run*:

- an empty `with:` / `env:` mapping — the one that bit us
- a tab used for indentation
- a `uses:` not pinned to a full 40-character commit SHA

The last is a policy rather than a parse error, but it belongs in the same
place: a supply-chain pin is a property of the file, and one script that reads
all the workflows once is a better home for it than a reviewer's eye.

**Deliberately not checked: duplicate keys.** It needs real mapping scope, and a
line scanner gets that wrong — sequence items are siblings of their own
children, so a naive indentation stack reports every `- name:` in a file as a
collision. A duplicate key also *does* surface: Actions reports a YAML parse
error naming the line, which is exactly the diagnosability this script exists to
restore elsewhere. Narrow and correct beats broad and noisy; a guard that cries
wolf gets deleted.

**Standard library only, deliberately.** This runs under `uv run` in CI, where
dependencies are installed with `--frozen`; adding a YAML library to lint a file
that is not Python source would mean regenerating the lockfile. Its sibling
`check_declarative_imports.py` is stdlib-only for the same reason.

Scope: a line scanner, not a YAML parser. It reads block mappings, block
sequences, comments and scalars — the subset a workflow is written in. Anything
it cannot interpret is skipped rather than guessed at.

Run: uv run python scripts/check_workflow_schema.py
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WORKFLOWS = ROOT / ".github" / "workflows"

SHA = re.compile(r"^[0-9a-f]{40}$")
USES = re.compile(r"^(?P<action>[^@\s]+)@(?P<ref>.+)$")
LOCAL_ACTION = re.compile(r"^\./")
KEY = re.compile(
    r"""^(?P<indent>\s*)"""
    r"""(?P<key>"[^"]+"|'[^']+'|[^\s:#][^:]*?)"""
    r"""\s*:(?:\s+(?P<value>.*))?$"""
)


class Line:
    """One significant line: where it is, how deep, what key it opens."""

    __slots__ = ("number", "indent", "key", "value", "is_item")

    def __init__(
        self, number: int, indent: int, key: str, value: str | None, is_item: bool
    ) -> None:
        self.number = number
        self.indent = indent
        self.key = key
        self.value = value
        self.is_item = is_item

    @property
    def opens_container(self) -> bool:
        return self.value is None


def _unquote(key: str) -> str:
    return key[1:-1] if len(key) > 1 and key[0] == key[-1] == '"' else key


def _scalar(value: str | None) -> str | None:
    """The value, or None when the key opens a block. Drops trailing comments."""
    if value is None:
        return None
    value = value.strip()
    if value == "" or value.startswith("#"):
        return None
    if not (value.startswith('"') or value.startswith("'")):
        value = re.split(r"\s+#", value, maxsplit=1)[0].strip()
    return value or None


def scan(path: Path) -> tuple[list[Line], list[str]]:
    """Significant lines, plus lexical problems (tabs) found on the way."""
    lines: list[Line] = []
    tabs: list[str] = []

    for number, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if "\t" in raw:
            tabs.append(
                f"line {number}: tab character (YAML forbids tabs for indentation)"
            )
            continue  # Unparseable indentation; do not compound the noise.

        stripped = raw.strip()
        if stripped == "" or stripped.startswith("#"):
            continue

        item = re.match(r"^(?P<indent>\s*)-(?:\s+(?P<rest>.*))?$", raw)
        if item is not None:
            # A sequence entry: its keys sit two columns in from the dash.
            indent = len(item.group("indent")) + 2
            rest = (item.group("rest") or "").strip()
            match = KEY.match(" " * indent + rest) if rest else None
            if match is not None:
                lines.append(
                    Line(
                        number,
                        indent,
                        _unquote(match.group("key")),
                        _scalar(match.group("value")),
                        True,
                    )
                )
            continue

        match = KEY.match(raw)
        if match is not None:
            lines.append(
                Line(
                    number,
                    len(match.group("indent")),
                    _unquote(match.group("key")),
                    _scalar(match.group("value")),
                    False,
                )
            )

    return lines, tabs


def empty_mappings(lines: list[Line]) -> list[str]:
    """`with:`/`env:` with no child. A null value fails before any job exists."""
    problems: list[str] = []
    for index, line in enumerate(lines):
        if line.key not in ("with", "env") or not line.opens_container:
            continue
        # Only the *next* significant line decides this: a block's first child
        # always follows it directly. Scanning further is wrong — some later,
        # deeper block elsewhere in the file would make every container in it
        # look populated, which is how this check passed the very file it
        # exists to catch.
        following = lines[index + 1 : index + 2]
        if following and following[0].indent > line.indent:
            continue
        problems.append(
            f"line {line.number}: `{line.key}:` is empty — Actions needs a "
            f"mapping here, and a null value fails before any job is created"
        )
    return problems


def unpinned_uses(lines: list[Line]) -> list[str]:
    """A `uses:` not pinned to a full commit SHA. Local paths are exempt."""
    problems: list[str] = []
    for line in lines:
        if line.key != "uses" or line.value is None:
            continue
        if LOCAL_ACTION.match(line.value):
            continue
        match = USES.match(line.value)
        if match is None:
            problems.append(
                f"line {line.number}: not a usable action reference: {line.value}"
            )
        elif not SHA.match(match.group("ref")):
            problems.append(
                f"line {line.number}: action not pinned to a 40-char commit SHA: "
                f"{match.group('action')}@{match.group('ref')}"
            )
    return problems


def check(path: Path) -> list[str]:
    lines, problems = scan(path)
    problems = problems + empty_mappings(lines) + unpinned_uses(lines)
    return sorted(set(problems), key=lambda text: int(re.match(r"line (\d+)", text).group(1)))


def main() -> int:
    files = sorted(WORKFLOWS.glob("*.yml")) + sorted(WORKFLOWS.glob("*.yaml"))
    if not files:
        print(f"no workflow files under {WORKFLOWS}")
        return 1

    failed = False
    for path in files:
        problems = check(path)
        if not problems:
            continue
        failed = True
        print(f"{path.relative_to(ROOT)}:")
        for problem in problems:
            print(f"  {problem}")

    if failed:
        print(
            "\nFAIL: a workflow would be rejected before dispatch, or is not "
            "supply-chain pinned.\nThese fail at pre-dispatch, so the symptom is "
            "a 0s run with zero jobs and no log line to follow. See the module "
            "docstring."
        )
        return 1

    print(f"ok: {len(files)} workflow files pass the pre-dispatch schema checks")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
