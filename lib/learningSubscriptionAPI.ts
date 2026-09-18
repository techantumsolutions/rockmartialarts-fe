import { getBackendApiUrl } from "./config"
import { TokenManager } from "./tokenManager"

export const LEARNING_PLAN_KINDS = [
  { value: "3_month", label: "3-Month" },
  { value: "lifetime", label: "Lifetime" },
  { value: "custom", label: "Custom" },
] as const

export type LearningSubscriptionPlan = {
  id: string
  course_id: string
  name: string
  description?: string | null
  plan_kind?: string
  fee_inr: number
  duration_days: number
  grace_period_days?: number
  is_lifetime?: boolean
  is_active?: boolean
  sort_order?: number
}

export type LearningSubscription = {
  id: string
  user_id: string
  user_email?: string | null
  user_name?: string | null
  course_id: string
  course_title?: string | null
  course_slug?: string | null
  plan_id?: string
  plan_snapshot?: Partial<LearningSubscriptionPlan> & { name?: string }
  status?: string
  payment_status?: string
  is_lifetime?: boolean
  amount_paise?: number
  starts_at?: string
  ends_at?: string
  grace_ends_at?: string
  activated_at?: string
}

export type LearningSubscriptionPayment = {
  id: string
  user_id?: string
  subscription_id?: string
  course_id?: string
  plan_name?: string
  amount_paise?: number
  payment_status?: string
  paid_at?: string
  note?: string | null
}

function authHeaders(json = false): HeadersInit {
  const token = TokenManager.getToken()
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

class LearningSubscriptionAPI {
  async listPublicPlans(courseId: string) {
    const qs = new URLSearchParams({ course_id: courseId })
    const res = await fetch(
      getBackendApiUrl(`learning-subscriptions/plans/public?${qs}`),
      { headers: { Accept: "application/json" }, cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ plans: LearningSubscriptionPlan[]; total: number }>
  }

  async listPlans(params: { course_id?: string; active_only?: boolean } = {}) {
    const qs = new URLSearchParams()
    if (params.course_id) qs.set("course_id", params.course_id)
    if (params.active_only) qs.set("active_only", "true")
    const res = await fetch(
      getBackendApiUrl(`learning-subscriptions/plans?${qs}`),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ plans: LearningSubscriptionPlan[]; total: number }>
  }

  async createPlan(body: Partial<LearningSubscriptionPlan> & { course_id: string; name: string; fee_inr: number }) {
    const res = await fetch(getBackendApiUrl("learning-subscriptions/plans"), {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ plan: LearningSubscriptionPlan }>
  }

  async updatePlan(planId: string, body: Partial<LearningSubscriptionPlan>) {
    const res = await fetch(
      getBackendApiUrl(`learning-subscriptions/plans/${encodeURIComponent(planId)}`),
      { method: "PATCH", headers: authHeaders(true), body: JSON.stringify(body) }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ plan: LearningSubscriptionPlan }>
  }

  async seedDefaults(courseId: string) {
    const res = await fetch(
      getBackendApiUrl(
        `learning-subscriptions/plans/seed-defaults/${encodeURIComponent(courseId)}`
      ),
      { method: "POST", headers: authHeaders() }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ plans: LearningSubscriptionPlan[]; message: string }>
  }

  async getMine(courseId?: string) {
    const qs = new URLSearchParams()
    if (courseId) qs.set("course_id", courseId)
    const res = await fetch(
      getBackendApiUrl(`learning-subscriptions/me?${qs}`),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      subscription: LearningSubscription | null
      entitled: boolean
      course_id?: string
    }>
  }

  async checkout(planId: string) {
    const res = await fetch(getBackendApiUrl("learning-subscriptions/me/checkout"), {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify({ plan_id: planId }),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      subscription_id: string
      subscription: LearningSubscription
      order: { id: string; amount: number; currency: string } | null
      key: string | null
      plan: LearningSubscriptionPlan
      activated?: boolean
    }>
  }

  async verifyPayment(body: {
    subscription_id: string
    razorpay_order_id: string
    razorpay_payment_id: string
    razorpay_signature: string
  }) {
    const res = await fetch(
      getBackendApiUrl("learning-subscriptions/me/verify-payment"),
      { method: "POST", headers: authHeaders(true), body: JSON.stringify(body) }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ subscription: LearningSubscription; message: string }>
  }

  async listSubscriptions(params: {
    course_id?: string
    status?: string
    search?: string
    skip?: number
    limit?: number
  } = {}) {
    const qs = new URLSearchParams()
    if (params.course_id) qs.set("course_id", params.course_id)
    if (params.status && params.status !== "all") qs.set("status", params.status)
    if (params.search?.trim()) qs.set("search", params.search.trim())
    qs.set("skip", String(params.skip ?? 0))
    qs.set("limit", String(params.limit ?? 25))
    const res = await fetch(
      getBackendApiUrl(`learning-subscriptions?${qs}`),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      subscriptions: LearningSubscription[]
      total: number
    }>
  }

  async grant(body: { user_id: string; plan_id: string; note?: string }) {
    const res = await fetch(getBackendApiUrl("learning-subscriptions/grant"), {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      subscription: LearningSubscription
      plan: LearningSubscriptionPlan
    }>
  }

  async refreshStatuses() {
    const res = await fetch(
      getBackendApiUrl("learning-subscriptions/refresh-statuses"),
      { method: "POST", headers: authHeaders() }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ checked: number; changed: number }>
  }
}

export const learningSubscriptionAPI = new LearningSubscriptionAPI()

export function learningPlanKindLabel(kind?: string | null) {
  return LEARNING_PLAN_KINDS.find((k) => k.value === kind)?.label || kind || "—"
}

export function formatInr(fee?: number | null) {
  if (fee == null || !Number.isFinite(fee)) return "—"
  return `₹${Number(fee).toLocaleString("en-IN")}`
}
