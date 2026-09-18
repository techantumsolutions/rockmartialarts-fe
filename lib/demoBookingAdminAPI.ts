import { getBackendApiUrl } from "./config"
import { TokenManager } from "./tokenManager"
import { BranchManagerAuth } from "./branchManagerAuth"
import type { DemoBooking } from "./demoSessionAPI"

export const DEMO_BOOKING_STATUSES = [
  { value: "pending_payment", label: "Awaiting payment" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "expired", label: "Expired" },
  { value: "failed", label: "Failed" },
] as const

export const ALLOWED_ADMIN_BOOKING_TRANSITIONS: Record<string, string[]> = {
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

export type DemoBookingListParams = {
  branch_id?: string
  course_id?: string
  status?: string
  payment_status?: string
  from?: string
  to?: string
  search?: string
  skip?: number
  limit?: number
}

class DemoBookingAdminAPI {
  async list(params: DemoBookingListParams = {}) {
    const qs = new URLSearchParams()
    if (params.branch_id) qs.set("branch_id", params.branch_id)
    if (params.course_id) qs.set("course_id", params.course_id)
    if (params.status) qs.set("status", params.status)
    if (params.payment_status) qs.set("payment_status", params.payment_status)
    if (params.from) qs.set("from", params.from)
    if (params.to) qs.set("to", params.to)
    if (params.search) qs.set("search", params.search)
    qs.set("skip", String(params.skip ?? 0))
    qs.set("limit", String(params.limit ?? 50))
    const res = await fetch(getBackendApiUrl(`demo-bookings?${qs.toString()}`), {
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      bookings: DemoBooking[]
      total: number
      count: number
    }>
  }

  async summary(params: { branch_id?: string } = {}) {
    const qs = new URLSearchParams()
    if (params.branch_id) qs.set("branch_id", params.branch_id)
    const suffix = qs.toString() ? `?${qs.toString()}` : ""
    const res = await fetch(getBackendApiUrl(`demo-bookings/summary${suffix}`), {
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      total: number
      by_status: Record<string, number>
      by_payment_status: Record<string, number>
    }>
  }

  async get(id: string) {
    const res = await fetch(
      getBackendApiUrl(`demo-bookings/${encodeURIComponent(id)}`),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ booking: DemoBooking }>
  }

  async updateStatus(id: string, status: string, note?: string) {
    const res = await fetch(
      getBackendApiUrl(`demo-bookings/${encodeURIComponent(id)}/status`),
      {
        method: "PATCH",
        headers: authHeaders(true),
        body: JSON.stringify({ status, note: note || null }),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ message: string; booking: DemoBooking }>
  }

  async export(params: DemoBookingListParams = {}) {
    const qs = new URLSearchParams()
    if (params.branch_id) qs.set("branch_id", params.branch_id)
    if (params.course_id) qs.set("course_id", params.course_id)
    if (params.status) qs.set("status", params.status)
    if (params.payment_status) qs.set("payment_status", params.payment_status)
    if (params.from) qs.set("from", params.from)
    if (params.to) qs.set("to", params.to)
    if (params.search) qs.set("search", params.search)
    const res = await fetch(getBackendApiUrl(`demo-bookings/export?${qs.toString()}`), {
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      content: string
      filename: string
      content_type: string
      total: number
    }>
  }
}

export const demoBookingAdminAPI = new DemoBookingAdminAPI()
