"""Share settings (static-viewer base URL for links)."""

from typing import Self

from pydantic import computed_field

from ._base import BaseSettings_


class ShareSettings(BaseSettings_):
    BASE_URL: str = "https://starpy.pages.dev"

    @computed_field
    @property
    def env(self: Self) -> dict[str, str]:
        return {}
