import { useEffect, useState } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import LandingPage from "./components/LandingPage.tsx";
import ViewerPage from "./components/ViewerPage.tsx";
import { fragmentFromHash } from "./lib/share.ts";

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
  useEffect(() => {
    const onHash = () => {
      setReady(hasShareFragment());
    };
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("hashchange", onHash);
    };
  }, []);
  return ready ? <ViewerPage /> : <LandingPage />;
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
