"""Component .dump() contract tests (kwargs accepted by gradio ctors)."""

from typing import Any

from gradio import (
    Accordion,
    Button,
    Checkbox,
    Dropdown,
    Image,
    Number,
    Radio,
    Slider,
    Tab,
    Textbox,
)

from starpy.gui.components import SkyPage


def test_dumps_feed_gradio_constructors() -> None:
    ui: SkyPage = SkyPage()
    assert isinstance(Radio(**ui.radio_mode.dump()), Radio)
    assert isinstance(Number(**ui.number_lat.dump()), Number)
    assert isinstance(Textbox(**ui.text_place.dump()), Textbox)
    assert isinstance(Dropdown(**ui.dropdown_projection.dump()), Dropdown)
    assert isinstance(Slider(**ui.slider_mag.dump()), Slider)
    assert isinstance(Checkbox(**ui.checkbox_glow.dump()), Checkbox)
    assert isinstance(Button(**ui.btn_render.dump()), Button)
    assert isinstance(Image(**ui.image_output.dump()), Image)
    assert isinstance(Accordion(**ui.accordion_options.dump()), Accordion)
    assert isinstance(Tab(**ui.tab_location.dump()), Tab)


def test_label_serialization() -> None:
    ui: SkyPage = SkyPage()
    dumped: dict[str, Any] = ui.number_lat.dump()
    assert dumped["minimum"] == -90.0
    assert dumped["maximum"] == 90.0
