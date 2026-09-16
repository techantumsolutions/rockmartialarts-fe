/**
 * Public category landing lives at /courses/category/[slug]
 * so it does not collide with course detail /courses/[slug].
 */
export function toCategoryHref(category: { slug?: string; id?: string; name?: string }): string {
  const slug = (category.slug || category.id || "").toString().trim().toLowerCase()
  return `/courses/category/${encodeURIComponent(slug || "category")}`
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
