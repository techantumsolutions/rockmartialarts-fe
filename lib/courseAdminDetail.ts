import { getBackendApiUrl } from "@/lib/config"

export interface AdminEnrolledStudent {
  id: string
  student_name: string
  enrollment_date: string
  progress: number
  status: "active" | "completed" | "paused" | "dropped"
  last_activity?: string
  grade?: string
}

export interface AdminCourseReview {
  id: string
  student_name: string
  rating: number
  comment: string
  date: string
}

function enrollmentStatus(isActive: boolean): AdminEnrolledStudent["status"] {
  return isActive ? "active" : "completed"
}

/**
 * Load enrollments for a course (requires auth token).
 * Returns all enrollment rows (including re-enrolls of the same student).
 */
export async function loadCourseEnrollmentsForAdmin(
  courseId: string,
  token: string
): Promise<AdminEnrolledStudent[]> {
  try {
    const res = await fetch(
      getBackendApiUrl(
        `enrollments?course_id=${encodeURIComponent(courseId)}&limit=500&skip=0`
      ),
      {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        cache: "no-store",
      }
    )
    if (!res.ok) return []
    const data = await res.json()
    const rows = Array.isArray(data.enrollments) ? data.enrollments : []
    return rows
      .filter((e: { is_active?: boolean }) => e.is_active !== false)
      .map((e: Record<string, unknown>, i: number) => {
        const start = e.start_date ?? e.enrollment_date ?? e.created_at
        const startStr =
          typeof start === "string"
            ? start
            : start != null && typeof (start as { toString?: () => string }).toString === "function"
              ? String(start)
              : new Date().toISOString()
        const enrollmentId = String(e.id ?? "").trim()
        const sid = String(e.student_id ?? "").trim()
        return {
          // Prefer enrollment id so duplicate students don't collide in lists
          id: enrollmentId || (sid ? `${sid}-${i}` : `enrollment-${i}`),
          student_name: String(e.student_name ?? "Student"),
          enrollment_date: startStr,
          progress: typeof e.progress_percent === "number" ? (e.progress_percent as number) : 0,
          status: enrollmentStatus(e.is_active !== false),
          last_activity: undefined,
          grade: undefined,
        }
      })
  } catch {
    return []
  }
}

/** Map CMS `page_content.testimonials` to review cards. */
export function mapPageContentReviews(courseData: Record<string, unknown>): AdminCourseReview[] {
  const pageContent = (courseData?.page_content as Record<string, unknown> | undefined) || {}
  const raw = pageContent.testimonials
  if (!Array.isArray(raw)) return []
  const fallbackDate =
    (typeof courseData.updated_at === "string" && courseData.updated_at) ||
    new Date().toISOString().slice(0, 10)
  return raw.map((t: Record<string, unknown>, i: number) => ({
    id: `cms-review-${i}`,
    student_name: String(t.name ?? "Student"),
    rating: typeof t.rating === "number" && t.rating > 0 ? (t.rating as number) : 5,
    comment: String(t.text ?? t.quote ?? ""),
    date:
      (typeof t.date === "string" && t.date) ||
      (typeof t.created_at === "string" && t.created_at) ||
      fallbackDate,
  }))
}
