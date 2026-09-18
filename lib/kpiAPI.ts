import { getBackendApiUrl } from "./config"
import { TokenManager } from "./tokenManager"
import { BranchManagerAuth } from "./branchManagerAuth"

export type KpiWeightUnit = "percent" | "points"

export interface KpiDefinition {
  id: string
  code: string
  name: string
  description?: string | null
  weight: number
  weight_unit: KpiWeightUnit
  max_score: number
  min_score: number
  sort_order: number
  is_active: boolean
  branch_ids?: string[]
  course_ids?: string[]
  created_at?: string
  updated_at?: string
}

export interface KpiWeightSummary {
  active_count: number
  percent_count: number
  points_count: number
  percent_weight_sum: number
  points_weight_sum: number
  percent_sum_ok: boolean
  percent_message?: string | null
  target_percent_sum: number
}

export interface KpiDefinitionPayload {
  code: string
  name: string
  description?: string
  weight: number
  weight_unit: KpiWeightUnit
  max_score: number
  min_score: number
  sort_order: number
  is_active: boolean
}

function authHeaders(): HeadersInit {
  const token = BranchManagerAuth.getToken() || TokenManager.getToken()
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
  }
}

class KpiDefinitionAPI {
  async list(params: { active_only?: boolean; limit?: number } = {}): Promise<{
    kpis: KpiDefinition[]
    total: number
    weight_summary?: KpiWeightSummary
  }> {
    const qs = new URLSearchParams()
    if (params.active_only) qs.set("active_only", "true")
    qs.set("limit", String(params.limit ?? 200))
    const res = await fetch(getBackendApiUrl(`kpi-definitions?${qs.toString()}`), {
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) {
      const t = await res.text()
      throw new Error(t || `Failed to load KPIs (${res.status})`)
    }
    return res.json()
  }

  async create(payload: KpiDefinitionPayload) {
    const res = await fetch(getBackendApiUrl("kpi-definitions"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(
        typeof err.detail === "string" ? err.detail : `Create failed (${res.status})`
      )
    }
    return res.json()
  }

  async update(id: string, payload: Partial<KpiDefinitionPayload>) {
    const res = await fetch(getBackendApiUrl(`kpi-definitions/${id}`), {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(
        typeof err.detail === "string" ? err.detail : `Update failed (${res.status})`
      )
    }
    return res.json()
  }

  async setActive(id: string, is_active: boolean) {
    const res = await fetch(
      getBackendApiUrl(`kpi-definitions/${id}/active?is_active=${is_active}`),
      { method: "PATCH", headers: authHeaders() }
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(
        typeof err.detail === "string" ? err.detail : `Status update failed (${res.status})`
      )
    }
    return res.json()
  }

  async remove(id: string) {
    const res = await fetch(getBackendApiUrl(`kpi-definitions/${id}`), {
      method: "DELETE",
      headers: authHeaders(),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(
        typeof err.detail === "string" ? err.detail : `Delete failed (${res.status})`
      )
    }
    return res.json()
  }
}

export const kpiDefinitionAPI = new KpiDefinitionAPI()
