import { Suspense, lazy, useEffect, useState } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import LandingPage from "./components/LandingPage.tsx";
import ViewerPage from "./components/ViewerPage.tsx";
import { t } from "./i18n/index.ts";
import { fragmentFromHash } from "./lib/share.ts";

// The Explorer is its own chunk: `#s=` and the landing never download it.
const ExplorerPage = lazy(() => import("./components/explorer/ExplorerPage.tsx"));
// So is the Poster Studio: only `#studio=` downloads it.
const StudioPage = lazy(() => import("./components/studio/StudioPage.tsx"));

/**
 * The `#e=` hash, or null. Deliberately not `explorerFragmentFromHash`: that
 * lives beside the Explorer's codec, and importing it here would pull the codec
 * into the main chunk the lazy page exists to keep it out of.
 */
function explorerHash(): string | null {
  const { hash } = window.location;
  return hash.startsWith("#e=") && hash.length > 3 ? hash : null;
}

/** The `#studio=` hash, or null. Kept here for the same reason as `explorerHash`. */
function studioHash(): string | null {
  const { hash } = window.location;
  return hash.startsWith("#studio=") && hash.length > 8 ? hash : null;
}

/** The `#c=` hash, or null: it opens the landing, pre-filled, and a pasted one remounts it. */
function creationHash(): string | null {
  const { hash } = window.location;
  return hash.startsWith("#c=") && hash.length > 3 ? hash : null;
}

function hasShareFragment(): boolean {
  return fragmentFromHash(window.location.hash) !== null;
}

/**
 * HashRouter: the static host has no SPA fallback. Share payloads live in
 * the same hash (`#s=`); ViewerPage reads `window.location.hash` directly
 * so router paths and share fragments never fight. With no `#s=` fragment
 * the landing form owns the page; the moment one appears we hand off to
 * the sky map view (and back again if the hash is cleared).
 */
function Root() {
  const [ready, setReady] = useState(hasShareFragment);
  const [explorer, setExplorer] = useState(explorerHash);
  const [studio, setStudio] = useState(studioHash);
  const [creation, setCreation] = useState(creationHash);
  useEffect(() => {
    const onHash = () => {
      setReady(hasShareFragment());
      setExplorer(explorerHash());
      setStudio(studioHash());
      setCreation(creationHash());
    };
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("hashchange", onHash);
    };
  }, []);
  if (ready) return <ViewerPage />;
  if (explorer !== null) {
    // Keyed by the fragment so a pasted `#e=` link replaces the camera and data.
    return (
      <Suspense
        fallback={
          <p className="atlas-loading" role="status">
            {t("explorer.loading")}
          </p>
        }
      >
        <ExplorerPage key={explorer} />
      </Suspense>
    );
  }
  if (studio !== null) {
    // Keyed by the fragment so a pasted `#studio=` link replaces the draft; the
    // page's own `replaceState` writes raise no `hashchange`, so editing never
    // remounts it.
    return (
      <Suspense
        fallback={
          <p className="atlas-loading" role="status">
            {t("viewer.loading")}
          </p>
        }
      >
        <StudioPage key={studio} />
      </Suspense>
    );
  }
  // Keyed by the fragment so a pasted `#c=` link refills the form; the landing's own
  // `replaceState` writes raise no `hashchange`, so typing never remounts it.
  return <LandingPage key={creation ?? "blank"} />;
}

export default function App() {
  return (
    // The docs-hub prefix lives in the URL pathname via Vite's `base`; the
    // hash carries the route. A hash router must NOT set `basename` — it would
    // look for the prefix inside the hash and render a blank page.
    <HashRouter>
      <Routes>
        <Route path="*" element={<Root />} />
      </Routes>
    </HashRouter>
  );
}
