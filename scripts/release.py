#!/usr/bin/env python3
"""Plan and prepare a release from Conventional Commits.

Reads the commits since the last plain SemVer tag (X.Y.Z, no "v") and
decides whether they warrant a release:

  feat                          -> minor
  fix, perf, refactor           -> patch
  "type!:" or a BREAKING CHANGE -> major
  anything else (docs, chore, ci, test, style, build, revert, ...) -> none

Merge-commit subjects and "chore(release): ..." commits are ignored (the
commits a merge brings in are counted on their own).

It then bumps, in place, every version carrier that still matches its tagged
version, by the repo-wide bump of the commits since the tag:

  - site/package.json ("version" — the footer prints it via __APP_VERSION__)
  - pyproject.toml (project.version — the release workflow tags from it)
  - uv.lock (the starsky stanza — CI syncs --frozen, so it must match)

and CHANGELOG.md: a "## Unreleased" section is renamed to
"## X.Y.Z — YYYY-MM-DD" (hand-written notes win, nothing is added);
otherwise a section is generated from the commits.

A carrier already changed by hand since the tag is left alone.

With no previous tag, the release is --initial (default 0.1.0) if there is
at least one releasable commit.

Usage (run from the repository root):
  scripts/release.py [--dry-run] [--date YYYY-MM-DD] [--initial X.Y.Z]
  scripts/release.py --notes [X.Y.Z]

Output and exit codes:
  default    writes the files; prints the new version alone on stdout,
             the plan on stderr; exit 0
  --dry-run  prints the plan (version, file bumps, changelog section) on
             stdout, writes nothing; exit 0
  --notes    prints one release's CHANGELOG section body (default: the
             newest version heading) for the GitHub Release; exit 0
  exit 3     no release needed (nothing releasable since the last tag)
  exit 1     error (not a git repository, malformed files, ...)
  exit 2     bad arguments
"""

import argparse
import datetime
import json
import os
import re
import subprocess
import sys

NO_RELEASE = 3
RANK = {"none": 0, "patch": 1, "minor": 2, "major": 3}
TYPE_BUMP = {"feat": "minor", "fix": "patch", "perf": "patch", "refactor": "patch"}
HEADER_RE = re.compile(
    r"^(?P<type>[a-z]+)(?:\((?P<scope>[^)]*)\))?(?P<bang>!)?: (?P<desc>.+)$"
)
BREAKING_RE = re.compile(r"^BREAKING[ -]CHANGE: *(?P<text>.+)$", re.M)
TAG_RE = re.compile(r"^\d+\.\d+\.\d+$")
SEP_FIELD, SEP_RECORD = "\x1f", "\x1e"


class ReleaseError(Exception):
    pass


def git(*args):
    result = subprocess.run(["git", *args], capture_output=True, text=True)
    if result.returncode != 0:
        raise ReleaseError(f"git {' '.join(args)}: {result.stderr.strip()}")
    return result.stdout


def parse_version(text):
    return tuple(int(part) for part in text.split("."))


def bump_version(version, bump):
    major, minor, patch = parse_version(version)
    if bump == "major":
        return f"{major + 1}.0.0"
    if bump == "minor":
        return f"{major}.{minor + 1}.0"
    if bump == "patch":
        return f"{major}.{minor}.{patch + 1}"
    return version


def last_tag():
    tags = [
        t for t in git("tag", "--list", "--merged", "HEAD").split() if TAG_RE.match(t)
    ]
    return max(tags, key=parse_version) if tags else None


def commits(since):
    """Releasable-or-not commits in since..HEAD (all history if since is None)."""
    rev = f"{since}..HEAD" if since else "HEAD"
    fmt = SEP_FIELD.join(["%H", "%P", "%s", "%b"]) + SEP_RECORD
    out = git("log", "--no-color", f"--format={fmt}", rev)
    result = []
    for record in out.split(SEP_RECORD):
        record = record.strip("\n")
        if not record:
            continue
        sha, parents, subject, body = (record.split(SEP_FIELD) + [""] * 4)[:4]
        if len(parents.split()) > 1:  # merge commit: its subject doesn't count
            continue
        if subject.startswith("chore(release):"):
            continue
        result.append(classify(sha, subject, body))
    return result


