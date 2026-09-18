"""App-shell builder (hosts all page builders).

Page builders run INSIDE the active ``Blocks`` context so every component
is parented correctly (Gradio ≥6 requires creation-in-context; building
outside then ``.render()``-ing leaves components without a page).
"""

from collections.abc import Callable

from gradio import Blocks, Markdown

from ..components.sky import SkyPage


def build_app(
    ui: SkyPage,
    /,
    *apps: Callable[[Blocks], Blocks],
    on_load: Callable[..., object] | None = None,
) -> Blocks:
    """Compose page builders into one Gradio ``Blocks`` app."""
    with Blocks(title=str(ui.title)) as gui:
        Markdown(f"# {ui.title}")
        if on_load:
            gui.load(fn=on_load)
        for app in apps:
            gui = app(gui)

    return gui
