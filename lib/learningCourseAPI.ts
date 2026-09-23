import { getBackendApiUrl } from "./config"
import { TokenManager } from "./tokenManager"

export const LEARNING_COURSE_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
] as const

export type LearningLesson = {
  id: string
  course_id?: string
  level_id?: string
  title: string
  description?: string | null
  sort_order?: number
  status?: string
  video_url?: string | null
  video_storage_key?: string | null
  duration_seconds?: number | null
  is_preview?: boolean
  has_video?: boolean
}

export type LearningLevel = {
  id: string
  course_id?: string
  title: string
  description?: string | null
  sort_order?: number
  status?: string
  lessons?: LearningLesson[]
  lessons_count?: number
}

export type LearningCourse = {
  id: string
  title: string
  slug: string
  short_description?: string | null
  description?: string | null
  thumbnail_url?: string | null
  trailer_url?: string | null
  difficulty?: string | null
  language?: string | null
  estimated_hours?: number | null
  status?: string
  sort_order?: number
  seo_title?: string | null
  seo_description?: string | null
  levels_count?: number
  lessons_count?: number
  curriculum?: LearningLevel[]
  published_at?: string | null
  created_at?: string
  updated_at?: string
}

export type LearningCoursePayload = {
  title: string
  slug?: string
  short_description?: string
  description?: string
  thumbnail_url?: string
  trailer_url?: string
  difficulty?: string
  language?: string
  estimated_hours?: number | null
  status?: string
  sort_order?: number
  seo_title?: string
  seo_description?: string
}

function authHeaders(json = false): HeadersInit {
  const token = TokenManager.getToken()
  const h: Record<string, string> = { "Cache-Control": "no-cache" }
  if (token) h.Authorization = `Bearer ${token}`
  else h.Authorization = "Bearer "
  if (json) h["Content-Type"] = "application/json"
  return h
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json()
    if (typeof data?.detail === "string") return data.detail
    if (Array.isArray(data?.detail)) {
      return data.detail
        .map((d: { msg?: string }) => d.msg || JSON.stringify(d))
        .join("; ")
    }
    return data?.message || res.statusText || "Request failed"
  } catch {
    return res.statusText || "Request failed"
  }
}

