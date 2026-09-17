import { HashRouter, Route, Routes } from "react-router-dom";
import ViewerPage from "./components/ViewerPage.tsx";

/**
 * HashRouter: the static host has no SPA fallback. Share payloads live in
 * the same hash (`#s=`); ViewerPage reads `window.location.hash` directly
 * so router paths and share fragments never fight.
 */
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="*" element={<ViewerPage />} />
      </Routes>
    </HashRouter>
  );
}
