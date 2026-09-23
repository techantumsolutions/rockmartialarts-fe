import { getBackendApiUrl } from "@/lib/config"
import { TokenManager } from "@/lib/tokenManager"

export type BillingCycle = {
  id: string
  enrollment_id: string
  student_id?: string
  branch_id?: string | null
  course_id?: string | null
  payment_id?: string | null
  period_start?: string | null
  period_end?: string | null
  next_due_date?: string | null
  anchor_day?: number
  duration_months?: number
  status?: string
  amount_hint?: number | null
  course_name?: string | null
  branch_name?: string | null
  validity_end_date?: string | null
}

function authHeaders(token?: string | null): HeadersInit {
  const t = token || TokenManager.getToken()
  const headers: Record<string, string> = { Accept: "application/json" }
  if (t) headers.Authorization = `Bearer ${t}`
  return headers
}

async function parseError(res: Response): Promise<string> {
  const data = await res.json().catch(() => ({}))
  if (typeof data?.detail === "string") return data.detail
  return data?.message || res.statusText || "Request failed"
}

export const billingAPI = {
  async list(params?: {
    skip?: number
    limit?: number
    enrollment_id?: string
    student_id?: string
    status?: string
    token?: string | null
  }): Promise<{ billing_cycles: BillingCycle[]; total: number }> {
    const q = new URLSearchParams()
    if (params?.skip != null) q.set("skip", String(params.skip))
    if (params?.limit != null) q.set("limit", String(params.limit))
    if (params?.enrollment_id) q.set("enrollment_id", params.enrollment_id)
    if (params?.student_id) q.set("student_id", params.student_id)
    if (params?.status) q.set("status", params.status)
    const res = await fetch(`${getBackendApiUrl("billing-cycles")}?${q.toString()}`, {
      headers: authHeaders(params?.token),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    const data = await res.json()
    return {
      billing_cycles: Array.isArray(data.billing_cycles) ? data.billing_cycles : [],
      total: Number(data.total || 0),
    }
  },

  async getForEnrollment(enrollmentId: string, token?: string | null) {
    const res = await fetch(
      getBackendApiUrl(`billing-cycles/enrollment/${encodeURIComponent(enrollmentId)}`),
      { headers: authHeaders(token), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      enrollment_id: string
      validity_end_date?: string | null
      next_due_date?: string | null
      billing_cycle?: BillingCycle | null
    }>
  },
}
