/**
 * Normalize CMS / upload URLs for `<img src>`, favicon href, etc.
 *
 * Values without a leading `/` are resolved by the browser relative to the *current path*,
 * so e.g. `logo.png` becomes `/courses/logo.png` on course detail — a different URL than on `/`.
 * This helper makes those values root-stable (or backend-absolute) everywhere.
 *
 * User uploads under `/uploads/...` are routed through `/api/uploads/...` so files added
 * after the last Next.js build are still served (production static public/ is build-time only).
 */
export function resolvePublicAssetUrl(url?: string | null): string {
  if (url == null) return ""
  const u = String(url).trim()
  if (!u) return ""

  if (u.startsWith("http://") || u.startsWith("https://")) {
    try {
      const parsed = new URL(u)
      const path = parsed.pathname || ""
      if (path.startsWith("/api/uploads/")) return path + parsed.search
      if (path.startsWith("/uploads/")) {
        return `/api/uploads/${path.slice("/uploads/".length)}${parsed.search}`
      }
    } catch {
      /* keep absolute URL */
    }
    return u
  }

  if (u.startsWith("/api/uploads/")) return u
  if (u.startsWith("/uploads/")) return `/api/uploads/${u.slice("/uploads/".length)}`
  if (u.startsWith("/")) return u
  if (u.startsWith("uploads/")) return `/api/uploads/${u.slice("uploads/".length)}`
  if (u.includes("/")) return `/api/uploads/${u.replace(/^\/+/, "")}`
  // Bare filename from older upload payloads — serve via runtime uploads route
  return `/api/uploads/images/${encodeURIComponent(u)}`
}
