import { getBackendApiUrl } from "./config"
import { TokenManager } from "./tokenManager"
import { BranchManagerAuth } from "./branchManagerAuth"
import { getCoachAuthHeaders } from "./coachAuth"

export const SESSION_STATUSES = [
  { value: "scheduled", label: "Scheduled" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const

export type SessionBooking = {
  id: string
  coach_id: string
  coach_name?: string | null
  branch_id?: string | null
  branch_name?: string | null
  session_date: string
  start_time: string
  end_time: string
  status: string
  lead_id?: string | null
  participant_name?: string | null
  participant_phone?: string | null
  notes?: string | null
  cancellation_reason?: string | null
  created_at?: string
}

export type SessionSlot = {
  coach_id: string
  session_date: string
  weekday?: string
  start_time: string
  end_time: string
  branch_id?: string | null
  branch_name?: string | null
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

class CoachSessionBookingAPI {
  async list(params: {
    status?: string
    coach_id?: string
    lead_id?: string
    search?: string
    date_from?: string
    date_to?: string
    skip?: number
    limit?: number
  } = {}) {
    const qs = new URLSearchParams()
    if (params.status && params.status !== "all") qs.set("status", params.status)
    if (params.coach_id) qs.set("coach_id", params.coach_id)
    if (params.lead_id) qs.set("lead_id", params.lead_id)
    if (params.search?.trim()) qs.set("search", params.search.trim())
    if (params.date_from) qs.set("date_from", params.date_from)
    if (params.date_to) qs.set("date_to", params.date_to)
    qs.set("skip", String(params.skip ?? 0))
    qs.set("limit", String(params.limit ?? 25))
    const res = await fetch(
      getBackendApiUrl(`coach-session-bookings?${qs.toString()}`),
      { headers: adminHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ bookings: SessionBooking[]; total: number }>
  }

  async summary() {
    const res = await fetch(getBackendApiUrl("coach-session-bookings/summary"), {
      headers: adminHeaders(),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      total: number
      upcoming: number
      by_status: Record<string, number>
    }>
  }

  async leadSlots(leadId: string, coachId?: string) {
    const qs = new URLSearchParams()
    if (coachId) qs.set("coach_id", coachId)
    const res = await fetch(
      getBackendApiUrl(
        `leads/${encodeURIComponent(leadId)}/coach-session-slots?${qs.toString()}`
      ),
      { headers: adminHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ slots: SessionSlot[]; coach_id: string; total: number }>
  }

  async leadBookings(leadId: string) {
    const res = await fetch(
      getBackendApiUrl(
        `leads/${encodeURIComponent(leadId)}/coach-session-bookings`
      ),
      { headers: adminHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ bookings: SessionBooking[] }>
  }

  async bookForLead(
    leadId: string,
    body: {
      coach_id: string
      session_date: string
      start_time: string
      end_time: string
      branch_id?: string
      notes?: string
    }
  ) {
    const res = await fetch(
      getBackendApiUrl(
        `leads/${encodeURIComponent(leadId)}/coach-session-bookings`
      ),
      {
        method: "POST",
        headers: adminHeaders(true),
        body: JSON.stringify({ ...body, lead_id: leadId, source_type: "lead" }),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ message: string; booking: SessionBooking }>
  }

  async updateStatus(
    id: string,
    status: string,
    opts?: { notes?: string; cancellation_reason?: string }
  ) {
    const res = await fetch(
      getBackendApiUrl(
        `coach-session-bookings/${encodeURIComponent(id)}/status`
      ),
      {
        method: "PATCH",
        headers: adminHeaders(true),
        body: JSON.stringify({
          status,
          notes: opts?.notes || null,
          cancellation_reason: opts?.cancellation_reason || null,
        }),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }

  async mySchedule(dateFrom?: string, dateTo?: string) {
    const qs = new URLSearchParams()
    if (dateFrom) qs.set("from", dateFrom)
    if (dateTo) qs.set("to", dateTo)
    const res = await fetch(
      getBackendApiUrl(`coaches/me/schedule?${qs.toString()}`),
      {
        headers: { ...getCoachAuthHeaders(), "Cache-Control": "no-cache" },
        cache: "no-store",
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      bookings: SessionBooking[]
      open_slots: SessionSlot[]
      total: number
    }>
  }

  async coachUpdateStatus(
    id: string,
    status: string,
    opts?: { cancellation_reason?: string }
  ) {
    const res = await fetch(
      getBackendApiUrl(
        `coach-session-bookings/${encodeURIComponent(id)}/status`
      ),
      {
        method: "PATCH",
        headers: { ...getCoachAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          cancellation_reason: opts?.cancellation_reason || null,
        }),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }
}

export const coachSessionBookingAPI = new CoachSessionBookingAPI()

export function sessionStatusLabel(status?: string | null) {
  return SESSION_STATUSES.find((s) => s.value === status)?.label || status || "—"
}
