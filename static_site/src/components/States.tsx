import { fragmentFromHash } from "../lib/share.ts";
import { randomSampleFragment } from "../lib/site.ts";

function goToSample() {
  window.location.hash = `#s=${randomSampleFragment(fragmentFromHash(window.location.hash))}`;
}

export function EmptyState() {
  return (
    <div className="atlas-empty">
      <p className="font-display text-3xl">No sky on this page yet</p>
      <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-cream/70">
        This explorer reads a shared moment from the page address — look for
        a link ending in <code className="atlas-code">#s=…</code>. Or jump
        straight in with a random sky below.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={goToSample} className="atlas-btn">
          Load a random sky
        </button>
      </div>
    </div>
  );
}

export function LegacyState() {
  return (
    <div className="atlas-empty">
      <p className="font-display text-3xl">An older kind of link</p>
      <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-cream/70">
        That link is from an older version — head back to the start and map
        a fresh moment, or jump in with a random sky below.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={goToSample} className="atlas-btn">
          Load a random sky instead
        </button>
      </div>
    </div>
  );
}

export function InvalidState({ detail }: { detail: string }) {
  return (
    <div className="atlas-empty">
      <p className="font-display text-3xl">This link holds no sky</p>
      <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-cream/70">
        The address fragment could not be read ({detail}). Check for a
        truncated copy, or start from a fresh share link.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={goToSample} className="atlas-btn">
          Load a random sky
        </button>
      </div>
    </div>
  );
}
