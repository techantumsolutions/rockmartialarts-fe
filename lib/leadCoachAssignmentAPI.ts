import { getBackendApiUrl } from "./config"
import { TokenManager } from "./tokenManager"
import { BranchManagerAuth } from "./branchManagerAuth"
import { getCoachAuthHeaders } from "./coachAuth"
import type { LeadRow } from "./leadAPI"

export type LeadCoachAssignment = {
  id: string
  lead_id: string
  coach_id: string
  coach_name?: string | null
  branch_id?: string | null
  branch_name?: string | null
  lead_name?: string | null
  lead_phone?: string | null
  status: string
  note?: string | null
  assigned_by?: string | null
  assigned_by_name?: string | null
  assigned_at?: string
  responded_at?: string | null
  response_note?: string | null
  decline_reason?: string | null
}

export type EligibleCoach = {
  id: string
  full_name: string
  email?: string | null
  phone?: string | null
  branch_id?: string | null
  service_location_ids?: string[]
  preferred?: boolean
}

function adminHeaders(json = false): HeadersInit {
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

class LeadCoachAssignmentAPI {
  async eligibleCoaches(leadId: string) {
    const res = await fetch(
      getBackendApiUrl(`leads/${encodeURIComponent(leadId)}/eligible-coaches`),
      { headers: adminHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      coaches: EligibleCoach[]
      preferred_count: number
      branch_id?: string | null
    }>
  }

  async get(leadId: string) {
    const res = await fetch(
      getBackendApiUrl(`leads/${encodeURIComponent(leadId)}/coach-assignment`),
      { headers: adminHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      lead: LeadRow
      assignment: LeadCoachAssignment | null
      history: LeadCoachAssignment[]
    }>
  }

  async assign(leadId: string, coachId: string, note?: string) {
    const res = await fetch(
      getBackendApiUrl(`leads/${encodeURIComponent(leadId)}/coach-assignment`),
      {
        method: "POST",
        headers: adminHeaders(true),
        body: JSON.stringify({ coach_id: coachId, note: note || null }),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      message: string
      assignment: LeadCoachAssignment
      lead: LeadRow
    }>
  }

  async cancel(leadId: string, assignmentId?: string) {
    const qs = assignmentId
      ? `?assignment_id=${encodeURIComponent(assignmentId)}`
      : ""
    const res = await fetch(
      getBackendApiUrl(
        `leads/${encodeURIComponent(leadId)}/coach-assignment/cancel${qs}`
      ),
      { method: "POST", headers: adminHeaders(true) }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }

  async myAssignments(status = "pending", skip = 0, limit = 25) {
    const qs = new URLSearchParams({
      status,
      skip: String(skip),
      limit: String(limit),
    })
    const res = await fetch(
      getBackendApiUrl(`lead-coach-assignments/me?${qs.toString()}`),
      { headers: { ...getCoachAuthHeaders(), "Cache-Control": "no-cache" }, cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      assignments: LeadCoachAssignment[]
      total: number
    }>
  }

  async accept(assignmentId: string, note?: string) {
    const res = await fetch(
      getBackendApiUrl(
        `lead-coach-assignments/${encodeURIComponent(assignmentId)}/accept`
      ),
      {
        method: "POST",
        headers: { ...getCoachAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ note: note || null }),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }

  async decline(assignmentId: string, reason?: string, note?: string) {
    const res = await fetch(
      getBackendApiUrl(
        `lead-coach-assignments/${encodeURIComponent(assignmentId)}/decline`
      ),
      {
        method: "POST",
        headers: { ...getCoachAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || null, note: note || null }),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }
}

export const leadCoachAssignmentAPI = new LeadCoachAssignmentAPI()

export function assignmentStatusLabel(status?: string | null) {
  const s = (status || "").toLowerCase()
  const map: Record<string, string> = {
    pending: "Pending",
    accepted: "Accepted",
    declined: "Declined",
    cancelled: "Cancelled",
    superseded: "Superseded",
  }
  return map[s] || status || "Unassigned"
}
