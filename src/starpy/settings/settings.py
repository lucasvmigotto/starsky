"""Aggregated application settings (env_prefix="STARPY__")."""

from pydantic_settings import BaseSettings, SettingsConfigDict

from .catalog import CatalogSettings
from .log import LogSettings


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_ignore_empty=True,
        extra="ignore",
        env_prefix="STARPY__",
        case_sensitive=False,
        env_nested_delimiter="__",
    )

    CATALOG: CatalogSettings = CatalogSettings()
    LOG: LogSettings = LogSettings()
