import { getBackendApiUrl } from "./config"
import { TokenManager } from "./tokenManager"
import { BranchManagerAuth } from "./branchManagerAuth"

export type AssessmentPeriodStatus = "draft" | "open" | "closed"

export interface AssessmentPeriod {
  id: string
  code: string
  name: string
  description?: string | null
  start_date: string
  end_date: string
  status: AssessmentPeriodStatus
  branch_ids?: string[]
  course_ids?: string[]
}

export interface KpiScoreRow {
  kpi_id: string
  raw_score: number
  notes?: string
}

export interface AssessmentRow {
  id: string
  student_id: string
  course_id: string
  branch_id: string
  period_id: string
  kpi_id: string
  kpi_code?: string
  kpi_name?: string
  raw_score: number
  max_score: number
  min_score: number
  normalized_score: number
  evaluator_name?: string
  evaluated_at?: string
  notes?: string | null
}

function authHeaders(): HeadersInit {
  const token = BranchManagerAuth.getToken() || TokenManager.getToken()
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
  }
}

async function parseError(res: Response) {
  const err = await res.json().catch(() => ({}))
  if (typeof err.detail === "string") return err.detail
  if (err.detail?.message) return err.detail.message
  return `Request failed (${res.status})`
}

class KpiAssessmentAPI {
  async listPeriods(params: { status?: string } = {}) {
    const qs = new URLSearchParams()
    if (params.status) qs.set("status", params.status)
    qs.set("limit", "200")
    const res = await fetch(
      getBackendApiUrl(`kpi-assessment-periods?${qs.toString()}`),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ periods: AssessmentPeriod[]; total: number }>
  }

  async createPeriod(payload: Record<string, unknown>) {
    const res = await fetch(getBackendApiUrl("kpi-assessment-periods"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }

  async updatePeriod(id: string, payload: Record<string, unknown>) {
    const res = await fetch(getBackendApiUrl(`kpi-assessment-periods/${id}`), {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }

  async deletePeriod(id: string) {
    const res = await fetch(getBackendApiUrl(`kpi-assessment-periods/${id}`), {
      method: "DELETE",
      headers: authHeaders(),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }

  async eligibleStudents(courseId: string, branchId?: string) {
    const qs = new URLSearchParams({ course_id: courseId })
    if (branchId) qs.set("branch_id", branchId)
    const res = await fetch(
      getBackendApiUrl(`kpi-assessments/eligible-students?${qs.toString()}`),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ students: any[]; total: number }>
  }

  async listAssessments(params: {
    period_id?: string
    student_id?: string
    course_id?: string
    branch_id?: string
  }) {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v) qs.set(k, v)
    })
    qs.set("limit", "200")
    const res = await fetch(
      getBackendApiUrl(`kpi-assessments?${qs.toString()}`),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ assessments: AssessmentRow[]; total: number }>
  }

  async upsertAssessment(payload: {
    period_id: string
    student_id: string
    course_id: string
    branch_id?: string
    scores: KpiScoreRow[]
    notes?: string
  }) {
    const res = await fetch(getBackendApiUrl("kpi-assessments"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }
}

export const kpiAssessmentAPI = new KpiAssessmentAPI()
