/** M10-S05 KPI performance metrics (additive to classic dashboard). */

export interface KpiMetricsPeriod {
  id: string
  code?: string
  name?: string
  status?: string
  start_date?: string
  end_date?: string
  has_data?: boolean
}

export interface KpiMetricsCourse {
  id: string
  name: string
}

export interface KpiBreakdownLine {
  kpi_id: string
  kpi_code?: string | null
  kpi_name?: string | null
  raw_score?: number | null
  min_score?: number | null
  max_score?: number | null
  normalized_score?: number | null
  weight?: number | null
  weight_unit?: string | null
  contribution?: number | null
}

export interface KpiMetricsRating {
  id?: string
  rating: number
  band?: string | null
  is_complete?: boolean
  weight_sum?: number
  formula_version?: string
  breakdown?: KpiBreakdownLine[]
  missing_kpi_ids?: string[]
  calculated_at?: string
  course_id?: string
  period_id?: string
  branch_id?: string
}

export interface KpiMetricsRanking {
  id?: string
  scope_type: string
  scope_id: string
  rank: number
  population_size?: number
  tied?: boolean
  rating?: number
  band?: string | null
  course_id?: string
  branch_id?: string
  category_id?: string | null
}

export interface StudentKpiPerformanceMetrics {
  student_id: string
  period: KpiMetricsPeriod | null
  period_id?: string | null
  available_periods: KpiMetricsPeriod[]
  courses: KpiMetricsCourse[]
  course_id?: string | null
  rating: KpiMetricsRating | null
  rankings: KpiMetricsRanking[]
  kpi_breakdown: KpiBreakdownLine[]
  has_kpi_data: boolean
}
