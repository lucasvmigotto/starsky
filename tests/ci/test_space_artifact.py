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


def test_hf_readme_gradio_frontmatter() -> None:
    meta: dict[str, Any] = _frontmatter(ROOT / "hf.README.md")
    assert meta["sdk"] == "gradio"
    assert meta["app_file"] == "app.py"
    assert str(meta["python_version"]).startswith("3.14")
    # Quoted on purpose: a bare 6.27.0 parses as float 6.27 (invalid version).
    assert isinstance(meta["sdk_version"], str)
    assert meta["pinned"] is False
    assert meta["license"] == "gpl-3.0"


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
