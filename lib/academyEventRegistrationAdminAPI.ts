import { getBackendApiUrl } from "./config"
import { TokenManager } from "./tokenManager"
import { BranchManagerAuth } from "./branchManagerAuth"
import type { AcademyEventRegistration } from "./academyEventRegistrationAPI"
import { registrationStatusLabel } from "./academyEventRegistrationAPI"

export { registrationStatusLabel }

export const EVENT_REGISTRATION_STATUSES = [
  { value: "pending_payment", label: "Awaiting payment" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "expired", label: "Expired" },
  { value: "failed", label: "Failed" },
] as const

export const ALLOWED_ADMIN_REGISTRATION_TRANSITIONS: Record<string, string[]> = {
  pending_payment: ["cancelled", "expired"],
  confirmed: ["cancelled"],
  failed: ["cancelled"],
  expired: [],
  cancelled: [],
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

export type EventRegistrationListParams = {
  event_id?: string
  branch_id?: string
  status?: string
  payment_status?: string
  from?: string
  to?: string
  search?: string
  skip?: number
  limit?: number
}

class AcademyEventRegistrationAdminAPI {
  async list(params: EventRegistrationListParams = {}) {
    const qs = new URLSearchParams()
    if (params.event_id) qs.set("event_id", params.event_id)
    if (params.branch_id) qs.set("branch_id", params.branch_id)
    if (params.status) qs.set("status", params.status)
    if (params.payment_status) qs.set("payment_status", params.payment_status)
    if (params.from) qs.set("from", params.from)
    if (params.to) qs.set("to", params.to)
    if (params.search) qs.set("search", params.search)
    qs.set("skip", String(params.skip ?? 0))
    qs.set("limit", String(params.limit ?? 50))
    const res = await fetch(
      getBackendApiUrl(`academy-event-registration-admin?${qs.toString()}`),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      registrations: AcademyEventRegistration[]
      total: number
      count: number
    }>
  }

  async summary(params: { branch_id?: string; event_id?: string } = {}) {
    const qs = new URLSearchParams()
    if (params.branch_id) qs.set("branch_id", params.branch_id)
    if (params.event_id) qs.set("event_id", params.event_id)
    const suffix = qs.toString() ? `?${qs.toString()}` : ""
    const res = await fetch(
      getBackendApiUrl(`academy-event-registration-admin/summary${suffix}`),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      total: number
      by_status: Record<string, number>
      by_payment_status: Record<string, number>
    }>
  }

  async get(id: string) {
    const res = await fetch(
      getBackendApiUrl(
        `academy-event-registration-admin/${encodeURIComponent(id)}`
      ),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ registration: AcademyEventRegistration }>
  }

  async updateStatus(id: string, status: string, note?: string) {
    const res = await fetch(
      getBackendApiUrl(
        `academy-event-registration-admin/${encodeURIComponent(id)}/status`
      ),
      {
        method: "PATCH",
        headers: authHeaders(true),
        body: JSON.stringify({ status, note: note || null }),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      message: string
      registration: AcademyEventRegistration
    }>
  }

  async export(params: EventRegistrationListParams = {}) {
    const qs = new URLSearchParams()
    if (params.event_id) qs.set("event_id", params.event_id)
    if (params.branch_id) qs.set("branch_id", params.branch_id)
    if (params.status) qs.set("status", params.status)
    if (params.payment_status) qs.set("payment_status", params.payment_status)
    if (params.from) qs.set("from", params.from)
    if (params.to) qs.set("to", params.to)
    if (params.search) qs.set("search", params.search)
    const res = await fetch(
      getBackendApiUrl(
        `academy-event-registration-admin/export?${qs.toString()}`
      ),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      content: string
      filename: string
      content_type: string
      total: number
    }>
  }
}

export const academyEventRegistrationAdminAPI =
  new AcademyEventRegistrationAdminAPI()
