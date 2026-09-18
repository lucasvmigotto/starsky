"""UI-metadata Pydantic classes with `.dump()` -> gradio constructors."""

from abc import ABC
from collections.abc import Sequence
from typing import Any, Self

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    PositiveInt,
    computed_field,
    model_serializer,
)


class BaseGUI_(BaseModel, ABC):
    model_config = ConfigDict(
        validate_by_name=True,
        validate_by_alias=True,
        extra="ignore",
        use_enum_values=True,
    )


class BaseComponent_(BaseGUI_, ABC):
    def dump(self: Self, /, exclude: set[str] | None = None) -> dict[str, Any]:
        """Serialize to kwargs for the matching ``gradio.*`` constructor."""
        return self.model_dump(exclude_computed_fields=True, exclude=exclude)


class Label(BaseComponent_):
    emoji: str | None = None
    text: str
    titlelize: bool = True

    @computed_field
    @property
    def emoji_(self: Self, /) -> str:
        return f"{self.emoji} " if self.emoji else ""

    @computed_field
    @property
    def text_(self: Self, /) -> str:
        return self.text.title() if self.titlelize else self.text

    @computed_field
    @property
    def text_clean(self: Self, /) -> str:
        return self.text.lower().replace(" ", "-").strip()

    @computed_field
    @property
    def emoji_text(self: Self, /) -> str:
        return f"{self.emoji_}{self.text_}"

    def __str__(self: Self, /) -> str:
        return self.emoji_text

    @model_serializer(mode="plain")
    def ui_serializer(self: Self, /) -> str:
        return self.emoji_text


class Accordion(BaseComponent_):
    label: Label
    open: bool = False


class Dropdown(BaseComponent_):
    value: str | None = None
    label: Label
    multiselect: bool = False
    filterable: bool = True
    choices: Sequence[tuple[str, str]] | Sequence[str] | None = None


class Image(BaseComponent_):
    label: Label
    format: str = "png"
    image_mode: str = "RGBA"


class Button(BaseComponent_):
    label: Label

    @model_serializer(mode="plain")
    def ui_serializer(self: Self, /) -> dict[str, str]:
        return {"value": f"{self.label}"}


class MarkdownHeader(BaseComponent_):
    label: Label
    level: PositiveInt = Field(default=1, gt=0, lt=7)

    @model_serializer(mode="plain")
    def ui_serializer(self: Self, /) -> dict[str, str]:
        return {"value": f"{'#' * self.level} {self.label}"}


class Tab(BaseComponent_):
    label: Label


class DateTime(BaseComponent_):
    label: Label
    include_time: bool = True
    type: str = "datetime"


class Number(BaseComponent_):
    label: Label
    value: float | int | None = None
    minimum: float | int | None = None
    maximum: float | int | None = None


class Slider(Number):
    step: float | None = None


class Checkbox(BaseComponent_):
    label: Label
    value: bool = False


class Text(BaseComponent_):
    label: Label
    value: str | None = None


class Radio(BaseComponent_):
    label: Label
    value: str | None = None
    choices: Sequence[tuple[str, str]] | Sequence[str] | None = None
