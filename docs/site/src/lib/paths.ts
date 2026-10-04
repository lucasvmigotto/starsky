/**
 * Absolute public paths. `import.meta.env.BASE_URL` is the Vite base with a
 * trailing slash ("/starsky/" in production) — building hrefs from it keeps
 * links correct regardless of trailing slashes or hash state, where a
 * relative "./…" URL would escape to the host root.
 */
export function publicHref(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`;
}
