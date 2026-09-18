import { getBackendApiUrl } from "./config"
import { TokenManager } from "./tokenManager"
import { BranchManagerAuth } from "./branchManagerAuth"

export const LEAD_STATUSES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
] as const

export const LEAD_FOLLOW_UP_ACTIONS = [
  { value: "note", label: "Note" },
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "scheduled", label: "Scheduled" },
  { value: "other", label: "Other" },
] as const

export type LeadStatus = (typeof LEAD_STATUSES)[number]["value"]

export type LeadRow = {
  id: string
  name: string
  phone: string
  email?: string
  course?: string
  branch_name?: string | null
  branch_id?: string | null
  source?: string | null
  source_type?: string | null
  source_ref_id?: string | null
  message?: string | null
  capture_count?: number
  duplicate_merged?: boolean
  status?: string | null
  next_follow_up_at?: string | null
  last_follow_up_at?: string | null
  last_follow_up_note?: string | null
  coach_assignment_id?: string | null
  assigned_coach_id?: string | null
  assigned_coach_name?: string | null
  coach_assignment_status?: string | null
  next_session_booking_id?: string | null
  next_session_at?: string | null
  session_booking_status?: string | null
  created_at?: string
}

export type LeadFollowUp = {
  id: string
  lead_id: string
  action: string
  note?: string | null
  from_status?: string | null
  to_status?: string | null
  next_follow_up_at?: string | null
  actor_id?: string | null
  actor_name?: string | null
  actor_role?: string | null
  created_at?: string
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

class LeadAPI {
  async list(params: {
    status?: string
    source_type?: string
    search?: string
    branch_id?: string
    follow_up_due?: string
    sort?: string
    coach_assignment_status?: string
    unassigned_coach?: boolean
    skip?: number
    limit?: number
  } = {}) {
    const qs = new URLSearchParams()
    if (params.status && params.status !== "all") qs.set("status", params.status)
    if (params.source_type && params.source_type !== "all")
      qs.set("source_type", params.source_type)
    if (params.search?.trim()) qs.set("search", params.search.trim())
    if (params.branch_id && params.branch_id !== "all") qs.set("branch_id", params.branch_id)
    if (params.follow_up_due && params.follow_up_due !== "all")
      qs.set("follow_up_due", params.follow_up_due)
    if (params.sort) qs.set("sort", params.sort)
    if (params.coach_assignment_status && params.coach_assignment_status !== "all")
      qs.set("coach_assignment_status", params.coach_assignment_status)
    if (params.unassigned_coach) qs.set("unassigned_coach", "true")
    qs.set("skip", String(params.skip ?? 0))
    qs.set("limit", String(params.limit ?? 25))
    const res = await fetch(getBackendApiUrl(`leads?${qs.toString()}`), {
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ leads: LeadRow[]; total: number }>
  }

  async sources() {
    const res = await fetch(getBackendApiUrl("leads/sources"), {
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      sources: { value: string; label: string; count: number }[]
    }>
  }

  async summary() {
    const res = await fetch(getBackendApiUrl("leads/summary"), {
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      total: number
      open: number
      overdue: number
      due_today: number
      by_status: Record<string, number>
    }>
  }

  async get(id: string) {
    const res = await fetch(getBackendApiUrl(`leads/${encodeURIComponent(id)}`), {
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ lead: LeadRow; follow_ups: LeadFollowUp[] }>
  }

  async updateStatus(id: string, status: string, note?: string) {
    const res = await fetch(getBackendApiUrl(`leads/${encodeURIComponent(id)}`), {
      method: "PATCH",
      headers: authHeaders(true),
      body: JSON.stringify({ status, note: note || null }),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<LeadRow>
  }

  async createFollowUp(
    id: string,
    body: {
      note?: string
      action?: string
      status?: string
      next_follow_up_at?: string | null
      clear_next_follow_up?: boolean
    }
  ) {
    const res = await fetch(
      getBackendApiUrl(`leads/${encodeURIComponent(id)}/follow-ups`),
      {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      message: string
      lead: LeadRow
      follow_up: LeadFollowUp
    }>
  }
}

export const leadAPI = new LeadAPI()

export function leadStatusLabel(status?: string | null) {
  return LEAD_STATUSES.find((s) => s.value === status)?.label || status || "—"
}
