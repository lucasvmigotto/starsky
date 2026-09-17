"""Hugging Face Gradio-Space entry point (publish artifact only).

The Space runs this file as ``python app.py``. The package keeps its
``src/`` layout, so we add it to ``sys.path`` here instead of installing
the project. Runtime deps come from ``requirements.txt``.

Port: HF routes to port 7860 (exposed as ``$PORT``); honor it unless the
operator explicitly set ``STARPY__GRADIO__SERVER_PORT``.
"""

from os import environ as os_environ
from pathlib import Path
from sys import path as sys_path

ROOT: Path = Path(__file__).resolve().parent
sys_path.insert(0, str(ROOT / "src"))

os_environ.setdefault("STARPY__GRADIO__SERVER_PORT", os_environ.get("PORT", "7860"))

from starpy.main import launch_app  # noqa: E402  (needs sys.path first)

if __name__ == "__main__":
    launch_app()
