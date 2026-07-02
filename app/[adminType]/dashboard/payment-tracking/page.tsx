"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
  created_at?: string | null
}

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
  const [exporting, setExporting] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [recoveringId, setRecoveringId] = useState<string | null>(null)
  const [recoverOpen, setRecoverOpen] = useState(false)
  const [recoverTarget, setRecoverTarget] = useState<Payment | null>(null)
  const [recoverAction, setRecoverAction] = useState<RecoveryAction | null>(null)
  const [recoverNote, setRecoverNote] = useState("")
  const [syncing, setSyncing] = useState(false)
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
  const filtersReadyRef = useRef(false)

  const isSuperAdmin = String(params?.adminType || "").toLowerCase() === "super-admin"

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
          ...(branchFilter !== "all" ? { branch_id: branchFilter } : {}),
        },
        token
      )
      setPayments(data.payments || [])
      setTotalPayments(Number(data.total) || 0)
    } catch (error) {
      console.error("Error fetching payments:", error)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, periodStart, periodEnd, debouncedStudentSearch, branchFilter])

  const fetchStats = useCallback(async () => {
    try {
      const token = TokenManager.getToken()
      const qsScoped = new URLSearchParams()
      if (periodStart) qsScoped.set("start_date", periodStart)
      if (periodEnd) qsScoped.set("end_date", periodEnd)
      if (branchFilter !== "all") qsScoped.set("branch_id", branchFilter)
      qsScoped.set("_ts", String(Date.now()))

      const headers: HeadersInit = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      }

      const scopedRes = await fetch(getBackendApiUrl(`payments/stats?${qsScoped.toString()}`), {
        cache: "no-store",
        headers,
      })

      if (!scopedRes.ok) return

      const scopedData = await scopedRes.json()

      if (isSuperAdmin) {
        const gQs = new URLSearchParams()
        gQs.set("_ts", String(Date.now()))
        const globalRes = await fetch(getBackendApiUrl(`payments/stats?${gQs.toString()}`), {
          cache: "no-store",
          headers,
        })
        if (globalRes.ok) {
          const globalData = await globalRes.json()
          const total = Number(globalData.total_collected)
          setStats({
            ...scopedData,
            total_collected: Number.isFinite(total) ? total : 0,
          })
          return
        }
      }

      setStats(scopedData)
    } catch (error) {
      console.error("Error fetching payment stats:", error)
    }
  }, [periodStart, periodEnd, branchFilter, isSuperAdmin])

  const fetchAnalytics = useCallback(async () => {
    try {
      setAnalyticsLoading(true)
      const token = TokenManager.getToken() || ""

      // Period revenue: works with start only, end only, or both dates
      if (periodStart || periodEnd) {
        const q = new URLSearchParams()
        if (periodStart) q.set("start_date", periodStart)
        if (periodEnd) q.set("end_date", periodEnd)
        if (branchFilter !== "all") q.set("branch_id", branchFilter)
        q.set("_ts", String(Date.now()))
        const statsRes = await fetch(
          getBackendApiUrl(`payments/stats?${q.toString()}`),
          {
            cache: "no-store",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          }
        )
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

      // Branch-wise revenue: backend aggregates paid/completed by branch (optional date range)
      const q = new URLSearchParams()
      if (periodStart) q.set("start_date", periodStart)
      if (periodEnd) q.set("end_date", periodEnd)
      if (branchFilter !== "all") q.set("branch_id", branchFilter)
      q.set("_ts", String(Date.now()))
      const revRes = await fetch(getBackendApiUrl(`payments/revenue/by-branch?${q.toString()}`), {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      })
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
  }, [periodStart, periodEnd, branchFilter])

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
    ;(async () => {
      if (isSuperAdmin) {
        try {
          setSyncing(true)
          const token = TokenManager.getToken() || undefined
          await paymentAPI.syncRazorpayPayments(token)
        } catch (e) {
          console.error("Razorpay sync failed:", e)
        } finally {
          setSyncing(false)
        }
      }
      filtersReadyRef.current = true
      await Promise.all([fetchPayments(), fetchStats(), fetchAnalytics()])
    })()
  }, [])

  useEffect(() => {
    if (!filtersReadyRef.current) return
    void Promise.all([fetchPayments(), fetchStats(), fetchAnalytics()])
  }, [page, branchFilter, periodStart, periodEnd, debouncedStudentSearch, fetchPayments, fetchStats, fetchAnalytics])

  useEffect(() => {
    if (!filtersReadyRef.current) return
    setPage(1)
  }, [branchFilter, periodStart, periodEnd, debouncedStudentSearch])

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
        ...(branchFilter && branchFilter !== "all" && branchFilter !== "unassigned"
          ? { branch_id: branchFilter }
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
    setRecoverTarget(payment)
    setRecoverAction(action)
    setRecoverNote("")
    setRecoverOpen(true)
  }

  const handleConfirmRecover = async () => {
    if (!recoverTarget?.id || !recoverAction) return
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
      await fetchPayments()
      await fetchStats()
    } catch (error) {
      toast({
        title: "Recovery failed",
        description: error instanceof Error ? error.message : "Could not update this enrollment",
        variant: "destructive",
      })
    } finally {
      setRecoveringId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full p-4 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Payment Tracking</h1>

        {/* Live revenue cards (Super Admin only) */}
        {isSuperAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium text-gray-700">Total Revenue (All time)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.total_collected)}</div>
                <div className="text-xs text-gray-500 mt-1">Paid / completed payments</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium text-gray-700">Custom Duration Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="flex-1 min-w-[140px]">
                    <div className="text-xs text-gray-500 mb-1">Start</div>
                    <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <div className="text-xs text-gray-500 mb-1">End</div>
                    <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
                  </div>
                  <Button
                    onClick={() => void fetchAnalytics()}
                    disabled={analyticsLoading || !periodStart || !periodEnd}
                    className="h-9"
                  >
                    Apply
                  </Button>
                </div>
                <div className="text-2xl font-semibold text-gray-900 mt-3">
                  {periodRevenue == null ? "—" : formatCurrency(periodRevenue)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium text-gray-700">Branch-wise Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[120px] overflow-auto pr-1">
                  {branchRevenue.length === 0 ? (
                    <div className="text-sm text-gray-500">{analyticsLoading ? "Loading…" : "No data"}</div>
                  ) : (
                    branchRevenue.slice(0, 8).map((r) => (
                      <div key={r.branch_id} className="flex items-center justify-between gap-3">
                        <div className="text-sm text-gray-700 truncate">{r.branch_name}</div>
                        <div className="text-sm font-medium text-gray-900 whitespace-nowrap">
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
            <span className="text-sm font-medium text-gray-700">Select Branch:</span>
            <Select value={branchFilter} onValueChange={setBranchFilter} disabled={branchesLoading}>
              <SelectTrigger className="w-48 bg-gray-100 text-gray-600 border-0">
                <SelectValue placeholder={branchesLoading ? "Loading…" : "Choose branch"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                <SelectItem value="unassigned">No branch on record</SelectItem>
                {branchOptions.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

          {isSuperAdmin && (
            <Button
              onClick={async () => {
                if (syncing) return
                try {
                  setSyncing(true)
                  const token = localStorage.getItem("token") || undefined
                  await paymentAPI.syncRazorpayPayments(token)
                  toast({
                    title: "Razorpay sync completed",
                    description: "Payment statuses have been reconciled.",
                  })
                  await fetchPayments()
                  await fetchStats()
                } catch (e) {
                  toast({
                    title: "Razorpay sync failed",
                    description: e instanceof Error ? e.message : "Could not sync payments right now.",
                    variant: "destructive",
                  })
                } finally {
                  setSyncing(false)
                }
              }}
              disabled={syncing}
              className="bg-transparent border border-gray-300 text-gray-700 text-[10px] w-[140px] hover:bg-gray-100 px-6 py-2 rounded-md flex items-center gap-1"
            >
              {syncing ? "Syncing..." : "Sync Razorpay"}
            </Button>
          )}

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
                  <td colSpan={isSuperAdmin ? 5 : 4} className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                      <span className="ml-2 text-gray-500">Loading payments...</span>
                    </div>
                  </td>
                </tr>
              ) : pagedPayments.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 5 : 4} className="px-6 py-8 text-center text-gray-500">
                    No payments found
                  </td>
                </tr>
              ) : (
                pagedPayments.map((payment) => {
                  const paymentStatus = String(payment.payment_status || "").toLowerCase()
                  return (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.student_name || "Unknown Student"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="font-medium">{payment.course_name || "N/A"}</div>
                      {payment.branch_name && (
                        <div className="text-xs text-gray-500 mt-0.5">{payment.branch_name}</div>
                      )}
                    </td>
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
                onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {recoverAction ? recoveryCopy[recoverAction].title : "Recover enrollment"}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-gray-600">
                {recoverAction ? recoveryCopy[recoverAction].description : ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="px-6 pb-2 space-y-2">
              <label className="text-xs text-gray-500 block">Optional note (stored on payment record)</label>
              <Textarea
                value={recoverNote}
                onChange={(e) => setRecoverNote(e.target.value)}
                placeholder="e.g. Cash collected at front desk"
                className="min-h-[72px] text-gray-900"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Back</AlertDialogCancel>
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
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  )
}
