import { defineConfig, devices } from "@playwright/test";

/**
 * Docs-site e2e: smoke every route including deep links, language
 * switching, keyboard-only flows, and a mobile viewport — against the
 * production static build, never the dev server.
 *
 * Browsers come from the Playwright container image, never from
 * `playwright install` on the host or runner.
 */
const PORT = Number(process.env["E2E_PORT"] ?? "4174");
const BASE_URL = process.env["E2E_BASE_URL"] ?? `http://127.0.0.1:${String(PORT)}`;

export default defineConfig({
  testDir: "./e2e",
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
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env["E2E_BASE_URL"]
    ? undefined
    : {
        command:
          process.env["E2E_SERVE_CMD"] ??
          `bun run build && node e2e/serve.mjs ${String(PORT)}`,
        url: BASE_URL,
        reuseExistingServer: !process.env["CI"],
        timeout: 120_000,
      },
});
