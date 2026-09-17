"""Space publish-artifact tests (hf.README.md, requirements.txt, app.py)."""

from importlib.util import module_from_spec as importlib_util_module_from_spec
from importlib.util import (
    spec_from_file_location as importlib_util_spec_from_file_location,
)
from pathlib import Path
from shutil import which as shutil_which
from subprocess import CompletedProcess as subprocess_CompletedProcess
from subprocess import run as subprocess_run
from sys import modules as sys_modules
from typing import Any

from yaml import safe_load as yaml_safe_load

ROOT: Path = Path(__file__).resolve().parents[2]


def _frontmatter(path: Path) -> dict[str, Any]:
    text: str = path.read_text(encoding="utf-8")
    assert text.startswith("---")
    _, raw, _ = text.split("---", 2)
    data: dict[str, Any] = yaml_safe_load(raw)
    return data


def _version_tuple(raw: str) -> tuple[int, ...]:
    return tuple(int(part) for part in str(raw).strip().split(".") if part.isdigit())


def test_hf_readme_gradio_frontmatter() -> None:
    meta: dict[str, Any] = _frontmatter(ROOT / "hf.README.md")
    assert meta["sdk"] == "gradio"
    assert meta["app_file"] == "app.py"
    assert str(meta["python_version"]).startswith("3.14")
    # Quoted on purpose: a bare 6.27.0 parses as float 6.27 (invalid version).
    assert isinstance(meta["sdk_version"], str)
    assert meta["pinned"] is False
    assert meta["license"] == "gpl-3.0"


def test_space_python_satisfies_requires_python() -> None:
    """The Space builder silently falls back to 3.10 for unknown versions.

    Requesting a `python_version` below our `requires-python` floor (or one
    the builder has no image for) fails late and confusingly (e.g. pip
    resolving 3.13-only pins on 3.10). Fail here instead, at PR time.
    """
    from tomllib import load as tomllib_load

    with open(ROOT / "pyproject.toml", "rb") as handle:
        project: dict[str, Any] = tomllib_load(handle)["project"]
    spec: str = str(project["requires-python"]).strip()
    assert spec.startswith(">=")
    floor: tuple[int, ...] = _version_tuple(spec[len(">=") :])
    meta: dict[str, Any] = _frontmatter(ROOT / "hf.README.md")
    requested: tuple[int, ...] = _version_tuple(str(meta["python_version"]))
    assert requested >= floor, f"Space python {requested} below floor {floor}"


def test_github_readme_has_no_hf_frontmatter() -> None:
    """GitHub does not parse HF metadata headers: README.md must not have one."""
    text: str = (ROOT / "README.md").read_text(encoding="utf-8")
    assert not text.startswith("---")
    assert "sdk:" not in text


def test_requirements_in_sync_with_lock() -> None:
    uv_bin: str | None = shutil_which("uv")
    if uv_bin is None:
        raise AssertionError("uv binary required for requirements sync check")
    completed: subprocess_CompletedProcess[str] = subprocess_run(
        [uv_bin, "export", "--frozen", "--no-dev", "--no-emit-project", "--no-hashes"],
        capture_output=True,
        text=True,
        cwd=ROOT,
        check=False,
    )
    assert completed.returncode == 0, completed.stderr
    expected: str = (ROOT / "requirements.txt").read_text(encoding="utf-8")

    def _body(text: str) -> list[str]:
        return [line for line in text.splitlines() if not line.startswith("#")]

    assert _body(completed.stdout) == _body(expected)


def test_app_entrypoint_imports_without_launching() -> None:
    spec: Any = importlib_util_spec_from_file_location("space_app", ROOT / "app.py")
    assert spec is not None and spec.loader is not None
    module: Any = importlib_util_module_from_spec(spec)
    sys_modules["space_app"] = module
    spec.loader.exec_module(module)
    assert callable(module.launch_app)


def test_publish_script_tree_shape(tmp_path: Path) -> None:
    """Run scripts/publish_space.sh into a local bare repo: minimal tree only.

    The Space must receive exactly the artifact the builder needs
    (README.md, app.py, requirements.txt, src/) and nothing else: the Hub
    rejects binary files, and tests/workflows/scripts/static_site have no
    business in the Space repo.
    """
    from os import environ as os_environ

    work: Path = tmp_path / "work"
    remote: Path = tmp_path / "remote.git"
    work.mkdir()
    subprocess_run(["git", "init", "-q", "-b", "main", str(work)], check=True)
    # Both identities local: CI runners have no global git identity.
    subprocess_run(["git", "-C", str(work), "config", "user.email", "t@t"], check=True)
    subprocess_run(["git", "-C", str(work), "config", "user.name", "t"], check=True)
    for name in ("hf.README.md", "README.md", "app.py", "requirements.txt"):
        (work / name).write_bytes((ROOT / name).read_bytes())
    # Artifact payload the Space builder actually needs (via the src/ shim).
    src_dir: Path = work / "src" / "starpy"
    src_dir.mkdir(parents=True)
    (src_dir / "__init__.py").write_text('"""Fixture package."""\n', encoding="utf-8")
    # Decoys mirroring the real repo: none of these may reach the Space.
    # The PNG carries real magic bytes: the Hub rejects binary files outright.
    banner: Path = work / "static_site" / "public" / "og-banner.png"
    banner.parent.mkdir(parents=True)
    banner.write_bytes(bytes.fromhex("89504e470d0a1a0a") + b"decoy")
    workflows_dir: Path = work / ".github" / "workflows"
    workflows_dir.mkdir(parents=True)
    (workflows_dir / "ci.yml").write_text("decoy: true\n", encoding="utf-8")
    scripts_dir: Path = work / "scripts"
    scripts_dir.mkdir()
    (scripts_dir / "publish_space.sh").write_bytes(
        (ROOT / "scripts" / "publish_space.sh").read_bytes()
    )
    subprocess_run(["git", "-C", str(work), "add", "-A"], check=True)
    subprocess_run(["git", "-C", str(work), "commit", "-qm", "base"], check=True)
    subprocess_run(
        ["git", "init", "--bare", "-q", "-b", "main", str(remote)], check=True
    )
    env: dict[str, str] = {
        "PATH": os_environ["PATH"],
        "HF_TOKEN": "dummy",
        "SPACE_REMOTE": str(remote),
        "GITHUB_SHA": "abc1234",
    }
    completed: subprocess_CompletedProcess[str] = subprocess_run(
        ["bash", str(ROOT / "scripts" / "publish_space.sh"), "example.com/x/y"],
        capture_output=True,
        text=True,
        cwd=work,
        env=env,
        check=False,
    )
    assert completed.returncode == 0, completed.stderr
    show: subprocess_CompletedProcess[str] = subprocess_run(
        ["git", "--git-dir", str(remote), "show", "HEAD:README.md"],
        capture_output=True,
        text=True,
        check=True,
    )
    assert show.stdout.startswith("---")
    assert "sdk: gradio" in show.stdout
    tree: subprocess_CompletedProcess[str] = subprocess_run(
        ["git", "--git-dir", str(remote), "ls-tree", "-r", "--name-only", "HEAD"],
        capture_output=True,
        text=True,
        check=True,
    )
    names: list[str] = tree.stdout.splitlines()
    assert "README.md" in names
    assert "hf.README.md" not in names
    assert "app.py" in names and "requirements.txt" in names
    assert "src/starpy/__init__.py" in names
    for decoy in (
        "static_site/public/og-banner.png",
        ".github/workflows/ci.yml",
        "scripts/publish_space.sh",
    ):
        assert decoy not in names, decoy
    assert len(names) == 4, names
