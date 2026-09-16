"""Dependency-hygiene guard: starpy's core never imports pandas.

Runs in a fresh interpreter because unrelated dev-time imports (e.g. gradio,
which legitimately depends on pandas for its own widgets) may otherwise
populate ``sys.modules`` in the pytest process.
"""

import subprocess
import sys


def test_no_pandas_imported() -> None:
    code: str = (
        "import sys; "
        "import starpy.astro, starpy.data, starpy.geocoding, "
        "starpy.render, starpy.schemas, starpy.settings, starpy.cli; "
        "assert 'pandas' not in sys.modules, "
        "'pandas imported by starpy core'; "
        "print('ok')"
    )
    completed: subprocess.CompletedProcess[str] = subprocess.run(
        [sys.executable, "-c", code], capture_output=True, text=True, check=False
    )
    assert completed.returncode == 0, completed.stderr
    assert "ok" in completed.stdout