class LearningCourseAPI {
  async listPublic(params: { search?: string; difficulty?: string; skip?: number; limit?: number } = {}) {
    const qs = new URLSearchParams()
    if (params.search?.trim()) qs.set("search", params.search.trim())
    if (params.difficulty && params.difficulty !== "all") qs.set("difficulty", params.difficulty)
    qs.set("skip", String(params.skip ?? 0))
    qs.set("limit", String(params.limit ?? 50))
    const res = await fetch(
      getBackendApiUrl(`learning-courses/public?${qs.toString()}`),
      { headers: { Accept: "application/json" }, cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ courses: LearningCourse[]; total: number }>
  }

  async getPublic(slugOrId: string) {
    const res = await fetch(
      getBackendApiUrl(`learning-courses/public/${encodeURIComponent(slugOrId)}`),
      { headers: { Accept: "application/json" }, cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ course: LearningCourse }>
  }

  async listAdmin(params: { status?: string; search?: string; skip?: number; limit?: number } = {}) {
    const qs = new URLSearchParams()
    if (params.status && params.status !== "all") qs.set("status", params.status)
    if (params.search?.trim()) qs.set("search", params.search.trim())
    qs.set("skip", String(params.skip ?? 0))
    qs.set("limit", String(params.limit ?? 50))
    const res = await fetch(
      getBackendApiUrl(`learning-courses?${qs.toString()}`),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ courses: LearningCourse[]; total: number }>
  }

  async getAdmin(id: string) {
    const res = await fetch(
      getBackendApiUrl(`learning-courses/${encodeURIComponent(id)}`),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ course: LearningCourse }>
  }

  async create(body: LearningCoursePayload) {
    const res = await fetch(getBackendApiUrl("learning-courses"), {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ message: string; course: LearningCourse }>
  }

  async update(id: string, body: Partial<LearningCoursePayload>) {
    const res = await fetch(
      getBackendApiUrl(`learning-courses/${encodeURIComponent(id)}`),
      {
        method: "PATCH",
        headers: authHeaders(true),
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ message: string; course: LearningCourse }>
  }

  async archive(id: string) {
    const res = await fetch(
      getBackendApiUrl(`learning-courses/${encodeURIComponent(id)}`),
      { method: "DELETE", headers: authHeaders() }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }

  // ----- M16-S02 hierarchy -----

  async listLevels(courseId: string) {
    const res = await fetch(
      getBackendApiUrl(`learning-courses/${encodeURIComponent(courseId)}/levels`),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ levels: LearningLevel[]; total_levels: number }>
  }

  async createLevel(
    courseId: string,
    body: { title: string; description?: string; status?: string; sort_order?: number }
  ) {
    const res = await fetch(
      getBackendApiUrl(`learning-courses/${encodeURIComponent(courseId)}/levels`),
      { method: "POST", headers: authHeaders(true), body: JSON.stringify(body) }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ level: LearningLevel }>
  }

  async updateLevel(
    courseId: string,
    levelId: string,
    body: Partial<{ title: string; description: string; status: string; sort_order: number }>
  ) {
    const res = await fetch(
      getBackendApiUrl(
        `learning-courses/${encodeURIComponent(courseId)}/levels/${encodeURIComponent(levelId)}`
      ),
      { method: "PATCH", headers: authHeaders(true), body: JSON.stringify(body) }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }

  async archiveLevel(courseId: string, levelId: string) {
    const res = await fetch(
      getBackendApiUrl(
        `learning-courses/${encodeURIComponent(courseId)}/levels/${encodeURIComponent(levelId)}`
      ),
      { method: "DELETE", headers: authHeaders() }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }

  async reorderLevels(courseId: string, orderedIds: string[]) {
    const res = await fetch(
      getBackendApiUrl(
        `learning-courses/${encodeURIComponent(courseId)}/levels/reorder`
      ),
      {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ ordered_ids: orderedIds }),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ levels: LearningLevel[] }>
  }

  async createLesson(
    courseId: string,
    levelId: string,
    body: {
      title: string
      description?: string
      status?: string
      video_url?: string
      duration_seconds?: number | null
      is_preview?: boolean
      sort_order?: number
    }
  ) {
    const res = await fetch(
      getBackendApiUrl(
        `learning-courses/${encodeURIComponent(courseId)}/levels/${encodeURIComponent(levelId)}/lessons`
      ),
      { method: "POST", headers: authHeaders(true), body: JSON.stringify(body) }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ lesson: LearningLesson }>
  }

  async updateLesson(
    courseId: string,
    levelId: string,
    lessonId: string,
    body: Record<string, unknown>
  ) {
    const res = await fetch(
      getBackendApiUrl(
        `learning-courses/${encodeURIComponent(courseId)}/levels/${encodeURIComponent(levelId)}/lessons/${encodeURIComponent(lessonId)}`
      ),
      { method: "PATCH", headers: authHeaders(true), body: JSON.stringify(body) }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }

  async archiveLesson(courseId: string, levelId: string, lessonId: string) {
    const res = await fetch(
      getBackendApiUrl(
        `learning-courses/${encodeURIComponent(courseId)}/levels/${encodeURIComponent(levelId)}/lessons/${encodeURIComponent(lessonId)}`
      ),
      { method: "DELETE", headers: authHeaders() }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }

  async reorderLessons(courseId: string, levelId: string, orderedIds: string[]) {
    const res = await fetch(
      getBackendApiUrl(
        `learning-courses/${encodeURIComponent(courseId)}/levels/${encodeURIComponent(levelId)}/lessons/reorder`
      ),
      {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ ordered_ids: orderedIds }),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }
}

export const learningCourseAPI = new LearningCourseAPI()

export function learningStatusLabel(status?: string | null) {
  return LEARNING_COURSE_STATUSES.find((s) => s.value === status)?.label || status || "—"
}

export function formatDuration(seconds?: number | null) {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  if (m >= 60) {
    const h = Math.floor(m / 60)
    const rm = m % 60
    return `${h}h ${rm}m`
  }
  return s > 0 ? `${m}m ${s}s` : `${m} min`
}