def classify(sha, subject, body):
    match = HEADER_RE.match(subject)
    commit = {
        "sha": sha,
        "subject": subject,
        "type": None,
        "scope": None,
        "desc": subject,
        "breaking": None,
        "bump": "none",
    }
    if not match:
        return commit
    commit.update(type=match["type"], scope=match["scope"], desc=match["desc"])
    footer = BREAKING_RE.search(body)
    if match["bang"] or footer:
        commit["breaking"] = footer["text"].strip() if footer else match["desc"]
        commit["bump"] = "major"
    else:
        commit["bump"] = TYPE_BUMP.get(match["type"], "none")
    return commit


def max_bump(items):
    return max((c["bump"] for c in items), key=RANK.get, default="none")


def repo_root():
    return os.path.realpath(git("rev-parse", "--show-toplevel").strip())


def read_version(path, pattern, group=1):
    """Current version in a carrier file, or None when the file is missing."""
    if not os.path.isfile(path):
        return None
    with open(path) as f:
        text = f.read()
    match = re.search(pattern, text)
    if not match:
        raise ReleaseError(f"{os.path.relpath(path)}: no version field to bump")
    return match[group]


def tagged_version(path, tag, pattern, group=1):
    """The carrier's version at the tag, or None when absent there."""
    rel = os.path.relpath(path)
    try:
        text = git("show", f"{tag}:{rel}")
    except ReleaseError:
        return None
    match = re.search(pattern, text)
    return match[group] if match else None


# The version carriers, each with a pattern matching exactly one occurrence.
# site/package.json feeds the footer (__APP_VERSION__); pyproject.toml is what
# the release workflow tags from; the uv.lock starsky stanza must match
# pyproject or CI's `uv sync --frozen` fails.
PACKAGE_JSON_RE = r'"version"\s*:\s*"([^"]+)"'
PYPROJECT_RE = r"(?m)^version\s*=\s*\"([^\"]+)\""
UV_LOCK_RE = r'\[\[package\]\]\nname = "starsky"\nversion = "([^"]+)"'


def version_files(root):
    return [
        {
            "path": os.path.join(root, "site", "package.json"),
            "pattern": PACKAGE_JSON_RE,
        },
        {"path": os.path.join(root, "pyproject.toml"), "pattern": PYPROJECT_RE},
        {"path": os.path.join(root, "uv.lock"), "pattern": UV_LOCK_RE},
    ]


def plan_versions(root, tag, bump, version):
    plans = []
    for entry in version_files(root):
        path, pattern = entry["path"], entry["pattern"]
        rel = os.path.relpath(path, root)
        current = read_version(path, pattern)
        if current is None:
            raise ReleaseError(f"{rel}: carrier file missing")
        if tag is not None:
            tagged = tagged_version(path, tag, pattern)
            if tagged is not None and tagged != current:
                continue  # already bumped by hand since the tag
        if current == version:
            continue  # already at the release version
        plans.append(
            {
                "path": path,
                "rel": rel,
                "pattern": pattern,
                "from": current,
                "to": version,
                "bump": bump,
            }
        )
    return plans


def apply_version(path, pattern, version):
    with open(path) as f:
        text = f.read()
    match = re.search(pattern, text)
    if not match:
        raise ReleaseError(f"{os.path.relpath(path)}: no version field to bump")
    start, end = match.span(1)
    with open(path, "w") as f:
        f.write(text[:start] + version + text[end:])


def generated_section(version, date, items):
    groups = [
        ("Breaking", [c for c in items if c["breaking"]]),
        ("Added", [c for c in items if not c["breaking"] and c["type"] == "feat"]),
        ("Fixed", [c for c in items if not c["breaking"] and c["type"] == "fix"]),
        (
            "Changed",
            [
                c
                for c in items
                if not c["breaking"] and c["type"] in ("perf", "refactor")
            ],
        ),
    ]
    lines = [f"## {version} — {date}", ""]
    for title, group in groups:
        if not group:
            continue
        lines += [f"### {title}", ""]
        for c in group:
            text = c["breaking"] if title == "Breaking" else c["desc"]
            lines.append(f"- **{c['scope']}:** {text}" if c["scope"] else f"- {text}")
        lines.append("")
    return "\n".join(lines)


def updated_changelog(text, version, date, items):
    heading = f"## {version} — {date}"
    lines = text.split("\n")
    for i, line in enumerate(lines):
        if line.strip() == "## Unreleased":
            lines[i] = heading
            return "\n".join(lines), "renamed ## Unreleased"
    section = generated_section(version, date, items)
    for i, line in enumerate(lines):
        if line.startswith("## "):
            return "\n".join(
                lines[:i] + section.split("\n") + lines[i:]
            ), "generated from commits"
    body = text.rstrip("\n")
    return (
        body + "\n\n" if body else "# Changelog\n\n"
    ) + section, "generated from commits"


