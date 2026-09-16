"""Callback base class (mirrors mba-dsa's OnCallbackBase)."""

from abc import ABC, abstractmethod
from typing import Any, Self


class OnCallbackBase(ABC):
    @abstractmethod
    def on_btn_render_callback(self: Self, /, *args: Any, **kwargs: Any) -> Any:
        """Synchronous render entry point (overridden by subclasses)."""
        raise NotImplementedError()

    async def on_btn_render_callback_async(
        self: Self, /, *args: Any, **kwargs: Any
    ) -> Any:
        """Async wrapper so Gradio can await the callback."""
        return self.on_btn_render_callback(*args, **kwargs)
