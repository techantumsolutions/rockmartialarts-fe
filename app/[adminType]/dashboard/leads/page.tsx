"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { RefreshCw, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  LEAD_FOLLOW_UP_ACTIONS,
  LEAD_STATUSES,
  leadAPI,
  type LeadFollowUp,
  type LeadRow,
  type LeadStatus,
} from "@/lib/leadAPI"
import LeadCoachAssignmentSection from "@/components/leads/LeadCoachAssignmentSection"
import LeadCoachSessionBookingSection from "@/components/leads/LeadCoachSessionBookingSection"
import { assignmentStatusLabel } from "@/lib/leadCoachAssignmentAPI"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { TokenManager } from "@/lib/tokenManager"

const STATUS_BADGE: Record<LeadStatus, string> = {
  new: "bg-gray-100 text-gray-800 border-gray-200",
  contacted: "bg-blue-50 text-blue-800 border-blue-200",
  qualified: "bg-amber-50 text-amber-900 border-amber-200",
  converted: "bg-green-50 text-green-800 border-green-200",
  lost: "bg-red-50 text-red-800 border-red-200",
}

function normalizeStatus(raw?: string | null): LeadStatus {
  const s = (raw || "").trim().toLowerCase()
  if (LEAD_STATUSES.some((x) => x.value === s)) return s as LeadStatus
  return "new"
}

function sourceLabel(row: LeadRow) {
  const raw = (row.source_type || row.source || "other").toLowerCase()
  if (raw === "partner_landing") return "Partner Landing"
  const t = raw.replace(/_/g, " ")
  return t.replace(/\b\w/g, (c) => c.toUpperCase())
}

function hasAuth() {
  return !!(BranchManagerAuth.getToken() || TokenManager.getToken())
}

function isOverdue(iso?: string | null, status?: string | null) {
  if (!iso) return false
  const st = (status || "").toLowerCase()
  if (st === "converted" || st === "lost") return false
  try {
    const d = new Date(iso)
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    return d.getTime() < start.getTime()
  } catch {
    return false
  }
}

function toDatetimeLocalValue(iso?: string | null) {
  if (!iso) return ""
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ""
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return ""
  }
}

function fromDatetimeLocal(value: string): string | undefined {
  if (!value.trim()) return undefined
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString()
}

