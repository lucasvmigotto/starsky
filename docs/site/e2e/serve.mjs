/**
 * Minimal static file server for the built docs site (`dist/`).
 *
 * Node-only harness so the Playwright container (Node, no Bun) can serve
 * the suite; not for production — R2 serves the real site.
 *
 * Usage: node e2e/serve.mjs [port]
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(HERE, "..", "dist");
const PORT = Number(process.argv[2] ?? process.env["E2E_PORT"] ?? "4174");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

// Production serves the build under the /starsky/ prefix on the docs host;
// mirror that here so absolute asset URLs resolve like they do on R2.
// Unprefixed paths resolve at the root too, so plain fetches keep working.
const BASE_PREFIX = "/starsky/";

/** Resolve a URL path inside ROOT, refusing traversal. */
function resolvePath(urlPath) {
  let pathname = decodeURIComponent(urlPath.split("?")[0]);
  if (pathname.startsWith(BASE_PREFIX)) {
    pathname = pathname.slice(BASE_PREFIX.length - 1);
  }
  if (pathname === "/") return join(ROOT, "index.html");
  const clean = normalize(pathname);
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
      // Hash routes never reach the server, but an unknown path without an
      // extension is still answered with the entry (deep-link safety).
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
