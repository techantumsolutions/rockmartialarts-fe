"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Calendar,
  CheckCircle2,
  Clock3,
  CreditCard,
  Eye,
  FileText,
  GraduationCap,
  Search,
  Users,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import paymentAPI from "@/lib/paymentAPI"
import { TokenManager } from "@/lib/tokenManager"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { getActiveBranchId } from "@/lib/activeBranch"
import { getBackendApiUrl } from "@/lib/config"
import { cn } from "@/lib/utils"

type PayerTab = "student" | "partner"

interface PaymentRow {
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
  invoice_number?: string | null
  invoice_id?: string | null
}

interface PaymentStats {
  total_collected: number
  pending_payments: number
  failed_payments?: number
  failed_count?: number
  transaction_count?: number
  payment_count?: number
  this_month_collection?: number
}

type BranchOption = { id: string; name: string }
type CourseOption = { id: string; name: string }

function formatCurrency(amount?: number | null) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(Number(amount) || 0)
}

function formatDateTime(value?: string | null) {
  if (!value) return "—"
  const d = new Date(value)
  if (!Number.isFinite(d.getTime())) return "—"
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function toInputDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function defaultMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { start: toInputDate(start), end: toInputDate(end) }
}

function paymentMethodLabel(p: PaymentRow) {
  const label = (p.gateway_payment_label || p.payment_method || "").trim()
  if (!label) return "—"
  return label
}

function StatusPill({ status }: { status: string }) {
  const s = String(status || "").toLowerCase()
  const paid = s === "paid" || s === "completed"
  const pending = s === "pending" || s === "processing"
  const failed = s === "failed" || s === "cancelled" || s === "canceled"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        paid && "bg-emerald-50 text-emerald-700",
        pending && "bg-amber-50 text-amber-800",
        failed && "bg-rose-50 text-rose-700",
        !paid && !pending && !failed && "bg-slate-100 text-slate-600"
      )}
    >
      {paid ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
      {pending ? <Clock3 className="h-3.5 w-3.5" /> : null}
      {failed ? <XCircle className="h-3.5 w-3.5" /> : null}
      {paid ? "Paid" : pending ? "Pending" : failed ? (s.startsWith("cancel") ? "Cancelled" : "Failed") : status || "—"}
    </span>
  )
}

