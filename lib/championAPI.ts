import { getBackendApiUrl } from "./config"
import { TokenManager } from "./tokenManager"

export const CHAMPION_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "unpublished", label: "Unpublished" },
  { value: "archived", label: "Archived" },
] as const

export const RECOGNITION_LEVELS = [
  { value: "academy", label: "Academy" },
  { value: "local", label: "Local" },
  { value: "regional", label: "Regional" },
  { value: "state", label: "State" },
  { value: "national", label: "National" },
  { value: "international", label: "International" },
  { value: "other", label: "Other" },
] as const

export type ChampionAchievement = {
  id: string
  champion_id?: string
  title: string
  description?: string | null
  recognition_level?: string
  competition_name?: string | null
  award_title?: string | null
  place?: string | null
  event_year?: number | null
  event_date?: string | null
  images?: string[]
  videos?: string[]
  documents?: string[]
  display_order?: number
  status?: string
  media_count?: number
  created_at?: string
  updated_at?: string
}

export type ChampionAchievementPayload = {
  title: string
  description?: string
  recognition_level?: string
  competition_name?: string
  award_title?: string
  place?: string
  event_year?: number
  clear_event_year?: boolean
  event_date?: string
  images?: string[]
  videos?: string[]
  documents?: string[]
  display_order?: number
  status?: string
}

export type Champion = {
  id: string
  name: string
  slug?: string
  headline?: string | null
  short_bio?: string | null
  success_story?: string | null
  photo_url?: string | null
  student_id?: string | null
  student_name?: string | null
  branch_id?: string | null
  display_order?: number
  status?: string
  is_published?: boolean
  published_at?: string | null
  created_at?: string
  updated_at?: string
}

export type ChampionPayload = {
  name: string
  slug?: string
  headline?: string
  short_bio?: string
  success_story?: string
  photo_url?: string
  student_id?: string
  branch_id?: string
  display_order?: number
  status?: string
  publish?: boolean
  clear_photo?: boolean
  clear_student?: boolean
  clear_branch?: boolean
}

export type ChampionStudentOption = {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  batch_ref?: string | null
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

class ChampionAPI {
  async list(
    params: {
      status?: string
      search?: string
      skip?: number
      limit?: number
      include_archived?: boolean
      published_only?: boolean
    } = {}
  ) {
    const qs = new URLSearchParams()
    if (params.status && params.status !== "all") qs.set("status", params.status)
    if (params.search?.trim()) qs.set("search", params.search.trim())
    if (params.include_archived) qs.set("include_archived", "true")
    if (params.published_only) qs.set("published_only", "true")
    qs.set("skip", String(params.skip ?? 0))
    qs.set("limit", String(params.limit ?? 50))
    const res = await fetch(getBackendApiUrl(`champions?${qs.toString()}`), {
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ champions: Champion[]; total: number }>
  }

  async get(id: string) {
    const res = await fetch(
      getBackendApiUrl(`champions/${encodeURIComponent(id)}`),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ champion: Champion }>
  }

  async create(body: ChampionPayload) {
    const res = await fetch(getBackendApiUrl("champions"), {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ message: string; champion: Champion }>
  }

  async update(id: string, body: Partial<ChampionPayload>) {
    const res = await fetch(
      getBackendApiUrl(`champions/${encodeURIComponent(id)}`),
      {
        method: "PATCH",
        headers: authHeaders(true),
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ message: string; champion: Champion }>
  }

  async publish(id: string) {
    const res = await fetch(
      getBackendApiUrl(`champions/${encodeURIComponent(id)}/publish`),
      {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ published: true }),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ message: string; champion: Champion }>
  }

  async unpublish(id: string) {
    const res = await fetch(
      getBackendApiUrl(`champions/${encodeURIComponent(id)}/unpublish`),
      { method: "POST", headers: authHeaders() }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ message: string; champion: Champion }>
  }

  async archive(id: string) {
    const res = await fetch(
      getBackendApiUrl(`champions/${encodeURIComponent(id)}`),
      { method: "DELETE", headers: authHeaders() }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }

  async studentOptions(params: { search?: string; limit?: number } = {}) {
    const qs = new URLSearchParams()
    if (params.search?.trim()) qs.set("search", params.search.trim())
    qs.set("limit", String(params.limit ?? 30))
    const res = await fetch(
      getBackendApiUrl(`champions/student-options?${qs.toString()}`),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ students: ChampionStudentOption[] }>
  }

  async uploadPhoto(file: File) {
    const token = TokenManager.getToken()
    const formData = new FormData()
    formData.append("file", file)
    const res = await fetch(getBackendApiUrl("uploads"), {
      method: "POST",
      headers: { Authorization: token ? `Bearer ${token}` : "Bearer " },
      body: formData,
    })
    if (!res.ok) throw new Error(await parseError(res))
    const data = await res.json()
    return (data.file_url || data.url || data.image_url || "") as string
  }

  async listAchievements(
    championId: string,
    params: { include_archived?: boolean; status?: string } = {}
  ) {
    const qs = new URLSearchParams()
    if (params.include_archived) qs.set("include_archived", "true")
    if (params.status) qs.set("status", params.status)
    const q = qs.toString()
    const res = await fetch(
      getBackendApiUrl(
        `champions/${encodeURIComponent(championId)}/achievements${q ? `?${q}` : ""}`
      ),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      achievements: ChampionAchievement[]
      total: number
    }>
  }

  async createAchievement(championId: string, body: ChampionAchievementPayload) {
    const res = await fetch(
      getBackendApiUrl(
        `champions/${encodeURIComponent(championId)}/achievements`
      ),
      {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      message: string
      achievement: ChampionAchievement
    }>
  }

  async updateAchievement(
    championId: string,
    achievementId: string,
    body: Partial<ChampionAchievementPayload>
  ) {
    const res = await fetch(
      getBackendApiUrl(
        `champions/${encodeURIComponent(championId)}/achievements/${encodeURIComponent(achievementId)}`
      ),
      {
        method: "PATCH",
        headers: authHeaders(true),
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      message: string
      achievement: ChampionAchievement
    }>
  }

  async archiveAchievement(championId: string, achievementId: string) {
    const res = await fetch(
      getBackendApiUrl(
        `champions/${encodeURIComponent(championId)}/achievements/${encodeURIComponent(achievementId)}`
      ),
      { method: "DELETE", headers: authHeaders() }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }

  async uploadMedia(file: File) {
    return this.uploadPhoto(file)
  }

  /** M20-S03 — public catalogue (no auth) */
  async listPublic(params: { search?: string; skip?: number; limit?: number } = {}) {
    const qs = new URLSearchParams()
    if (params.search?.trim()) qs.set("search", params.search.trim())
    qs.set("skip", String(params.skip ?? 0))
    qs.set("limit", String(params.limit ?? 48))
    const res = await fetch(
      getBackendApiUrl(`champions/public?${qs.toString()}`),
      { cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      champions: (Champion & { achievement_count?: number })[]
      total: number
    }>
  }

  async getPublic(slugOrId: string) {
    const res = await fetch(
      getBackendApiUrl(`champions/public/${encodeURIComponent(slugOrId)}`),
      { cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      champion: Champion & { achievement_count?: number }
      achievements: ChampionAchievement[]
    }>
  }
}

export const championAPI = new ChampionAPI()

export function championStatusLabel(v?: string | null) {
  return CHAMPION_STATUSES.find((s) => s.value === v)?.label || v || "—"
}

export function recognitionLevelLabel(v?: string | null) {
  return RECOGNITION_LEVELS.find((s) => s.value === v)?.label || v || "—"
}
