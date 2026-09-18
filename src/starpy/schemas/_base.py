"""Base schema classes (immutable Pydantic models)."""

from pydantic import BaseModel, ConfigDict


class BaseSchema_(BaseModel):
    model_config = ConfigDict(
        frozen=True,
        validate_by_name=True,
        use_enum_values=True,
        extra="ignore",
    )
