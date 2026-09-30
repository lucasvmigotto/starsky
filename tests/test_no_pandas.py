"""Dependency-hygiene guard: starsky's core never imports pandas.

Runs in a fresh interpreter so unrelated dev-time imports cannot populate
``sys.modules`` in the pytest process first.
"""

from subprocess import CompletedProcess as subprocess_CompletedProcess
from subprocess import run as subprocess_run
from sys import executable as sys_executable


def test_no_pandas_imported() -> None:
    code: str = (
        "import sys; "
        "import starsky.data, starsky.settings, starsky.cli; "
        "assert 'pandas' not in sys.modules, "
        "'pandas imported by starsky core'; "
        "print('ok')"
    )
    completed: subprocess_CompletedProcess[str] = subprocess_run(
        [sys_executable, "-c", code], capture_output=True, text=True, check=False
    )
    assert completed.returncode == 0, completed.stderr
    assert "ok" in completed.stdout
