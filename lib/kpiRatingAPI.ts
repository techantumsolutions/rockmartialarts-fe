import { getBackendApiUrl } from "./config"

import { TokenManager } from "./tokenManager"

import { BranchManagerAuth } from "./branchManagerAuth"



export type RatingBand =

  | "outstanding"

  | "excellent"

  | "good"

  | "fair"

  | "needs_improvement"



export interface RatingBreakdownLine {

  kpi_id: string

  kpi_code?: string | null

  kpi_name?: string | null

  weight: number

  weight_unit: string

  raw_score: number

  min_score: number

  max_score: number

  normalized_score: number

  contribution: number

}



export interface StudentKpiRating {

  id: string

  student_id: string

  course_id: string

  branch_id: string

  period_id: string

  rating: number

  band: RatingBand

  is_complete: boolean

  weight_sum: number

  formula_version?: string

  missing_kpi_ids?: string[]

  breakdown?: RatingBreakdownLine[]

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



class KpiRatingAPI {

  async getFormula() {

    const res = await fetch(getBackendApiUrl("kpi-ratings/formula"), {

      headers: authHeaders(),

      cache: "no-store",

    })

    if (!res.ok) throw new Error(await parseError(res))

    return res.json() as Promise<{

      formula_version: string

      description: string

      bands: Record<string, string>

    }>

  }



  async list(params: {

    period_id?: string

    student_id?: string

    course_id?: string

    branch_id?: string

  } = {}) {

    const qs = new URLSearchParams()

    Object.entries(params).forEach(([k, v]) => {

      if (v) qs.set(k, v)

    })

    qs.set("limit", "200")

    const res = await fetch(getBackendApiUrl(`kpi-ratings?${qs.toString()}`), {

      headers: authHeaders(),

      cache: "no-store",

    })

    if (!res.ok) throw new Error(await parseError(res))

    return res.json() as Promise<{

      ratings: StudentKpiRating[]

      total: number

      formula_version?: string

    }>

  }



  async preview(payload: {

    period_id: string

    student_id: string

    course_id: string

    branch_id?: string

  }) {

    const res = await fetch(getBackendApiUrl("kpi-ratings/preview"), {

      method: "POST",

      headers: authHeaders(),

      body: JSON.stringify(payload),

    })

    if (!res.ok) throw new Error(await parseError(res))

    return res.json()

  }



  async recalculate(payload: {

    period_id: string

    student_id?: string

    course_id?: string

    branch_id?: string

    force?: boolean

  }) {

    const res = await fetch(getBackendApiUrl("kpi-ratings/recalculate"), {

      method: "POST",

      headers: authHeaders(),

      body: JSON.stringify(payload),

    })

    if (!res.ok) throw new Error(await parseError(res))

    return res.json() as Promise<{

      message: string

      saved_count: number

      error_count: number

      ratings: StudentKpiRating[]

      errors: Array<{ student_id?: string; course_id?: string; error: string }>

      formula_version?: string

    }>

  }

}



export const kpiRatingAPI = new KpiRatingAPI()