export default function LeadsPage() {
  const { toast } = useToast()
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sourceFilter, setSourceFilter] = useState<string>("all")
  const [dueFilter, setDueFilter] = useState<string>("all")
  const [coachFilter, setCoachFilter] = useState<string>("all")
  const [sourceOptions, setSourceOptions] = useState<
    { value: string; label: string; count: number }[]
  >([])
  const [savingId, setSavingId] = useState<string | null>(null)
  const [summary, setSummary] = useState({
    total: 0,
    open: 0,
    overdue: 0,
    due_today: 0,
  })

  const [detailOpen, setDetailOpen] = useState(false)
  const [activeLead, setActiveLead] = useState<LeadRow | null>(null)
  const [followUps, setFollowUps] = useState<LeadFollowUp[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [logging, setLogging] = useState(false)
  const [fuNote, setFuNote] = useState("")
  const [fuAction, setFuAction] = useState("call")
  const [fuStatus, setFuStatus] = useState<string>("")
  const [fuNext, setFuNext] = useState("")

  const limit = 25

  const loadSummary = useCallback(async () => {
    if (!hasAuth()) return
    try {
      const data = await leadAPI.summary()
      setSummary({
        total: data.total || 0,
        open: data.open || 0,
        overdue: data.overdue || 0,
        due_today: data.due_today || 0,
      })
    } catch {
      /* non-blocking */
    }
  }, [])

  const load = useCallback(async () => {
    if (!hasAuth()) {
      setError("Not authenticated")
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await leadAPI.list({
        skip,
        limit,
        search,
        status: statusFilter,
        source_type: sourceFilter,
        follow_up_due: dueFilter,
        sort: dueFilter !== "all" ? "next_follow_up_at" : undefined,
        unassigned_coach: coachFilter === "unassigned",
        coach_assignment_status:
          coachFilter !== "all" && coachFilter !== "unassigned" ? coachFilter : undefined,
      })
      setLeads(Array.isArray(data.leads) ? data.leads : [])
      setTotal(typeof data.total === "number" ? data.total : 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load leads")
      setLeads([])
    } finally {
      setLoading(false)
    }
  }, [skip, search, statusFilter, sourceFilter, dueFilter, coachFilter])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  useEffect(() => {
    if (!hasAuth()) return
    leadAPI
      .sources()
      .then((d) => {
        if (Array.isArray(d.sources)) setSourceOptions(d.sources)
      })
      .catch(() => {})
  }, [])

  const fmtDate = (iso?: string | null) => {
    if (!iso) return "—"
    try {
      return new Date(iso).toLocaleString()
    } catch {
      return iso
    }
  }

  const refreshAll = async () => {
    await Promise.all([load(), loadSummary()])
  }

  const openDetail = async (row: LeadRow) => {
    setActiveLead(row)
    setFuNote("")
    setFuAction("call")
    setFuStatus("")
    setFuNext(toDatetimeLocalValue(row.next_follow_up_at))
    setDetailOpen(true)
    setDetailLoading(true)
    try {
      const data = await leadAPI.get(row.id)
      setActiveLead(data.lead)
      setFollowUps(Array.isArray(data.follow_ups) ? data.follow_ups : [])
      setFuNext(toDatetimeLocalValue(data.lead.next_follow_up_at))
    } catch (e) {
      toast({
        title: "Could not load lead detail",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setDetailLoading(false)
    }
  }

  const updateStatus = async (id: string, previous: LeadStatus, next: LeadStatus) => {
    if (previous === next) return
    setLeads((rows) => rows.map((r) => (r.id === id ? { ...r, status: next } : r)))
    setSavingId(id)
    try {
      const updated = await leadAPI.updateStatus(id, next)
      setLeads((rows) => rows.map((r) => (r.id === id ? { ...r, ...updated } : r)))
      if (activeLead?.id === id) {
        setActiveLead((prev) => (prev ? { ...prev, ...updated } : prev))
      }
      await loadSummary()
    } catch (e) {
      setLeads((rows) => rows.map((r) => (r.id === id ? { ...r, status: previous } : r)))
      toast({
        title: "Could not update status",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSavingId(null)
    }
  }

  const submitFollowUp = async () => {
    if (!activeLead) return
    const nextIso = fromDatetimeLocal(fuNext)
    if (!fuNote.trim() && !fuStatus && !nextIso) {
      toast({
        title: "Add a note, status, or next follow-up date",
        variant: "destructive",
      })
      return
    }
    setLogging(true)
    try {
      const res = await leadAPI.createFollowUp(activeLead.id, {
        note: fuNote.trim() || undefined,
        action: fuAction,
        status: fuStatus || undefined,
        next_follow_up_at: nextIso,
      })
      setActiveLead(res.lead)
      setLeads((rows) =>
        rows.map((r) => (r.id === res.lead.id ? { ...r, ...res.lead } : r))
      )
      setFollowUps((prev) => [res.follow_up, ...prev])
      setFuNote("")
      setFuStatus("")
      setFuNext(toDatetimeLocalValue(res.lead.next_follow_up_at))
      toast({ title: "Follow-up logged" })
      await loadSummary()
    } catch (e) {
      toast({
        title: "Could not log follow-up",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setLogging(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lead management</h1>
            <p className="text-gray-600 text-sm">
              Follow-up pipeline — notes, next follow-up dates, and status history.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => void refreshAll()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs uppercase tracking-wide text-gray-500">Total</p>
              <p className="text-2xl font-semibold text-gray-900">{summary.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs uppercase tracking-wide text-gray-500">Open</p>
              <p className="text-2xl font-semibold text-gray-900">{summary.open}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs uppercase tracking-wide text-gray-500">Due today</p>
              <p className="text-2xl font-semibold text-amber-700">{summary.due_today}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs uppercase tracking-wide text-gray-500">Overdue</p>
              <p className="text-2xl font-semibold text-red-700">{summary.overdue}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Leads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="flex flex-col sm:flex-row gap-2 flex-wrap"
              onSubmit={(e) => {
                e.preventDefault()
                setSkip(0)
                setSearch(searchInput)
              }}
            >
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search name, phone, branch, source…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setSkip(0)
                  setStatusFilter(v)
                }}
              >
                <SelectTrigger className="h-10 w-full sm:w-[160px] bg-white">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {LEAD_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={sourceFilter}
                onValueChange={(v) => {
                  setSkip(0)
                  setSourceFilter(v)
                }}
              >
                <SelectTrigger className="h-10 w-full sm:w-[200px] bg-white">
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  {sourceOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                      {s.count ? ` (${s.count})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={dueFilter}
                onValueChange={(v) => {
                  setSkip(0)
                  setDueFilter(v)
                }}
              >
                <SelectTrigger className="h-10 w-full sm:w-[170px] bg-white">
                  <SelectValue placeholder="Follow-up" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All follow-ups</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="today">Due today</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="unscheduled">Unscheduled</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={coachFilter}
                onValueChange={(v) => {
                  setSkip(0)
                  setCoachFilter(v)
                }}
              >
                <SelectTrigger className="h-10 w-full sm:w-[170px] bg-white">
                  <SelectValue placeholder="Coach" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All coaches</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" className="bg-yellow-400 hover:bg-yellow-500 text-white">
                Search
              </Button>
            </form>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {loading ? (
              <p className="text-gray-500 text-sm py-8 text-center">Loading…</p>
            ) : leads.length === 0 ? (
              <p className="text-gray-500 text-sm py-8 text-center">No leads found.</p>
            ) : (
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Name</th>
                      <th className="px-3 py-2 font-semibold">Phone</th>
                      <th className="px-3 py-2 font-semibold">Source</th>
                      <th className="px-3 py-2 font-semibold">Branch</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold">Coach</th>
                      <th className="px-3 py-2 font-semibold">Next follow-up</th>
                      <th className="px-3 py-2 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((row) => {
                      const status = normalizeStatus(row.status)
                      const overdue = isOverdue(row.next_follow_up_at, row.status)
                      return (
                        <tr
                          key={row.id}
                          className={`border-t border-gray-200 cursor-pointer ${
                            overdue
                              ? "bg-red-50/70 hover:bg-red-50"
                              : "hover:bg-gray-50/80"
                          }`}
                          onClick={() => void openDetail(row)}
                        >
                          <td className="px-3 py-2">
                            <div>{row.name}</div>
                            {row.course ? (
                              <div className="text-xs text-gray-500">{row.course}</div>
                            ) : null}
                            {row.last_follow_up_note ? (
                              <div className="text-xs text-gray-400 line-clamp-1 max-w-[180px]">
                                {row.last_follow_up_note}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">{row.phone}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1 items-center">
                              <Badge variant="outline" className="text-xs font-normal">
                                {sourceLabel(row)}
                              </Badge>
                              {(row.capture_count || 1) > 1 && (
                                <span className="text-[10px] text-amber-700">
                                  ×{row.capture_count}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            {row.branch_name?.trim() ? row.branch_name : "—"}
                          </td>
                          <td
                            className="px-3 py-2 min-w-[160px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Select
                              value={status}
                              disabled={savingId === row.id}
                              onValueChange={(v) =>
                                void updateStatus(row.id, status, v as LeadStatus)
                              }
                            >
                              <SelectTrigger
                                className={`h-8 text-xs border ${STATUS_BADGE[status]}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {LEAD_STATUSES.map((s) => (
                                  <SelectItem key={s.value} value={s.value}>
                                    {s.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2">
                            {row.assigned_coach_name ? (
                              <div>
                                <div className="text-gray-800">{row.assigned_coach_name}</div>
                                <div className="text-[11px] text-gray-500">
                                  {assignmentStatusLabel(row.coach_assignment_status)}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">
                                {row.coach_assignment_status === "declined"
                                  ? "Declined · reassign"
                                  : "Unassigned"}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {row.next_follow_up_at ? (
                              <span
                                className={
                                  overdue ? "text-red-700 font-medium" : "text-gray-700"
                                }
                              >
                                {fmtDate(row.next_follow_up_at)}
                                {overdue ? " · overdue" : ""}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                            {fmtDate(row.created_at)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {total > limit && (
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  Showing {skip + 1}–{Math.min(skip + limit, total)} of {total}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={skip === 0 || loading}
                    onClick={() => setSkip((s) => Math.max(0, s - limit))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={skip + limit >= total || loading}
                    onClick={() => setSkip((s) => s + limit)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{activeLead?.name || "Lead"}</SheetTitle>
            <SheetDescription>
              {activeLead?.phone}
              {activeLead?.email ? ` · ${activeLead.email}` : ""}
            </SheetDescription>
          </SheetHeader>

          {detailLoading ? (
            <p className="text-sm text-gray-500 mt-6">Loading…</p>
          ) : activeLead ? (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="font-medium">{normalizeStatus(activeLead.status)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Source</p>
                  <p className="font-medium">{sourceLabel(activeLead)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Branch</p>
                  <p className="font-medium">{activeLead.branch_name || "—"}</p>
                </div>
                {activeLead.message ? (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Message</p>
                    <p className="font-medium whitespace-pre-wrap text-gray-800">
                      {activeLead.message}
                    </p>
                  </div>
                ) : null}
                <div>
                  <p className="text-xs text-gray-500">Next follow-up</p>
                  <p
                    className={`font-medium ${
                      isOverdue(activeLead.next_follow_up_at, activeLead.status)
                        ? "text-red-700"
                        : ""
                    }`}
                  >
                    {fmtDate(activeLead.next_follow_up_at)}
                  </p>
                </div>
              </div>

              <LeadCoachAssignmentSection
                lead={activeLead}
                onLeadUpdated={(updated) => {
                  setActiveLead(updated)
                  setLeads((rows) =>
                    rows.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
                  )
                }}
              />

              <LeadCoachSessionBookingSection
                lead={activeLead}
                onLeadUpdated={(updated) => {
                  setActiveLead(updated)
                  setLeads((rows) =>
                    rows.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
                  )
                }}
              />

              <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900">Log follow-up</h3>
                <div className="space-y-2">
                  <Label>Action</Label>
                  <Select value={fuAction} onValueChange={setFuAction}>
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_FOLLOW_UP_ACTIONS.map((a) => (
                        <SelectItem key={a.value} value={a.value}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Note</Label>
                  <Textarea
                    value={fuNote}
                    onChange={(e) => setFuNote(e.target.value)}
                    placeholder="What happened / next steps…"
                    rows={3}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Update status (optional)</Label>
                  <Select
                    value={fuStatus || "keep"}
                    onValueChange={(v) => setFuStatus(v === "keep" ? "" : v)}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Keep current" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="keep">Keep current</SelectItem>
                      {LEAD_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Next follow-up</Label>
                  <Input
                    type="datetime-local"
                    value={fuNext}
                    onChange={(e) => setFuNext(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <Button
                  type="button"
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-white"
                  disabled={logging}
                  onClick={() => void submitFollowUp()}
                >
                  {logging ? "Saving…" : "Save follow-up"}
                </Button>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900">Follow-up history</h3>
                {followUps.length === 0 ? (
                  <p className="text-sm text-gray-500">No follow-ups yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {followUps.map((ev) => (
                      <li
                        key={ev.id}
                        className="border rounded-md p-3 bg-white text-sm space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline" className="text-xs capitalize">
                            {(ev.action || "note").replace(/_/g, " ")}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {fmtDate(ev.created_at)}
                          </span>
                        </div>
                        {ev.from_status || ev.to_status ? (
                          <p className="text-xs text-gray-600">
                            Status: {ev.from_status || "—"} → {ev.to_status || "—"}
                          </p>
                        ) : null}
                        {ev.note ? <p className="text-gray-800">{ev.note}</p> : null}
                        {ev.next_follow_up_at ? (
                          <p className="text-xs text-gray-500">
                            Next: {fmtDate(ev.next_follow_up_at)}
                          </p>
                        ) : null}
                        {ev.actor_name ? (
                          <p className="text-[11px] text-gray-400">by {ev.actor_name}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
