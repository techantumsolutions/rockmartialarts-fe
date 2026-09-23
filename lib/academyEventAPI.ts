import { getBackendApiUrl } from "./config"
import { TokenManager } from "./tokenManager"

export const ACADEMY_EVENT_TYPES = [
  { value: "event", label: "Event" },
  { value: "seminar", label: "Seminar" },
  { value: "workshop", label: "Workshop" },
] as const

export const ACADEMY_EVENT_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
] as const

/** Hours-before offsets allowed for SMS reminders (M17-S06) */
export const ACADEMY_EVENT_REMINDER_OFFSETS = [72, 48, 24, 12, 6, 2, 1] as const

export type AcademyEvent = {
  id: string
  title: string
  slug: string
  event_type?: string
  short_description?: string | null
  description?: string | null
  venue?: string | null
  venue_address?: string | null
  start_at: string
  end_at?: string | null
  branch_id?: string | null
  branch_name?: string | null
  branch_code?: string | null
  fee_inr?: number
  capacity?: number | null
  registrations_count?: number
  seats_remaining?: number | null
  is_full?: boolean
  thumbnail_url?: string | null
  status?: string
  sort_order?: number
  seo_title?: string | null
  seo_description?: string | null
  registration_enabled?: boolean
  registration_open?: boolean
  registration_fields?: AcademyEventRegistrationField[]
  reminders_enabled?: boolean
  reminder_offsets_hours?: number[]
  published_at?: string | null
  created_at?: string
  updated_at?: string
}

export type AcademyEventRegistrationField = {
  key: string
  label: string
  field_type: string
  required: boolean
  enabled: boolean
}

export type AcademyEventPayload = {
  title: string
  slug?: string
  event_type?: string
  short_description?: string
  description?: string
  venue?: string
  venue_address?: string
  start_at: string
  end_at?: string
  branch_id?: string
  fee_inr?: number
  capacity?: number | null
  clear_capacity?: boolean
  thumbnail_url?: string
  status?: string
  sort_order?: number
  seo_title?: string
  seo_description?: string
  registration_enabled?: boolean
  registration_fields?: AcademyEventRegistrationField[]
  reminders_enabled?: boolean
  reminder_offsets_hours?: number[]
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

class AcademyEventAPI {
  async listPublic(params: {
    event_type?: string
    branch_id?: string
    search?: string
    skip?: number
    limit?: number
  } = {}) {
    const qs = new URLSearchParams()
    if (params.event_type && params.event_type !== "all")
      qs.set("event_type", params.event_type)
    if (params.branch_id && params.branch_id !== "all")
      qs.set("branch_id", params.branch_id)
    if (params.search?.trim()) qs.set("search", params.search.trim())
    qs.set("skip", String(params.skip ?? 0))
    qs.set("limit", String(params.limit ?? 50))
    const res = await fetch(
      getBackendApiUrl(`academy-events/public?${qs.toString()}`),
      { headers: { Accept: "application/json" }, cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ events: AcademyEvent[]; total: number }>
  }

  async getPublic(slugOrId: string) {
    const res = await fetch(
      getBackendApiUrl(
        `academy-events/public/${encodeURIComponent(slugOrId)}`
      ),
      { headers: { Accept: "application/json" }, cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ event: AcademyEvent }>
  }

  async list(params: {
    status?: string
    event_type?: string
    branch_id?: string
    search?: string
    skip?: number
    limit?: number
  } = {}) {
    const qs = new URLSearchParams()
    if (params.status && params.status !== "all") qs.set("status", params.status)
    if (params.event_type && params.event_type !== "all")
      qs.set("event_type", params.event_type)
    if (params.branch_id && params.branch_id !== "all")
      qs.set("branch_id", params.branch_id)
    if (params.search?.trim()) qs.set("search", params.search.trim())
    qs.set("skip", String(params.skip ?? 0))
    qs.set("limit", String(params.limit ?? 50))
    const res = await fetch(
      getBackendApiUrl(`academy-events?${qs.toString()}`),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ events: AcademyEvent[]; total: number }>
  }

  async get(id: string) {
    const res = await fetch(
      getBackendApiUrl(`academy-events/${encodeURIComponent(id)}`),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ event: AcademyEvent }>
  }

  async create(body: AcademyEventPayload) {
    const res = await fetch(getBackendApiUrl("academy-events"), {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ message: string; event: AcademyEvent }>
  }

  async update(id: string, body: Partial<AcademyEventPayload>) {
    const res = await fetch(
      getBackendApiUrl(`academy-events/${encodeURIComponent(id)}`),
      {
        method: "PATCH",
        headers: authHeaders(true),
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ message: string; event: AcademyEvent }>
  }

  async archive(id: string) {
    const res = await fetch(
      getBackendApiUrl(`academy-events/${encodeURIComponent(id)}`),
      { method: "DELETE", headers: authHeaders() }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }

  async triggerReminders(
    eventId: string,
    body: { offset_hours?: number[]; dry_run?: boolean } = {}
  ) {
    const res = await fetch(
      getBackendApiUrl(
        `academy-events/${encodeURIComponent(eventId)}/reminders/trigger`
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
      sent: number
      stubbed: number
      failed: number
      skipped: number
      dry_run_count?: number
      dry_run?: boolean
    }>
  }

  async listReminderLogs(params: {
    event_id?: string
    registration_id?: string
    status?: string
    skip?: number
    limit?: number
  } = {}) {
    const qs = new URLSearchParams()
    if (params.event_id) qs.set("event_id", params.event_id)
    if (params.registration_id) qs.set("registration_id", params.registration_id)
    if (params.status) qs.set("status", params.status)
    qs.set("skip", String(params.skip ?? 0))
    qs.set("limit", String(params.limit ?? 50))
    const res = await fetch(
      getBackendApiUrl(`academy-events/reminders/logs?${qs.toString()}`),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      logs: AcademyEventReminderLog[]
      total: number
      skip: number
      limit: number
    }>
  }
}

export type AcademyEventReminderLog = {
  id: string
  event_id?: string
  event_title?: string
  registration_id?: string
  participant_name?: string
  participant_phone?: string
  offset_hours?: number
  channel?: string
  status?: string
  message?: string
  error?: string | null
  created_at?: string
}

export const academyEventAPI = new AcademyEventAPI()

export function academyEventTypeLabel(type?: string | null) {
  return ACADEMY_EVENT_TYPES.find((t) => t.value === type)?.label || type || "—"
}

export function academyEventStatusLabel(status?: string | null) {
  return (
    ACADEMY_EVENT_STATUSES.find((s) => s.value === status)?.label ||
    status ||
    "—"
  )
}

export function formatEventFee(fee?: number | null) {
  if (fee == null || !Number.isFinite(fee) || fee <= 0) return "Free"
  return `₹${Number(fee).toLocaleString("en-IN")}`
}

/** Convert API ISO-ish string to datetime-local input value */
export function toDatetimeLocalValue(iso?: string | null) {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    // already local-like "YYYY-MM-DDTHH:mm"
    return iso.slice(0, 16)
  }
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromDatetimeLocalValue(local: string) {
  if (!local.trim()) return ""
  // Keep as local ISO-like string without forcing Z — backend stores as provided
  return local.trim().length === 16 ? `${local.trim()}:00` : local.trim()
}
