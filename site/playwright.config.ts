import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright e2e configuration (`qa:strategy`'s journeys J1–J4, J6 + a11y).
 *
 * Browsers come from the Playwright container image, never from
 * `playwright install` on the host or runner (`qa/references/browsers.md`).
 * CI sets PLAYWRIGHT_BROWSERS_PATH and runs inside
 * `mcr.microsoft.com/playwright` pinned by digest; locally, developers run the
 * same image via the compose profile.
 *
 * The suite drives the **built** site through `vite preview`, not the dev
 * server: `base: "./"` makes `dist/` self-contained and closest to what R2
 * serves.
 */
const PORT = Number(process.env["E2E_PORT"] ?? "4173");
const BASE_URL = process.env["E2E_BASE_URL"] ?? `http://127.0.0.1:${String(PORT)}`;

export default defineConfig({
  testDir: "./e2e",
  // No `sleep()` anywhere; rely on auto-waiting (qa-quality anti-pattern 3).
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env["CI"]),
  retries: process.env["CI"] ? 1 : 0,
  workers: process.env["CI"] ? 2 : undefined,
  reporter: process.env["CI"] ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // Downloads are asserted, so give them somewhere known to land.
    acceptDownloads: true,
  },
  projects: [
    // Chrome and Firefox are the supported browsers (constitution VI).
    // WebKit is deliberately absent: no selenium/standalone-webkit image and
    // the product does not claim Safari support.
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    // A mobile viewport, Chromium-only (`qa:e2e`'s default matrix). The poster
    // is a portrait artifact and the export controls must stay reachable on a
    // phone; the journeys that matter at this width are the ones tagged
    // `@mobile` or that assert layout, and the rest simply re-run to catch
    // viewport-dependent breakage.
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env["E2E_BASE_URL"]
    ? undefined
    : {
        // Serve the production build; the suite must not test the dev server.
        // `E2E_SERVE_CMD` lets the container run a Node-only server (the
        // Playwright image has no Bun), while local runs use Bun.
        command:
          process.env["E2E_SERVE_CMD"] ??
          `bun run build && bun run preview --port ${String(PORT)} --strictPort`,
        url: BASE_URL,
        reuseExistingServer: !process.env["CI"],
        timeout: 120_000,
      },
});
