"""Enforce declarative imports: forbid `import x` / `import x as y`.

Every external name must arrive via an explicit from-import
(`from polars import DataFrame as pl_DataFrame`). Module attribute access roots
that sneak back in (pl./click./httpx./...) are also rejected.

Usage: `python scripts/check_declarative_imports.py src tests`.
Compliant by construction (uses from-imports only itself).
"""

from ast import Attribute, Import, Name, parse, walk
from pathlib import Path
from sys import argv as sys_argv
from sys import exit as sys_exit

MODULE_ATTRIBUTE_ROOTS: frozenset[str] = frozenset(
    {
        "np",
        "pl",
        "plt",
        "click",
        "httpx",
        "Image",
        "ImageDraw",
        "font_manager",
        "matplotlib",
        "json",
        "time",
        "io",
        "hashlib",
        "sys",
        "os",
        "subprocess",
        "yaml",
        "shutil",
        "respx",
        "pytest",
    }
)


def check_file(path: Path) -> list[str]:
    """Return violation messages for one Python file."""
    violations: list[str] = []
    tree: object = parse(path.read_text(encoding="utf-8"), filename=str(path))
    for node in walk(tree):
        if isinstance(node, Import):
            names: str = ", ".join(
                alias.name + (f" as {alias.asname}" if alias.asname else "")
                for alias in node.names
            )
            violations.append(f"{path}:{node.lineno}: plain import forbidden: {names}")
        elif (
            isinstance(node, Attribute)
            and isinstance(node.value, Name)
            and node.value.id in MODULE_ATTRIBUTE_ROOTS
        ):
            violations.append(
                f"{path}:{node.lineno}: module attribute access forbidden: "
                f"{node.value.id}.{node.attr}"
            )
    return violations


def main(argv: list[str]) -> int:
    """Check all given paths (files or directories); 1 on any violation."""
    roots: list[str] = argv[1:]
    if not roots:
        print("usage: check_declarative_imports.py <paths...>")
        return 2
    violations: list[str] = []
    for root in roots:
        base: Path = Path(root)
        files: list[Path] = sorted(base.rglob("*.py")) if base.is_dir() else [base]
        for path in files:
            violations.extend(check_file(path))
    for violation in violations:
        print(violation)
    return 1 if violations else 0


if __name__ == "__main__":
    sys_exit(main(sys_argv))
