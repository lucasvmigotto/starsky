"""Aggregated application settings (env_prefix="STARPY__")."""

from pydantic_settings import BaseSettings, SettingsConfigDict

from .ephemeris import EphemerisSettings
from .geocoding import GeocodingSettings
from .gradio import GradioSettings
from .hf import HuggingFaceSettings
from .log import LogSettings
from .render import RenderSettings
from .share import ShareSettings


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_ignore_empty=True,
        extra="ignore",
        env_prefix="STARPY__",
        case_sensitive=False,
        env_nested_delimiter="__",
    )

    GRADIO: GradioSettings = GradioSettings()
    EPHEMERIS: EphemerisSettings = EphemerisSettings()
    GEOCODING: GeocodingSettings = GeocodingSettings()
    RENDER: RenderSettings = RenderSettings()
    SHARE: ShareSettings = ShareSettings()
    LOG: LogSettings = LogSettings()
    HF: HuggingFaceSettings = HuggingFaceSettings()
