/**
 * Branch URL slug: academy name → URL-safe slug (e.g. "Main Academy" → "main-academy").
 * Used for /branches/[slug] URLs.
 */
export function branchNameToSlug(name: string): string {
  if (!name || typeof name !== "string") return ""
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "branch"
}

/**
 * Check if a string looks like a UUID (for backwards compatibility).
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function isBranchId(value: string): boolean {
  return UUID_REGEX.test(value)
}
