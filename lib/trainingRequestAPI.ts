import { getBackendApiUrl } from "./config"
import { TokenManager } from "./tokenManager"
import { BranchManagerAuth } from "./branchManagerAuth"

export type TrainingRequestType = "home" | "school" | "college" | "corporate" | "residential"

export type TrainingRequestStatus =
  | "submitted"
  | "under_review"
  | "coach_assigned"
  | "scheduled"
  | "completed"
  | "rejected"
  | "cancelled"

export const TRAINING_REQUEST_STATUSES: { value: TrainingRequestStatus; label: string }[] = [
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under review" },
  { value: "coach_assigned", label: "Coach assigned" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
]

/** Mirrors backend ALLOWED_STATUS_TRANSITIONS for UX (server still enforces). */
export const ALLOWED_STATUS_TRANSITIONS: Record<TrainingRequestStatus, TrainingRequestStatus[]> = {
  submitted: ["under_review", "coach_assigned", "rejected", "cancelled"],
  under_review: ["coach_assigned", "scheduled", "rejected", "cancelled"],
  coach_assigned: ["scheduled", "under_review", "completed", "cancelled"],
  scheduled: ["completed", "cancelled", "coach_assigned"],
  completed: [],
  rejected: [],
  cancelled: [],
}

export type HomeTrainingDetails = {
  participant_name: string
  participant_age?: number | null
  participant_phone: string
  participant_email?: string | null
  number_of_participants: number
  address_line1: string
  address_line2?: string | null
  city: string
  state: string
  pincode?: string | null
  preferred_date?: string | null
  preferred_time?: string | null
  training_type?: string | null
  training_goals?: string | null
  special_requirements?: string | null
}

export type SchoolTrainingDetails = {
  school_name: string
  school_type?: string | null
  contact_designation?: string | null
  number_of_students: number
  age_group?: string | null
  grade_levels?: string | null
  address_line1: string
  address_line2?: string | null
  city: string
  state: string
  pincode?: string | null
  preferred_date?: string | null
  preferred_time?: string | null
  schedule_notes?: string | null
  training_type?: string | null
  training_goals?: string | null
  special_requirements?: string | null
}

export type CollegeTrainingDetails = {
  college_name: string
  college_type?: string | null
  department?: string | null
  contact_designation?: string | null
  number_of_participants: number
  year_of_study?: string | null
  participant_group?: string | null
  address_line1: string
  address_line2?: string | null
  city: string
  state: string
  pincode?: string | null
  preferred_date?: string | null
  preferred_time?: string | null
  schedule_notes?: string | null
  training_type?: string | null
  training_goals?: string | null
  special_requirements?: string | null
}

export type CorporateTrainingDetails = {
  organization_name: string
  organization_type?: string | null
  industry?: string | null
  contact_designation?: string | null
  employee_count: number
  department_or_team?: string | null
  training_requirement?: string | null
  address_line1: string
  address_line2?: string | null
  city: string
  state: string
  pincode?: string | null
  preferred_date?: string | null
  preferred_time?: string | null
  schedule_notes?: string | null
  training_type?: string | null
  training_goals?: string | null
  special_requirements?: string | null
}

export type ResidentialPackage = {
  id: string
  name: string
  duration_days?: number | null
  duration_label?: string
  fee_total_inr: number
  fee_pay_now_inr: number
  includes_accommodation?: boolean
  includes_food?: boolean
  description?: string | null
  payment_required?: boolean
  is_active?: boolean
}

export type ResidentialTrainingDetails = {
  participant_name: string
  participant_age?: number | null
  participant_phone: string
  participant_email?: string | null
  gender?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  package_id: string
  package_name?: string | null
  duration_days?: number | null
  duration_label?: string | null
  preferred_start_date?: string | null
  preferred_end_date?: string | null
  accommodation: string
  food_preference: string
  medical_notes?: string | null
  training_goals?: string | null
  special_requirements?: string | null
  fee_total_inr?: number | null
  fee_pay_now_inr?: number | null
  city?: string | null
  state?: string | null
}

export type TrainingRequest = {
  id: string
  type: TrainingRequestType | string
  status: TrainingRequestStatus | string
  contact_name: string
  contact_phone: string
  contact_email?: string | null
  branch_id?: string | null
  branch_name?: string | null
  source?: string | null
  notes?: string | null
  details?:
    | HomeTrainingDetails
    | SchoolTrainingDetails
    | CollegeTrainingDetails
    | CorporateTrainingDetails
    | ResidentialTrainingDetails
    | Record<string, unknown>
  assigned_coach_id?: string | null
  assigned_coach_name?: string | null
  assigned_at?: string | null
  assigned_by?: string | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
  payment_status?: string | null
  fee_total_inr?: number | null
  fee_pay_now_inr?: number | null
  amount_paise?: number | null
  currency?: string | null
  razorpay_order_id?: string | null
  razorpay_payment_id?: string | null
  paid_at?: string | null
}

export type StatusHistoryEntry = {
  id: string
  request_id: string
  action?: string
  from_status?: string | null
  to_status?: string
  note?: string | null
  actor_id?: string | null
  actor_name?: string | null
  actor_role?: string | null
  created_at?: string
}

export type HomeTrainingCreatePayload = {
  contact_name: string
  contact_phone: string
  contact_email?: string
  branch_id?: string
  branch_name?: string
  source?: string
  notes?: string
  details: HomeTrainingDetails
}

export type SchoolTrainingCreatePayload = {
  contact_name: string
  contact_phone: string
  contact_email?: string
  branch_id?: string
  branch_name?: string
  source?: string
  notes?: string
  details: SchoolTrainingDetails
}

export type CollegeTrainingCreatePayload = {
  contact_name: string
  contact_phone: string
  contact_email?: string
  branch_id?: string
  branch_name?: string
  source?: string
  notes?: string
  details: CollegeTrainingDetails
}

export type CorporateTrainingCreatePayload = {
  contact_name: string
  contact_phone: string
  contact_email?: string
  branch_id?: string
  branch_name?: string
  source?: string
  notes?: string
  details: CorporateTrainingDetails
}

export type ResidentialTrainingCreatePayload = {
  contact_name: string
  contact_phone: string
  contact_email?: string
  branch_id?: string
  branch_name?: string
  source?: string
  notes?: string
  pay_now?: boolean
  details: ResidentialTrainingDetails
}

export const TRAINING_REQUEST_TYPES: { value: TrainingRequestType; label: string }[] = [
  { value: "home", label: "Home" },
  { value: "school", label: "School" },
  { value: "college", label: "College" },
  { value: "corporate", label: "Corporate" },
  { value: "residential", label: "Residential" },
]

export function typeLabel(type?: string | null) {
  const found = TRAINING_REQUEST_TYPES.find((t) => t.value === type)
  return found?.label || type || "—"
}

export function paymentStatusLabel(status?: string | null) {
  const map: Record<string, string> = {
    pending: "Payment pending",
    paid: "Paid",
    not_required: "No payment required",
    waived: "Waived",
    failed: "Failed",
  }
  return map[String(status || "")] || status || "—"
}

function authHeaders(json = false, optional = false): HeadersInit {
  const token = BranchManagerAuth.getToken() || TokenManager.getToken()
  const h: Record<string, string> = { "Cache-Control": "no-cache" }
  if (token) h.Authorization = `Bearer ${token}`
  else if (!optional) h.Authorization = "Bearer "
  if (json) h["Content-Type"] = "application/json"
  return h
}

async function parseError(res: Response) {
  const err = await res.json().catch(() => ({}))
  if (typeof err.detail === "string") return err.detail
  if (Array.isArray(err.detail)) {
    const first = err.detail[0]
    if (typeof first?.msg === "string") return first.msg
  }
  if (err.detail?.message) return err.detail.message
  return `Request failed (${res.status})`
}

export function statusLabel(status?: string | null) {
  const found = TRAINING_REQUEST_STATUSES.find((s) => s.value === status)
  return found?.label || status || "—"
}

class TrainingRequestAPI {
  async submitHome(payload: HomeTrainingCreatePayload) {
    const res = await fetch(getBackendApiUrl("training-requests/home"), {
      method: "POST",
      headers: authHeaders(true, true),
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ message: string; request: TrainingRequest }>
  }

  async submitSchool(payload: SchoolTrainingCreatePayload) {
    const res = await fetch(getBackendApiUrl("training-requests/school"), {
      method: "POST",
      headers: authHeaders(true, true),
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ message: string; request: TrainingRequest }>
  }

  async submitCollege(payload: CollegeTrainingCreatePayload) {
    const res = await fetch(getBackendApiUrl("training-requests/college"), {
      method: "POST",
      headers: authHeaders(true, true),
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ message: string; request: TrainingRequest }>
  }

  async submitCorporate(payload: CorporateTrainingCreatePayload) {
    const res = await fetch(getBackendApiUrl("training-requests/corporate"), {
      method: "POST",
      headers: authHeaders(true, true),
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ message: string; request: TrainingRequest }>
  }

  async listResidentialPackages() {
    const res = await fetch(getBackendApiUrl("training-requests/residential/packages"), {
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ packages: ResidentialPackage[]; total: number }>
  }

  async submitResidential(payload: ResidentialTrainingCreatePayload) {
    const res = await fetch(getBackendApiUrl("training-requests/residential"), {
      method: "POST",
      headers: authHeaders(true, true),
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ message: string; request: TrainingRequest }>
  }

  async createResidentialOrder(requestId: string) {
    const res = await fetch(
      getBackendApiUrl(`training-requests/${encodeURIComponent(requestId)}/create-order`),
      {
        method: "POST",
        headers: authHeaders(true, true),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      order: { id: string; amount: number; currency: string }
      key: string
      request_id: string
    }>
  }

  async verifyResidentialPayment(
    requestId: string,
    payload: {
      razorpay_order_id: string
      razorpay_payment_id: string
      razorpay_signature: string
    }
  ) {
    const res = await fetch(
      getBackendApiUrl(`training-requests/${encodeURIComponent(requestId)}/verify-payment`),
      {
        method: "POST",
        headers: authHeaders(true, true),
        body: JSON.stringify(payload),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ message: string; request: TrainingRequest }>
  }

  async list(params: {
    type?: string
    status?: string
    branch_id?: string
    payment_status?: string
    assigned_coach_id?: string
    unassigned_only?: boolean
    search?: string
    skip?: number
    limit?: number
  } = {}) {
    const qs = new URLSearchParams()
    if (params.type) qs.set("type", params.type)
    if (params.status) qs.set("status", params.status)
    if (params.branch_id) qs.set("branch_id", params.branch_id)
    if (params.payment_status) qs.set("payment_status", params.payment_status)
    if (params.assigned_coach_id) qs.set("assigned_coach_id", params.assigned_coach_id)
    if (params.unassigned_only) qs.set("unassigned_only", "true")
    if (params.search) qs.set("search", params.search)
    qs.set("skip", String(params.skip ?? 0))
    qs.set("limit", String(params.limit ?? 50))
    const res = await fetch(getBackendApiUrl(`training-requests?${qs.toString()}`), {
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      requests: TrainingRequest[]
      total: number
      count: number
    }>
  }

  async summary(params: { branch_id?: string } = {}) {
    const qs = new URLSearchParams()
    if (params.branch_id) qs.set("branch_id", params.branch_id)
    const suffix = qs.toString() ? `?${qs.toString()}` : ""
    const res = await fetch(getBackendApiUrl(`training-requests/summary${suffix}`), {
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      total: number
      by_type: Record<string, number>
      by_status: Record<string, number>
      by_payment_status: Record<string, number>
      unassigned_coach: number
    }>
  }

  async get(id: string) {
    const res = await fetch(getBackendApiUrl(`training-requests/${encodeURIComponent(id)}`), {
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      request: TrainingRequest
      status_history: StatusHistoryEntry[]
    }>
  }

  async updateStatus(id: string, status: TrainingRequestStatus, note?: string) {
    const res = await fetch(
      getBackendApiUrl(`training-requests/${encodeURIComponent(id)}/status`),
      {
        method: "PATCH",
        headers: authHeaders(true),
        body: JSON.stringify({ status, note: note || null }),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ message: string; request: TrainingRequest }>
  }

  async assignCoach(id: string, coach_id: string, note?: string) {
    const res = await fetch(
      getBackendApiUrl(`training-requests/${encodeURIComponent(id)}/coach`),
      {
        method: "PATCH",
        headers: authHeaders(true),
        body: JSON.stringify({ coach_id, note: note || null }),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ message: string; request: TrainingRequest }>
  }
}

export const trainingRequestAPI = new TrainingRequestAPI()
