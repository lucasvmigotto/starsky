import { FULL_APP_URL, SAMPLE_FRAGMENT } from "../lib/site.ts";

function goToSample() {
  window.location.hash = `#s=${SAMPLE_FRAGMENT}`;
}

export function EmptyState() {
  return (
    <div className="atlas-empty">
      <p className="font-display text-3xl">No sky on this page yet</p>
      <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-cream/70">
        This explorer reads a shared moment from the page address — look for
        a link ending in <code className="atlas-code">#s=…</code>. Create one
        in the full app, then open it here to wander the figures.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={goToSample} className="atlas-btn">
          Load the sample sky
        </button>
        <a className="atlas-btn-ghost" href={FULL_APP_URL}>
          Open the full app
        </a>
      </div>
    </div>
  );
}

export function LegacyState() {
  return (
    <div className="atlas-empty">
      <p className="font-display text-3xl">An older kind of link</p>
      <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-cream/70">
        That link is from an older version — regenerate it in the app and
        open the fresh link here.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <a className="atlas-btn" href={FULL_APP_URL}>
          Open the full app
        </a>
        <button type="button" onClick={goToSample} className="atlas-btn-ghost">
          Load the sample sky instead
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
          Load the sample sky
        </button>
        <a className="atlas-btn-ghost" href={FULL_APP_URL}>
          Open the full app
        </a>
      </div>
    </div>
  );
}
