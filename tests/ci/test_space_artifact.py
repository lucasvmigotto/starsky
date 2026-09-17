"""Space publish-artifact tests (hf.README.md, requirements.txt, app.py)."""

import importlib.util
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

import yaml

ROOT: Path = Path(__file__).resolve().parents[2]


def _frontmatter(path: Path) -> dict[str, Any]:
    text: str = path.read_text(encoding="utf-8")
    assert text.startswith("---")
    _, raw, _ = text.split("---", 2)
    data: dict[str, Any] = yaml.safe_load(raw)
    return data


def test_hf_readme_gradio_frontmatter() -> None:
    meta: dict[str, Any] = _frontmatter(ROOT / "hf.README.md")
    assert meta["sdk"] == "gradio"
    assert meta["app_file"] == "app.py"
    assert str(meta["python_version"]).startswith("3.14")
    assert "sdk_version" in meta
    assert meta["license"] == "gpl-3.0"


def test_github_readme_not_gradio_space() -> None:
    meta: dict[str, Any] = _frontmatter(ROOT / "README.md")
    assert meta.get("sdk") != "gradio"


def test_requirements_in_sync_with_lock() -> None:
    uv_bin: str | None = shutil.which("uv")
    if uv_bin is None:
        raise AssertionError("uv binary required for requirements sync check")
    completed: subprocess.CompletedProcess[str] = subprocess.run(
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
    spec: Any = importlib.util.spec_from_file_location("space_app", ROOT / "app.py")
    assert spec is not None and spec.loader is not None
    module: Any = importlib.util.module_from_spec(spec)
    sys.modules["space_app"] = module
    spec.loader.exec_module(module)
    assert callable(module.launch_app)
