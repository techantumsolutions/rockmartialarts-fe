"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, RefreshCw, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { TokenManager } from "@/lib/tokenManager"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { fetchAllCoaches } from "@/lib/coachFetch"
import { getBackendApiUrl } from "@/lib/config"
import {
  ALLOWED_STATUS_TRANSITIONS,
  paymentStatusLabel,
  statusLabel,
  typeLabel,
  trainingRequestAPI,
  TRAINING_REQUEST_STATUSES,
  TRAINING_REQUEST_TYPES,
  type StatusHistoryEntry,
  type TrainingRequest,
  type TrainingRequestStatus,
} from "@/lib/trainingRequestAPI"

type CoachOpt = { id: string; name: string }
type BranchOpt = { id: string; name: string }
type Summary = {
  total: number
  by_type: Record<string, number>
  by_status: Record<string, number>
  by_payment_status: Record<string, number>
  unassigned_coach: number
}

const STATUS_BADGE: Record<string, string> = {
  submitted: "bg-gray-100 text-gray-800 border-gray-200",
  under_review: "bg-blue-50 text-blue-800 border-blue-200",
  coach_assigned: "bg-indigo-50 text-indigo-800 border-indigo-200",
  scheduled: "bg-amber-50 text-amber-900 border-amber-200",
  completed: "bg-green-50 text-green-800 border-green-200",
  rejected: "bg-red-50 text-red-800 border-red-200",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200",
}

