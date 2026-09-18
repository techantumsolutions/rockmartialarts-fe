import { getBackendApiUrl } from "./config"
import { TokenManager } from "./tokenManager"
import { BranchManagerAuth } from "./branchManagerAuth"

export const COACH_APPROVAL_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
] as const

export type CoachApprovalStatus = (typeof COACH_APPROVAL_STATUSES)[number]["value"]

export type CoachApprovalRow = {
  id: string
  full_name?: string
  email?: string
  phone?: string
  is_active?: boolean
  approval_status?: string | null
  registration_source?: string | null
  service_location_ids?: string[]
  service_location_names?: string[]
  areas_of_expertise?: string[]
  profile_image_url?: string | null
  about_short?: string | null
  branch_id?: string | null
  created_at?: string
  updated_at?: string
  personal_info?: {
    first_name?: string
    last_name?: string
    gender?: string
    date_of_birth?: string
  }
  contact_info?: {
    email?: string
    phone?: string
    country_code?: string
  }
  address_info?: {
    address?: string
    city?: string
    state?: string
    country?: string
  }
  professional_info?: {
    professional_experience?: string
    education_qualification?: string
    designation_id?: string
  }
}

export type ApprovalHistoryEntry = {
  id: string
  coach_id: string
  from_status?: string | null
  to_status: string
  action: string
  note?: string | null
  is_active_before?: boolean | null
  is_active_after?: boolean | null
  actor_id?: string | null
  actor_name?: string | null
  actor_role?: string | null
  created_at?: string
}

export type ApprovalSummary = {
  total: number
  by_status: Record<string, number>
  pending: number
  approved: number
  rejected: number
  active: number
  inactive: number
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

class CoachApprovalAPI {
  async list(params: {
    approval_status?: string
    is_active?: boolean
    registration_source?: string
    search?: string
    skip?: number
    limit?: number
  } = {}) {
    const qs = new URLSearchParams()
    if (params.approval_status && params.approval_status !== "all") {
      qs.set("approval_status", params.approval_status)
    }
    if (typeof params.is_active === "boolean") {
      qs.set("is_active", String(params.is_active))
    }
    if (params.registration_source && params.registration_source !== "all") {
      qs.set("registration_source", params.registration_source)
    }
    if (params.search?.trim()) qs.set("search", params.search.trim())
    qs.set("skip", String(params.skip ?? 0))
    qs.set("limit", String(params.limit ?? 25))

    const res = await fetch(getBackendApiUrl(`coaches/approvals?${qs.toString()}`), {
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      coaches: CoachApprovalRow[]
      total: number
      skip: number
      limit: number
    }>
  }

  async summary() {
    const res = await fetch(getBackendApiUrl("coaches/approvals/summary"), {
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<ApprovalSummary>
  }

  async detail(coachId: string) {
    const res = await fetch(
      getBackendApiUrl(`coaches/approvals/${encodeURIComponent(coachId)}`),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      coach: CoachApprovalRow
      approval_history: ApprovalHistoryEntry[]
    }>
  }

  async approve(coachId: string, note?: string) {
    const res = await fetch(
      getBackendApiUrl(`coaches/${encodeURIComponent(coachId)}/approve`),
      {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ note: note || null }),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }

  async reject(coachId: string, note?: string) {
    const res = await fetch(
      getBackendApiUrl(`coaches/${encodeURIComponent(coachId)}/reject`),
      {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ note: note || null }),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }

  async setActive(coachId: string, isActive: boolean, note?: string) {
    const res = await fetch(
      getBackendApiUrl(`coaches/${encodeURIComponent(coachId)}/active-status`),
      {
        method: "PATCH",
        headers: authHeaders(true),
        body: JSON.stringify({ is_active: isActive, note: note || null }),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }

  async history(coachId: string) {
    const res = await fetch(
      getBackendApiUrl(`coaches/${encodeURIComponent(coachId)}/approval-history`),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      coach_id: string
      approval_history: ApprovalHistoryEntry[]
    }>
  }
}

export const coachApprovalAPI = new CoachApprovalAPI()

export function approvalStatusLabel(status?: string | null) {
  const s = (status || "approved").toLowerCase()
  const found = COACH_APPROVAL_STATUSES.find((x) => x.value === s)
  return found?.label || s
}
