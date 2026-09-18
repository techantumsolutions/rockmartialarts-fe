import { getBackendApiUrl } from "./config"
import { TokenManager } from "./tokenManager"
import { BranchManagerAuth } from "./branchManagerAuth"

export type DemoRecurrence = "daily" | "weekly"

export const DEFAULT_DEMO_FEE_INR = 300

export const DEMO_WEEKDAYS = [
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
  { value: "saturday", label: "Sat" },
  { value: "sunday", label: "Sun" },
] as const

export type DemoSchedule = {
  id: string
  title?: string | null
  branch_id: string
  branch_name?: string | null
  course_id: string
  course_name?: string | null
  recurrence: DemoRecurrence
  weekdays: string[]
  start_time: string
  end_time: string
  capacity?: number | null
  fee_inr: number
  effective_from?: string | null
  effective_until?: string | null
  is_active: boolean
  notes?: string | null
  created_at?: string
  updated_at?: string
}

export type DemoScheduleCreatePayload = {
  title?: string | null
  branch_id: string
  course_id: string
  recurrence: DemoRecurrence
  weekdays?: string[]
  start_time: string
  end_time: string
  capacity?: number | null
  fee_inr?: number
  effective_from?: string | null
  effective_until?: string | null
  is_active?: boolean
  notes?: string | null
}

export type DemoScheduleUpdatePayload = Partial<DemoScheduleCreatePayload> & {
  clear_capacity?: boolean
  clear_effective_until?: boolean
}

function authHeaders(json = false): HeadersInit {
  const token = BranchManagerAuth.getToken() || TokenManager.getToken()
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

export function weekdayLabels(days?: string[] | null) {
  if (!days?.length) return "—"
  const map = Object.fromEntries(DEMO_WEEKDAYS.map((d) => [d.value, d.label]))
  return days.map((d) => map[d] || d).join(", ")
}

class DemoScheduleAPI {
  async list(
    params: {
      branch_id?: string
      course_id?: string
      is_active?: boolean
      search?: string
      skip?: number
      limit?: number
    } = {}
  ) {
    const qs = new URLSearchParams()
    if (params.branch_id) qs.set("branch_id", params.branch_id)
    if (params.course_id) qs.set("course_id", params.course_id)
    if (params.is_active !== undefined) qs.set("is_active", String(params.is_active))
    if (params.search) qs.set("search", params.search)
    qs.set("skip", String(params.skip ?? 0))
    qs.set("limit", String(params.limit ?? 50))
    const res = await fetch(getBackendApiUrl(`demo-schedules?${qs.toString()}`), {
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      schedules: DemoSchedule[]
      total: number
      count: number
    }>
  }

  async get(id: string) {
    const res = await fetch(getBackendApiUrl(`demo-schedules/${encodeURIComponent(id)}`), {
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ schedule: DemoSchedule }>
  }

  async create(payload: DemoScheduleCreatePayload) {
    const res = await fetch(getBackendApiUrl("demo-schedules"), {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ message: string; schedule: DemoSchedule }>
  }

  async update(id: string, payload: DemoScheduleUpdatePayload) {
    const res = await fetch(getBackendApiUrl(`demo-schedules/${encodeURIComponent(id)}`), {
      method: "PATCH",
      headers: authHeaders(true),
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ message: string; schedule: DemoSchedule }>
  }

  async deactivate(id: string) {
    const res = await fetch(getBackendApiUrl(`demo-schedules/${encodeURIComponent(id)}`), {
      method: "DELETE",
      headers: authHeaders(),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ message: string; schedule?: DemoSchedule }>
  }
}

export const demoScheduleAPI = new DemoScheduleAPI()
