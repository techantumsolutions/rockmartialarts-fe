import { getBackendApiUrl } from "./config"
import { TokenManager } from "./tokenManager"
import { BranchManagerAuth } from "./branchManagerAuth"

export type CoachSubscriptionPlan = {
  id: string
  name: string
  description?: string | null
  fee_inr: number
  duration_days: number
  grace_period_days: number
  deactivate_on_grace_expiry: boolean
  is_active: boolean
  is_default?: boolean
  sort_order?: number
}

export type CoachSubscription = {
  id: string
  coach_id: string
  plan_id?: string
  plan_snapshot?: Partial<CoachSubscriptionPlan> & { name?: string }
  status: string
  payment_status?: string
  amount_paise?: number
  currency?: string
  starts_at?: string
  ends_at?: string
  grace_ends_at?: string
  activated_at?: string
  created_at?: string
  coach_name?: string
  coach_email?: string
  action?: string
}

export type SubscriptionPayment = {
  id: string
  coach_id: string
  subscription_id: string
  plan_name?: string
  amount_paise?: number
  payment_status?: string
  action?: string
  period_start?: string
  period_end?: string
  paid_at?: string
  note?: string | null
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

class CoachSubscriptionAPI {
  async listPlans(activeOnly = false) {
    const qs = activeOnly ? "?active_only=true" : ""
    const res = await fetch(getBackendApiUrl(`coach-subscriptions/plans${qs}`), {
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ plans: CoachSubscriptionPlan[]; total: number }>
  }

  async createPlan(body: Partial<CoachSubscriptionPlan>) {
    const res = await fetch(getBackendApiUrl("coach-subscriptions/plans"), {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }

  async updatePlan(planId: string, body: Partial<CoachSubscriptionPlan>) {
    const res = await fetch(
      getBackendApiUrl(`coach-subscriptions/plans/${encodeURIComponent(planId)}`),
      {
        method: "PUT",
        headers: authHeaders(true),
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }

  async mySubscription() {
    const res = await fetch(getBackendApiUrl("coach-subscriptions/me"), {
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      coach_id: string
      subscription: CoachSubscription | null
      coach_is_active: boolean
      approval_status?: string
    }>
  }

  async myHistory(skip = 0, limit = 50) {
    const res = await fetch(
      getBackendApiUrl(`coach-subscriptions/me/history?skip=${skip}&limit=${limit}`),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      payments: SubscriptionPayment[]
      total: number
    }>
  }

  async checkout(planId: string) {
    const res = await fetch(getBackendApiUrl("coach-subscriptions/me/checkout"), {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify({ plan_id: planId }),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      subscription_id: string
      order: { id: string; amount: number; currency: string }
      key: string
      plan: CoachSubscriptionPlan
      subscription: CoachSubscription
    }>
  }

  async verifyPayment(payload: {
    subscription_id: string
    razorpay_order_id: string
    razorpay_payment_id: string
    razorpay_signature: string
  }) {
    const res = await fetch(getBackendApiUrl("coach-subscriptions/me/verify-payment"), {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }

  async listSubscriptions(params: {
    status?: string
    search?: string
    skip?: number
    limit?: number
  } = {}) {
    const qs = new URLSearchParams()
    if (params.status && params.status !== "all") qs.set("status", params.status)
    if (params.search?.trim()) qs.set("search", params.search.trim())
    qs.set("skip", String(params.skip ?? 0))
    qs.set("limit", String(params.limit ?? 25))
    const res = await fetch(
      getBackendApiUrl(`coach-subscriptions?${qs.toString()}`),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      subscriptions: CoachSubscription[]
      total: number
    }>
  }

  async grant(coachId: string, planId: string, note?: string) {
    const res = await fetch(
      getBackendApiUrl(
        `coach-subscriptions/coach/${encodeURIComponent(coachId)}/grant`
      ),
      {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ plan_id: planId, note: note || null }),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }

  async refreshStatuses() {
    const res = await fetch(getBackendApiUrl("coach-subscriptions/refresh-statuses"), {
      method: "POST",
      headers: authHeaders(true),
      body: "{}",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }
}

export const coachSubscriptionAPI = new CoachSubscriptionAPI()

export function formatInrFromPaise(paise?: number) {
  const n = typeof paise === "number" ? paise / 100 : 0
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
}

export function subscriptionStatusLabel(status?: string) {
  const map: Record<string, string> = {
    pending_payment: "Awaiting payment",
    active: "Active",
    grace: "Grace period",
    expired: "Expired",
    cancelled: "Cancelled",
  }
  return map[(status || "").toLowerCase()] || status || "—"
}
