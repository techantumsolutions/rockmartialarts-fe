import { getBackendApiUrl } from "./config"
import { TokenManager } from "./tokenManager"

export type LearningCourseProgress = {
  id?: string
  user_id?: string
  course_id: string
  progress_percent?: number
  completed_lesson_ids?: string[]
  completed_count?: number
  total_lessons?: number
  last_lesson_id?: string | null
  last_position_seconds?: number
  lesson_states?: Record<
    string,
    {
      position_seconds?: number
      percent?: number
      completed?: boolean
    }
  >
  course?: {
    id?: string
    title?: string
    slug?: string
    thumbnail_url?: string | null
    status?: string
  }
  last_lesson?: { id?: string; title?: string; is_preview?: boolean } | null
  resume?: {
    lesson_id?: string | null
    position_seconds?: number
    available?: boolean
  }
  entitled?: boolean
  updated_at?: string
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

class LearningProgressAPI {
  async listMine() {
    const res = await fetch(getBackendApiUrl("learning-progress/me"), {
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      progress: LearningCourseProgress[]
      total: number
    }>
  }

  async getCourse(courseId: string) {
    const res = await fetch(
      getBackendApiUrl(
        `learning-progress/me/courses/${encodeURIComponent(courseId)}`
      ),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<LearningCourseProgress>
  }

  async getResume(courseId: string) {
    const res = await fetch(
      getBackendApiUrl(
        `learning-progress/me/courses/${encodeURIComponent(courseId)}/resume`
      ),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      course_id: string
      resume: {
        lesson_id?: string | null
        position_seconds?: number
        available?: boolean
      }
      lesson?: { id?: string; title?: string } | null
      progress_percent?: number
    }>
  }

  async heartbeat(
    courseId: string,
    body: {
      lesson_id: string
      position_seconds?: number
      duration_seconds?: number
      completed?: boolean
    }
  ) {
    const res = await fetch(
      getBackendApiUrl(
        `learning-progress/me/courses/${encodeURIComponent(courseId)}/heartbeat`
      ),
      {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      progress: LearningCourseProgress
      lesson_state: { completed?: boolean; percent?: number }
    }>
  }

  async completeLesson(courseId: string, lessonId: string) {
    const res = await fetch(
      getBackendApiUrl(
        `learning-progress/me/courses/${encodeURIComponent(courseId)}/complete-lesson`
      ),
      {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ lesson_id: lessonId }),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }
}

export const learningProgressAPI = new LearningProgressAPI()
