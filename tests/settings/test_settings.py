"""Settings env-var precedence tests."""

from os import environ as os_environ

from pytest import MonkeyPatch as pytest_MonkeyPatch

from starpy.settings import Settings


def test_gradio_env_precedence(monkeypatch: pytest_MonkeyPatch) -> None:
    monkeypatch.setenv("STARPY__GRADIO__SERVER_PORT", "9090")
    settings: Settings = Settings()
    assert settings.GRADIO.SERVER_PORT == 9090
    assert settings.GRADIO.config["server_port"] == 9090


def test_nested_delimiter_geocoding(monkeypatch: pytest_MonkeyPatch) -> None:
    monkeypatch.setenv("STARPY__GEOCODING__USER_AGENT", "starpy-test/0.1 (a@b.c)")
    settings: Settings = Settings()
    assert settings.GEOCODING.USER_AGENT == "starpy-test/0.1 (a@b.c)"


def test_defaults_without_env(monkeypatch: pytest_MonkeyPatch) -> None:
    for key in [k for k in os_environ if k.startswith("STARPY__")]:
        monkeypatch.delenv(key, raising=False)
    settings: Settings = Settings()
    assert settings.GRADIO.SERVER_PORT == 8080
    assert settings.EPHEMERIS.BSP_NAME == "de421.bsp"


def test_gradio_env_dict_keys() -> None:
    settings: Settings = Settings()
    assert settings.GRADIO.env["GRADIO_SERVER_PORT"] == str(settings.GRADIO.SERVER_PORT)
