import { getBackendApiUrl } from "./config"
import { TokenManager } from "./tokenManager"

export type LearningPlaybackLesson = {
  id: string
  course_id?: string
  level_id?: string
  title: string
  description?: string | null
  duration_seconds?: number | null
  is_preview?: boolean
  has_video?: boolean
  can_play?: boolean
}

export type LearningPlayback = {
  mode: "stream" | "embed_youtube" | "embed_vimeo" | "none" | string
  stream_path?: string
  embed_url?: string
  download_allowed?: boolean
  token_expires_in_minutes?: number
  message?: string
}

export type LearningLessonPlaybackResponse = {
  lesson: LearningPlaybackLesson
  level?: { id?: string; title?: string } | null
  course?: { id?: string; title?: string; slug?: string } | null
  access: {
    allowed: boolean
    reason?: string
    entitled?: boolean
    is_preview?: boolean
  }
  playback: LearningPlayback
  download_allowed: boolean
}

export type LearningPlayerCurriculum = {
  course: {
    id: string
    title: string
    slug?: string
    thumbnail_url?: string | null
  }
  entitled: boolean
  entitlement?: {
    entitled?: boolean
    reason?: string
  }
  curriculum: Array<{
    id: string
    title: string
    description?: string | null
    lessons: LearningPlaybackLesson[]
  }>
}

function authHeaders(optional = false): HeadersInit {
  const token = TokenManager.getToken()
  const h: Record<string, string> = {
    Accept: "application/json",
    "Cache-Control": "no-cache",
  }
  if (token) h.Authorization = `Bearer ${token}`
  else if (!optional) h.Authorization = "Bearer "
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

class LearningAccessAPI {
  async getEntitlement(courseId: string) {
    const res = await fetch(
      getBackendApiUrl(
        `learning-access/courses/${encodeURIComponent(courseId)}/entitlement`
      ),
      { headers: authHeaders(true), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      course_id: string
      entitled: boolean
      reason?: string
    }>
  }

  async getPlayerCurriculum(courseId: string) {
    const res = await fetch(
      getBackendApiUrl(
        `learning-access/courses/${encodeURIComponent(courseId)}/player`
      ),
      { headers: authHeaders(true), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<LearningPlayerCurriculum>
  }

  async getLessonPlayback(lessonId: string) {
    const res = await fetch(
      getBackendApiUrl(
        `learning-access/lessons/${encodeURIComponent(lessonId)}`
      ),
      { headers: authHeaders(true), cache: "no-store" }
    )
    if (!res.ok) {
      const err = new Error(await parseError(res)) as Error & { status?: number }
      err.status = res.status
      throw err
    }
    return res.json() as Promise<LearningLessonPlaybackResponse>
  }

  /** Full URL for <video src> — uses same-origin proxy; token is in query. */
  streamUrl(streamPath: string) {
    return getBackendApiUrl(streamPath)
  }
}

export const learningAccessAPI = new LearningAccessAPI()
