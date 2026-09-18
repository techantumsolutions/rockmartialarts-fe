import { getBackendApiUrl } from "./config"
import { TokenManager } from "./tokenManager"

export const PROMOTION_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "archived", label: "Archived" },
] as const

export const PROMOTION_CTA_TYPES = [
  { value: "none", label: "No CTA" },
  { value: "url", label: "External URL" },
  { value: "path", label: "In-app path" },
] as const

export const PROMOTION_MEDIA_TYPES = [
  { value: "none", label: "None" },
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
] as const

export type PromotionTarget = {
  mode: "all" | "targeted"
  student_ids: string[]
  branch_ids: string[]
  course_ids: string[]
  group_ids: string[]
}

export type StudentPromotion = {
  id: string
  title: string
  slug?: string
  short_description?: string | null
  description?: string | null
  banner_url?: string | null
  banner_media_type?: string
  cta_label?: string | null
  cta_type?: string
  cta_url?: string | null
  start_at?: string | null
  end_at?: string | null
  status?: string
  is_active?: boolean
  in_schedule?: boolean
  is_live?: boolean
  priority?: number
  target?: PromotionTarget
  target_summary?: {
    mode?: string
    student_count?: number
    branch_count?: number
    course_count?: number
    group_count?: number
  }
  created_at?: string
  updated_at?: string
}

export type StudentPromotionPayload = {
  title: string
  slug?: string
  short_description?: string
  description?: string
  banner_url?: string
  banner_media_type?: string
  cta_label?: string
  cta_type?: string
  cta_url?: string
  start_at?: string
  end_at?: string
  status?: string
  priority?: number
  is_active?: boolean
  target?: PromotionTarget
  clear_banner?: boolean
  clear_cta?: boolean
  clear_dates?: boolean
}

export type TargetingOptions = {
  branches: { id: string; name: string; code?: string | null }[]
  courses: { id: string; name: string; code?: string | null }[]
  groups: { id: string; name: string; source?: string }[]
  students: {
    id: string
    name: string
    email?: string | null
    phone?: string | null
    batch_ref?: string | null
  }[]
}

export const EMPTY_PROMOTION_TARGET: PromotionTarget = {
  mode: "all",
  student_ids: [],
  branch_ids: [],
  course_ids: [],
  group_ids: [],
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

class StudentPromotionAPI {
  async list(
    params: {
      status?: string
      search?: string
      skip?: number
      limit?: number
      include_archived?: boolean
      live_only?: boolean
    } = {}
  ) {
    const qs = new URLSearchParams()
    if (params.status && params.status !== "all") qs.set("status", params.status)
    if (params.search?.trim()) qs.set("search", params.search.trim())
    if (params.include_archived) qs.set("include_archived", "true")
    if (params.live_only) qs.set("live_only", "true")
    qs.set("skip", String(params.skip ?? 0))
    qs.set("limit", String(params.limit ?? 50))
    const res = await fetch(
      getBackendApiUrl(`student-promotions?${qs.toString()}`),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ promotions: StudentPromotion[]; total: number }>
  }

  async get(id: string) {
    const res = await fetch(
      getBackendApiUrl(`student-promotions/${encodeURIComponent(id)}`),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ promotion: StudentPromotion }>
  }

  async create(body: StudentPromotionPayload) {
    const res = await fetch(getBackendApiUrl("student-promotions"), {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ message: string; promotion: StudentPromotion }>
  }

  async update(id: string, body: Partial<StudentPromotionPayload>) {
    const res = await fetch(
      getBackendApiUrl(`student-promotions/${encodeURIComponent(id)}`),
      {
        method: "PATCH",
        headers: authHeaders(true),
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ message: string; promotion: StudentPromotion }>
  }

  async archive(id: string) {
    const res = await fetch(
      getBackendApiUrl(`student-promotions/${encodeURIComponent(id)}`),
      { method: "DELETE", headers: authHeaders() }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }

  async uploadBanner(file: File) {
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

  async targetingOptions(params: { student_search?: string; student_limit?: number } = {}) {
    const qs = new URLSearchParams()
    if (params.student_search?.trim()) qs.set("student_search", params.student_search.trim())
    if (params.student_limit) qs.set("student_limit", String(params.student_limit))
    const q = qs.toString()
    const res = await fetch(
      getBackendApiUrl(`student-promotions/targeting/options${q ? `?${q}` : ""}`),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<TargetingOptions>
  }

  async previewEligibility(body: {
    target?: PromotionTarget
    promotion_id?: string
    sample_limit?: number
  }) {
    const res = await fetch(
      getBackendApiUrl("student-promotions/eligibility/preview"),
      {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      eligible_count: number
      sample: { id: string; name?: string; email?: string | null; phone?: string | null }[]
      target: PromotionTarget
      has_filters?: boolean
      mode?: string
    }>
  }

  async checkEligibility(body: {
    student_id: string
    target?: PromotionTarget
    promotion_id?: string
  }) {
    const res = await fetch(
      getBackendApiUrl("student-promotions/eligibility/check"),
      {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ student_id: string; eligible: boolean }>
  }

  /** M19-S03 — live promotions for the authenticated student */
  async myEligible(params: { exclude_dismissed?: boolean; limit?: number } = {}) {
    const qs = new URLSearchParams()
    if (params.exclude_dismissed === false) qs.set("exclude_dismissed", "false")
    qs.set("limit", String(params.limit ?? 5))
    const res = await fetch(
      getBackendApiUrl(`student-promotions/me/eligible?${qs.toString()}`),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      promotions: StudentPromotion[]
      total: number
      student_id: string
    }>
  }

  async recordMyEvent(body: {
    promotion_id: string
    event_type: "view" | "cta" | "dismiss"
    meta?: Record<string, unknown>
  }) {
    const res = await fetch(getBackendApiUrl("student-promotions/me/events"), {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      message: string
      event: { id?: string; event_type: string; deduped?: boolean }
    }>
  }
}

export const studentPromotionAPI = new StudentPromotionAPI()

export function promotionStatusLabel(v?: string | null) {
  return PROMOTION_STATUSES.find((s) => s.value === v)?.label || v || "—"
}

export function toDatetimeLocalValue(iso?: string | null) {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromDatetimeLocalValue(local: string) {
  if (!local.trim()) return ""
  return local.trim().length === 16 ? `${local.trim()}:00` : local.trim()
}
