"""Star-map page UI metadata."""

from typing import Self

from pydantic import computed_field

from ._base import (
    Accordion,
    BaseGUI_,
    Button,
    Checkbox,
    DateTime,
    Dropdown,
    Image,
    Label,
    MarkdownHeader,
    Number,
    Radio,
    Slider,
    Tab,
    Text,
)


class SkyPage(BaseGUI_):
    title: Label = Label(emoji="🔭", text="starpy — personalized star map")
    route: str = "sky"

    label_location: Label = Label(emoji="📍", text="location")
    label_mode: Label = Label(emoji="🧭", text="input mode")
    label_lat: Label = Label(emoji="⬍", text="latitude")
    label_lon: Label = Label(emoji="⬌", text="longitude")
    label_place: Label = Label(emoji="🏙️", text="place")
    label_resolved: Label = Label(emoji="✅", text="resolved place")
    label_when: Label = Label(emoji="📅", text="date and time")
    label_tz: Label = Label(emoji="🕰️", text="timezone")
    label_detect_tz: Label = Label(emoji="🌐", text="auto-detect timezone")
    label_options: Label = Label(emoji="🎛️", text="render options")
    label_projection: Label = Label(emoji="🔭", text="projection")
    label_fisheye: Label = Label(emoji="🐟", text="fisheye strength")
    label_separation: Label = Label(emoji="✨", text="minimum separation")
    label_mag: Label = Label(emoji="💡", text="limiting magnitude")
    label_glow: Label = Label(emoji="🌟", text="glow")
    label_glow_intensity: Label = Label(emoji="✴️", text="glow intensity")
    label_const: Label = Label(emoji="⛓️", text="constellation lines")
    label_const_labels: Label = Label(emoji="🏷️", text="constellation labels")
    label_shape: Label = Label(emoji="🔵", text="shape")
    label_title: Label = Label(emoji="✏️", text="title (optional)")
    label_render: Label = Label(emoji="🖨️", text="render sky map")
    label_share: Label = Label(emoji="🔗", text="generate share link")
    label_share_link: Label = Label(emoji="🌌", text="explorer link")
    label_output: Label = Label(emoji="🖼️", text="poster")

    @computed_field
    @property
    def md_title(self: Self, /) -> MarkdownHeader:
        return MarkdownHeader(label=self.title)

    @computed_field
    @property
    def tab_location(self: Self, /) -> Tab:
        return Tab(label=self.label_location)

    @computed_field
    @property
    def radio_mode(self: Self, /) -> Radio:
        return Radio(
            label=self.label_mode, value="place", choices=["coordinates", "place"]
        )

    @computed_field
    @property
    def number_lat(self: Self, /) -> Number:
        return Number(label=self.label_lat, value=40.7580, minimum=-90.0, maximum=90.0)

    @computed_field
    @property
    def number_lon(self: Self, /) -> Number:
        return Number(
            label=self.label_lon, value=-73.9855, minimum=-180.0, maximum=180.0
        )

    @computed_field
    @property
    def text_place(self: Self, /) -> Text:
        return Text(label=self.label_place, value="Times Square, New York, NY")

    @computed_field
    @property
    def text_resolved(self: Self, /) -> Text:
        return Text(label=self.label_resolved, value=None)

    @computed_field
    @property
    def datetime_when(self: Self, /) -> DateTime:
        return DateTime(label=self.label_when)

    @computed_field
    @property
    def text_tz(self: Self, /) -> Text:
        return Text(label=self.label_tz, value="UTC")

    @computed_field
    @property
    def btn_detect_tz(self: Self, /) -> Button:
        return Button(label=self.label_detect_tz)

    @computed_field
    @property
    def accordion_options(self: Self, /) -> Accordion:
        return Accordion(label=self.label_options, open=False)

    @computed_field
    @property
    def dropdown_projection(self: Self, /) -> Dropdown:
        return Dropdown(
            label=self.label_projection,
            value="stereographic",
            choices=["stereographic", "fisheye"],
        )

    @computed_field
    @property
    def slider_fisheye(self: Self, /) -> Slider:
        return Slider(
            label=self.label_fisheye, value=1.0, minimum=0.1, maximum=3.0, step=0.1
        )

    @computed_field
    @property
    def slider_separation(self: Self, /) -> Slider:
        return Slider(
            label=self.label_separation,
            value=0.008,
            minimum=0.0,
            maximum=0.05,
            step=0.001,
        )

    @computed_field
    @property
    def slider_mag(self: Self, /) -> Slider:
        return Slider(
            label=self.label_mag, value=5.8, minimum=1.0, maximum=7.0, step=0.1
        )

    @computed_field
    @property
    def checkbox_glow(self: Self, /) -> Checkbox:
        return Checkbox(label=self.label_glow, value=True)

    @computed_field
    @property
    def slider_glow_intensity(self: Self, /) -> Slider:
        return Slider(
            label=self.label_glow_intensity,
            value=1.0,
            minimum=0.0,
            maximum=3.0,
            step=0.1,
        )

    @computed_field
    @property
    def checkbox_const(self: Self, /) -> Checkbox:
        return Checkbox(label=self.label_const, value=True)

    @computed_field
    @property
    def checkbox_const_labels(self: Self, /) -> Checkbox:
        return Checkbox(label=self.label_const_labels, value=True)

    @computed_field
    @property
    def radio_shape(self: Self, /) -> Radio:
        return Radio(
            label=self.label_shape, value="circle", choices=["circle", "square"]
        )

    @computed_field
    @property
    def text_title(self: Self, /) -> Text:
        return Text(label=self.label_title, value=None)

    @computed_field
    @property
    def btn_render(self: Self, /) -> Button:
        return Button(label=self.label_render)

    @computed_field
    @property
    def btn_share(self: Self, /) -> Button:
        return Button(label=self.label_share)

    @computed_field
    @property
    def text_share_link(self: Self, /) -> Text:
        return Text(label=self.label_share_link, value=None)

    @computed_field
    @property
    def image_output(self: Self, /) -> Image:
        return Image(label=self.label_output)
