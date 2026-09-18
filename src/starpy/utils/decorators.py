"""Shared decorators."""

from collections.abc import Callable
from datetime import datetime as dt
from functools import wraps
from logging import Logger, getLogger

_logger: Logger = getLogger(__name__)


def timeit[**P, R](func: Callable[P, R], /) -> Callable[P, R]:
    """Log start/end of ``func`` at debug level and return its result."""

    @wraps(func)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        start: dt = dt.now()
        func_name: str = getattr(func, "__name__", type(func).__name__)
        _logger.debug(f"{func_name} started")
        result: R = func(*args, **kwargs)
        _logger.debug(f"{func_name} took: {str(dt.now() - start)}")
        return result

    return wrapper
