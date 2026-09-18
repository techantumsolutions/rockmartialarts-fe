"use client"

import { useCallback, useEffect, useState } from "react"
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  ToggleLeft,
  ToggleRight,
  XCircle,
} from "lucide-react"
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
import {
  approvalStatusLabel,
  coachApprovalAPI,
  COACH_APPROVAL_STATUSES,
  type ApprovalHistoryEntry,
  type ApprovalSummary,
  type CoachApprovalRow,
} from "@/lib/coachApprovalAPI"

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-900 border-amber-200",
  approved: "bg-green-50 text-green-800 border-green-200",
  rejected: "bg-red-50 text-red-800 border-red-200",
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function displayName(c: CoachApprovalRow) {
  return (
    c.full_name ||
    `${c.personal_info?.first_name || ""} ${c.personal_info?.last_name || ""}`.trim() ||
    "Coach"
  )
}

function displayEmail(c: CoachApprovalRow) {
  return c.contact_info?.email || c.email || "—"
}

function displayPhone(c: CoachApprovalRow) {
  const local = c.contact_info?.phone || c.phone || ""
  const cc = c.contact_info?.country_code || ""
  return `${cc} ${local}`.trim() || "—"
}

export default function CoachApprovalsAdminPage() {
  const { toast } = useToast()
  const [rows, setRows] = useState<CoachApprovalRow[]>([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("pending")
  const [activeFilter, setActiveFilter] = useState("all")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [summary, setSummary] = useState<ApprovalSummary | null>(null)
  const limit = 25

  const [detail, setDetail] = useState<CoachApprovalRow | null>(null)
  const [history, setHistory] = useState<ApprovalHistoryEntry[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState("")

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
      const isActive =
        activeFilter === "active" ? true : activeFilter === "inactive" ? false : undefined
      const [data, summaryData] = await Promise.all([
        coachApprovalAPI.list({
          approval_status: statusFilter,
          is_active: isActive,
          registration_source: sourceFilter,
          search: search.trim() || undefined,
          skip,
          limit,
        }),
        coachApprovalAPI.summary(),
      ])
      setRows(data.coaches || [])
      setTotal(typeof data.total === "number" ? data.total : data.coaches?.length || 0)
      setSummary(summaryData)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load coach approvals")
      setRows([])
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [skip, search, statusFilter, activeFilter, sourceFilter])

  useEffect(() => {
    load()
  }, [load])

  const openDetail = async (coach: CoachApprovalRow) => {
    setDetail(coach)
    setNote("")
    setDetailLoading(true)
    try {
      const data = await coachApprovalAPI.detail(coach.id)
      setDetail(data.coach)
      setHistory(data.approval_history || [])
    } catch (e) {
      toast({
        title: "Could not load details",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
      setHistory([])
    } finally {
      setDetailLoading(false)
    }
  }

  const refreshDetail = async (coachId: string) => {
    const data = await coachApprovalAPI.detail(coachId)
    setDetail(data.coach)
    setHistory(data.approval_history || [])
    await load()
  }

  const handleApprove = async () => {
    if (!detail) return
    setSaving(true)
    try {
      await coachApprovalAPI.approve(detail.id, note.trim() || undefined)
      toast({ title: "Coach approved", description: "They can now sign in." })
      setNote("")
      await refreshDetail(detail.id)
    } catch (e) {
      toast({
        title: "Approve failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleReject = async () => {
    if (!detail) return
    setSaving(true)
    try {
      await coachApprovalAPI.reject(detail.id, note.trim() || undefined)
      toast({ title: "Registration rejected" })
      setNote("")
      await refreshDetail(detail.id)
    } catch (e) {
      toast({
        title: "Reject failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async () => {
    if (!detail) return
    const next = !detail.is_active
    setSaving(true)
    try {
      await coachApprovalAPI.setActive(detail.id, next, note.trim() || undefined)
      toast({
        title: next ? "Coach activated" : "Coach deactivated",
      })
      setNote("")
      await refreshDetail(detail.id)
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

  const status = (detail?.approval_status || "approved").toLowerCase()
  const canApprove = status === "pending" || status === "rejected"
  const canReject = status === "pending" || status === "approved"
  const canToggleActive = status === "approved"

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full p-4 lg:px-8 lg:py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#4F5077]">Coach Approvals</h1>
            <p className="text-sm text-[#6B7A99] mt-1">
              Review self-registered coaches, approve or reject, and manage active status.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => load()}
            disabled={loading}
            className="gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>
        </div>

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Pending", value: summary.pending },
              { label: "Approved", value: summary.approved },
              { label: "Rejected", value: summary.rejected },
              { label: "Active", value: summary.active },
              { label: "Inactive", value: summary.inactive },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="py-4 px-4">
                  <p className="text-xs text-[#6B7A99]">{s.label}</p>
                  <p className="text-xl font-semibold text-[#4F5077]">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search name, email, phone…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setSkip(0)
                      setSearch(searchInput)
                    }
                  }}
                  className="pl-10"
                />
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setSkip(0)
                  setSearch(searchInput)
                }}
              >
                Search
              </Button>
              <div className="w-40">
                <Label className="text-xs text-[#6B7A99]">Approval</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setSkip(0)
                    setStatusFilter(v)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {COACH_APPROVAL_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-36">
                <Label className="text-xs text-[#6B7A99]">Active</Label>
                <Select
                  value={activeFilter}
                  onValueChange={(v) => {
                    setSkip(0)
                    setActiveFilter(v)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-36">
                <Label className="text-xs text-[#6B7A99]">Source</Label>
                <Select
                  value={sourceFilter}
                  onValueChange={(v) => {
                    setSkip(0)
                    setSourceFilter(v)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="self">Self-registered</SelectItem>
                    <SelectItem value="admin">Admin-created</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-[#6B7A99]">Coach</th>
                    <th className="text-left py-3 px-4 font-medium text-[#6B7A99]">Contact</th>
                    <th className="text-left py-3 px-4 font-medium text-[#6B7A99]">Approval</th>
                    <th className="text-left py-3 px-4 font-medium text-[#6B7A99]">Active</th>
                    <th className="text-left py-3 px-4 font-medium text-[#6B7A99]">Source</th>
                    <th className="text-left py-3 px-4 font-medium text-[#6B7A99]">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-gray-500">
                        <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                        Loading…
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-gray-500">
                        No coaches match these filters.
                      </td>
                    </tr>
                  ) : (
                    rows.map((c) => {
                      const st = (c.approval_status || "approved").toLowerCase()
                      return (
                        <tr
                          key={c.id}
                          className="border-b hover:bg-gray-50 cursor-pointer"
                          onClick={() => openDetail(c)}
                        >
                          <td className="py-3 px-4">
                            <div className="font-medium text-[#4F5077]">{displayName(c)}</div>
                            <div className="text-xs text-gray-500 truncate max-w-[200px]">
                              {(c.areas_of_expertise || []).slice(0, 3).join(", ") || "—"}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-[#6B7A99]">
                            <div>{displayEmail(c)}</div>
                            <div className="text-xs">{displayPhone(c)}</div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className={STATUS_BADGE[st] || ""}>
                              {approvalStatusLabel(st)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            {c.is_active ? (
                              <span className="text-green-700 text-xs font-medium">Active</span>
                            ) : (
                              <span className="text-gray-500 text-xs">Inactive</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-[#6B7A99] capitalize">
                            {c.registration_source || "—"}
                          </td>
                          <td className="py-3 px-4 text-[#6B7A99] text-xs">
                            {fmtDate(c.created_at)}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-sm text-[#6B7A99]">
              <span>
                Showing {rows.length ? skip + 1 : 0}–{skip + rows.length} of {total}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={skip <= 0 || loading}
                  onClick={() => setSkip(Math.max(0, skip - limit))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={skip + limit >= total || loading}
                  onClick={() => setSkip(skip + limit)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {detail && (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-[#4F5077]">{displayName(detail)}</CardTitle>
                <p className="text-sm text-[#6B7A99] mt-1">
                  {displayEmail(detail)} · {displayPhone(detail)}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setDetail(null)}>
                Close
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {detailLoading ? (
                <div className="py-8 text-center text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin inline" />
                </div>
              ) : (
                <>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-[#6B7A99]">Approval</p>
                      <Badge
                        variant="outline"
                        className={`mt-1 ${STATUS_BADGE[status] || ""}`}
                      >
                        {approvalStatusLabel(status)}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-[#6B7A99]">Active status</p>
                      <p className="mt-1 font-medium">
                        {detail.is_active ? "Active" : "Inactive"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#6B7A99]">Experience</p>
                      <p className="mt-1">
                        {detail.professional_info?.professional_experience || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#6B7A99]">Specializations</p>
                      <p className="mt-1">
                        {(detail.areas_of_expertise || []).join(", ") || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#6B7A99]">Service locations</p>
                      <p className="mt-1">
                        {(detail.service_location_names || []).join(", ") ||
                          (detail.service_location_ids || []).join(", ") ||
                          "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#6B7A99]">Address</p>
                      <p className="mt-1">
                        {[
                          detail.address_info?.address,
                          detail.address_info?.city,
                          detail.address_info?.state,
                        ]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </p>
                    </div>
                    {detail.about_short && (
                      <div className="md:col-span-2">
                        <p className="text-xs text-[#6B7A99]">About</p>
                        <p className="mt-1">{detail.about_short}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="approval-note">Note (optional)</Label>
                    <Textarea
                      id="approval-note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Reason or comment for the audit trail…"
                      rows={2}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {canApprove && (
                      <Button
                        onClick={handleApprove}
                        disabled={saving}
                        className="bg-green-600 hover:bg-green-700 gap-2"
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        Approve
                      </Button>
                    )}
                    {canReject && (
                      <Button
                        variant="destructive"
                        onClick={handleReject}
                        disabled={saving}
                        className="gap-2"
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        Reject
                      </Button>
                    )}
                    {canToggleActive && (
                      <Button
                        variant="outline"
                        onClick={handleToggleActive}
                        disabled={saving}
                        className="gap-2"
                      >
                        {detail.is_active ? (
                          <ToggleRight className="w-4 h-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 text-gray-400" />
                        )}
                        {detail.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold text-[#4F5077] mb-3">Approval history</h3>
                    {history.length === 0 ? (
                      <p className="text-sm text-gray-500">No history yet.</p>
                    ) : (
                      <ul className="space-y-3 border-l-2 border-gray-200 pl-4">
                        {history.map((h) => (
                          <li key={h.id} className="text-sm relative">
                            <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#4F5077]" />
                            <div className="font-medium text-[#4F5077] capitalize">
                              {h.action.replace(/_/g, " ")}
                              {h.from_status || h.to_status
                                ? ` · ${h.from_status || "—"} → ${h.to_status}`
                                : ""}
                            </div>
                            <div className="text-xs text-[#6B7A99]">
                              {fmtDate(h.created_at)}
                              {h.actor_name ? ` · ${h.actor_name}` : ""}
                              {typeof h.is_active_after === "boolean"
                                ? ` · active: ${h.is_active_after ? "yes" : "no"}`
                                : ""}
                            </div>
                            {h.note && (
                              <p className="text-xs text-gray-600 mt-0.5">{h.note}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
