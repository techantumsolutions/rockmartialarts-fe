import { getBackendApiUrl } from "./config"
import { TokenManager } from "./tokenManager"
import { BranchManagerAuth } from "./branchManagerAuth"

export const CALLBACK_STATUSES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const

export const CALLBACK_PRIORITIES = [
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const

export type CallbackRow = {
  id: string
  name: string
  phone: string
  email?: string | null
  branch_id?: string | null
  branch_name?: string | null
  preferred_time?: string | null
  preferred_date?: string | null
  message?: string | null
  course_interest?: string | null
  priority: string
  highlight?: boolean
  status: string
  admin_note?: string | null
  lead_id?: string | null
  created_at?: string
  contacted_at?: string | null
  completed_at?: string | null
}

export type CallbackCreatePayload = {
  name: string
  phone: string
  email?: string
  branch_id?: string
  branch_name?: string
  preferred_time?: string
  preferred_date?: string
  message?: string
  priority?: string
  course_interest?: string
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

class CallbackAPI {
  async create(payload: CallbackCreatePayload) {
    const res = await fetch(getBackendApiUrl("callbacks"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ message: string; callback: CallbackRow }>
  }

  async list(params: {
    status?: string
    priority?: string
    highlight_only?: boolean
    search?: string
    branch_id?: string
    skip?: number
    limit?: number
  } = {}) {
    const qs = new URLSearchParams()
    if (params.status && params.status !== "all") qs.set("status", params.status)
    if (params.priority && params.priority !== "all") qs.set("priority", params.priority)
    if (params.highlight_only) qs.set("highlight_only", "true")
    if (params.search?.trim()) qs.set("search", params.search.trim())
    if (params.branch_id && params.branch_id !== "all") qs.set("branch_id", params.branch_id)
    qs.set("skip", String(params.skip ?? 0))
    qs.set("limit", String(params.limit ?? 25))
    const res = await fetch(getBackendApiUrl(`callbacks?${qs.toString()}`), {
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ callbacks: CallbackRow[]; total: number }>
  }

  async summary() {
    const res = await fetch(getBackendApiUrl("callbacks/summary"), {
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      total: number
      highlighted: number
      open: number
      by_status: Record<string, number>
      by_priority: Record<string, number>
    }>
  }

  async updateStatus(id: string, status: string, admin_note?: string) {
    const res = await fetch(
      getBackendApiUrl(`callbacks/${encodeURIComponent(id)}/status`),
      {
        method: "PATCH",
        headers: authHeaders(true),
        body: JSON.stringify({ status, admin_note: admin_note || null }),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }

  async update(
    id: string,
    body: { priority?: string; highlight?: boolean; admin_note?: string }
  ) {
    const res = await fetch(getBackendApiUrl(`callbacks/${encodeURIComponent(id)}`), {
      method: "PATCH",
      headers: authHeaders(true),
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }
}

export const callbackAPI = new CallbackAPI()

export function callbackStatusLabel(status?: string) {
  return CALLBACK_STATUSES.find((s) => s.value === status)?.label || status || "—"
}

export function callbackPriorityLabel(priority?: string) {
  return CALLBACK_PRIORITIES.find((p) => p.value === priority)?.label || priority || "—"
}
