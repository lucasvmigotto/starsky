"""Settings env-var precedence tests."""

import os

import pytest

from starpy.settings import Settings


def test_gradio_env_precedence(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("STARPY__GRADIO__SERVER_PORT", "9090")
    settings: Settings = Settings()
    assert settings.GRADIO.SERVER_PORT == 9090
    assert settings.GRADIO.config["server_port"] == 9090


def test_nested_delimiter_geocoding(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("STARPY__GEOCODING__USER_AGENT", "starpy-test/0.1 (a@b.c)")
    settings: Settings = Settings()
    assert settings.GEOCODING.USER_AGENT == "starpy-test/0.1 (a@b.c)"


def test_defaults_without_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for key in [k for k in os.environ if k.startswith("STARPY__")]:
        monkeypatch.delenv(key, raising=False)
    settings: Settings = Settings()
    assert settings.GRADIO.SERVER_PORT == 8080
    assert settings.EPHEMERIS.BSP_NAME == "de421.bsp"


def test_gradio_env_dict_keys() -> None:
    settings: Settings = Settings()
    assert settings.GRADIO.env["GRADIO_SERVER_PORT"] == str(settings.GRADIO.SERVER_PORT)
