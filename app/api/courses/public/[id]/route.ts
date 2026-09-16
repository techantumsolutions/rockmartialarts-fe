import { NextRequest, NextResponse } from "next/server"
import { getBackendProxyBaseUrl } from "@/lib/serverBackendUrl"

/**
 * Thin proxy to FastAPI public course-by-slug. Flattens the nested payload
 * so existing callers receive a course document.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const slugOrId = "then" in params ? (await params).id : params.id
  if (!slugOrId) {
    return NextResponse.json({ error: "Course ID or slug required" }, { status: 400 })
  }

  const base = getBackendProxyBaseUrl().replace(/\/$/, "")
  try {
    const res = await fetch(`${base}/api/courses/public/by-slug/${encodeURIComponent(slugOrId)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      cache: "no-store",
    })
    const text = await res.text()
    let data: unknown = text
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        data = { error: "Course not found" }
      }
    }
    if (!res.ok) {
      return NextResponse.json(
        typeof data === "object" && data !== null ? data : { error: "Course not found" },
        { status: res.status === 404 ? 404 : res.status }
      )
    }
    const payload = (data && typeof data === "object" ? data : {}) as Record<string, unknown>
    const course = (
      payload.course && typeof payload.course === "object"
        ? payload.course
        : payload
    ) as Record<string, unknown>
    return NextResponse.json({
      ...course,
      branches_offering: payload.branches_offering ?? course.branches_offering,
      assigned_coaches: payload.assigned_coaches ?? course.assigned_coaches,
      instructor_assignments: payload.instructor_assignments ?? course.instructor_assignments,
      showcase_achievements: payload.showcase_achievements ?? course.showcase_achievements,
      statistics: payload.statistics ?? course.statistics,
      category: payload.category ?? course.category,
    })
  } catch {
    return NextResponse.json({ error: "Course not found" }, { status: 404 })
  }
}
