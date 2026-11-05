"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Calendar } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import paymentAPI from "@/lib/paymentAPI"
import { getBackendApiUrl } from "@/lib/config"
import { TokenManager } from "@/lib/tokenManager"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { getActiveBranchId } from "@/lib/activeBranch"
import BranchSelectionField from "@/components/layout/BranchSelectionField"

interface Payment {
  id: string
  student_id?: string
  student_name?: string | null
  amount?: number | null
  payment_type?: string
  payment_method?: string | null
  gateway_payment_label?: string | null
  payment_status: string
  transaction_id?: string | null
  payment_date?: string | null
  course_name?: string | null
  branch_name?: string | null
  branch_id?: string | null
  partner_org_id?: string | null
  partner_org_name?: string | null
  created_at?: string | null
  enrollment_id?: string | null
}

type PartnerOption = { id: string; name: string }

interface PaymentStats {
  total_collected: number
  pending_payments: number
  total_students: number
  this_month_collection: number
}

interface BranchOption {
  id: string
  name: string
}

type BranchRevenueRow = {
  branch_id: string
  branch_name: string
  total_revenue: number
  transactions: number
}

type RecoveryAction = "restore_checkout" | "mark_received" | "waive"

export default function PaymentTrackingPage() {
  const params = useParams<{ adminType: string }>()
  const { toast } = useToast()
  const [payments, setPayments] = useState<Payment[]>([])
  const [stats, setStats] = useState<PaymentStats>({
    total_collected: 0,
    pending_payments: 0,
    total_students: 0,
    this_month_collection: 0
  })
  const [loading, setLoading] = useState(true)
  const [branchesLoading, setBranchesLoading] = useState(true)
  const [branchOptions, setBranchOptions] = useState<BranchOption[]>([])
  const [branchFilter, setBranchFilter] = useState<string>("all")
  /** Rock SA: all | rock | partners | specific partner org id */
  const [partnerFilter, setPartnerFilter] = useState<string>("all")
  const [partnerOptions, setPartnerOptions] = useState<PartnerOption[]>([])
  const [partnersLoading, setPartnersLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [recoveringId, setRecoveringId] = useState<string | null>(null)
  const [recoverOpen, setRecoverOpen] = useState(false)
  const [recoverTarget, setRecoverTarget] = useState<Payment | null>(null)
  const [recoverAction, setRecoverAction] = useState<RecoveryAction | null>(null)
  const [recoverNote, setRecoverNote] = useState("")
  const [recoverBlocked, setRecoverBlocked] = useState(false)
  /** Cancelled payment ids that still have a course registration (enrollment) to recover */
  const [recoverablePaymentIds, setRecoverablePaymentIds] = useState<Record<string, boolean>>({})
  const [page, setPage] = useState(1)
  const [totalPayments, setTotalPayments] = useState(0)
  const pageSize = 20
  const [periodStart, setPeriodStart] = useState<string>("")
  const [periodEnd, setPeriodEnd] = useState<string>("")
  const [periodRevenue, setPeriodRevenue] = useState<number | null>(null)
  const [branchRevenue, setBranchRevenue] = useState<BranchRevenueRow[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [studentSearch, setStudentSearch] = useState<string>("")
  const [debouncedStudentSearch, setDebouncedStudentSearch] = useState<string>("")
  const filtersReadyRef = useRef(true)

  const adminType = String(params?.adminType || "super-admin").toLowerCase()
  const isSuperAdmin = adminType === "super-admin"
  const isPartnerAdmin = adminType === "partner-admin" || adminType === "partners"
  /** Super admin and partner admin pick a branch. Branch managers stay on the header branch. */
  const canPickBranch = isSuperAdmin || isPartnerAdmin
  const branchManager = BranchManagerAuth.getCurrentUser()
  const headerBranchId =
    getActiveBranchId() ||
    branchManager?.branch_id ||
    branchManager?.managed_branches?.[0] ||
    ""
  const effectiveBranchFilter = canPickBranch ? branchFilter : headerBranchId || branchFilter
  const partnerQuery = useMemo(() => {
    if (!isSuperAdmin || partnerFilter === "all") return {} as { partner_org_id?: string; partner_scope?: string }
    if (partnerFilter === "rock") return { partner_scope: "rock" }
    if (partnerFilter === "partners") return { partner_scope: "partners" }
    return { partner_org_id: partnerFilter }
  }, [isSuperAdmin, partnerFilter])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedStudentSearch(studentSearch.trim())
    }, 400)
    return () => window.clearTimeout(timer)
  }, [studentSearch])

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true)
      const token = TokenManager.getToken() || undefined
      const data = await paymentAPI.getPayments(
        {
          skip: (page - 1) * pageSize,
          limit: pageSize,
          ...(periodStart ? { start_date: periodStart } : {}),
          ...(periodEnd ? { end_date: periodEnd } : {}),
          ...(debouncedStudentSearch ? { search: debouncedStudentSearch } : {}),
          ...(effectiveBranchFilter !== "all" ? { branch_id: effectiveBranchFilter } : {}),
          ...partnerQuery,
        },
        token
      )
      const list = (data.payments || []) as Payment[]
      setPayments(list)
      setTotalPayments(Number(data.total) || 0)

      // Show Recover only when the cancelled payment still has a course registration.
      if (isSuperAdmin) {
        const cancelled = list.filter((p) => {
          const s = String(p.payment_status || "").toLowerCase()
          return s === "cancelled" || s === "canceled"
        })
        const checks = await Promise.all(
          cancelled.map(async (payment) => {
            try {
              const detail = (await paymentAPI.getPaymentById(payment.id, token)) as Payment & {
                enrollment_id?: string | null
              }
              const enrollmentId = String(detail.enrollment_id || payment.enrollment_id || "").trim()
              if (!enrollmentId) return [payment.id, false] as const

              const studentId = String(detail.student_id || payment.student_id || "").trim()
              if (!studentId) {
                // Enrollment id present but cannot verify student list — allow Recover.
                return [payment.id, true] as const
              }

              const enrRes = await fetch(
                getBackendApiUrl(`enrollments/students/${encodeURIComponent(studentId)}`),
                {
                  cache: "no-store",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                }
              )
              if (!enrRes.ok) return [payment.id, false] as const
              const enrBody = await enrRes.json().catch(() => ({}))
              const enrollments = Array.isArray(enrBody)
                ? enrBody
                : Array.isArray(enrBody?.enrollments)
                  ? enrBody.enrollments
                  : Array.isArray(enrBody?.data)
                    ? enrBody.data
                    : []
              const exists = enrollments.some(
                (e: { id?: string; enrollment_id?: string }) =>
                  String(e?.id || e?.enrollment_id || "") === enrollmentId
              )
              return [payment.id, exists] as const
            } catch {
              return [payment.id, false] as const
            }
          })
        )
        setRecoverablePaymentIds(Object.fromEntries(checks))
      } else {
        setRecoverablePaymentIds({})
      }
    } catch (error) {
      console.error("Error fetching payments:", error)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, periodStart, periodEnd, debouncedStudentSearch, effectiveBranchFilter, isSuperAdmin, partnerQuery])

  const fetchStats = useCallback(async () => {
    try {
      const token = TokenManager.getToken()
      const qsScoped = new URLSearchParams()
      if (periodStart) qsScoped.set("start_date", periodStart)
      if (periodEnd) qsScoped.set("end_date", periodEnd)
      if (effectiveBranchFilter !== "all") qsScoped.set("branch_id", effectiveBranchFilter)
      if (partnerQuery.partner_org_id) qsScoped.set("partner_org_id", partnerQuery.partner_org_id)
      if (partnerQuery.partner_scope) qsScoped.set("partner_scope", partnerQuery.partner_scope)
      qsScoped.set("_ts", String(Date.now()))

      const headers: HeadersInit = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      }

      const gQs = new URLSearchParams()
      gQs.set("_ts", String(Date.now()))

      // When Rock SA filters by partner, use scoped totals so they see that partner's amount.
      const useGlobalTotal = isSuperAdmin && partnerFilter === "all"

      const [scopedRes, globalRes] = await Promise.all([
        fetch(getBackendApiUrl(`payments/stats?${qsScoped.toString()}`), {
          cache: "no-store",
          headers,
        }),
        useGlobalTotal
          ? fetch(getBackendApiUrl(`payments/stats?${gQs.toString()}`), {
              cache: "no-store",
              headers,
            })
          : Promise.resolve(null),
      ])

      if (!scopedRes.ok) return

      const scopedData = await scopedRes.json()

      if (globalRes?.ok) {
        const globalData = await globalRes.json()
        const total = Number(globalData.total_collected)
        setStats({
          ...scopedData,
          total_collected: Number.isFinite(total) ? total : 0,
        })
        return
      }

      setStats(scopedData)
    } catch (error) {
      console.error("Error fetching payment stats:", error)
    }
  }, [periodStart, periodEnd, effectiveBranchFilter, isSuperAdmin, partnerFilter, partnerQuery])

  const fetchAnalytics = useCallback(async () => {
    try {
      setAnalyticsLoading(true)
      const token = TokenManager.getToken() || ""

      const analyticsHeaders: HeadersInit = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      }

      const periodQs = new URLSearchParams()
      if (periodStart) periodQs.set("start_date", periodStart)
      if (periodEnd) periodQs.set("end_date", periodEnd)
      if (effectiveBranchFilter !== "all") periodQs.set("branch_id", effectiveBranchFilter)
      if (partnerQuery.partner_org_id) periodQs.set("partner_org_id", partnerQuery.partner_org_id)
      if (partnerQuery.partner_scope) periodQs.set("partner_scope", partnerQuery.partner_scope)
      periodQs.set("_ts", String(Date.now()))

      const [statsRes, revRes] = await Promise.all([
        periodStart || periodEnd
          ? fetch(getBackendApiUrl(`payments/stats?${periodQs.toString()}`), {
              cache: "no-store",
              headers: analyticsHeaders,
            })
          : Promise.resolve(null),
        // Branch revenue endpoint is Rock-wide; skip when focusing a single partner filter.
        partnerFilter === "all"
          ? fetch(getBackendApiUrl(`payments/revenue/by-branch?${periodQs.toString()}`), {
              cache: "no-store",
              headers: analyticsHeaders,
            })
          : Promise.resolve({ ok: false } as Response),
      ])

      if (statsRes) {
        if (statsRes.ok) {
          const s = await statsRes.json()
          const v = Number(s?.this_month_collection)
          setPeriodRevenue(Number.isFinite(v) ? v : 0)
        } else {
          setPeriodRevenue(null)
        }
      } else {
        setPeriodRevenue(null)
      }

      if (revRes.ok) {
        const js = await revRes.json().catch(() => ({}))
        const rows: BranchRevenueRow[] = Array.isArray(js?.branches) ? js.branches : []
        setBranchRevenue(rows)
      } else {
        setBranchRevenue([])
      }
    } catch (e) {
      console.error("analytics fetch failed", e)
      setBranchRevenue([])
      setPeriodRevenue(null)
    } finally {
      setAnalyticsLoading(false)
    }
  }, [periodStart, periodEnd, effectiveBranchFilter, partnerFilter, partnerQuery])

  useEffect(() => {
    const loadBranches = async () => {
      try {
        setBranchesLoading(true)
        const token = TokenManager.getToken()
        const res = await fetch(getBackendApiUrl(`branches?skip=0&limit=200&_ts=${Date.now()}`), {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        })
        if (!res.ok) return
        const data = await res.json()
        const raw = data.branches || []
        const opts: BranchOption[] = raw.map((b: { id: string; branch?: { name?: string }; name?: string }) => ({
          id: b.id,
          name: b.branch?.name || b.name || "Branch",
        }))
        setBranchOptions(opts)
      } catch (e) {
        console.error("Error fetching branches:", e)
      } finally {
        setBranchesLoading(false)
      }
    }
    void loadBranches()
  }, [])

  useEffect(() => {
    if (!isSuperAdmin) return
    const loadPartners = async () => {
      try {
        setPartnersLoading(true)
        const token = TokenManager.getToken()
        const res = await fetch(
          getBackendApiUrl(`partner-organizations?skip=0&limit=200&_ts=${Date.now()}`),
          {
            cache: "no-store",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          }
        )
        if (!res.ok) return
        const data = await res.json()
        const raw = Array.isArray(data.partners) ? data.partners : Array.isArray(data) ? data : []
        setPartnerOptions(
          raw
            .map((p: { id?: string; partner_org_id?: string; name?: string }) => ({
              id: String(p.id || p.partner_org_id || ""),
              name: String(p.name || "Partner"),
            }))
            .filter((p: PartnerOption) => !!p.id)
        )
      } catch (e) {
        console.error("Error fetching partners:", e)
      } finally {
        setPartnersLoading(false)
      }
    }
    void loadPartners()
  }, [isSuperAdmin])

  useEffect(() => {
    if (!filtersReadyRef.current) return
    void Promise.all([fetchPayments(), fetchStats(), fetchAnalytics()])
  }, [page, effectiveBranchFilter, partnerFilter, periodStart, periodEnd, debouncedStudentSearch, fetchPayments, fetchStats, fetchAnalytics])

  useEffect(() => {
    if (!filtersReadyRef.current) return
    setPage(1)
  }, [effectiveBranchFilter, partnerFilter, periodStart, periodEnd, debouncedStudentSearch])

  const formatCurrency = (amount: number) => {
    const v = Number(amount)
    if (!Number.isFinite(v)) return "₹0"
    return `₹${Math.round(v).toLocaleString("en-IN")}`
  }

  // Server-side pagination (20 per page).
  const totalPages = Math.max(1, Math.ceil((totalPayments || 0) / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const startIdx = (safePage - 1) * pageSize
  const endIdx = startIdx + payments.length
  const pagedPayments = payments

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch {
      return "Invalid Date"
    }
  }

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return "Invalid Date"
    }
  }

  const describePaymentSource = (payment: Payment) => {
    return paymentAPI.formatPaymentSource(payment)
  }

  const handleExport = async () => {
    if (exporting) return

    setExporting(true)
    try {
      toast({
        title: "Exporting payments...",
        description: "Your payment report is being generated.",
      })

      await paymentAPI.exportPayments({
        format: "csv",
        ...(effectiveBranchFilter && effectiveBranchFilter !== "all" && effectiveBranchFilter !== "unassigned"
          ? { branch_id: effectiveBranchFilter }
          : {}),
      })

      toast({
        title: "Export successful",
        description: "Payment report has been downloaded.",
      })
    } catch (error) {
      console.error("Export error:", error)
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Failed to export payment report",
        variant: "destructive",
      })
    } finally {
      setExporting(false)
    }
  }

  const handleCancelPayment = async (payment: Payment) => {
    if (cancellingId || !payment.id) return
    const status = String(payment.payment_status || "").toLowerCase()
    if (status === "paid" || status === "completed") {
      toast({
        title: "Cannot cancel paid transaction",
        description: "Only pending/failed/mistaken attempts can be cancelled.",
        variant: "destructive",
      })
      return
    }

    try {
      setCancellingId(payment.id)
      await paymentAPI.cancelPayment(payment.id)
      toast({
        title: "Transaction cancelled",
        description: "The payment attempt was cancelled and removed from student pending dues.",
      })
      await fetchPayments()
      await fetchStats()
    } catch (error) {
      toast({
        title: "Cancellation failed",
        description: error instanceof Error ? error.message : "Could not cancel this payment attempt",
        variant: "destructive",
      })
    } finally {
      setCancellingId(null)
    }
  }

  const recoveryCopy: Record<RecoveryAction, { title: string; description: string }> = {
    restore_checkout: {
      title: "Restore pending checkout?",
      description:
        "The enrollment returns to pending so the student can pay online again. Previous Razorpay order data on this row is cleared.",
    },
    mark_received: {
      title: "Mark payment as received?",
      description:
        "Use when fees were collected outside the gateway (cash, bank transfer, etc.). The enrollment becomes active and paid.",
    },
    waive: {
      title: "Waive / comp this course?",
      description:
        "Grant access without collecting payment. The enrollment becomes active and paid as complimentary.",
    },
  }

  const openRecoverDialog = (payment: Payment, action: RecoveryAction) => {
    if (!recoverablePaymentIds[payment.id]) return
    setRecoverTarget(payment)
    setRecoverNote("")
    setRecoverBlocked(false)
    setRecoverAction(action)
    setRecoverOpen(true)
  }

  const handleConfirmRecover = async () => {
    if (!recoverTarget?.id || !recoverAction || recoverBlocked) return
    try {
      setRecoveringId(recoverTarget.id)
      const res = await paymentAPI.recoverCancelledPayment(recoverTarget.id, {
        action: recoverAction,
        ...(recoverNote.trim() ? { note: recoverNote.trim() } : {}),
      })
      toast({
        title: "Updated",
        description: res.message,
      })
      setRecoverOpen(false)
      setRecoverTarget(null)
      setRecoverAction(null)
      setRecoverBlocked(false)
      await fetchPayments()
      await fetchStats()
    } catch (error) {
      const raw = error instanceof Error ? error.message : "Could not update this enrollment"
      const enrollmentMissing = /enrollment not found/i.test(raw)
      toast({
        title: enrollmentMissing ? "Cannot recover this payment" : "Recovery failed",
        description: enrollmentMissing
          ? "This student’s course registration for this payment is missing, so recovery cannot be completed. Please contact support or re-add the course for the student, then try Recover again."
          : raw,
        variant: "destructive",
      })
    } finally {
      setRecoveringId(null)
    }
  }

  const showPartnerColumn = isSuperAdmin || isPartnerAdmin
  const tableColSpan = (isSuperAdmin ? 5 : 4) + (showPartnerColumn ? 1 : 0)
  const selectedPartnerLabel =
    partnerFilter === "all"
      ? null
      : partnerFilter === "rock"
        ? "Rock (non-partner)"
        : partnerFilter === "partners"
          ? "All partners"
          : partnerOptions.find((p) => p.id === partnerFilter)?.name || "Partner"

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full p-4 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Payment Tracking</h1>

        {isPartnerAdmin ? (
          <div className="mb-6 space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              Student course payments are collected on Rock’s payment gateway. This list shows
              every transaction for your organization (student, branch, course, amount) so you can
              reconcile settlement with Rock Super Admin offline.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-sm font-medium text-gray-700">
                    Your org — collected (all time)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(stats.total_collected)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Paid / completed for your branches</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-sm font-medium text-gray-700">
                    Selected period
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(Number(stats.this_month_collection) || 0)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Uses the date filters below when set
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}

        {/* Live revenue cards (Super Admin only) */}
        {isSuperAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 items-stretch">
            <Card className="h-full flex flex-col">
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium text-gray-700">
                  {selectedPartnerLabel
                    ? `Revenue — ${selectedPartnerLabel}`
                    : "Total Revenue (All time)"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.total_collected)}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {selectedPartnerLabel
                    ? "Paid / completed for this partner filter"
                    : "Paid / completed payments"}
                </div>
              </CardContent>
            </Card>

            <Card className="h-full flex flex-col">
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium text-gray-700">Custom Duration Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="flex-1 min-w-[130px] max-w-[180px]">
                    <div className="text-xs text-gray-500 mb-1">Start</div>
                    <div className="relative">
                      <Input
                        type="date"
                        min="1000-01-01"
                        max="9999-12-31"
                        value={periodStart}
                        className="w-full pl-3 pr-9 py-1.5 h-9 text-xs sm:text-sm bg-white border-gray-200 rounded-md cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:top-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-9 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-datetime-edit]:p-0"
                        onClick={(e) => e.currentTarget.showPicker?.()}
                        onChange={(e) => {
                          const raw = e.target.value || ""
                          const match = /^(\d+)-(\d{2})-(\d{2})$/.exec(raw)
                          if (!match) {
                            setPeriodStart(raw.slice(0, 10))
                            return
                          }
                          setPeriodStart(`${match[1].slice(0, 4)}-${match[2]}-${match[3]}`)
                        }}
                      />
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-[130px] max-w-[180px]">
                    <div className="text-xs text-gray-500 mb-1">End</div>
                    <div className="relative">
                      <Input
                        type="date"
                        min="1000-01-01"
                        max="9999-12-31"
                        value={periodEnd}
                        className="w-full pl-3 pr-9 py-1.5 h-9 text-xs sm:text-sm bg-white border-gray-200 rounded-md cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:top-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-9 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-datetime-edit]:p-0"
                        onClick={(e) => e.currentTarget.showPicker?.()}
                        onChange={(e) => {
                          const raw = e.target.value || ""
                          const match = /^(\d+)-(\d{2})-(\d{2})$/.exec(raw)
                          if (!match) {
                            setPeriodEnd(raw.slice(0, 10))
                            return
                          }
                          setPeriodEnd(`${match[1].slice(0, 4)}-${match[2]}-${match[3]}`)
                        }}
                      />
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                  </div>
                  {(periodStart || periodEnd) ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9"
                      disabled={analyticsLoading}
                      onClick={() => {
                        setPeriodStart("")
                        setPeriodEnd("")
                        setPeriodRevenue(null)
                      }}
                    >
                      Clear
                    </Button>
                  ) : null}
                </div>
                <div className="text-2xl font-semibold text-gray-900 mt-3">
                  {periodRevenue == null ? "—" : formatCurrency(periodRevenue)}
                </div>
              </CardContent>
            </Card>

            <Card className="h-full flex flex-col">
              <CardHeader className="py-4 shrink-0">
                <CardTitle className="text-sm font-medium text-gray-700">Branch-wise Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Mobile/tablet: all branches. Desktop (lg+): 4 rows + visible smooth scrollbar */}
                <div
                  className={
                    branchRevenue.length > 4
                      ? "space-y-2 lg:max-h-[6.5rem] lg:overflow-y-scroll lg:scroll-smooth lg:pr-1 lg:[scrollbar-width:thin] lg:[scrollbar-color:#9ca3af_#f3f4f6] lg:[&::-webkit-scrollbar]:w-1.5 lg:[&::-webkit-scrollbar-track]:bg-gray-100 lg:[&::-webkit-scrollbar-track]:rounded-full lg:[&::-webkit-scrollbar-thumb]:bg-gray-400 lg:[&::-webkit-scrollbar-thumb]:rounded-full lg:[&::-webkit-scrollbar-thumb]:hover:bg-gray-500"
                      : "space-y-2"
                  }
                >
                  {branchRevenue.length === 0 ? (
                    <div className="text-sm text-gray-500">{analyticsLoading ? "Loading…" : "No data"}</div>
                  ) : (
                    branchRevenue.map((r) => (
                      <div key={r.branch_id} className="flex items-center justify-between gap-3 h-5">
                        <div className="text-sm leading-5 text-gray-700 truncate">{r.branch_name}</div>
                        <div className="text-sm leading-5 font-medium text-gray-900 whitespace-nowrap">
                          {formatCurrency(r.total_revenue)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 border-1 shadow overflow-x-auto p-6 mb-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700">
              {canPickBranch ? "Select Branch:" : "Branch:"}
            </span>
            {canPickBranch ? (
              <Select value={branchFilter} onValueChange={setBranchFilter} disabled={branchesLoading}>
                <SelectTrigger className="w-48 bg-gray-100 text-gray-600 border-0">
                  <SelectValue placeholder={branchesLoading ? "Loading…" : "Choose branch"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {!isPartnerAdmin ? (
                    <SelectItem value="unassigned">No branch on record</SelectItem>
                  ) : null}
                  {branchOptions.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <BranchSelectionField />
            )}
          </div>

          {isSuperAdmin ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-700">Partner:</span>
              <Select
                value={partnerFilter}
                onValueChange={setPartnerFilter}
                disabled={partnersLoading}
              >
                <SelectTrigger className="w-56 bg-gray-100 text-gray-600 border-0">
                  <SelectValue placeholder={partnersLoading ? "Loading…" : "All sources"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All (Rock + partners)</SelectItem>
                  <SelectItem value="rock">Rock only</SelectItem>
                  <SelectItem value="partners">All partners</SelectItem>
                  {partnerOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Filter by:</span>
            <Input
              type="date"
              value={periodStart}
              onChange={(e) => {
                setPeriodStart(e.target.value)
              }}
              className="w-[150px] bg-gray-100 border-0 text-gray-600"
            />
            <Input
              type="date"
              value={periodEnd}
              onChange={(e) => {
                setPeriodEnd(e.target.value)
              }}
              className="w-[150px] bg-gray-100 border-0 text-gray-600"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Student:</span>
            <Input
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Search name / phone / email"
              className="w-[220px] bg-gray-100 border-0 text-gray-600"
            />
          </div>

          <Button
            onClick={handleExport}
            disabled={exporting}
            className="bg-transparent border border-gray-300 text-[#5A6ACF] text-[10px] w-[120px] hover:bg-gray-100 px-6 py-2 rounded-md flex items-center gap-1"
          >
            {exporting ? "Exporting..." : "Export CSV"}
          </Button>
        </div>

        <div className="bg-white rounded-b-xl shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#000] uppercase tracking-wider">
                  Student Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#000] uppercase tracking-wider">
                  Course enrolled
                </th>
                {showPartnerColumn ? (
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#000] uppercase tracking-wider">
                    Partner / Branch
                  </th>
                ) : null}
                <th className="px-6 py-3 text-left text-xs font-medium text-[#000] uppercase tracking-wider">
                  Payment details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#000] uppercase tracking-wider">
                  Status
                </th>
                {isSuperAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#000] uppercase tracking-wider">
                    Action
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={tableColSpan} className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                      <span className="ml-2 text-gray-500">Loading payments...</span>
                    </div>
                  </td>
                </tr>
              ) : pagedPayments.length === 0 ? (
                <tr>
                  <td colSpan={tableColSpan} className="px-6 py-8 text-center text-gray-500">
                    No payments found
                  </td>
                </tr>
              ) : (
                pagedPayments.map((payment) => {
                  const paymentStatus = String(payment.payment_status || "").toLowerCase()
                  return (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.student_id ? (
                        <Link
                          href={`/${adminType}/dashboard/students/${payment.student_id}`}
                          className="font-medium text-blue-700 hover:text-blue-900 hover:underline"
                        >
                          {payment.student_name || "Unknown Student"}
                        </Link>
                      ) : (
                        payment.student_name || "Unknown Student"
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="font-medium">{payment.course_name || "N/A"}</div>
                      {payment.branch_name && !showPartnerColumn ? (
                        <div className="text-xs text-gray-500 mt-0.5">{payment.branch_name}</div>
                      ) : null}
                    </td>
                    {showPartnerColumn ? (
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="font-medium">
                          {payment.partner_org_name || (payment.partner_org_id ? "Partner" : "Rock")}
                        </div>
                        {payment.branch_name ? (
                          <div className="text-xs text-gray-500 mt-0.5">{payment.branch_name}</div>
                        ) : null}
                      </td>
                    ) : null}
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="font-semibold text-base">
                        {formatCurrency(Number(payment.amount) || 0)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatDateTime(payment.payment_date || payment.created_at)}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        {describePaymentSource(payment)}
                        {payment.transaction_id ? (
                          <span className="text-gray-400"> · {payment.transaction_id}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        className={
                          paymentStatus === "paid"
                            ? "bg-green-100 text-green-800"
                            : paymentStatus === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : paymentStatus === "cancelled" || paymentStatus === "canceled"
                                ? "bg-gray-100 text-gray-800"
                              : "bg-red-100 text-red-800"
                        }
                      >
                        {paymentStatus === "paid"
                          ? "Paid"
                          : paymentStatus === "pending"
                            ? "Pending"
                            : paymentStatus === "cancelled" || paymentStatus === "canceled"
                              ? "Cancelled"
                              : "Failed"}
                      </Badge>
                    </td>
                    {isSuperAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        {paymentStatus === "cancelled" || paymentStatus === "canceled" ? (
                          recoverablePaymentIds[payment.id] ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={recoveringId === payment.id}
                                className="text-emerald-800 border-emerald-200 hover:bg-emerald-50"
                              >
                                {recoveringId === payment.id ? "Working…" : "Recover"}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuItem
                                onClick={() => openRecoverDialog(payment, "restore_checkout")}
                              >
                                Restore checkout (student pays online)
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openRecoverDialog(payment, "mark_received")}
                              >
                                Mark payment received (offline)
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openRecoverDialog(payment, "waive")}>
                                Waive / complimentary access
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleCancelPayment(payment)}
                            disabled={
                              cancellingId === payment.id ||
                              ["paid", "completed", "cancelled", "canceled"].includes(paymentStatus)
                            }
                            className="text-red-700 border-red-200 hover:bg-red-50 hover:text-red-800"
                          >
                            {cancellingId === payment.id ? "Cancelling..." : "Cancel"}
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPayments > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
            <div className="text-sm text-gray-600">
              Showing <span className="font-medium">{startIdx + 1}</span>-
              <span className="font-medium">{startIdx + pagedPayments.length}</span> of{" "}
              <span className="font-medium">{totalPayments}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1))
                  window.scrollTo({ top: 0, behavior: "smooth" })
                }}
              >
                Prev
              </Button>
              <div className="text-sm text-gray-700">
                Page <span className="font-medium">{safePage}</span> /{" "}
                <span className="font-medium">{totalPages}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => {
                  setPage((p) => Math.min(totalPages, p + 1))
                  window.scrollTo({ top: 0, behavior: "smooth" })
                }}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        <AlertDialog
          open={recoverOpen}
          onOpenChange={(open) => {
            setRecoverOpen(open)
            if (!open) {
              setRecoverTarget(null)
              setRecoverAction(null)
              setRecoverNote("")
              setRecoverBlocked(false)
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {recoverBlocked
                  ? "Cannot recover this payment"
                  : recoverAction
                    ? recoveryCopy[recoverAction].title
                    : "Recover enrollment"}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-gray-600">
                {recoverBlocked
                  ? "This student’s course registration for this payment is missing, so recovery cannot be completed. Please contact support or re-add the course for the student, then try Recover again."
                  : recoverAction
                    ? recoveryCopy[recoverAction].description
                    : ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {!recoverBlocked && (
              <div className="px-6 pb-2 space-y-2">
                <label className="text-xs text-gray-500 block">Optional note (stored on payment record)</label>
                <Textarea
                  value={recoverNote}
                  onChange={(e) => setRecoverNote(e.target.value)}
                  placeholder="e.g. Cash collected at front desk"
                  className="min-h-[72px] text-gray-900"
                />
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel>{recoverBlocked ? "Close" : "Back"}</AlertDialogCancel>
              {!recoverBlocked && (
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault()
                    void handleConfirmRecover()
                  }}
                  disabled={recoveringId !== null}
                  className="bg-emerald-700 hover:bg-emerald-800"
                >
                  {recoveringId ? "Please wait…" : "Confirm"}
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  )
}
