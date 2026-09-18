"""Hugging Face / data-cache home settings."""

from pathlib import Path
from typing import Self

from pydantic import DirectoryPath, computed_field

from ._base import BaseSettings_


class HuggingFaceSettings(BaseSettings_):
    HOME: DirectoryPath = Path("/tmp/starpy-cache/hf")

    @computed_field
    @property
    def env(self: Self) -> dict[str, str]:
        return {
            "HF_HOME": str(self.HOME),
        }
