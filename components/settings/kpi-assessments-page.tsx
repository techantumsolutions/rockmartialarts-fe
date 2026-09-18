"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  ClipboardList,
  Loader2,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  AlertTriangle,
  Calculator,
  Trophy,
} from "lucide-react"
import { toast } from "sonner"
import { TokenManager } from "@/lib/tokenManager"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { getBackendApiUrl } from "@/lib/config"
import { kpiDefinitionAPI, type KpiDefinition } from "@/lib/kpiAPI"
import {
  kpiAssessmentAPI,
  type AssessmentPeriod,
  type AssessmentPeriodStatus,
  type AssessmentRow,
} from "@/lib/kpiAssessmentAPI"
import {
  kpiRatingAPI,
  type StudentKpiRating,
} from "@/lib/kpiRatingAPI"
import {
  kpiRankingAPI,
  type RankingScopeType,
  type StudentKpiRanking,
} from "@/lib/kpiRankingAPI"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"

function bandBadge(band: string) {
  if (band === "outstanding") return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
  if (band === "excellent") return "bg-green-100 text-green-800 hover:bg-green-100"
  if (band === "good") return "bg-blue-100 text-blue-800 hover:bg-blue-100"
  if (band === "fair") return "bg-amber-100 text-amber-900 hover:bg-amber-100"
  return "bg-rose-100 text-rose-800 hover:bg-rose-100"
}

type BranchOpt = { id: string; name: string }
type CourseOpt = { id: string; name: string }
type StudentOpt = { id: string; full_name: string; branch_id?: string }

const emptyPeriod = {
  code: "",
  name: "",
  description: "",
  start_date: format(new Date(), "yyyy-MM-dd"),
  end_date: format(new Date(Date.now() + 30 * 86400000), "yyyy-MM-dd"),
  status: "draft" as AssessmentPeriodStatus,
}

function authHeaders(): HeadersInit {
  const token = BranchManagerAuth.getToken() || TokenManager.getToken()
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }
}

function statusBadge(status: string) {
  if (status === "open") return "bg-green-100 text-green-800 hover:bg-green-100"
  if (status === "closed") return "bg-slate-100 text-slate-700 hover:bg-slate-100"
  return "bg-amber-100 text-amber-900 hover:bg-amber-100"
}

