/**
 * Minimal static file server for the built site (`dist/`).
 *
 * Exists so the e2e suite can be served by Node alone — the Playwright
 * container has Node but no Bun, and the config's default webServer command
 * uses Bun locally. Not for production: R2 serves the real site.
 *
 * Usage: node e2e/serve.mjs [port]
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(HERE, "..", "dist");
const PORT = Number(process.argv[2] ?? process.env["E2E_PORT"] ?? "4173");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".otf": "font/otf",
  ".txt": "text/plain; charset=utf-8",
};

/** Resolve a URL path inside ROOT, refusing traversal. */
function resolvePath(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split("?")[0]));
  const candidate = resolve(join(ROOT, clean));
  if (!candidate.startsWith(ROOT)) return null;
  return candidate;
}

const server = createServer((request, response) => {
  void (async () => {
    const path = resolvePath(request.url ?? "/");
    if (path === null) {
      response.writeHead(403).end("forbidden");
      return;
    }
    let file = path;
    try {
      const info = await stat(file);
      if (info.isDirectory()) file = join(file, "index.html");
    } catch {
      // SPA: an unknown path without an extension is a client route.
      file = join(ROOT, "index.html");
    }
    try {
      const body = await readFile(file);
      response.writeHead(200, {
        "content-type": TYPES[extname(file)] ?? "application/octet-stream",
        "cache-control": "no-store",
      });
      response.end(body);
    } catch {
      response.writeHead(404).end("not found");
    }
  })();
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`serving ${ROOT} on http://127.0.0.1:${String(PORT)}`);
});
