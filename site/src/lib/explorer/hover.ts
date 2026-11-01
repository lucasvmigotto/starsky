/**
 * Which constellation the pointer is over (FR-013): a tiny store outside React.
 * The canvas sets it from the pointer, the side panel's list sets it from its
 * items, and both read it, so a hover re-renders only the list item it names
 * and asks the canvas for one frame, never the whole panel.
 */

export type HoverSource = "canvas" | "list";

export class HoverStore {
  private current: string | null = null;
  private from: HoverSource = "canvas";
  private readonly listeners = new Set<() => void>();

  /** The hovered `CON:<abbr>`, or null. */
  get id(): string | null {
    return this.current;
  }

  /** Who set it last: a list item's own hover must not scroll the list under the pointer. */
  get source(): HoverSource {
    return this.from;
  }

  /** Change the hover; nothing happens, and nobody is told, when the id is the same. */
  set(id: string | null, source: HoverSource): void {
    if (id === this.current) return;
    this.current = id;
    this.from = source;
    for (const listener of this.listeners) listener();
  }

  /** Clear the hover if it is still `id`, so a late leave cannot wipe a newer hover. */
  clear(id: string, source: HoverSource = "list"): void {
    if (this.current === id) this.set(null, source);
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
}
