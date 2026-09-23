import { getBackendApiUrl } from "./config"
import { TokenManager } from "./tokenManager"
import { BranchManagerAuth } from "./branchManagerAuth"

export type RankingScopeType = "overall" | "branch" | "course" | "category"

export interface StudentKpiRanking {
  id: string
  period_id: string
  scope_type: RankingScopeType
  scope_id: string
  student_id: string
  course_id: string
  branch_id: string
  category_id?: string | null
  rating: number
  band?: string | null
  rank: number
  population_size: number
  tied: boolean
  calculated_by_name?: string | null
  calculated_at?: string
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

class KpiRankingAPI {
  async getPolicy() {
    const res = await fetch(getBackendApiUrl("kpi-rankings/policy"), {
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      formula_version: string
      tie_policy: string
      scope_types: string[]
    }>
  }

  async list(params: {
    period_id?: string
    scope_type?: string
    scope_id?: string
    student_id?: string
    course_id?: string
    branch_id?: string
    category_id?: string
  } = {}) {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v) qs.set(k, v)
    })
    qs.set("limit", "200")
    const res = await fetch(getBackendApiUrl(`kpi-rankings?${qs.toString()}`), {
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      rankings: StudentKpiRanking[]
      total: number
      formula_version?: string
    }>
  }

  async recalculate(payload: {
    period_id: string
    scope_types?: RankingScopeType[]
    branch_id?: string
    course_id?: string
    category_id?: string
    force?: boolean
  }) {
    const res = await fetch(getBackendApiUrl("kpi-rankings/recalculate"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      message: string
      saved_count: number
      rankings: StudentKpiRanking[]
      formula_version?: string
      excluded_inactive?: number
    }>
  }
}

export const kpiRankingAPI = new KpiRankingAPI()
