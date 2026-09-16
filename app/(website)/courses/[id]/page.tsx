import type { Metadata } from "next"
import { getBackendProxyBaseUrl } from "@/lib/serverBackendUrl"
import CourseDetailPage from "./course-detail-client"

export const dynamic = "force-dynamic"

type PageProps = {
  params: { id: string }
}

async function fetchPublicCourse(slug: string): Promise<Record<string, unknown> | null> {
  const base = getBackendProxyBaseUrl().replace(/\/$/, "")
  try {
    const res = await fetch(`${base}/api/courses/public/by-slug/${encodeURIComponent(slug)}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
    if (!res.ok) return null
    return (await res.json()) as Record<string, unknown>
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const slug = params.id
  const payload = await fetchPublicCourse(slug)
  const course = (
    payload?.course && typeof payload.course === "object"
      ? payload.course
      : payload
  ) as Record<string, unknown> | null
  if (!course) {
    return { title: "Course not found | Rock Martial Arts Academy" }
  }
  const pageContent = (course.page_content || {}) as Record<string, unknown>
  const hero = (pageContent.hero_section || {}) as Record<string, unknown>
  const about = (pageContent.about_section || {}) as Record<string, unknown>
  const title =
    String(hero.title || course.title || course.course_name || "Course").trim() || "Course"
  const description = String(
    course.aboutDescription ||
      about.description ||
      about.aboutDescription ||
      hero.description ||
      hero.subtitle ||
      ""
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160)
  const canonicalSlug = String(course.slug || slug).trim()
  return {
    title: `${title} | Rock Martial Arts Academy`,
    description: description || `Learn ${title} at Rock Martial Arts Academy.`,
    alternates: { canonical: `/courses/${encodeURIComponent(canonicalSlug)}` },
    openGraph: {
      title,
      description: description || `Learn ${title} at Rock Martial Arts Academy.`,
    },
  }
}

export default function CourseDetailRoute() {
  return <CourseDetailPage />
}
