"""Environment + logging setup helpers (pure, side-effecting only here)."""

from logging import Logger, basicConfig, getLogger
from os import environ, getenv

from ..settings import LogSettings

_logger: Logger = getLogger(__name__)


def setup_log(settings: LogSettings | None = None) -> None:
    """Configure root logging from ``LogSettings`` (defaults when None)."""
    _settings: LogSettings = settings or LogSettings()
    basicConfig(**_settings.config)
    for mod, level in _settings.SUPPRESS_MODULES:
        getLogger(mod).setLevel(level or _settings.SUPPRESS_LEVEL)


def setup_envvars(*envs: dict[str, str]) -> None:
    """Export env vars without overriding already-set values."""
    for env in envs:
        for env_key, env_value in env.items():
            if not getenv(env_key):
                environ[env_key] = env_value


def require_user_agent(user_agent: str) -> str:
    """Fail fast when the Nominatim contact User-Agent is not configured."""
    if not user_agent.strip():
        raise ValueError(
            "A descriptive Nominatim User-Agent is required "
            "(set STARSKY__GEOCODING__USER_AGENT, e.g. "
            "'starsky/0.1.0 (contact@example.com)'). "
            "See https://operations.osmfoundation.org/policies/nominatim/"
        )
    return user_agent