const TYPE_BADGE: Record<string, string> = {
  home: "bg-emerald-50 text-emerald-800 border-emerald-200",
  school: "bg-sky-50 text-sky-800 border-sky-200",
  college: "bg-violet-50 text-violet-800 border-violet-200",
  corporate: "bg-orange-50 text-orange-900 border-orange-200",
  residential: "bg-rose-50 text-rose-800 border-rose-200",
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function detailsOf(req: TrainingRequest | null): Record<string, unknown> {
  if (!req?.details || typeof req.details !== "object") return {}
  return req.details as Record<string, unknown>
}

export default function TrainingRequestsAdminPage() {
  const { toast } = useToast()
  const [rows, setRows] = useState<TrainingRequest[]>([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [paymentFilter, setPaymentFilter] = useState("all")
  const [branchFilter, setBranchFilter] = useState("all")
  const [coachFilter, setCoachFilter] = useState("all")
  const [summary, setSummary] = useState<Summary | null>(null)
  const [branches, setBranches] = useState<BranchOpt[]>([])
  const limit = 25

  const [detail, setDetail] = useState<TrainingRequest | null>(null)
  const [history, setHistory] = useState<StatusHistoryEntry[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [statusNote, setStatusNote] = useState("")
  const [nextStatus, setNextStatus] = useState<string>("")
  const [coaches, setCoaches] = useState<CoachOpt[]>([])
  const [coachId, setCoachId] = useState("")
  const [coachNote, setCoachNote] = useState("")

  const ensureAuth = () => {
    const token = BranchManagerAuth.getToken() || TokenManager.getToken()
    if (!token) {
      setError("Not authenticated")
      return null
    }
    return token
  }

  const load = useCallback(async () => {
    if (!ensureAuth()) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [data, summaryData] = await Promise.all([
        trainingRequestAPI.list({
          type: typeFilter !== "all" ? typeFilter : undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          payment_status: paymentFilter !== "all" ? paymentFilter : undefined,
          branch_id: branchFilter !== "all" ? branchFilter : undefined,
          assigned_coach_id:
            coachFilter !== "all" && coachFilter !== "unassigned" ? coachFilter : undefined,
          unassigned_only: coachFilter === "unassigned",
          search: search.trim() || undefined,
          skip,
          limit,
        }),
        trainingRequestAPI.summary({
          branch_id: branchFilter !== "all" ? branchFilter : undefined,
        }),
      ])
      setRows(data.requests || [])
      setTotal(typeof data.total === "number" ? data.total : data.requests?.length || 0)
      setSummary(summaryData)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load training requests")
      setRows([])
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [skip, search, statusFilter, typeFilter, paymentFilter, branchFilter, coachFilter])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const token = BranchManagerAuth.getToken() || TokenManager.getToken()
    if (!token) return
    fetchAllCoaches(token, { activeOnly: true })
      .then((list) => {
        setCoaches(
          (list || []).map((c: { id: string; full_name?: string; first_name?: string; last_name?: string }) => ({
            id: c.id,
            name:
              c.full_name ||
              `${c.first_name || ""} ${c.last_name || ""}`.trim() ||
              c.id,
          }))
        )
      })
      .catch(() => setCoaches([]))

    fetch(getBackendApiUrl("branches?skip=0&limit=200"), {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : Promise.resolve({ branches: [] })))
      .then((data) => {
        const list = data.branches || data || []
        setBranches(
          (Array.isArray(list) ? list : []).map((b: { id: string; name?: string; branch?: { name?: string } }) => ({
            id: b.id,
            name: b.branch?.name || b.name || b.id,
          }))
        )
      })
      .catch(() => setBranches([]))
  }, [])

  const openDetail = async (id: string) => {
    setDetailLoading(true)
    setStatusNote("")
    setCoachNote("")
    setCoachId("")
    setNextStatus("")
    try {
      const data = await trainingRequestAPI.get(id)
      setDetail(data.request)
      setHistory(data.status_history || [])
      setCoachId(data.request.assigned_coach_id || "")
    } catch (e) {
      toast({
        title: "Failed to load detail",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setDetailLoading(false)
    }
  }

  const allowedNext = useMemo(() => {
    const cur = (detail?.status || "") as TrainingRequestStatus
    return ALLOWED_STATUS_TRANSITIONS[cur] || []
  }, [detail?.status])

  const refreshDetail = async (id: string) => {
    const data = await trainingRequestAPI.get(id)
    setDetail(data.request)
    setHistory(data.status_history || [])
    setCoachId(data.request.assigned_coach_id || "")
  }

  const onUpdateStatus = async () => {
    if (!detail || !nextStatus) return
    setSaving(true)
    try {
      await trainingRequestAPI.updateStatus(
        detail.id,
        nextStatus as TrainingRequestStatus,
        statusNote.trim() || undefined
      )
      toast({ title: "Status updated" })
      setStatusNote("")
      setNextStatus("")
      await refreshDetail(detail.id)
      await load()
    } catch (e) {
      toast({
        title: "Status update failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const onAssignCoach = async () => {
    if (!detail || !coachId) return
    setSaving(true)
    try {
      await trainingRequestAPI.assignCoach(
        detail.id,
        coachId,
        coachNote.trim() || undefined
      )
      toast({ title: "Coach assigned" })
      setCoachNote("")
      await refreshDetail(detail.id)
      await load()
    } catch (e) {
      toast({
        title: "Coach assignment failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const d = detailsOf(detail)
  const terminal = ["completed", "rejected", "cancelled"].includes(
    String(detail?.status || "")
  )

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Training requests</h1>
            <p className="text-gray-600 text-sm">
              Unified inbox for all training types — filter, review, assign coaches, and track history
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => load()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {summary ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <SummaryCard
              label="Total"
              value={summary.total}
              onClick={() => {
                setTypeFilter("all")
                setStatusFilter("all")
                setCoachFilter("all")
                setSkip(0)
              }}
            />
            {TRAINING_REQUEST_TYPES.map((t) => (
              <SummaryCard
                key={t.value}
                label={t.label}
                value={summary.by_type[t.value] || 0}
                active={typeFilter === t.value}
                onClick={() => {
                  setTypeFilter(t.value)
                  setSkip(0)
                }}
              />
            ))}
            <SummaryCard
              label="Unassigned coach"
              value={summary.unassigned_coach}
              active={coachFilter === "unassigned"}
              onClick={() => {
                setCoachFilter("unassigned")
                setSkip(0)
              }}
            />
          </div>
        ) : null}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Requests ({total})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                setSkip(0)
                setSearch(searchInput)
              }}
            >
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search name, school, college, org, phone, city, coach…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button type="submit" className="bg-yellow-400 hover:bg-yellow-500 text-white">
                  Search
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                <Select
                  value={typeFilter}
                  onValueChange={(v) => {
                    setSkip(0)
                    setTypeFilter(v)
                  }}
                >
                  <SelectTrigger className="h-10 bg-white">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {TRAINING_REQUEST_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setSkip(0)
                    setStatusFilter(v)
                  }}
                >
                  <SelectTrigger className="h-10 bg-white">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {TRAINING_REQUEST_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={paymentFilter}
                  onValueChange={(v) => {
                    setSkip(0)
                    setPaymentFilter(v)
                  }}
                >
                  <SelectTrigger className="h-10 bg-white">
                    <SelectValue placeholder="Payment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All payments</SelectItem>
                    <SelectItem value="pending">Payment pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="not_required">No payment required</SelectItem>
                    <SelectItem value="waived">Waived</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={branchFilter}
                  onValueChange={(v) => {
                    setSkip(0)
                    setBranchFilter(v)
                  }}
                >
                  <SelectTrigger className="h-10 bg-white">
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
                <Select
                  value={coachFilter}
                  onValueChange={(v) => {
                    setSkip(0)
                    setCoachFilter(v)
                  }}
                >
                  <SelectTrigger className="h-10 bg-white">
                    <SelectValue placeholder="Coach" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All coaches</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {coaches.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </form>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {loading ? (
              <p className="text-gray-500 text-sm py-8 text-center">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="text-gray-500 text-sm py-8 text-center">No training requests found.</p>
            ) : (
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Type</th>
                      <th className="px-3 py-2 font-semibold">Contact</th>
                      <th className="px-3 py-2 font-semibold">Subject</th>
                      <th className="px-3 py-2 font-semibold">City</th>
                      <th className="px-3 py-2 font-semibold">Branch</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold">Payment</th>
                      <th className="px-3 py-2 font-semibold">Coach</th>
                      <th className="px-3 py-2 font-semibold">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const det = detailsOf(row)
                      const subject =
                        row.type === "school"
                          ? String(det.school_name || "—")
                          : row.type === "college"
                            ? String(det.college_name || "—")
                            : row.type === "corporate"
                              ? String(det.organization_name || "—")
                              : row.type === "residential"
                                ? String(det.participant_name || det.package_name || "—")
                                : String(det.participant_name || "—")
                      return (
                        <tr
                          key={row.id}
                          className="border-t hover:bg-yellow-50 cursor-pointer"
                          onClick={() => openDetail(row.id)}
                        >
                          <td className="px-3 py-2">
                            <Badge
                              variant="outline"
                              className={TYPE_BADGE[String(row.type)] || ""}
                            >
                              {typeLabel(row.type)}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-medium">{row.contact_name}</div>
                            <div className="text-xs text-gray-500">{row.contact_phone}</div>
                          </td>
                          <td className="px-3 py-2">{subject}</td>
                          <td className="px-3 py-2">{String(det.city || "—")}</td>
                          <td className="px-3 py-2">{row.branch_name || "—"}</td>
                          <td className="px-3 py-2">
                            <Badge
                              variant="outline"
                              className={STATUS_BADGE[String(row.status)] || ""}
                            >
                              {statusLabel(row.status)}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {row.type === "residential"
                              ? paymentStatusLabel(row.payment_status)
                              : "—"}
                          </td>
                          <td className="px-3 py-2">{row.assigned_coach_name || "—"}</td>
                          <td className="px-3 py-2">{fmtDate(row.created_at)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {total > limit ? (
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  disabled={skip === 0}
                  onClick={() => setSkip(Math.max(0, skip - limit))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={skip + limit >= total}
                  onClick={() => setSkip(skip + limit)}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {(detail || detailLoading) && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => {
            if (!saving) setDetail(null)
          }}
        >
          <div
            className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-auto p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading || !detail ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                <div className="flex justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold">{detail.contact_name}</h2>
                    <p className="text-sm text-gray-600">
                      {detail.contact_phone}
                      {detail.contact_email ? ` • ${detail.contact_email}` : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge
                        variant="outline"
                        className={TYPE_BADGE[String(detail.type)] || ""}
                      >
                        {typeLabel(detail.type)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={STATUS_BADGE[String(detail.status)] || ""}
                      >
                        {statusLabel(detail.status)}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => setDetail(null)} disabled={saving}>
                    Close
                  </Button>
                </div>

                {detail.type === "residential" ? (
                  <Section title="Residential package & participant">
                    <p>Participant: {String(d.participant_name || "—")}</p>
                    <p>Age: {d.participant_age != null ? String(d.participant_age) : "—"}</p>
                    <p>Phone: {String(d.participant_phone || "—")}</p>
                    <p>Email: {String(d.participant_email || "—")}</p>
                    <p>Gender: {String(d.gender || "—")}</p>
                    <p>
                      Emergency: {String(d.emergency_contact_name || "—")} /{" "}
                      {String(d.emergency_contact_phone || "—")}
                    </p>
                    <p>Package: {String(d.package_name || d.package_id || "—")}</p>
                    <p>Duration: {String(d.duration_label || d.duration_days || "—")}</p>
                    <p>
                      Dates: {String(d.preferred_start_date || "—")} →{" "}
                      {String(d.preferred_end_date || "—")}
                    </p>
                    <p>Accommodation: {String(d.accommodation || "—")}</p>
                    <p>Food: {String(d.food_preference || "—")}</p>
                    <p>Medical: {String(d.medical_notes || "—")}</p>
                    <p>Goals: {String(d.training_goals || "—")}</p>
                    <p>Special: {String(d.special_requirements || "—")}</p>
                    <p>
                      Fees: total ₹{String(detail.fee_total_inr ?? d.fee_total_inr ?? "—")} · pay now
                      ₹{String(detail.fee_pay_now_inr ?? d.fee_pay_now_inr ?? "—")}
                    </p>
                    <p>Payment: {paymentStatusLabel(detail.payment_status)}</p>
                    {detail.razorpay_payment_id ? (
                      <p>Txn: {detail.razorpay_payment_id}</p>
                    ) : null}
                    <p>Notes: {detail.notes || "—"}</p>
                    <p>Branch: {detail.branch_name || "—"}</p>
                    <p>Submitted: {fmtDate(detail.created_at)}</p>
                  </Section>
                ) : detail.type === "corporate" ? (
                  <Section title="Organization & employees">
                    <p>Organization: {String(d.organization_name || "—")}</p>
                    <p>Type: {String(d.organization_type || "—")}</p>
                    <p>Industry: {String(d.industry || "—")}</p>
                    <p>Designation: {String(d.contact_designation || "—")}</p>
                    <p>Employees: {String(d.employee_count ?? "—")}</p>
                    <p>Team: {String(d.department_or_team || "—")}</p>
                    <p>Requirement: {String(d.training_requirement || "—")}</p>
                    <p>
                      Address:{" "}
                      {[d.address_line1, d.address_line2, d.city, d.state, d.pincode]
                        .filter(Boolean)
                        .map(String)
                        .join(", ") || "—"}
                    </p>
                  </Section>
                ) : detail.type === "college" ? (
                  <Section title="College & participants">
                    <p>College: {String(d.college_name || "—")}</p>
                    <p>College type: {String(d.college_type || "—")}</p>
                    <p>Department: {String(d.department || "—")}</p>
                    <p>Designation: {String(d.contact_designation || "—")}</p>
                    <p>Participants: {String(d.number_of_participants ?? "—")}</p>
                    <p>Year of study: {String(d.year_of_study || "—")}</p>
                    <p>Group: {String(d.participant_group || "—")}</p>
                    <p>
                      Address:{" "}
                      {[d.address_line1, d.address_line2, d.city, d.state, d.pincode]
                        .filter(Boolean)
                        .map(String)
                        .join(", ") || "—"}
                    </p>
                  </Section>
                ) : detail.type === "school" ? (
                  <Section title="School & participants">
                    <p>School: {String(d.school_name || "—")}</p>
                    <p>School type: {String(d.school_type || "—")}</p>
                    <p>Designation: {String(d.contact_designation || "—")}</p>
                    <p>Students: {String(d.number_of_students ?? "—")}</p>
                    <p>Age group: {String(d.age_group || "—")}</p>
                    <p>Grades: {String(d.grade_levels || "—")}</p>
                    <p>
                      Address:{" "}
                      {[d.address_line1, d.address_line2, d.city, d.state, d.pincode]
                        .filter(Boolean)
                        .map(String)
                        .join(", ") || "—"}
                    </p>
                  </Section>
                ) : (
                  <Section title="Participant & location">
                    <p>Name: {String(d.participant_name || "—")}</p>
                    <p>Age: {d.participant_age != null ? String(d.participant_age) : "—"}</p>
                    <p>Phone: {String(d.participant_phone || "—")}</p>
                    <p>Email: {String(d.participant_email || "—")}</p>
                    <p>Participants: {String(d.number_of_participants ?? "—")}</p>
                    <p>
                      Address:{" "}
                      {[d.address_line1, d.address_line2, d.city, d.state, d.pincode]
                        .filter(Boolean)
                        .map(String)
                        .join(", ") || "—"}
                    </p>
                  </Section>
                )}

                {detail.type === "residential" ? null : (
                <Section title="Training preferences">
                  <p>Date: {String(d.preferred_date || "—")}</p>
                  <p>Time: {String(d.preferred_time || "—")}</p>
                  {detail.type === "school" ||
                  detail.type === "college" ||
                  detail.type === "corporate" ? (
                    <p>Schedule notes: {String(d.schedule_notes || "—")}</p>
                  ) : null}
                  <p>Type: {String(d.training_type || "—")}</p>
                  <p>Goals: {String(d.training_goals || "—")}</p>
                  <p>Special: {String(d.special_requirements || "—")}</p>
                  <p>Notes: {detail.notes || "—"}</p>
                  <p>Branch: {detail.branch_name || "—"}</p>
                  <p>Source: {detail.source || "—"}</p>
                  <p>Submitted: {fmtDate(detail.created_at)}</p>
                </Section>
                )}

                <Section title="Status workflow">
                  {allowedNext.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No further status changes available for this request.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label>New status</Label>
                          <Select value={nextStatus || undefined} onValueChange={setNextStatus}>
                            <SelectTrigger className="bg-white">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              {allowedNext.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {statusLabel(s)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label>Note (optional)</Label>
                          <Textarea
                            value={statusNote}
                            onChange={(e) => setStatusNote(e.target.value)}
                            className="min-h-[60px]"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        disabled={saving || !nextStatus}
                        className="bg-yellow-400 hover:bg-yellow-500 text-white"
                        onClick={onUpdateStatus}
                      >
                        {saving ? "Saving…" : "Update status"}
                      </Button>
                    </div>
                  )}
                </Section>

                <Section title="Coach assignment">
                  {terminal ? (
                    <p className="text-sm text-gray-500">
                      Coach cannot be changed when status is {statusLabel(detail.status)}.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        Current: {detail.assigned_coach_name || "Unassigned"}
                      </p>
                      <div className="space-y-1">
                        <Label>Coach</Label>
                        <Select value={coachId || undefined} onValueChange={setCoachId}>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select coach" />
                          </SelectTrigger>
                          <SelectContent>
                            {coaches.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Note (optional)</Label>
                        <Textarea
                          value={coachNote}
                          onChange={(e) => setCoachNote(e.target.value)}
                          className="min-h-[60px]"
                        />
                      </div>
                      <Button
                        type="button"
                        disabled={saving || !coachId}
                        className="bg-yellow-400 hover:bg-yellow-500 text-white"
                        onClick={onAssignCoach}
                      >
                        {saving ? "Saving…" : "Assign coach"}
                      </Button>
                    </div>
                  )}
                </Section>

                <Section title="Status history">
                  {history.length === 0 ? (
                    <p className="text-sm text-gray-500">No history yet.</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {history.map((h) => (
                        <li key={h.id} className="border-l-2 border-yellow-400 pl-3 py-1">
                          <div className="font-medium text-gray-900">
                            {h.from_status
                              ? `${statusLabel(h.from_status)} → ${statusLabel(h.to_status)}`
                              : statusLabel(h.to_status)}
                            {h.action ? (
                              <span className="text-xs text-gray-500 font-normal ml-2">
                                ({h.action})
                              </span>
                            ) : null}
                          </div>
                          <div className="text-gray-600">
                            {h.actor_name || "—"}
                            {h.actor_role ? ` (${h.actor_role})` : ""} • {fmtDate(h.created_at)}
                          </div>
                          {h.note ? <div className="text-gray-500">{h.note}</div> : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold text-[#4F5077] mb-1">{title}</h3>
      <div className="text-sm text-gray-800 space-y-1">{children}</div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  active,
  onClick,
}: {
  label: string
  value: number
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border bg-white px-3 py-3 text-left transition-colors ${
        active ? "border-yellow-400 ring-1 ring-yellow-300" : "border-gray-200 hover:border-yellow-300"
      }`}
    >
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-semibold text-gray-900">{value}</div>
    </button>
  )
}
