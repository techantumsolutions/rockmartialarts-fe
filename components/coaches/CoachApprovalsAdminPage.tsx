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
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Award,
  CreditCard,
  Calendar,
  AlertTriangle,
  FileText,
  X,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { TokenManager } from "@/lib/tokenManager"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
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

  // Detailed Coach Modal State
  const [detail, setDetail] = useState<CoachApprovalRow | null>(null)
  const [history, setHistory] = useState<ApprovalHistoryEntry[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [rowSavingId, setRowSavingId] = useState<string | null>(null)

  // Rejection Dialog State (mandatory reason)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [coachToReject, setCoachToReject] = useState<CoachApprovalRow | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [rejectionError, setRejectionError] = useState<string | null>(null)
  const [rejectSaving, setRejectSaving] = useState(false)

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
    setDetailLoading(true)
    try {
      const data = await coachApprovalAPI.detail(coach.id)
      setDetail(data.coach)
      setHistory(data.approval_history || [])
    } catch (e) {
      toast({
        title: "Could not load full details",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
      setHistory([])
    } finally {
      setDetailLoading(false)
    }
  }

  const refreshDetail = async (coachId: string) => {
    try {
      const data = await coachApprovalAPI.detail(coachId)
      setDetail(data.coach)
      setHistory(data.approval_history || [])
    } catch {
      // ignore
    }
    await load()
  }

  const handleApprove = async () => {
    if (!detail) return
    setSaving(true)
    try {
      await coachApprovalAPI.approve(detail.id)
      toast({
        title: "Coach approved",
        description: "Approval and password setup email sent to the coach.",
      })
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

  const handleRowApprove = async (coachId: string) => {
    setRowSavingId(coachId)
    try {
      await coachApprovalAPI.approve(coachId)
      toast({
        title: "Coach approved",
        description: "Approval and password setup email sent to the coach.",
      })
      if (detail?.id === coachId) {
        await refreshDetail(coachId)
      } else {
        await load()
      }
    } catch (e) {
      toast({
        title: "Approve failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setRowSavingId(null)
    }
  }

  const openRejectModal = (coach: CoachApprovalRow, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setCoachToReject(coach)
    setRejectionReason("")
    setRejectionError(null)
    setIsRejectModalOpen(true)
  }

  const handleConfirmReject = async () => {
    if (!coachToReject) return
    const reason = rejectionReason.trim()
    if (!reason) {
      setRejectionError("Please specify a reason for rejecting this application.")
      return
    }

    setRejectSaving(true)
    setRejectionError(null)
    try {
      await coachApprovalAPI.reject(coachToReject.id, reason)
      toast({
        title: "Application rejected",
        description: "Rejection notification with reason sent to the coach.",
      })
      setIsRejectModalOpen(false)
      const rejectedId = coachToReject.id
      setCoachToReject(null)
      setRejectionReason("")

      if (detail?.id === rejectedId) {
        await refreshDetail(rejectedId)
      } else {
        await load()
      }
    } catch (e: any) {
      setRejectionError(e.message || "Failed to reject registration")
      toast({
        title: "Reject failed",
        description: e.message || "Error",
        variant: "destructive",
      })
    } finally {
      setRejectSaving(false)
    }
  }

  const handleToggleActive = async () => {
    if (!detail) return
    const next = !detail.is_active
    setSaving(true)
    try {
      await coachApprovalAPI.setActive(detail.id, next)
      toast({
        title: next ? "Coach activated" : "Coach deactivated",
      })
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

  const detailStatus = (detail?.approval_status || "approved").toLowerCase()
  const canApprove = detailStatus === "pending" || detailStatus === "rejected"
  const canReject = detailStatus === "pending" || detailStatus === "approved"
  const canToggleActive = detailStatus === "approved"

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full p-4 lg:px-8 lg:py-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#4F5077]">Coach Approvals</h1>
            <p className="text-sm text-[#6B7A99] mt-1">
              Review self-registered coaches, approve or reject applications, and manage active status.
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

        {/* Summary Metric Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Pending", value: summary.pending, color: "text-amber-600" },
              { label: "Approved", value: summary.approved, color: "text-green-600" },
              { label: "Rejected", value: summary.rejected, color: "text-red-600" },
              { label: "Active", value: summary.active, color: "text-[#4F5077]" },
              { label: "Inactive", value: summary.inactive, color: "text-gray-500" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="py-4 px-4">
                  <p className="text-xs text-[#6B7A99]">{s.label}</p>
                  <p className={`text-xl font-semibold mt-1 ${s.color}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Search & Filter Controls */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by name, email, phone…"
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

            {/* Coaches Table */}
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-[#6B7A99]">Coach</th>
                    <th className="text-left py-3 px-4 font-medium text-[#6B7A99]">Contact</th>
                    <th className="text-left py-3 px-4 font-medium text-[#6B7A99]">Approval</th>
                    <th className="text-left py-3 px-4 font-medium text-[#6B7A99]">Payment</th>
                    <th className="text-left py-3 px-4 font-medium text-[#6B7A99]">Active</th>
                    <th className="text-left py-3 px-4 font-medium text-[#6B7A99]">Source</th>
                    <th className="text-left py-3 px-4 font-medium text-[#6B7A99]">Submitted</th>
                    <th className="text-left py-3 px-4 font-medium text-[#6B7A99]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-gray-500">
                        <Loader2 className="w-5 h-5 animate-spin inline mr-2 text-yellow-500" />
                        Loading coaches…
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-gray-500">
                        No coaches match these filters.
                      </td>
                    </tr>
                  ) : (
                    rows.map((c) => {
                      const st = (c.approval_status || "approved").toLowerCase()
                      const rowPending = st === "pending"
                      const rowBusy = rowSavingId === c.id
                      const hasPaid = c.registration_payment && c.registration_payment.payment_status === "paid"

                      return (
                        <tr
                          key={c.id}
                          className="border-b hover:bg-yellow-50/40 transition-colors cursor-pointer group"
                          onClick={() => openDetail(c)}
                        >
                          <td className="py-3 px-4">
                            <div className="font-semibold text-[#4F5077] group-hover:text-yellow-700 transition-colors">
                              {displayName(c)}
                            </div>
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
                            {hasPaid ? (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200">
                                Paid ₹{Number(c.registration_payment?.fee_amount || 0).toLocaleString("en-IN")}
                              </Badge>
                            ) : c.registration_source === "admin" ? (
                              <span className="text-xs text-gray-400">Exempt</span>
                            ) : (
                              <span className="text-xs text-gray-400">None</span>
                            )}
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
                          <td
                            className="py-3 px-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {rowPending ? (
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  className="h-8 bg-green-600 hover:bg-green-700 text-white gap-1"
                                  disabled={rowBusy || saving}
                                  onClick={() => void handleRowApprove(c.id)}
                                  title="Approve coach & email 24h setup link"
                                >
                                  {rowBusy ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  )}
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-8 gap-1"
                                  disabled={rowBusy || saving}
                                  onClick={(e) => openRejectModal(c, e)}
                                  title="Reject with mandatory reason"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs text-gray-600 hover:text-gray-900"
                                onClick={() => openDetail(c)}
                              >
                                View Details
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
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

        {/* 1. COACH DETAILS MODAL POPUP (Replaces bottom card) */}
        <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
            {detail && (
              <>
                {/* Modal Header */}
                <DialogHeader className="p-6 pb-4 border-b bg-gray-50/70">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {detail.profile_image_url ? (
                        <img
                          src={resolvePublicAssetUrl(detail.profile_image_url)}
                          alt={displayName(detail)}
                          className="w-14 h-14 rounded-full object-cover border-2 border-yellow-400 shadow-sm"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-yellow-100 border-2 border-yellow-400 flex items-center justify-center text-yellow-800 font-bold text-lg shadow-sm">
                          {displayName(detail).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <DialogTitle className="text-xl font-bold text-[#4F5077]">
                          {displayName(detail)}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-[#6B7A99] mt-0.5">
                          {displayEmail(detail)} · {displayPhone(detail)}
                        </DialogDescription>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Badge variant="outline" className={STATUS_BADGE[detailStatus] || ""}>
                            {approvalStatusLabel(detailStatus)}
                          </Badge>
                          <Badge variant="outline" className={detail.is_active ? "bg-green-50 text-green-800 border-green-200" : "bg-gray-100 text-gray-600 border-gray-200"}>
                            {detail.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 capitalize">
                            Source: {detail.registration_source || "admin"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogHeader>

                {/* Modal Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {detailLoading ? (
                    <div className="py-12 text-center text-gray-500">
                      <Loader2 className="w-6 h-6 animate-spin inline text-yellow-500 mr-2" />
                      Loading details…
                    </div>
                  ) : (
                    <>
                      {/* Rejection Alert if rejected */}
                      {detailStatus === "rejected" && (detail.rejection_reason || (history.find(h => h.action === "reject")?.note)) && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-1">
                          <div className="flex items-center gap-2 text-red-900 font-semibold text-sm">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            Application Rejection Reason
                          </div>
                          <p className="text-sm text-red-800">
                            {detail.rejection_reason || history.find(h => h.action === "reject")?.note}
                          </p>
                        </div>
                      )}

                      {/* Personal & Contact Details */}
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                          Personal & Contact Information
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm bg-gray-50/60 p-4 rounded-lg border border-gray-100">
                          <div>
                            <span className="text-[#6B7A99] text-xs">Gender</span>
                            <p className="font-medium capitalize text-gray-900 mt-0.5">
                              {detail.personal_info?.gender || "—"}
                            </p>
                          </div>
                          <div>
                            <span className="text-[#6B7A99] text-xs">Date of Birth</span>
                            <p className="font-medium text-gray-900 mt-0.5">
                              {detail.personal_info?.date_of_birth || "—"}
                            </p>
                          </div>
                          <div>
                            <span className="text-[#6B7A99] text-xs">Email Address</span>
                            <p className="font-medium text-gray-900 mt-0.5 break-all">
                              {displayEmail(detail)}
                            </p>
                          </div>
                          <div>
                            <span className="text-[#6B7A99] text-xs">Phone Number</span>
                            <p className="font-medium text-gray-900 mt-0.5">
                              {displayPhone(detail)}
                            </p>
                          </div>
                          <div>
                            <span className="text-[#6B7A99] text-xs">Submission Date</span>
                            <p className="font-medium text-gray-900 mt-0.5">
                              {fmtDate(detail.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Address & Assigned Branches */}
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                          Address & Service Locations
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-gray-50/60 p-4 rounded-lg border border-gray-100">
                          <div>
                            <span className="text-[#6B7A99] text-xs">Residential Address</span>
                            <p className="font-medium text-gray-900 mt-0.5">
                              {[
                                detail.address_info?.address,
                                detail.address_info?.city,
                                detail.address_info?.state,
                                detail.address_info?.country,
                              ]
                                .filter(Boolean)
                                .join(", ") || "—"}
                            </p>
                          </div>
                          <div>
                            <span className="text-[#6B7A99] text-xs">Selected Branches (Service Locations)</span>
                            <p className="font-medium text-gray-900 mt-0.5">
                              {(detail.service_location_names || []).join(", ") ||
                                (detail.service_location_ids || []).join(", ") ||
                                "—"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Experience & Specialization */}
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                          Experience & Specialization
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm bg-gray-50/60 p-4 rounded-lg border border-gray-100">
                          <div>
                            <span className="text-[#6B7A99] text-xs">Professional Experience</span>
                            <p className="font-medium text-gray-900 mt-0.5">
                              {detail.professional_info?.professional_experience || "—"}
                            </p>
                          </div>
                          <div>
                            <span className="text-[#6B7A99] text-xs">Education / Qualification</span>
                            <p className="font-medium text-gray-900 mt-0.5">
                              {detail.professional_info?.education_qualification || "—"}
                            </p>
                          </div>
                          <div>
                            <span className="text-[#6B7A99] text-xs">Designation</span>
                            <p className="font-medium text-gray-900 mt-0.5">
                              {detail.professional_info?.designation_id || "Coach"}
                            </p>
                          </div>
                          <div className="sm:col-span-2 md:col-span-3">
                            <span className="text-[#6B7A99] text-xs">Specializations</span>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {(detail.areas_of_expertise || []).length > 0 ? (
                                detail.areas_of_expertise!.map((spec) => (
                                  <Badge key={spec} variant="secondary" className="bg-yellow-100/70 text-yellow-900 border-yellow-200">
                                    {spec}
                                  </Badge>
                                ))
                              ) : (
                                <p className="text-gray-500 text-sm">—</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Registration Payment Information */}
                      {detail.registration_payment && (
                        <div>
                          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                            Registration Payment
                          </h4>
                          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                              <div>
                                <span className="text-[#6B7A99]">Fee Amount:</span>
                                <p className="text-sm font-bold text-emerald-900 mt-0.5">
                                  ₹{Number(detail.registration_payment.fee_amount || 0).toLocaleString("en-IN")}
                                </p>
                              </div>
                              <div>
                                <span className="text-[#6B7A99]">Payment Status:</span>
                                <p className="text-sm font-semibold text-emerald-800 capitalize mt-0.5">
                                  {detail.registration_payment.payment_status || "Paid"}
                                </p>
                              </div>
                              <div>
                                <span className="text-[#6B7A99]">Payment ID:</span>
                                <p className="font-mono text-gray-900 truncate mt-0.5" title={detail.registration_payment.razorpay_payment_id}>
                                  {detail.registration_payment.razorpay_payment_id || "—"}
                                </p>
                              </div>
                              <div>
                                <span className="text-[#6B7A99]">Paid At:</span>
                                <p className="text-gray-900 mt-0.5">
                                  {fmtDate(detail.registration_payment.paid_at)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* About / Bio */}
                      {detail.about_short && (
                        <div>
                          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            About Coach
                          </h4>
                          <div className="p-3.5 bg-gray-50 rounded-lg text-sm text-gray-700 leading-relaxed border border-gray-100">
                            {detail.about_short}
                          </div>
                        </div>
                      )}

                      {/* Audit History Trail */}
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                          Approval & Audit History
                        </h4>
                        {history.length === 0 ? (
                          <p className="text-sm text-gray-400">No history records yet.</p>
                        ) : (
                          <ul className="space-y-3 border-l-2 border-yellow-300 pl-4 py-1">
                            {history.map((h) => (
                              <li key={h.id} className="text-sm relative">
                                <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-yellow-500 ring-2 ring-white" />
                                <div className="font-semibold text-[#4F5077] capitalize">
                                  {h.action.replace(/_/g, " ")}
                                  {h.from_status || h.to_status
                                    ? ` · ${h.from_status || "—"} → ${h.to_status}`
                                    : ""}
                                </div>
                                <div className="text-xs text-[#6B7A99]">
                                  {fmtDate(h.created_at)}
                                  {h.actor_name ? ` · by ${h.actor_name}` : ""}
                                  {typeof h.is_active_after === "boolean"
                                    ? ` · active: ${h.is_active_after ? "yes" : "no"}`
                                    : ""}
                                </div>
                                {h.note && (
                                  <p className="text-xs text-gray-600 bg-gray-100/70 p-2 rounded mt-1">
                                    <strong>Note:</strong> {h.note}
                                  </p>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Modal Footer with Actions */}
                <DialogFooter className="p-4 border-t bg-gray-50/70 flex flex-wrap items-center justify-between gap-3">
                  <Button variant="outline" onClick={() => setDetail(null)}>
                    Close
                  </Button>
                  <div className="flex flex-wrap gap-2">
                    {canApprove && (
                      <Button
                        onClick={handleApprove}
                        disabled={saving}
                        className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        Approve & Send 24h Setup Email
                      </Button>
                    )}
                    {canReject && (
                      <Button
                        variant="destructive"
                        onClick={() => openRejectModal(detail)}
                        disabled={saving}
                        className="gap-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject with Reason
                      </Button>
                    )}
                    {canToggleActive && (
                      <Button
                        variant="outline"
                        onClick={handleToggleActive}
                        disabled={saving}
                        className="gap-1.5"
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
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* 2. REJECTION REASON MODAL (Mandatory Reason Dialog) */}
        <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                Reject Coach Application
              </DialogTitle>
              <DialogDescription>
                {coachToReject ? (
                  <>
                    Please enter the reason for rejecting <strong>{displayName(coachToReject)}</strong>&apos;s application.
                    This reason will be recorded in the audit trail and emailed directly to the coach.
                  </>
                ) : (
                  "Please enter the reason for rejection."
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-2">
              <Label htmlFor="rejection-reason" className="text-sm font-semibold text-gray-700">
                Reason for Rejection <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder="e.g. Incomplete martial arts certifications, location outside serviceable branches, etc."
                rows={4}
                value={rejectionReason}
                onChange={(e) => {
                  setRejectionReason(e.target.value)
                  if (rejectionError) setRejectionError(null)
                }}
                className={`resize-none ${rejectionError ? "border-red-500" : ""}`}
              />
              {rejectionError && (
                <p className="text-xs text-red-600 font-medium">{rejectionError}</p>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setIsRejectModalOpen(false)}
                disabled={rejectSaving}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmReject}
                disabled={!rejectionReason.trim() || rejectSaving}
                className="gap-1.5"
              >
                {rejectSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                Confirm Rejection & Email Coach
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
