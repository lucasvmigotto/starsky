"""Settings for the sky-data caches the CLI builds (BCR-0005).

The ephemeris is gone with the Python renderer: the browser computes alt/az
itself, so the CLI only needs somewhere to cache the star catalog and the
constellation lines between runs.
"""

from pathlib import Path

from pydantic import Field as pydantic_Field

from ._base import BaseSettings_


class CatalogSettings(BaseSettings_):
    """Where the downloaded catalog artifacts live."""

    CACHE_DIR: Path = pydantic_Field(
        default=Path("/tmp/starpy-cache/catalog"),
        description="Directory holding the Hipparcos and Stellarium parquet caches.",
    )
