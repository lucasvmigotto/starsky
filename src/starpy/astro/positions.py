"""Topocentric star positions via Skyfield (vectorized, pure-ish)."""

from datetime import datetime
from typing import Any

import numpy as np
import polars as pl
from numpy.typing import NDArray


def altaz_for_stars(
    catalog: pl.DataFrame,
    lat: float,
    lon: float,
    when_utc: datetime,
    planets: Any,
    timescale: Any,
) -> pl.DataFrame:
    """Compute apparent alt/az for every catalog row.

    ``catalog`` needs ``hip, ra_deg, dec_deg, mag``. Returns the input plus
    ``alt_deg``/``az_deg`` columns. Stars below the horizon are kept here;
    projection filters them.
    """
    from skyfield.api import Star

    ra_hours: NDArray[np.float64] = (
        catalog.get_column("ra_deg").to_numpy() / 15.0
    ).astype(np.float64)
    dec_deg: NDArray[np.float64] = (
        catalog.get_column("dec_deg").to_numpy().astype(np.float64)
    )
    stars: list[Any] = [
        Star(ra_hours=ra, dec_degrees=dec)
        for ra, dec in zip(ra_hours, dec_deg, strict=True)
    ]
    earth: Any = planets["earth"]
    observer: Any = earth + __import__("skyfield.api", fromlist=["wgs84"]).wgs84.latlon(
        lat, lon
    )
    moment: Any = timescale.from_datetime(when_utc)
    alts: list[float] = []
    azs: list[float] = []
    for star in stars:
        apparent: Any = observer.at(moment).observe(star).apparent()
        alt: Any
        az: Any
        alt, az, _ = apparent.altaz()
        alts.append(float(alt.degrees))
        azs.append(float(az.degrees))
    return catalog.with_columns(
        pl.Series("alt_deg", alts, dtype=pl.Float64),
        pl.Series("az_deg", azs, dtype=pl.Float64),
    )
