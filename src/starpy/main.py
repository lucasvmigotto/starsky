"""App composition: settings -> env/log -> warm caches -> callbacks -> Gradio."""

import polars as pl
from gradio import Blocks

from .data.catalog import load_hipparcos
from .data.constellations import load_constellation_lines
from .data.ephemeris import load_ephemeris
from .data.fonts import register_cached_fonts
from .gui.callbacks import SkyMapCallback
from .gui.components import SkyPage
from .gui.pages import build_app, build_sky
from .settings import Settings
from .utils import setup_envvars, setup_log


def launch_app() -> None:
    """Load everything and launch the Gradio Blocks app (blocking)."""
    settings: Settings = Settings()

    setup_envvars(settings.GRADIO.env, settings.HF.env, settings.EPHEMERIS.env)
    setup_log(settings.LOG)
    register_cached_fonts(settings.EPHEMERIS.CACHE_DIR)

    _, planets, timescale = load_ephemeris(settings.EPHEMERIS)
    catalog: pl.DataFrame = load_hipparcos(settings.EPHEMERIS)
    lines: pl.DataFrame = load_constellation_lines(settings.EPHEMERIS.CACHE_DIR)

    callback: SkyMapCallback = SkyMapCallback(
        settings, catalog, lines, planets, timescale
    )

    app: Blocks = build_app(
        SkyPage(),
        build_sky(
            SkyPage(),
            on_render=callback.on_btn_render_callback_async,
            on_detect_tz=callback.on_detect_tz,
            on_geocode_preview=callback.on_geocode_preview,
            on_share_link=callback.on_share_link,
        ),
    )
    app.launch(**settings.GRADIO.config)


def main() -> None:
    """Direct entry point (``python -c "from starpy.main import main; main()"``)."""
    launch_app()
