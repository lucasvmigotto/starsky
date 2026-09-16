"""Logging settings."""

from typing import Any, Self

from pydantic import computed_field

from ._base import BaseSettings_


class LogSettings(BaseSettings_):
    LEVEL: str = "INFO"
    DATE_FORMAT: str = "%Y-%m-%d %H:%M:%S"
    FORMAT: str = "{asctime} {levelname} {name}.{funcName}.{lineno}: {message}"
    STYLE: str = "{"

    SUPPRESS_MODULES: set[tuple[str, str | None]] = {
        ("httpcore", None),
        ("httpx", None),
        ("filelock", None),
        ("fsspec", None),
        ("asyncio", None),
        ("PIL", None),
        ("matplotlib", None),
    }
    SUPPRESS_LEVEL: str = "ERROR"

    @computed_field
    @property
    def config(self: Self) -> dict[str, Any]:
        return {
            "level": self.LEVEL,
            "datefmt": self.DATE_FORMAT,
            "format": self.FORMAT,
            "style": self.STYLE,
        }
