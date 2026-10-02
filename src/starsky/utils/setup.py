"""Environment + logging setup helpers (pure, side-effecting only here)."""

from logging import Logger, basicConfig, getLogger

from ..settings import LogSettings

_logger: Logger = getLogger(__name__)


def setup_log(settings: LogSettings | None = None) -> None:
    """Configure root logging from ``LogSettings`` (defaults when None)."""
    _settings: LogSettings = settings or LogSettings()
    basicConfig(**_settings.config)
    for mod, level in _settings.SUPPRESS_MODULES:
        getLogger(mod).setLevel(level or _settings.SUPPRESS_LEVEL)
