"""Star density declutter: greedy brightest-kept spatial filter (pure)."""

from numpy import argsort as np_argsort
from numpy import asarray as np_asarray
from numpy import float64 as np_float64
from numpy import intp as np_intp
from numpy.typing import NDArray
from polars import DataFrame as pl_DataFrame
from scipy.spatial import cKDTree  # ty: ignore[unresolved-import]


def declutter(
    projected: pl_DataFrame,
    min_separation: float,
) -> pl_DataFrame:
    """Keep the brightest star per neighborhood, drop dimmer neighbors.

    ``projected`` needs ``x, y, mag`` (unit-disc coords). Stars are visited
    brightest-first; a star is kept only if no already-kept star lies within
    ``min_separation``. ``min_separation <= 0`` returns the input unchanged.
    Deterministic: ties broken by row order (input is mag-sorted upstream).
    """
    if min_separation <= 0.0 or projected.is_empty():
        return projected
    xs: NDArray[np_float64] = projected.get_column("x").to_numpy().astype(np_float64)
    ys: NDArray[np_float64] = projected.get_column("y").to_numpy().astype(np_float64)
    order: NDArray[np_intp] = np_argsort(
        projected.get_column("mag").to_numpy().astype(np_float64), kind="stable"
    )
    kept: list[int] = []
    kept_xy: list[tuple[float, float]] = []
    tree: cKDTree | None = None
    for idx in order.tolist():
        x: float = float(xs[idx])
        y: float = float(ys[idx])
        if tree is not None and len(kept_xy) > 0:
            dist: float = float(tree.query([x, y], k=1)[0])
            if dist < min_separation:
                continue
        kept.append(int(idx))
        kept_xy.append((x, y))
        tree = cKDTree(np_asarray(kept_xy, dtype=np_float64))
    keep_sorted: list[int] = sorted(kept)
    return projected[keep_sorted]
