"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Loader2, BarChart3, Trophy, Star } from "lucide-react"
import type { StudentKpiPerformanceMetrics } from "@/lib/student-kpi-metrics-types"

function bandClass(band?: string | null) {
  if (band === "outstanding") return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
  if (band === "excellent") return "bg-green-100 text-green-800 hover:bg-green-100"
  if (band === "good") return "bg-blue-100 text-blue-800 hover:bg-blue-100"
  if (band === "fair") return "bg-amber-100 text-amber-900 hover:bg-amber-100"
  if (band === "needs_improvement") return "bg-rose-100 text-rose-800 hover:bg-rose-100"
  return "bg-slate-100 text-slate-700 hover:bg-slate-100"
}

function scopeLabel(scopeType: string) {
  if (scopeType === "overall") return "Overall"
  if (scopeType === "branch") return "Branch"
  if (scopeType === "course") return "Course"
  if (scopeType === "category") return "Category"
  return scopeType
}

export function KpiPerformanceSection({
  metrics,
  loading,
  periodId,
  courseId,
  onPeriodChange,
  onCourseChange,
}: {
  metrics: StudentKpiPerformanceMetrics | null
  loading: boolean
  periodId: string
  courseId: string
  onPeriodChange: (id: string) => void
  onCourseChange: (id: string) => void
}) {
  const periods = metrics?.available_periods || []
  const courses = metrics?.courses || []
  const rating = metrics?.rating
  const rankings = metrics?.rankings || []
  const breakdown = metrics?.kpi_breakdown || []

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-amber-600" />
            KPI performance
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Period ratings, rankings, and KPI scores for the selected student.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto sm:min-w-[320px]">
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">Period</Label>
            <Select
              value={periodId || "none"}
              onValueChange={(v) => onPeriodChange(v === "none" ? "" : v)}
              disabled={loading || periods.length === 0}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select period</SelectItem>
                {periods.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name || p.code || p.id}
                    {p.status ? ` (${p.status})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">Course</Label>
            <Select
              value={courseId || "none"}
              onValueChange={(v) => onCourseChange(v === "none" ? "" : v)}
              disabled={loading || courses.length === 0}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select course</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-500 py-8 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading KPI metrics…
        </div>
      ) : !metrics?.has_kpi_data && !rating && rankings.length === 0 && breakdown.length === 0 ? (
        <Card className="border-dashed border-slate-200">
          <CardContent className="py-8 text-center text-sm text-slate-500">
            No KPI assessments or ratings yet for this student. Results appear after staff
            complete assessments and calculate ratings.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-slate-800">
                <Star className="h-4 w-4 text-amber-600" />
                Rating
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rating ? (
                <div className="space-y-3">
                  <div className="flex items-end gap-3">
                    <span className="text-4xl font-bold tabular-nums text-slate-900">
                      {Number(rating.rating).toFixed(1)}
                    </span>
                    <span className="text-sm text-slate-500 mb-1">/ 100</span>
                    {rating.band ? (
                      <Badge className={bandClass(rating.band)}>
                        {rating.band.replace(/_/g, " ")}
                      </Badge>
                    ) : null}
                  </div>
                  {!rating.is_complete ? (
                    <p className="text-xs text-amber-700">Incomplete — some KPI scores missing</p>
                  ) : (
                    <p className="text-xs text-slate-500">Complete weighted rating</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500 py-4">
                  No rating calculated for this period/course yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-slate-800">
                <Trophy className="h-4 w-4 text-amber-600" />
                Rankings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rankings.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">
                  No rankings yet. Rankings appear after staff recalculate for the period.
                </p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-2">
                  {rankings.map((r) => (
                    <div
                      key={r.id || `${r.scope_type}-${r.scope_id}`}
                      className="rounded-lg border px-3 py-2 flex items-center justify-between gap-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {scopeLabel(r.scope_type)}
                        </p>
                        <p className="text-xs text-slate-500">
                          of {r.population_size ?? "—"}
                          {r.tied ? " · tied" : ""}
                        </p>
                      </div>
                      <span className="text-xl font-bold tabular-nums text-slate-900">
                        #{r.rank}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-slate-800">
                <BarChart3 className="h-4 w-4 text-amber-600" />
                KPI breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {breakdown.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">No KPI scores for this selection.</p>
              ) : (
                breakdown.map((line) => {
                  const pct =
                    line.normalized_score == null
                      ? 0
                      : Math.min(100, Math.max(0, Number(line.normalized_score)))
                  return (
                    <div key={line.kpi_id} className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-600 gap-2">
                        <span className="font-medium text-slate-800">
                          {line.kpi_name || line.kpi_code || line.kpi_id}
                          {line.weight != null ? (
                            <span className="text-slate-400 font-normal">
                              {" "}
                              · w {line.weight}
                              {line.weight_unit === "percent" ? "%" : line.weight_unit ? ` ${line.weight_unit}` : ""}
                            </span>
                          ) : null}
                        </span>
                        <span className="tabular-nums shrink-0">
                          {line.raw_score != null && line.max_score != null
                            ? `${line.raw_score}/${line.max_score}`
                            : line.normalized_score != null
                              ? `${Math.round(pct)}%`
                              : "—"}
                          {line.normalized_score != null
                            ? ` · ${Number(line.normalized_score).toFixed(0)}%`
                            : ""}
                        </span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
