"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  AdminCard,
  AdminFilterBar,
  AdminKpiCard,
  AdminKpiGrid,
  AdminPageHeader,
  AdminPageShell,
  AdminStatusPill,
  AdminTableShell,
} from "@/components/dashboard/AdminPageShell"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import {
  Calendar,
  CheckCircle2,
  CreditCard,
  Download,
  Eye,
  Plus,
  RotateCcw,
  XCircle,
} from "lucide-react"
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
  payment_count?: number
  failed_count?: number
  cancelled_count?: number
}

const STUDENT_AVATAR_PALETTE = [
  "bg-[#E8F1FF] text-[#2563EB]",
  "bg-[#F1EBFF] text-[#6D28D9]",
  "bg-[#EAF8F0] text-[#1F9D57]",
  "bg-[#FFF8E1] text-[#C9971A]",
  "bg-[#FFE8E8] text-[#E11D48]",
]

function studentInitials(name?: string | null) {
  const trimmed = (name || "Unknown").trim()
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase()
  }
  return trimmed.slice(0, 2).toUpperCase()
}

function paymentStatusPill(
  status: string
): "paid" | "pending" | "cancelled" | "rejected" | undefined {
  const s = status.toLowerCase()
  if (s === "paid" || s === "completed") return "paid"
  if (s === "pending") return "pending"
  if (s === "cancelled" || s === "canceled") return "cancelled"
  if (s === "failed") return "rejected"
  return undefined
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
  const router = useRouter()
  const basePath = useDashboardBasePath()
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
    if (typeof window === "undefined") return
    const sp = new URLSearchParams(window.location.search)
    const start = sp.get("start_date")
    const end = sp.get("end_date")
    const branchId = sp.get("branch_id")
    if (start) setPeriodStart(start)
    if (end) setPeriodEnd(end)
    if (branchId && canPickBranch) setBranchFilter(branchId)
  }, [canPickBranch])

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
  const tableColSpan = 7 + (showPartnerColumn ? 1 : 0)
  const selectedPartnerLabel =
    partnerFilter === "all"
      ? null
      : partnerFilter === "rock"
        ? "Rock (non-partner)"
        : partnerFilter === "partners"
          ? "All partners"
          : partnerOptions.find((p) => p.id === partnerFilter)?.name || "Partner"

  const maxBranchRevenue = useMemo(
    () => Math.max(1, ...branchRevenue.map((r) => r.total_revenue)),
    [branchRevenue]
  )

  const paidTransactions =
    typeof stats.payment_count === "number" ? stats.payment_count : "—"

  const cancelledOrFailed =
    Number(stats.cancelled_count ?? 0) + Number(stats.failed_count ?? 0) > 0
      ? Number(stats.cancelled_count ?? 0) + Number(stats.failed_count ?? 0)
      : stats.pending_payments

  const periodRevenueLabel =
    periodStart || periodEnd
      ? periodRevenue != null
        ? formatCurrency(periodRevenue)
        : "—"
      : formatCurrency(Number(stats.this_month_collection) || 0)

  return (
    <AdminPageShell>
      <AdminPageHeader
        icon={CreditCard}
        title="Payment Tracking"
        subtitle="Track revenue, payment status, and transactions across branches."
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              className="btn-admin-outline h-10"
              disabled={exporting}
              onClick={() => void handleExport()}
            >
              <Download className="mr-2 h-4 w-4" />
              {exporting ? "Exporting…" : "Export Report"}
            </Button>
            <Button
              type="button"
              className="btn-admin-primary h-10"
              onClick={() => router.push(`${basePath}/create-student`)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          </>
        }
      />

      {isPartnerAdmin ? (
        <>
          <AdminCard className="border-amber-200/80 bg-[#FFFBEB] text-sm text-amber-950">
            Student course payments are collected on Rock&apos;s payment gateway. This list shows every
            transaction for your organization (student, branch, course, amount) so you can reconcile
            settlement with Rock Super Admin offline.
          </AdminCard>
          <AdminKpiGrid cols={4}>
            <AdminKpiCard
              icon={CreditCard}
              label="Your org — collected (all time)"
              value={formatCurrency(stats.total_collected)}
              tone="amber"
            />
            <AdminKpiCard
              icon={Calendar}
              label="Selected period"
              value={formatCurrency(Number(stats.this_month_collection) || 0)}
              tone="blue"
              hint="Uses date filters below when set"
            />
          </AdminKpiGrid>
        </>
      ) : null}

      {isSuperAdmin ? (
        <div
          className={
            partnerFilter === "all" && branchRevenue.length > 0
              ? "grid grid-cols-1 gap-4 xl:grid-cols-[1fr_minmax(0,17rem)]"
              : ""
          }
        >
          <AdminKpiGrid cols={4}>
            <AdminKpiCard
              icon={CreditCard}
              label={
                selectedPartnerLabel ? `Revenue — ${selectedPartnerLabel}` : "Total Revenue (All time)"
              }
              value={formatCurrency(stats.total_collected)}
              tone="amber"
            />
            <AdminKpiCard
              icon={CheckCircle2}
              label="Paid Transactions"
              value={paidTransactions}
              tone="green"
            />
            <AdminKpiCard
              icon={XCircle}
              label="Cancelled / Failed"
              value={cancelledOrFailed}
              tone="rose"
            />
            <AdminKpiCard
              icon={Calendar}
              label={periodStart || periodEnd ? "Selected Period Revenue" : "This Month Revenue"}
              value={periodRevenueLabel}
              tone="blue"
            />
          </AdminKpiGrid>

          {partnerFilter === "all" && branchRevenue.length > 0 ? (
            <AdminCard>
              <h3 className="mb-3 text-sm font-semibold text-[#4F5077]">Branch-wise Revenue</h3>
              <div
                className={
                  branchRevenue.length > 5
                    ? "max-h-48 space-y-3 overflow-y-auto pr-1"
                    : "space-y-3"
                }
              >
                {branchRevenue.map((r) => (
                  <div key={r.branch_id}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-[#6B7A99]">{r.branch_name}</span>
                      <span className="shrink-0 font-semibold text-[#4F5077]">
                        {formatCurrency(r.total_revenue)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-[#6D28D9]"
                        style={{ width: `${(r.total_revenue / maxBranchRevenue) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </AdminCard>
          ) : null}
        </div>
      ) : null}

      <AdminFilterBar className="items-end">
        <div className="flex min-w-[160px] flex-col gap-1">
          <span className="text-xs font-medium text-[#6B7A99]">Branch</span>
          {canPickBranch ? (
            <Select value={branchFilter} onValueChange={setBranchFilter} disabled={branchesLoading}>
              <SelectTrigger className="h-11 w-full min-w-[160px] bg-white sm:w-48">
                <SelectValue placeholder={branchesLoading ? "Loading…" : "All branches"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {!isPartnerAdmin ? <SelectItem value="unassigned">No branch on record</SelectItem> : null}
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
          <div className="flex min-w-[160px] flex-col gap-1">
            <span className="text-xs font-medium text-[#6B7A99]">Partner</span>
            <Select value={partnerFilter} onValueChange={setPartnerFilter} disabled={partnersLoading}>
              <SelectTrigger className="h-11 w-full min-w-[160px] bg-white sm:w-52">
                <SelectValue placeholder={partnersLoading ? "Loading…" : "All Rock + partners"} />
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

        <div className="flex min-w-[130px] flex-col gap-1">
          <span className="text-xs font-medium text-[#6B7A99]">Start Date</span>
          <Input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="h-11 w-full min-w-[130px] bg-white sm:w-[150px]"
          />
        </div>
        <div className="flex min-w-[130px] flex-col gap-1">
          <span className="text-xs font-medium text-[#6B7A99]">End Date</span>
          <Input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="h-11 w-full min-w-[130px] bg-white sm:w-[150px]"
          />
        </div>

        <div className="flex min-w-[200px] flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-[#6B7A99]">Student</span>
          <Input
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="Search name / phone / email"
            className="h-11 w-full bg-white"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          className="btn-admin-outline h-11 shrink-0"
          disabled={analyticsLoading}
          onClick={() => {
            setBranchFilter("all")
            setPartnerFilter("all")
            setPeriodStart("")
            setPeriodEnd("")
            setStudentSearch("")
            setPeriodRevenue(null)
          }}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset Filters
        </Button>
      </AdminFilterBar>

      <AdminCard padding={false}>
        <div className="border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-[#6D28D9]" />
            <h2 className="text-[15px] font-semibold text-[#4F5077]">Payment Transactions</h2>
          </div>
        </div>
        <AdminTableShell
          footer={
            !loading && totalPayments > 0 ? (
              <>
                <span>
                  Showing {startIdx + 1}–{endIdx} of {totalPayments}
                </span>
                <nav className="admin-pagination flex items-center gap-2" aria-label="Pagination">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="btn-admin-outline h-8"
                    disabled={safePage <= 1}
                    onClick={() => {
                      setPage((p) => Math.max(1, p - 1))
                      window.scrollTo({ top: 0, behavior: "smooth" })
                    }}
                  >
                    Prev
                  </Button>
                  <span
                    className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-[#E1BB33] px-2 text-sm font-semibold text-[#3d3e5c]"
                    aria-current="page"
                  >
                    {safePage}
                  </span>
                  <span className="text-xs text-[#6B7A99]">
                    / {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="btn-admin-outline h-8"
                    disabled={safePage >= totalPages}
                    onClick={() => {
                      setPage((p) => Math.min(totalPages, p + 1))
                      window.scrollTo({ top: 0, behavior: "smooth" })
                    }}
                  >
                    Next
                  </Button>
                </nav>
              </>
            ) : undefined
          }
        >
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Course Enrolled</th>
                {showPartnerColumn ? <th>Branch / Partner</th> : null}
                <th>Payment Details</th>
                <th>Date &amp; Time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={tableColSpan} className="py-12 text-center text-[#6B7A99]">
                    Loading payments…
                  </td>
                </tr>
              ) : pagedPayments.length === 0 ? (
                <tr>
                  <td colSpan={tableColSpan} className="py-12 text-center text-[#6B7A99]">
                    No payments found
                  </td>
                </tr>
              ) : (
                pagedPayments.map((payment, idx) => {
                  const paymentStatus = String(payment.payment_status || "").toLowerCase()
                  const statusLabel =
                    paymentStatus === "paid"
                      ? "Paid"
                      : paymentStatus === "pending"
                        ? "Pending"
                        : paymentStatus === "cancelled" || paymentStatus === "canceled"
                          ? "Cancelled"
                          : "Failed"
                  return (
                    <tr key={payment.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback
                              className={`text-xs font-semibold ${STUDENT_AVATAR_PALETTE[idx % STUDENT_AVATAR_PALETTE.length]}`}
                            >
                              {studentInitials(payment.student_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            {payment.student_id ? (
                              <Link
                                href={`/${adminType}/dashboard/students/${payment.student_id}`}
                                className="font-medium text-[#4F5077] hover:underline"
                              >
                                {payment.student_name || "Unknown Student"}
                              </Link>
                            ) : (
                              <span className="font-medium text-[#4F5077]">
                                {payment.student_name || "Unknown Student"}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="font-medium text-[#4F5077]">{payment.course_name || "N/A"}</div>
                        {payment.branch_name && !showPartnerColumn ? (
                          <div className="mt-0.5 text-xs text-[#6B7A99]">{payment.branch_name}</div>
                        ) : null}
                      </td>
                      {showPartnerColumn ? (
                        <td>
                          <div className="font-medium text-[#4F5077]">
                            {payment.partner_org_name || (payment.partner_org_id ? "Partner" : "Rock")}
                          </div>
                          {payment.branch_name ? (
                            <div className="mt-0.5 text-xs text-[#6B7A99]">{payment.branch_name}</div>
                          ) : null}
                        </td>
                      ) : null}
                      <td>
                        <div className="font-semibold text-[#4F5077]">
                          {formatCurrency(Number(payment.amount) || 0)}
                        </div>
                        <div className="mt-0.5 text-xs text-[#6B7A99]">{describePaymentSource(payment)}</div>
                        {payment.transaction_id ? (
                          <div className="mt-0.5 text-xs text-[#9593A8]">{payment.transaction_id}</div>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap text-sm text-[#6B7A99]">
                        {formatDateTime(payment.payment_date || payment.created_at)}
                      </td>
                      <td>
                        <AdminStatusPill status={paymentStatusPill(paymentStatus)}>{statusLabel}</AdminStatusPill>
                      </td>
                      <td>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="btn-admin-outline h-8"
                            onClick={() => router.push(`${basePath}/payments/${payment.id}`)}
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" />
                            View
                          </Button>
                          {isSuperAdmin ? (
                            paymentStatus === "cancelled" || paymentStatus === "canceled" ? (
                              recoverablePaymentIds[payment.id] ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={recoveringId === payment.id}
                                      className="btn-admin-outline h-8 text-emerald-800"
                                    >
                                      <RotateCcw className="mr-1 h-3.5 w-3.5" />
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
                              ) : null
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void handleCancelPayment(payment)}
                                disabled={
                                  cancellingId === payment.id ||
                                  ["paid", "completed", "cancelled", "canceled"].includes(paymentStatus)
                                }
                                className="btn-admin-outline h-8 text-red-700 hover:bg-red-50"
                              >
                                Cancel
                              </Button>
                            )
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </AdminTableShell>
      </AdminCard>

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
    </AdminPageShell>
  )
}