def section_of(text, version=None):
    lines = text.split("\n")
    start = None
    for i, line in enumerate(lines):
        match = re.match(r"^## (\d+\.\d+\.\d+)\b", line)
        if match and (version is None or match[1] == version):
            start = i
            break
    if start is None:
        raise ReleaseError(
            f"CHANGELOG.md has no section for {version or 'any version'}"
        )
    end = next(
        (j for j in range(start + 1, len(lines)) if lines[j].startswith("## ")),
        len(lines),
    )
    return "\n".join(lines[start + 1 : end]).strip("\n") + "\n"


def validate_carriers(root):
    """Every carrier parses and all three agree — a release must never ship
    split versions."""
    versions = {}
    for entry in version_files(root):
        rel = os.path.relpath(entry["path"], root)
        current = read_version(entry["path"], entry["pattern"])
        if current is None:
            raise ReleaseError(f"{rel}: carrier file missing")
        versions[rel] = current
    if rel == "site/package.json":
        try:
            with open(os.path.join(root, "site", "package.json")) as f:
                json.load(f)
        except ValueError as e:
            raise ReleaseError(f"site/package.json is not valid JSON ({e})") from e
    if len(set(versions.values())) != 1:
        detail = ", ".join(f"{k}={v}" for k, v in sorted(versions.items()))
        raise ReleaseError(f"version carriers disagree: {detail}")
    return next(iter(versions.values()))


def main(argv):
    parser = argparse.ArgumentParser(
        description="Plan and prepare a release from Conventional Commits."
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="print the plan, write nothing"
    )
    parser.add_argument(
        "--notes",
        nargs="?",
        const="",
        metavar="X.Y.Z",
        help="print a release's CHANGELOG section (default: the newest)",
    )
    parser.add_argument("--date", help="release date, YYYY-MM-DD (default: today, UTC)")
    parser.add_argument(
        "--initial", default="0.1.0", help="version when no tag exists (default 0.1.0)"
    )
    args = parser.parse_args(argv)
    if not TAG_RE.match(args.initial):
        parser.error("--initial must be X.Y.Z")
    if args.date and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", args.date):
        parser.error("--date must be YYYY-MM-DD")

    root = repo_root()
    changelog = os.path.join(root, "CHANGELOG.md")

    if args.notes is not None:
        with open(changelog) as f:
            sys.stdout.write(section_of(f.read(), args.notes or None))
        return 0

    validate_carriers(root)
    tag = last_tag()
    items = commits(tag)
    bump = max_bump(items)
    if bump == "none":
        print(
            "no release needed: no feat, fix, perf, refactor or breaking"
            f" commits since {tag or 'the start'}",
            file=sys.stderr,
        )
        return NO_RELEASE
    version = bump_version(tag, bump) if tag else args.initial
    if tag is None:
        # Without a tag --initial is the whole versioning policy; refusing to
        # plan a downgrade when the carriers are already past it (the release
        # workflow always passes --initial explicitly, so this only fires on
        # a bare manual invocation).
        above = [
            v
            for v in (
                read_version(e["path"], e["pattern"]) for e in version_files(root)
            )
            if v is not None and parse_version(v) > parse_version(version)
        ]
        if above:
            raise ReleaseError(
                f"carriers already above --initial {version}; pass --initial explicitly"
            )
    date = args.date or datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%d")
    plans = plan_versions(root, tag, bump, version)

    text = open(changelog).read() if os.path.exists(changelog) else ""
    new_changelog, how = updated_changelog(text, version, date, items)

    plan = [
        f"release {version} ({bump}, since {tag or 'the start'})",
        *(f"{p['rel']}: {p['from']} -> {p['to']} ({p['bump']})" for p in plans),
        f"CHANGELOG.md: {how}",
    ]
    if args.dry_run:
        print("\n".join(plan))
        print()
        print(f"## {version} — {date}")
        print()
        print(section_of(new_changelog, version), end="")
        return 0

    for p in plans:
        apply_version(p["path"], p["pattern"], p["to"])
    with open(changelog, "w") as f:
        f.write(new_changelog)
    print("\n".join(plan), file=sys.stderr)
    print(version)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except ReleaseError as e:
        print(f"release.py: error: {e}", file=sys.stderr)
        sys.exit(1)
