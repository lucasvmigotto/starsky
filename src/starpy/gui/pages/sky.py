"""Sky page builder: pure function wiring UI metadata to callbacks."""

from collections.abc import Callable
from typing import Any

from gradio import (
    Accordion,
    Blocks,
    Button,
    Checkbox,
    DateTime,
    Dropdown,
    Image,
    Markdown,
    Number,
    Radio,
    Row,
    Slider,
    Tab,
    Textbox,
)

from ..components.sky import SkyPage

FOOTER: str = (
    "© OpenStreetMap contributors · Geocoding by Nominatim · "
    "Stars: Hipparcos (ESA) · Constellations: Stellarium IAU (CC BY-SA 4.0)"
)


def build_sky(
    ui: SkyPage,
    /,
    on_render: Callable[..., Any],
    on_detect_tz: Callable[..., Any],
    on_geocode_preview: Callable[..., Any],
) -> Callable[[Blocks], Blocks]:
    """Build the star-map tab; returns a function mounting it onto ``Blocks``."""

    def _build(app: Blocks) -> Blocks:
        with Tab(**ui.tab_location.dump()):
            Markdown(**ui.md_title.dump())
            mode: Radio = Radio(**ui.radio_mode.dump())
            with Row():
                lat: Number = Number(**ui.number_lat.dump())
                lon: Number = Number(**ui.number_lon.dump())
            place: Textbox = Textbox(**ui.text_place.dump())
            resolved: Textbox = Textbox(**ui.text_resolved.dump(exclude={"value"}))
            with Row():
                when: DateTime = DateTime(**ui.datetime_when.dump())
                tz_name: Textbox = Textbox(**ui.text_tz.dump())
            detect_tz: Button = Button(**ui.btn_detect_tz.dump())
            with Accordion(**ui.accordion_options.dump()):
                projection: Dropdown = Dropdown(**ui.dropdown_projection.dump())
                fisheye_strength: Slider = Slider(**ui.slider_fisheye.dump())
                min_separation: Slider = Slider(**ui.slider_separation.dump())
                magnitude_limit: Slider = Slider(**ui.slider_mag.dump())
                with Row():
                    glow: Checkbox = Checkbox(**ui.checkbox_glow.dump())
                    glow_intensity: Slider = Slider(**ui.slider_glow_intensity.dump())
                with Row():
                    constellations: Checkbox = Checkbox(**ui.checkbox_const.dump())
                    constellation_labels: Checkbox = Checkbox(
                        **ui.checkbox_const_labels.dump()
                    )
                shape: Radio = Radio(**ui.radio_shape.dump())
                title: Textbox = Textbox(**ui.text_title.dump(exclude={"value"}))
            render_btn: Button = Button(**ui.btn_render.dump())
            output: Image = Image(**ui.image_output.dump())
            Markdown(f"*{FOOTER}*")

            render_inputs: list[Any] = [
                mode,
                lat,
                lon,
                place,
                when,
                tz_name,
                projection,
                fisheye_strength,
                min_separation,
                magnitude_limit,
                glow,
                glow_intensity,
                constellations,
                constellation_labels,
                shape,
                title,
            ]
            render_btn.click(fn=on_render, inputs=render_inputs, outputs=output)
            detect_tz.click(
                fn=on_detect_tz, inputs=[mode, lat, lon, place], outputs=tz_name
            )
            place.change(fn=on_geocode_preview, inputs=place, outputs=resolved)
        return app

    return _build