export default function KpiAssessmentsPage() {
  const router = useRouter()
  const basePath = useDashboardBasePath()
  const isBranchAdmin = basePath.includes("branch-admin")

  const [tab, setTab] = useState("assess")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [periods, setPeriods] = useState<AssessmentPeriod[]>([])
  const [kpis, setKpis] = useState<KpiDefinition[]>([])
  const [branches, setBranches] = useState<BranchOpt[]>([])
  const [courses, setCourses] = useState<CourseOpt[]>([])
  const [students, setStudents] = useState<StudentOpt[]>([])
  const [history, setHistory] = useState<AssessmentRow[]>([])
  const [ratings, setRatings] = useState<StudentKpiRating[]>([])
  const [rankings, setRankings] = useState<StudentKpiRanking[]>([])
  const [rankScopeType, setRankScopeType] = useState<RankingScopeType | "all">("overall")
  const [formulaHint, setFormulaHint] = useState("")
  const [rankingHint, setRankingHint] = useState("")
  const [forceClosedRecalc, setForceClosedRecalc] = useState(false)
  const [ratingBusy, setRatingBusy] = useState(false)
  const [rankingBusy, setRankingBusy] = useState(false)
  const [expandedRatingId, setExpandedRatingId] = useState("")

  const [periodOpen, setPeriodOpen] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState<AssessmentPeriod | null>(null)
  const [periodForm, setPeriodForm] = useState(emptyPeriod)

  const [periodId, setPeriodId] = useState("")
  const [branchId, setBranchId] = useState("all")
  const [courseId, setCourseId] = useState("")
  const [studentId, setStudentId] = useState("")
  const [scoreMap, setScoreMap] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState("")

  const openPeriods = useMemo(
    () => periods.filter((p) => p.status === "open"),
    [periods]
  )
  const activeKpis = useMemo(() => kpis.filter((k) => k.is_active), [kpis])

  const canManagePeriods = !isBranchAdmin

  const ensureAuth = () => {
    const token = BranchManagerAuth.getToken() || TokenManager.getToken()
    if (!token) {
      router.push(isBranchAdmin ? "/branch-manager/login" : "/superadmin/login")
      return false
    }
    return true
  }

  const loadLookups = useCallback(async () => {
    if (!ensureAuth()) return
    try {
      const [periodRes, kpiRes, branchRes, courseRes] = await Promise.all([
        kpiAssessmentAPI.listPeriods(),
        kpiDefinitionAPI.list({ active_only: false, limit: 200 }),
        fetch(getBackendApiUrl("branches"), { headers: authHeaders(), cache: "no-store" }),
        fetch(getBackendApiUrl("courses"), { headers: authHeaders(), cache: "no-store" }),
      ])
      setPeriods(periodRes.periods || [])
      setKpis(kpiRes.kpis || [])
      if (branchRes.ok) {
        const data = await branchRes.json()
        setBranches(
          (data.branches || data || []).map((b: any) => ({
            id: b.id,
            name: b.name || b.branch?.name || b.code || b.id,
          }))
        )
      }
      if (courseRes.ok) {
        const data = await courseRes.json()
        setCourses(
          (data.courses || data || []).map((c: any) => ({
            id: c.id,
            name: c.title || c.name || c.id,
          }))
        )
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [isBranchAdmin, router])

  useEffect(() => {
    void loadLookups()
  }, [loadLookups])

  useEffect(() => {
    const loadStudents = async () => {
      if (!courseId) {
        setStudents([])
        setStudentId("")
        return
      }
      try {
        const data = await kpiAssessmentAPI.eligibleStudents(
          courseId,
          branchId !== "all" ? branchId : undefined
        )
        setStudents(
          (data.students || []).map((s: any) => ({
            id: s.id,
            full_name: s.full_name || s.id,
            branch_id: s.branch_id,
          }))
        )
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load students")
        setStudents([])
      }
    }
    void loadStudents()
  }, [courseId, branchId])

  useEffect(() => {
    const loadHistory = async () => {
      if (!periodId && !studentId) {
        setHistory([])
        return
      }
      try {
        const data = await kpiAssessmentAPI.listAssessments({
          period_id: periodId || undefined,
          student_id: studentId || undefined,
          course_id: courseId || undefined,
          branch_id: branchId !== "all" ? branchId : undefined,
        })
        setHistory(data.assessments || [])
      } catch {
        setHistory([])
      }
    }
    void loadHistory()
  }, [periodId, studentId, courseId, branchId])

  useEffect(() => {
    // Prefill scores from existing assessments for selected student/period/course
    if (!studentId || !periodId || !courseId) return
    const next: Record<string, string> = {}
    for (const k of activeKpis) {
      const existing = history.find(
        (h) =>
          h.kpi_id === k.id &&
          h.student_id === studentId &&
          h.period_id === periodId &&
          h.course_id === courseId
      )
      next[k.id] = existing ? String(existing.raw_score) : ""
    }
    setScoreMap(next)
  }, [studentId, periodId, courseId, activeKpis, history])

  const loadRatings = useCallback(async () => {
    if (!periodId) {
      setRatings([])
      return
    }
    try {
      const data = await kpiRatingAPI.list({
        period_id: periodId,
        course_id: courseId || undefined,
        branch_id: branchId !== "all" ? branchId : undefined,
        student_id: studentId || undefined,
      })
      setRatings(data.ratings || [])
      if (data.formula_version) {
        setFormulaHint(data.formula_version)
      }
    } catch {
      setRatings([])
    }
  }, [periodId, courseId, branchId, studentId])

  useEffect(() => {
    if (tab !== "ratings") return
    void (async () => {
      try {
        const meta = await kpiRatingAPI.getFormula()
        setFormulaHint(meta.formula_version || "")
      } catch {
        /* optional */
      }
      await loadRatings()
    })()
  }, [tab, loadRatings])

  const loadRankings = useCallback(async () => {
    if (!periodId) {
      setRankings([])
      return
    }
    try {
      const data = await kpiRankingAPI.list({
        period_id: periodId,
        scope_type: rankScopeType === "all" ? undefined : rankScopeType,
        course_id: courseId || undefined,
        branch_id: branchId !== "all" ? branchId : undefined,
      })
      setRankings(data.rankings || [])
      if (data.formula_version) setRankingHint(data.formula_version)
    } catch {
      setRankings([])
    }
  }, [periodId, rankScopeType, courseId, branchId])

  useEffect(() => {
    if (tab !== "rankings") return
    void (async () => {
      try {
        const meta = await kpiRankingAPI.getPolicy()
        setRankingHint(meta.formula_version || "")
      } catch {
        /* optional */
      }
      await loadRankings()
    })()
  }, [tab, loadRankings])

  const calculateOneRating = async () => {
    if (!periodId || !courseId || !studentId) {
      toast.error("Select period, course, and student")
      return
    }
    const selectedPeriod = periods.find((p) => p.id === periodId)
    const force =
      selectedPeriod?.status === "closed" ? forceClosedRecalc : false
    if (selectedPeriod?.status === "closed" && !force) {
      toast.error("Period is closed. Enable force recalculation to proceed.")
      return
    }
    const student = students.find((s) => s.id === studentId)
    const resolvedBranch =
      branchId !== "all" ? branchId : student?.branch_id || undefined
    try {
      setRatingBusy(true)
      const result = await kpiRatingAPI.recalculate({
        period_id: periodId,
        student_id: studentId,
        course_id: courseId,
        branch_id: resolvedBranch,
        force,
      })
      toast.success(
        `Rating saved: ${result.ratings?.[0]?.rating ?? "—"} (${result.ratings?.[0]?.band || ""})`
      )
      if (result.ratings?.[0] && !result.ratings[0].is_complete) {
        toast.message("Incomplete score set", {
          description: "Some active KPIs are missing scores for this student.",
        })
      }
      await loadRatings()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Calculation failed")
    } finally {
      setRatingBusy(false)
    }
  }

  const calculatePeriodRatings = async () => {
    if (!periodId) {
      toast.error("Select a period first")
      return
    }
    const selectedPeriod = periods.find((p) => p.id === periodId)
    const force =
      selectedPeriod?.status === "closed" ? forceClosedRecalc : false
    if (selectedPeriod?.status === "closed" && !force) {
      toast.error("Period is closed. Enable force recalculation to proceed.")
      return
    }
    try {
      setRatingBusy(true)
      const result = await kpiRatingAPI.recalculate({
        period_id: periodId,
        course_id: courseId || undefined,
        branch_id: branchId !== "all" ? branchId : undefined,
        force,
      })
      toast.success(
        `Calculated ${result.saved_count || 0} rating(s)` +
          (result.error_count ? ` · ${result.error_count} skipped` : "")
      )
      await loadRatings()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Batch calculation failed")
    } finally {
      setRatingBusy(false)
    }
  }

  const recalculateRankings = async () => {
    if (!periodId) {
      toast.error("Select a period first")
      return
    }
    const selectedPeriod = periods.find((p) => p.id === periodId)
    const force =
      selectedPeriod?.status === "closed" ? forceClosedRecalc : false
    if (selectedPeriod?.status === "closed" && !force) {
      toast.error("Period is closed. Enable force recalculation to proceed.")
      return
    }
    try {
      setRankingBusy(true)
      const scopeTypes: RankingScopeType[] =
        rankScopeType === "all"
          ? ["overall", "branch", "course", "category"]
          : [rankScopeType]
      const result = await kpiRankingAPI.recalculate({
        period_id: periodId,
        scope_types: scopeTypes,
        course_id: courseId || undefined,
        branch_id: branchId !== "all" ? branchId : undefined,
        force,
      })
      toast.success(
        `Saved ${result.saved_count || 0} ranking row(s)` +
          (result.excluded_inactive
            ? ` · ${result.excluded_inactive} inactive excluded`
            : "")
      )
      await loadRankings()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ranking failed")
    } finally {
      setRankingBusy(false)
    }
  }

  const openCreatePeriod = () => {
    setEditingPeriod(null)
    setPeriodForm(emptyPeriod)
    setPeriodOpen(true)
  }

  const openEditPeriod = (p: AssessmentPeriod) => {
    setEditingPeriod(p)
    setPeriodForm({
      code: p.code,
      name: p.name,
      description: p.description || "",
      start_date: (p.start_date || "").slice(0, 10),
      end_date: (p.end_date || "").slice(0, 10),
      status: p.status,
    })
    setPeriodOpen(true)
  }

  const savePeriod = async () => {
    if (!periodForm.code.trim() || !periodForm.name.trim()) {
      toast.error("Code and name are required")
      return
    }
    try {
      setSaving(true)
      const payload = {
        code: periodForm.code.trim(),
        name: periodForm.name.trim(),
        description: periodForm.description.trim() || undefined,
        start_date: `${periodForm.start_date}T00:00:00`,
        end_date: `${periodForm.end_date}T23:59:59`,
        status: periodForm.status,
      }
      if (editingPeriod) {
        await kpiAssessmentAPI.updatePeriod(editingPeriod.id, payload)
        toast.success("Period updated")
      } else {
        await kpiAssessmentAPI.createPeriod(payload)
        toast.success("Period created")
      }
      setPeriodOpen(false)
      await loadLookups()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const deletePeriod = async (p: AssessmentPeriod) => {
    if (!confirm(`Delete period “${p.name}”?`)) return
    try {
      await kpiAssessmentAPI.deletePeriod(p.id)
      toast.success("Period deleted")
      await loadLookups()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed")
    }
  }

  const submitAssessment = async () => {
    if (!periodId || !courseId || !studentId) {
      toast.error("Select period, course, and student")
      return
    }
    const selectedPeriod = periods.find((p) => p.id === periodId)
    if (selectedPeriod && selectedPeriod.status !== "open") {
      toast.error("Only open periods accept assessments")
      return
    }
    const scores = activeKpis
      .map((k) => {
        const raw = scoreMap[k.id]
        if (raw === undefined || raw === "") return null
        return { kpi_id: k.id, raw_score: parseFloat(raw) }
      })
      .filter(Boolean) as { kpi_id: string; raw_score: number }[]

    if (!scores.length) {
      toast.error("Enter at least one KPI score")
      return
    }

    const student = students.find((s) => s.id === studentId)
    const resolvedBranch =
      branchId !== "all" ? branchId : student?.branch_id || undefined

    try {
      setSaving(true)
      const result = await kpiAssessmentAPI.upsertAssessment({
        period_id: periodId,
        student_id: studentId,
        course_id: courseId,
        branch_id: resolvedBranch,
        scores,
        notes: notes.trim() || undefined,
      })
      toast.success(`Saved ${result.saved_count || scores.length} score(s)`)
      if (result.errors?.length) {
        toast.message("Some KPIs were skipped", {
          description: result.errors.map((e: any) => e.error).join("; "),
        })
      }
      const data = await kpiAssessmentAPI.listAssessments({
        period_id: periodId,
        student_id: studentId,
        course_id: courseId,
      })
      setHistory(data.assessments || [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Assessment failed")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="w-full p-8 flex items-center justify-center text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading assessments…
      </main>
    )
  }

  return (
    <main className="w-full p-4 lg:px-8 mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-blue-600" />
            KPI Assessments
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Open an evaluation period, select course and student, then enter KPI scores.
          </p>
        </div>
        <Button variant="outline" onClick={() => void loadLookups()}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      {activeKpis.length === 0 ? (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-700" />
          <AlertDescription className="text-amber-900">
            No active KPIs found. Configure them under Settings → KPI Master first.
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="assess">Assess student</TabsTrigger>
          <TabsTrigger value="periods">Periods</TabsTrigger>
          <TabsTrigger value="ratings">Ratings</TabsTrigger>
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="assess" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Selection</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Period (open only)</Label>
                <Select value={periodId || "none"} onValueChange={(v) => setPeriodId(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select period</SelectItem>
                    {openPeriods.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {openPeriods.length === 0 ? (
                  <p className="text-xs text-amber-700">No open periods. Create/open one in Periods tab.</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label>Branch (optional filter)</Label>
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All branches</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Course</Label>
                <Select
                  value={courseId || "none"}
                  onValueChange={(v) => {
                    setCourseId(v === "none" ? "" : v)
                    setStudentId("")
                  }}
                >
                  <SelectTrigger>
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
              <div className="space-y-1.5">
                <Label>Student</Label>
                <Select
                  value={studentId || "none"}
                  onValueChange={(v) => setStudentId(v === "none" ? "" : v)}
                  disabled={!courseId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={courseId ? "Select student" : "Select course first"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select student</SelectItem>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">KPI scores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeKpis.map((k) => (
                <div
                  key={k.id}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-2 items-center border rounded-lg px-3 py-2"
                >
                  <div>
                    <p className="font-medium text-sm">{k.name}</p>
                    <p className="text-xs text-slate-500">
                      {k.code} · weight {k.weight}
                      {k.weight_unit === "percent" ? "%" : " pts"} · max {k.max_score}
                    </p>
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    min={k.min_score}
                    max={k.max_score}
                    placeholder={`0–${k.max_score}`}
                    value={scoreMap[k.id] ?? ""}
                    onChange={(e) =>
                      setScoreMap((prev) => ({ ...prev, [k.id]: e.target.value }))
                    }
                    disabled={!studentId || !periodId}
                  />
                </div>
              ))}
              <div className="space-y-1.5">
                <Label>Notes (optional)</Label>
                <Textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Evaluator notes for this submission"
                />
              </div>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => void submitAssessment()}
                disabled={saving || !studentId || !periodId || !courseId}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Save assessment
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="periods" className="space-y-4 mt-4">
          <div className="flex justify-end">
            {canManagePeriods ? (
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={openCreatePeriod}>
                <Plus className="h-4 w-4 mr-1" />
                Add period
              </Button>
            ) : (
              <p className="text-sm text-slate-500">Periods are managed by Super Admin.</p>
            )}
          </div>
          <Card>
            <CardContent className="pt-4 space-y-2">
              {periods.length === 0 ? (
                <p className="text-center py-10 text-slate-500">No periods yet.</p>
              ) : (
                periods.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border rounded-lg px-3 py-2"
                  >
                    <div>
                      <p className="font-medium">
                        {p.name}{" "}
                        <span className="font-mono text-xs text-slate-500">{p.code}</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        {(p.start_date || "").slice(0, 10)} → {(p.end_date || "").slice(0, 10)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusBadge(p.status)}>{p.status}</Badge>
                      {canManagePeriods ? (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => openEditPeriod(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600"
                            onClick={() => void deletePeriod(p)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ratings" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-4 w-4 text-blue-600" />
                Weighted rating
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Uses active KPI weights and saved assessment scores for the selected period.
                {formulaHint ? (
                  <span className="block text-xs text-slate-500 mt-1">
                    Formula: {formulaHint} — rating = Σ(normalized × weight) / Σ(weight)
                  </span>
                ) : null}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Period</Label>
                  <Select
                    value={periodId || "none"}
                    onValueChange={(v) => setPeriodId(v === "none" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select period</SelectItem>
                      {periods.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Branch (optional filter)</Label>
                  <Select value={branchId} onValueChange={setBranchId}>
                    <SelectTrigger>
                      <SelectValue placeholder="All branches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All branches</SelectItem>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Course</Label>
                  <Select
                    value={courseId || "none"}
                    onValueChange={(v) => {
                      setCourseId(v === "none" ? "" : v)
                      setStudentId("")
                    }}
                  >
                    <SelectTrigger>
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
                <div className="space-y-1.5">
                  <Label>Student (for single calculate)</Label>
                  <Select
                    value={studentId || "none"}
                    onValueChange={(v) => setStudentId(v === "none" ? "" : v)}
                    disabled={!courseId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={courseId ? "Select student" : "Select course first"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select student</SelectItem>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {periods.find((p) => p.id === periodId)?.status === "closed" &&
              canManagePeriods ? (
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={forceClosedRecalc}
                    onChange={(e) => setForceClosedRecalc(e.target.checked)}
                  />
                  Force recalculate closed period
                </label>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={ratingBusy || !periodId || !courseId || !studentId}
                  onClick={() => void calculateOneRating()}
                >
                  {ratingBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Calculator className="h-4 w-4 mr-1" />
                  )}
                  Calculate selected student
                </Button>
                <Button
                  variant="outline"
                  disabled={ratingBusy || !periodId}
                  onClick={() => void calculatePeriodRatings()}
                >
                  Recalculate period
                </Button>
                <Button
                  variant="ghost"
                  disabled={!periodId}
                  onClick={() => void loadRatings()}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh list
                </Button>
              </div>
              {!studentId ? (
                <p className="text-xs text-slate-500">
                  Select course + student to calculate one rating, or use Recalculate period for
                  everyone with saved scores in this period.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Stored ratings{" "}
                <span className="text-slate-500 font-normal text-sm">({ratings.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!periodId ? (
                <p className="text-center py-10 text-slate-500">Select a period to view ratings.</p>
              ) : ratings.length === 0 ? (
                <p className="text-center py-10 text-slate-500">
                  No ratings yet. Calculate after assessments are saved.
                </p>
              ) : (
                <div className="space-y-2 text-sm">
                  {ratings.map((r) => {
                    const courseName =
                      courses.find((c) => c.id === r.course_id)?.name || r.course_id
                    const studentName =
                      students.find((s) => s.id === r.student_id)?.full_name || r.student_id
                    const open = expandedRatingId === r.id
                    return (
                      <div key={r.id} className="rounded-lg border px-3 py-2 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <p className="font-medium">
                              {studentName} · {courseName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {r.calculated_at
                                ? format(new Date(r.calculated_at), "dd MMM yyyy, hh:mm a")
                                : ""}
                              {r.calculated_by_name ? ` · ${r.calculated_by_name}` : ""}
                              {!r.is_complete ? " · incomplete" : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold tabular-nums">
                              {Number(r.rating).toFixed(2)}
                            </span>
                            <Badge className={bandBadge(r.band)}>
                              {r.band.replace(/_/g, " ")}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setExpandedRatingId(open ? "" : r.id)
                              }
                            >
                              {open ? "Hide" : "Breakdown"}
                            </Button>
                          </div>
                        </div>
                        {open && r.breakdown?.length ? (
                          <div className="rounded-md bg-slate-50 border p-2 space-y-1">
                            {r.breakdown.map((line) => (
                              <div
                                key={line.kpi_id}
                                className="flex justify-between gap-2 text-xs text-slate-700"
                              >
                                <span>
                                  {line.kpi_name || line.kpi_code || line.kpi_id}{" "}
                                  <span className="text-slate-400">
                                    (w {line.weight}
                                    {line.weight_unit === "percent" ? "%" : " pts"})
                                  </span>
                                </span>
                                <span className="tabular-nums">
                                  {line.normalized_score.toFixed(1)} → contrib{" "}
                                  {line.contribution.toFixed(1)}
                                </span>
                              </div>
                            ))}
                            {(r.missing_kpi_ids?.length || 0) > 0 ? (
                              <p className="text-xs text-amber-700 pt-1">
                                Missing {r.missing_kpi_ids?.length} active KPI score(s)
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rankings" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-blue-600" />
                Student rankings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Ranks students from complete S03 ratings. Incomplete scores and inactive
                students are excluded. Ties use competition ranking (1, 2, 2, 4).
                {rankingHint ? (
                  <span className="block text-xs text-slate-500 mt-1">
                    Policy: {rankingHint}
                  </span>
                ) : null}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Period</Label>
                  <Select
                    value={periodId || "none"}
                    onValueChange={(v) => setPeriodId(v === "none" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select period</SelectItem>
                      {periods.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Population</Label>
                  <Select
                    value={rankScopeType}
                    onValueChange={(v) =>
                      setRankScopeType(v as RankingScopeType | "all")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="overall">Overall</SelectItem>
                      <SelectItem value="branch">Branch</SelectItem>
                      <SelectItem value="course">Course</SelectItem>
                      <SelectItem value="category">Category</SelectItem>
                      <SelectItem value="all">All populations (recalc)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Branch filter</Label>
                  <Select value={branchId} onValueChange={setBranchId}>
                    <SelectTrigger>
                      <SelectValue placeholder="All branches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All branches</SelectItem>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Course filter</Label>
                  <Select
                    value={courseId || "none"}
                    onValueChange={(v) => setCourseId(v === "none" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All courses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">All courses</SelectItem>
                      {courses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {periods.find((p) => p.id === periodId)?.status === "closed" &&
              canManagePeriods ? (
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={forceClosedRecalc}
                    onChange={(e) => setForceClosedRecalc(e.target.checked)}
                  />
                  Force recalculate closed period
                </label>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={rankingBusy || !periodId}
                  onClick={() => void recalculateRankings()}
                >
                  {rankingBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Trophy className="h-4 w-4 mr-1" />
                  )}
                  Recalculate rankings
                </Button>
                <Button
                  variant="ghost"
                  disabled={!periodId}
                  onClick={() => void loadRankings()}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh list
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Calculate ratings on the Ratings tab first, then recalculate rankings here.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Leaderboard{" "}
                <span className="text-slate-500 font-normal text-sm">
                  ({rankings.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!periodId ? (
                <p className="text-center py-10 text-slate-500">
                  Select a period to view rankings.
                </p>
              ) : rankings.length === 0 ? (
                <p className="text-center py-10 text-slate-500">
                  No rankings yet. Recalculate after ratings exist.
                </p>
              ) : (
                <div className="space-y-2 text-sm">
                  {rankings.map((row) => {
                    const courseName =
                      courses.find((c) => c.id === row.course_id)?.name || row.course_id
                    const studentName =
                      students.find((s) => s.id === row.student_id)?.full_name ||
                      row.student_id
                    const branchName =
                      branches.find((b) => b.id === row.branch_id)?.name || row.branch_id
                    return (
                      <div
                        key={row.id}
                        className="rounded-lg border px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-lg font-semibold tabular-nums w-10 text-slate-800">
                            #{row.rank}
                          </span>
                          <div>
                            <p className="font-medium">{studentName}</p>
                            <p className="text-xs text-slate-500">
                              {row.scope_type}
                              {row.scope_id && row.scope_id !== "*"
                                ? ` · ${row.scope_id.slice(0, 8)}…`
                                : ""}
                              {" · "}
                              {courseName}
                              {branchName ? ` · ${branchName}` : ""}
                              {row.tied ? " · tied" : ""}
                              {" · pop "}
                              {row.population_size}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:pl-12">
                          <span className="tabular-nums font-semibold">
                            {Number(row.rating).toFixed(2)}
                          </span>
                          {row.band ? (
                            <Badge className={bandBadge(row.band)}>
                              {row.band.replace(/_/g, " ")}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Saved scores{" "}
                <span className="text-slate-500 font-normal text-sm">({history.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-center py-10 text-slate-500">
                  Select a period/student on the Assess tab to view history.
                </p>
              ) : (
                <div className="space-y-2 text-sm">
                  {history.map((h) => (
                    <div
                      key={h.id}
                      className="rounded-lg border px-3 py-2 flex flex-col sm:flex-row sm:justify-between gap-1"
                    >
                      <div>
                        <p className="font-medium">
                          {h.kpi_name || h.kpi_code} — {h.raw_score}/{h.max_score}
                        </p>
                        <p className="text-xs text-slate-500">
                          Normalized {h.normalized_score}%
                          {h.evaluator_name ? ` · by ${h.evaluator_name}` : ""}
                          {h.evaluated_at
                            ? ` · ${format(new Date(h.evaluated_at), "dd MMM yyyy, hh:mm a")}`
                            : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={periodOpen} onOpenChange={setPeriodOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPeriod ? "Edit period" : "Add period"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input
                  value={periodForm.code}
                  onChange={(e) => setPeriodForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="2026-Q3"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={periodForm.status}
                  onValueChange={(v) =>
                    setPeriodForm((f) => ({ ...f, status: v as AssessmentPeriodStatus }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={periodForm.name}
                onChange={(e) => setPeriodForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start</Label>
                <Input
                  type="date"
                  value={periodForm.start_date}
                  onChange={(e) => setPeriodForm((f) => ({ ...f, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>End</Label>
                <Input
                  type="date"
                  value={periodForm.end_date}
                  onChange={(e) => setPeriodForm((f) => ({ ...f, end_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={periodForm.description}
                onChange={(e) => setPeriodForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPeriodOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => void savePeriod()}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
