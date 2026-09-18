"""Gradio server settings."""

from typing import Any, Self

from pydantic import computed_field

from ._base import BaseSettings_


class GradioSettings(BaseSettings_):
    SERVER_NAME: str = "0.0.0.0"
    SERVER_PORT: int = 8080
    ANALYTICS_ENABLED: bool = False
    SHARE: bool = False
    DEBUG: int = 0
    ENABLE_MONITORING: bool = False
    FOOTER_LINKS: list[str] = ["gradio"]

    @computed_field
    @property
    def env(self: Self) -> dict[str, str]:
        return {
            "GRADIO_SERVER_NAME": str(self.SERVER_NAME),
            "GRADIO_SERVER_PORT": str(self.SERVER_PORT),
            "GRADIO_ANALYTICS_ENABLED": str(self.ANALYTICS_ENABLED),
            "GRADIO_SHARE": str(self.SHARE),
            "GRADIO_DEBUG": str(self.DEBUG),
        }

    @computed_field
    @property
    def config(self: Self) -> dict[str, Any]:
        return {
            "server_name": self.SERVER_NAME,
            "server_port": self.SERVER_PORT,
            "debug": self.DEBUG,
            "enable_monitoring": self.ENABLE_MONITORING,
            "footer_links": self.FOOTER_LINKS,
            "share": self.SHARE,
        }
