"""hip_main.dat parser tests (fixed-width, no network)."""

from polars import DataFrame as pl_DataFrame

from starpy.data.catalog import parse_hip_main, parse_hip_main_line


def make_line(
    hip: int = 677,
    vmag: str = " 2.07",
    ra: str = "2.09691670",
    dec: str = "29.09043130",
) -> str:
    """Build a 450-char-ish line with fields at the CDS byte positions."""
    line: list[str] = [" "] * 100
    line[8:14] = list(f"{hip:6d}")
    line[41:46] = list(vmag[-5:])
    line[51:63] = list(f"{float(ra):12.8f}")
    line[64:76] = list(f"{float(dec):12.8f}")
    return "".join(line)


def test_parse_line_spot_values() -> None:
    parsed: tuple[int, float, float, float] | None = parse_hip_main_line(make_line())
    assert parsed is not None
    hip, ra, dec, mag = parsed
    assert hip == 677
    assert ra == 2.09691670
    assert dec == 29.09043130
    assert mag == 2.07


def test_blank_coordinates_skipped() -> None:
    line: str = make_line()
    blank: str = line[:51] + " " * 12 + line[63:64] + " " * 12 + line[76:]
    assert parse_hip_main_line(blank) is None


def test_parse_frame_skips_short_and_blank() -> None:
    text: str = "\n".join([make_line(hip=1), "short", make_line(hip=2)[:51]])
    df: pl_DataFrame = parse_hip_main(text)
    assert df.height == 1
    assert df.get_column("hip").to_list() == [1]
