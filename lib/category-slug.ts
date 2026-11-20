/**
 * Public category landing lives at /courses/category/[slug]
 * so it does not collide with course detail /courses/[slug].
 */

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export function slugifyCategoryName(name?: string | null): string {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}

export function resolveCategorySlug(category: {
  slug?: string | null
  id?: string | null
  name?: string | null
  code?: string | null
}): string {
  const rawSlug = String(category.slug || "").trim().toLowerCase()
  if (rawSlug && !isUuidLike(rawSlug)) return rawSlug

  const fromName = slugifyCategoryName(category.name)
  if (fromName) return fromName

  const fromCode = slugifyCategoryName(category.code)
  if (fromCode) return fromCode

  const id = String(category.id || "").trim().toLowerCase()
  return id || "category"
}

export function toCategoryHref(category: {
  slug?: string | null
  id?: string | null
  name?: string | null
  code?: string | null
}): string {
  const slug = resolveCategorySlug(category)
  return `/courses/category/${encodeURIComponent(slug)}`
}

export function toCourseDetailHref(course: {
  slug?: string
  code?: string
  title?: string
  name?: string
  id?: string
}): string {
  const stored = (course.slug || "").toString().trim().toLowerCase()
  if (stored) return `/courses/${encodeURIComponent(stored)}`
  const raw = (course.code ?? course.title ?? course.name ?? course.id ?? "").toString().trim()
  const fallback =
    raw.toLowerCase().replace(/\s+/g, "-").replace(/_/g, "-").replace(/[^a-z0-9-]/g, "") || "course"
  return `/courses/${encodeURIComponent(fallback)}`
}