export default function PaymentTrackingPage() {
  const params = useParams<{ adminType: string }>()
  const router = useRouter()
  const basePath = useDashboardBasePath()
  const { toast } = useToast()
  const adminType = String(params?.adminType || "super-admin").toLowerCase()
  const isSuperAdmin = adminType === "super-admin"
  const isPartnerAdmin = adminType === "partner-admin" || adminType === "partners"
  const canPickBranch = isSuperAdmin || isPartnerAdmin
  const showPartnerTab = isSuperAdmin

  const initialRange = useMemo(() => defaultMonthRange(), [])
  const [tab, setTab] = useState<PayerTab>("student")
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [stats, setStats] = useState<PaymentStats>({
    total_collected: 0,
    pending_payments: 0,
    failed_payments: 0,
    transaction_count: 0,
  })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [courseFilter, setCourseFilter] = useState("all")
  const [branchFilter, setBranchFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [periodStart, setPeriodStart] = useState(initialRange.start)
  const [periodEnd, setPeriodEnd] = useState(initialRange.end)
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [courses, setCourses] = useState<CourseOption[]>([])

  const branchManager = BranchManagerAuth.getCurrentUser()
  const headerBranchId =
    getActiveBranchId() ||
    branchManager?.branch_id ||
    branchManager?.managed_branches?.[0] ||
    ""
  const effectiveBranchFilter = canPickBranch ? branchFilter : headerBranchId || branchFilter

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => window.clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [tab, debouncedSearch, courseFilter, branchFilter, statusFilter, periodStart, periodEnd])

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const token = TokenManager.getToken()
        const headers: HeadersInit = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        }
        const [bRes, cRes] = await Promise.all([
          fetch(getBackendApiUrl(`branches?skip=0&limit=200&_ts=${Date.now()}`), {
            cache: "no-store",
            headers,
          }),
          fetch(getBackendApiUrl(`courses?limit=200&_ts=${Date.now()}`), {
            cache: "no-store",
            headers,
          }),
        ])
        if (bRes.ok) {
          const data = await bRes.json()
          const raw = data.branches || []
          setBranches(
            raw.map((b: { id: string; branch?: { name?: string }; name?: string }) => ({
              id: b.id,
              name: b.branch?.name || b.name || "Academy",
            }))
          )
        }
        if (cRes.ok) {
          const data = await cRes.json()
          const raw = data.courses || data || []
          setCourses(
            (Array.isArray(raw) ? raw : []).map((c: { id: string; title?: string; name?: string }) => ({
              id: c.id,
              name: c.title || c.name || "Course",
            }))
          )
        }
      } catch (e) {
        console.error(e)
      }
    }
    void loadMeta()
  }, [])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const token = TokenManager.getToken() || undefined
      const payerCategory = showPartnerTab ? tab : "student"
      const common = {
        ...(periodStart ? { start_date: periodStart } : {}),
        ...(periodEnd ? { end_date: periodEnd } : {}),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(effectiveBranchFilter && effectiveBranchFilter !== "all"
          ? { branch_id: effectiveBranchFilter }
          : {}),
        ...(courseFilter !== "all" ? { course_id: courseFilter } : {}),
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        payer_category: payerCategory,
      }

      const [list, statsData] = await Promise.all([
        paymentAPI.getPayments(
          {
            skip: (page - 1) * pageSize,
            limit: pageSize,
            ...common,
          },
          token
        ),
        paymentAPI.getPaymentStats(token, common),
      ])

      setPayments((list.payments || []) as PaymentRow[])
      setTotal(Number(list.total) || 0)
      setStats({
        total_collected: Number(statsData.total_collected) || 0,
        pending_payments: Number(statsData.pending_payments) || 0,
        failed_payments: Number((statsData as PaymentStats).failed_payments) || 0,
        failed_count: Number((statsData as PaymentStats).failed_count) || 0,
        transaction_count: Number((statsData as PaymentStats).transaction_count) || Number(list.total) || 0,
        payment_count: Number(statsData.payment_count) || 0,
        this_month_collection: Number(statsData.this_month_collection) || 0,
      })
    } catch (error) {
      console.error(error)
      toast({
        title: "Could not load transactions",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [
    page,
    pageSize,
    periodStart,
    periodEnd,
    debouncedSearch,
    effectiveBranchFilter,
    courseFilter,
    statusFilter,
    tab,
    showPartnerTab,
    toast,
  ])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const showingFrom = total === 0 ? 0 : (page - 1) * pageSize + 1
  const showingTo = Math.min(page * pageSize, total)

  const pageButtons = useMemo(() => {
    const maxButtons = 5
    let start = Math.max(1, page - Math.floor(maxButtons / 2))
    let end = Math.min(totalPages, start + maxButtons - 1)
    start = Math.max(1, end - maxButtons + 1)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [page, totalPages])

  const nameColumnLabel = tab === "partner" ? "Partner Name" : "Student Name"
  const searchPlaceholder =
    tab === "partner"
      ? "Search by partner, invoice no..."
      : "Search by student, enrollment ID, invoice no..."

  return (
    <div className="w-full space-y-6 p-4 lg:px-8 lg:py-6">
      <div className="space-y-1">
        <p className="text-sm text-[#6B7A99]">
          Finance &amp; Billing <span className="mx-1 text-[#CBD5E1]">&gt;</span> Transactions
          (Payments &amp; Invoices)
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-[#171A26] sm:text-3xl">
          Transactions (Payments &amp; Invoices)
        </h1>
        <p className="text-sm text-[#6B7A99]">
          Track and manage all payments and invoices for students and partners.
        </p>
      </div>

      {showPartnerTab ? (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setTab("student")}
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors",
              tab === "student"
                ? "bg-[#F5C518] text-[#171A26] shadow-sm"
                : "border border-[#E2E8F0] bg-white text-[#4F5077] hover:bg-[#F8FAFC]"
            )}
          >
            <GraduationCap className="h-4 w-4" />
            Student Payments
          </button>
          <button
            type="button"
            onClick={() => setTab("partner")}
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors",
              tab === "partner"
                ? "bg-[#F5C518] text-[#171A26] shadow-sm"
                : "border border-[#E2E8F0] bg-white text-[#4F5077] hover:bg-[#F8FAFC]"
            )}
          >
            <Users className="h-4 w-4" />
            Partner Payments
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#E8ECF4] bg-white p-5 shadow-sm">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#4F46E5]">
            <FileText className="h-5 w-5" />
          </div>
          <p className="text-2xl font-bold text-[#171A26]">
            {Number(stats.transaction_count || total).toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-sm text-[#6B7A99]">Total Transactions</p>
        </div>
        <div className="rounded-2xl border border-[#E8ECF4] bg-white p-5 shadow-sm">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CreditCard className="h-5 w-5" />
          </div>
          <p className="text-2xl font-bold text-[#171A26]">{formatCurrency(stats.total_collected)}</p>
          <p className="mt-1 text-sm text-[#6B7A99]">Total Collected</p>
        </div>
        <div className="rounded-2xl border border-[#E8ECF4] bg-white p-5 shadow-sm">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Clock3 className="h-5 w-5" />
          </div>
          <p className="text-2xl font-bold text-[#171A26]">
            {formatCurrency(stats.pending_payments)}
          </p>
          <p className="mt-1 text-sm text-[#6B7A99]">Pending</p>
        </div>
        <div className="rounded-2xl border border-[#E8ECF4] bg-white p-5 shadow-sm">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <XCircle className="h-5 w-5" />
          </div>
          <p className="text-2xl font-bold text-[#171A26]">
            {formatCurrency(stats.failed_payments)}
          </p>
          <p className="mt-1 text-sm text-[#6B7A99]">Failed</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-[#E8ECF4] bg-white p-4 shadow-sm lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-11 rounded-xl border-[#E2E8F0] bg-[#F8FAFC] pl-10"
          />
        </div>
        {tab === "student" ? (
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="h-11 w-full rounded-xl bg-white lg:w-44">
              <SelectValue placeholder="All Courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        {canPickBranch ? (
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="h-11 w-full rounded-xl bg-white lg:w-44">
              <SelectValue placeholder="All Academies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Academies</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-11 w-full rounded-xl bg-white lg:w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex h-11 items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-sm text-[#4F5077]">
          <Calendar className="h-4 w-4 text-[#94A3B8]" />
          <Input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="h-8 w-[118px] border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
          />
          <span className="text-[#94A3B8]">-</span>
          <Input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="h-8 w-[118px] border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#E8ECF4] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="bg-[#4F5077] text-left text-white">
                <th className="px-4 py-3.5 font-semibold">#</th>
                <th className="px-4 py-3.5 font-semibold">Invoice No</th>
                <th className="px-4 py-3.5 font-semibold">{nameColumnLabel}</th>
                <th className="px-4 py-3.5 font-semibold">{tab === "partner" ? "Type" : "Course"}</th>
                <th className="px-4 py-3.5 font-semibold">Academy</th>
                <th className="px-4 py-3.5 font-semibold">Payment Method</th>
                <th className="px-4 py-3.5 font-semibold">Amount</th>
                <th className="px-4 py-3.5 font-semibold">Date &amp; Time</th>
                <th className="px-4 py-3.5 font-semibold">Status</th>
                <th className="px-4 py-3.5 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-[#6B7A99]">
                    Loading transactions…
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-[#6B7A99]">
                    No transactions found for the selected filters.
                  </td>
                </tr>
              ) : (
                payments.map((p, idx) => (
                  <tr key={p.id} className="border-b border-[#F1F5F9] last:border-0 hover:bg-[#FAFBFC]">
                    <td className="px-4 py-4 text-[#6B7A99]">{(page - 1) * pageSize + idx + 1}</td>
                    <td className="px-4 py-4 font-medium text-[#171A26]">
                      {p.invoice_number || "—"}
                    </td>
                    <td className="px-4 py-4 font-medium text-[#171A26]">
                      {tab === "partner"
                        ? p.partner_org_name || p.student_name || "Partner"
                        : p.student_name || "—"}
                    </td>
                    <td className="px-4 py-4 text-[#4F5077]">
                      {tab === "partner"
                        ? p.payment_type?.replace(/_/g, " ") || "Registration fee"
                        : p.course_name || "—"}
                    </td>
                    <td className="px-4 py-4 text-[#4F5077]">{p.branch_name || "—"}</td>
                    <td className="px-4 py-4 text-[#4F5077]">{paymentMethodLabel(p)}</td>
                    <td className="px-4 py-4 font-semibold text-[#171A26]">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="px-4 py-4 text-[#4F5077]">
                      {formatDateTime(p.payment_date || p.created_at)}
                    </td>
                    <td className="px-4 py-4">
                      <StatusPill status={p.payment_status} />
                    </td>
                    <td className="px-4 py-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-lg border-[#E2E8F0] bg-white px-3 text-[#4F5077] hover:bg-[#F8FAFC]"
                        onClick={() => router.push(`${basePath}/payments/${p.id}`)}
                      >
                        <Eye className="mr-1.5 h-4 w-4" />
                        Details
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#F1F5F9] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#6B7A99]">
            Showing {showingFrom} – {showingTo} of {total.toLocaleString("en-IN")} transactions
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-9 rounded-lg p-0"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ‹
            </Button>
            {pageButtons.map((n) => (
              <Button
                key={n}
                type="button"
                size="sm"
                className={cn(
                  "h-9 w-9 rounded-lg p-0",
                  n === page
                    ? "bg-[#F5C518] text-[#171A26] hover:bg-[#E6B800]"
                    : "border border-[#E2E8F0] bg-white text-[#4F5077] hover:bg-[#F8FAFC]"
                )}
                variant={n === page ? "default" : "outline"}
                onClick={() => setPage(n)}
              >
                {n}
              </Button>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-9 rounded-lg p-0"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              ›
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
