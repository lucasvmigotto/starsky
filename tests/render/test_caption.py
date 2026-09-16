"""Caption formatting tests (title x place matrix)."""

from starpy.render.caption import format_caption, format_coords


def test_coords_suffix_convention() -> None:
    assert format_coords(40.7580, -73.9855) == "40.7580°N, 73.9855°W"
    assert format_coords(-33.8688, 151.2093) == "33.8688°S, 151.2093°E"


def test_caption_with_title_and_place() -> None:
    lines: list[str] = format_caption(
        40.7580,
        -73.9855,
        "Times Square, New York, NY",
        "2023-01-01 00:00",
        "UTC+00:00",
        "Our Night",
    )
    assert lines[0] == "Our Night"
    assert "Times Square" in lines[1]
    assert "40.7580°N" in lines[1]


def test_caption_no_title_no_blank_line() -> None:
    for title in (None, "", "   "):
        lines: list[str] = format_caption(
            40.7580, -73.9855, "Times Square", "2023-01-01 00:00", "UTC+00:00", title
        )
        assert len(lines) == 1


def test_caption_no_place_omits_segment() -> None:
    lines: list[str] = format_caption(
        40.7580, -73.9855, None, "2023-01-01 00:00", "UTC+00:00", None
    )
    assert lines == ["40.7580°N, 73.9855°W · 2023-01-01 00:00 UTC+00:00"]
    assert "—" not in lines[0]
