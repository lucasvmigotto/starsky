"""Topocentric star positions via Skyfield (vectorized, pure-ish)."""

from datetime import datetime
from typing import Any

from numpy import float64 as np_float64
from numpy.typing import NDArray
from polars import DataFrame as pl_DataFrame
from polars import Float64 as pl_Float64
from polars import Series as pl_Series


def altaz_for_stars(
    catalog: pl_DataFrame,
    lat: float,
    lon: float,
    when_utc: datetime,
    planets: Any,
    timescale: Any,
) -> pl_DataFrame:
    """Compute apparent alt/az for every catalog row.

    ``catalog`` needs ``hip, ra_deg, dec_deg, mag``. Returns the input plus
    ``alt_deg``/``az_deg`` columns. Stars below the horizon are kept here;
    projection filters them.
    """
    from skyfield.api import Star

    ra_hours: NDArray[np_float64] = (
        catalog.get_column("ra_deg").to_numpy() / 15.0
    ).astype(np_float64)
    dec_deg: NDArray[np_float64] = (
        catalog.get_column("dec_deg").to_numpy().astype(np_float64)
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
        pl_Series("alt_deg", alts, dtype=pl_Float64),
        pl_Series("az_deg", azs, dtype=pl_Float64),
    )
