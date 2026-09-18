"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import StudentDashboardLayout from "@/components/student-dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  Calendar,
  CreditCard,
  AlertCircle,
  RefreshCw,
  Download,
  CheckCircle,
  Clock,
  BookOpen,
  TrendingUp,
  IndianRupee,
  ArrowRight,
  Loader2,
  FileText
} from "lucide-react"
import { studentPaymentAPI, type PaymentRecord } from "@/lib/studentPaymentAPI"
import { studentProfileAPI, type StudentEnrollment } from "@/lib/studentProfileAPI"
import { openRazorpayCheckout, type RazorpayPaymentResponse } from "@/lib/razorpay"
import { getBackendApiUrl } from "@/lib/config"
import {
  getEnrollmentUiStatus,
  isEnrollmentActivePaid,
  calendarDaysUntilSubscriptionEnd,
  overdueDaysAfterExpiry,
  graceDaysRemaining,
  ENROLLMENT_GRACE_DAYS,
} from "@/lib/student-enrollment-status"
import { mergeEnrollmentsByCourseBranch } from "@/lib/merge-enrollment-groups"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TokenManager } from "@/lib/tokenManager"
import {
  getSessionErrorMessage,
  isSessionExpiredError,
  requireStudentSession,
  SESSION_EXPIRED_PAYMENT_MESSAGE,
} from "@/lib/sessionAuth"

type TenureOption = {
  id: string
  code?: string
  label: string
  months: number
}

function asTs(value?: string | null): number {
  if (!value) return 0
  const ts = new Date(value).getTime()
  return Number.isFinite(ts) ? ts : 0
}

function dedupeSubscriptionEnrollments(input: StudentEnrollment[]): StudentEnrollment[] {
  return mergeEnrollmentsByCourseBranch(input) as StudentEnrollment[]
}

function pickPricingTotal(data: unknown): number | null {
  if (!data || typeof data !== "object") return null
  const p = (data as { pricing?: { total_amount?: unknown; course_fee?: unknown } }).pricing
  if (!p) return null
  const t = p.total_amount ?? p.course_fee
  if (typeof t === "number" && Number.isFinite(t) && t > 0) return t
  return null
}

/** Quote renewal/checkout total (course fee only after first paid enrollment — no repeat admission). */
async function fetchStudentCheckoutQuoteTotal(
  token: string,
  courseId: string,
  branchId: string,
  durationKey: string
): Promise<number | null> {
  try {
    const res = await fetch(getBackendApiUrl("payments/student-checkout-quote"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        course_id: courseId,
        branch_id: branchId,
        duration: durationKey,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return pickPricingTotal(data)
  } catch {
    return null
  }
}

type RenewalQuoteBreakdown = {
  total: number
  course_fee: number
  admission_fee: number
  arrear_amount: number
  overdue_days: number
  grace_days_remaining: number | null
  billing_state: string
  message?: string
  arrear_note?: string
}

async function fetchRenewalQuote(
  token: string,
  enrollmentId: string,
  durationKey: string
): Promise<RenewalQuoteBreakdown | null> {
  try {
    const res = await fetch(getBackendApiUrl("payments/renewal-quote"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        enrollment_id: enrollmentId,
        duration: durationKey,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const pricing = data?.pricing || {}
    const billing = data?.billing || {}
    const total = Number(pricing.total_amount)
    if (!Number.isFinite(total) || total <= 0) return null
    return {
      total,
      course_fee: Number(pricing.course_fee || 0),
      admission_fee: Number(pricing.admission_fee || 0),
      arrear_amount: Number(pricing.arrear_amount || 0),
      overdue_days: Number(billing.overdue_days || 0),
      grace_days_remaining:
        billing.grace_days_remaining == null ? null : Number(billing.grace_days_remaining),
      billing_state: String(billing.billing_state || "active"),
      message: typeof data.message === "string" ? data.message : undefined,
      arrear_note: data?.arrear?.arrear_note,
    }
  } catch {
    return null
  }
}

function durationKeyMatchesEnrollment(option: TenureOption, durationId: string | null | undefined): boolean {
  if (!durationId) return false
  return option.id === durationId || option.code === durationId
}

export default function StudentPaymentsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [studentData, setStudentData] = useState<any>(null)
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([])
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([])
  const [totalPaid, setTotalPaid] = useState(0)
  const [totalPending, setTotalPending] = useState(0)
  const [paymentProcessingId, setPaymentProcessingId] = useState<string | null>(null)
  const [tenureModal, setTenureModal] = useState<{
    enrollment: StudentEnrollment
    isRenewal: boolean
  } | null>(null)
  const [tenureOptions, setTenureOptions] = useState<TenureOption[]>([])
  const [tenurePrices, setTenurePrices] = useState<Record<string, number | null>>({})
  const [tenureQuotes, setTenureQuotes] = useState<Record<string, RenewalQuoteBreakdown | null>>({})
  const [tenurePricesLoading, setTenurePricesLoading] = useState(false)

  useEffect(() => {
    const token = requireStudentSession(router, pathname || "/student-dashboard/payments")
    if (!token) return

    const user = TokenManager.getUser()
    if (!user) {
      router.push("/login")
      return
    }

    if (user.role !== "student") {
      if (user.role === "coach") {
        router.push("/coach-dashboard")
      } else {
        router.push("/dashboard")
      }
      return
    }

    setStudentData({
      name: user.full_name || user.name || "Student",
      email: user.email || "",
    })

    loadPaymentData(token)
  }, [router, pathname])

  // When tenure modal opens, fetch price for each duration
  useEffect(() => {
    if (!tenureModal) {
      setTenureOptions([])
      setTenurePrices({})
      setTenureQuotes({})
      setTenurePricesLoading(false)
      return
    }
    setTenurePricesLoading(true)
    const token = TokenManager.getToken()
    if (!token || !TokenManager.isAuthenticated()) {
      setTenurePricesLoading(false)
      return
    }
    const { course_id, branch_id } = tenureModal.enrollment
    ;(async () => {
      try {
        // 1) Load durations for this course from master data (dynamic, admin-configured)
        const durationsRes = await fetch(
          getBackendApiUrl(
            `durations/public/by-course/${course_id}?active_only=true&include_pricing=true&branch_id=${branch_id}`
          )
        )
        const durationsData = await durationsRes.json().catch(() => ({}))
        const durations: any[] = Array.isArray(durationsData.durations) ? durationsData.durations : []

        const options: TenureOption[] = durations
          .map((d) => ({
            id: String(d.id),
            code: d.code != null && String(d.code) !== String(d.id) ? String(d.code) : undefined,
            label: String(d.name || d.code || ""),
            months:
              typeof d.duration_months === "number"
                ? d.duration_months
                : parseInt(String(d.duration_months), 10) || 0,
          }))
          .filter((opt) => opt.id && opt.label && opt.months > 0)

        setTenureOptions(options)

        if (options.length === 0) {
          setTenurePrices({})
          setTenureQuotes({})
          return
        }

        const profileEnr = tenureModal.enrollment
        const isRenewal = tenureModal.isRenewal
        const next: Record<string, number | null> = {}
        const quotes: Record<string, RenewalQuoteBreakdown | null> = {}
        for (const opt of options) {
          if (isRenewal) {
            let quote = await fetchRenewalQuote(token, profileEnr.id, opt.id)
            if (!quote && opt.code) {
              quote = await fetchRenewalQuote(token, profileEnr.id, opt.code)
            }
            quotes[opt.id] = quote
            next[opt.id] = quote?.total ?? null
            if (next[opt.id] == null) {
              let total = await fetchStudentCheckoutQuoteTotal(token, course_id, branch_id, opt.id)
              if (total == null && opt.code) {
                total = await fetchStudentCheckoutQuoteTotal(token, course_id, branch_id, opt.code)
              }
              next[opt.id] = total
            }
          } else {
            let total = await fetchStudentCheckoutQuoteTotal(token, course_id, branch_id, opt.id)
            if (total == null && opt.code) {
              total = await fetchStudentCheckoutQuoteTotal(token, course_id, branch_id, opt.code)
            }
            next[opt.id] = total
            quotes[opt.id] = null
          }
        }

        // First-time pending checkout only — never add admission on renewal quotes.
        if (
          !isRenewal &&
          profileEnr.payment_status === "pending" &&
          profileEnr.duration_id
        ) {
          const match = options.find((o) => durationKeyMatchesEnrollment(o, profileEnr.duration_id))
          const fee = Number(profileEnr.fee_amount)
          const adm = Number(profileEnr.admission_fee ?? 0)
          if (
            match &&
            Number.isFinite(fee) &&
            fee + adm > 0 &&
            (next[match.id] == null || next[match.id]! <= 0)
          ) {
            next[match.id] = fee + adm
          }
        }

        setTenurePrices(next)
        setTenureQuotes(quotes)
      } finally {
        setTenurePricesLoading(false)
      }
    })()
  }, [tenureModal])

  const loadPaymentData = async (token: string) => {
    try {
      setLoading(true)
      setError(null)

      // Load payment history
      const history = await studentPaymentAPI.getPaymentHistory(token)
      setPaymentHistory(history)

      // Prefer authoritative totals from API stats (covers full DB, not just paged history).
      let totalsFromStats = false
      try {
        const statsRes = await fetch(getBackendApiUrl(`payments/stats?_ts=${Date.now()}`), {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          cache: "no-store",
        })
        if (statsRes.ok) {
          const stats = await statsRes.json()
          const paid = Number(stats?.total_collected)
          const pending = Number(stats?.pending_payments)
          setTotalPaid(Number.isFinite(paid) ? paid : 0)
          setTotalPending(Number.isFinite(pending) ? pending : 0)
          totalsFromStats = true
        }
      } catch {
        totalsFromStats = false
      }

      if (!totalsFromStats) {
        const paid = history
          .filter((p) => p.payment_status === "paid")
          .reduce((sum, p) => sum + p.amount, 0)
        const pending = history
          .filter((p) => p.payment_status === "pending" || p.payment_status === "overdue")
          .reduce((sum, p) => sum + p.amount, 0)
        setTotalPaid(paid)
        setTotalPending(pending)
      }

      // Load enrollments with course details
      const profileResponse = await studentProfileAPI.getProfile(token)
      const enrollmentsData = profileResponse.profile.enrollments || []
      const mergedEnrollments = dedupeSubscriptionEnrollments(enrollmentsData)
      setEnrollments(mergedEnrollments)

    } catch (error: any) {
      console.error("Error loading payment data:", error)
      setError(`Failed to load payment data: ${error.message}. Please try again.`)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    const token = localStorage.getItem("token")
    if (token) {
      await loadPaymentData(token)
    }
    setRefreshing(false)
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    localStorage.removeItem("auth_data")
    router.push("/login")
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate)
    const now = new Date()
    const diffTime = due.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getStatusBadge = (status: string) => {
    const variants: any = {
      paid: { variant: "default", className: "bg-green-100 text-green-800 border-green-200" },
      pending: { variant: "secondary", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
      overdue: { variant: "destructive", className: "bg-red-100 text-red-800 border-red-200" },
      cancelled: { variant: "outline", className: "bg-gray-100 text-gray-800 border-gray-200" }
    }
    const config = variants[status] || variants.pending
    return (
      <Badge className={config.className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getPaymentMethodIcon = (method: string) => {
    return <CreditCard className="h-4 w-4" />
  }

  const openTenureModal = (enrollment: StudentEnrollment, isRenewal: boolean) => {
    setTenureModal({ enrollment, isRenewal })
  }

  const handlePayment = async (
    enrollment: StudentEnrollment,
    isRenewal: boolean,
    tenure: { months: number; id: string }
  ) => {
    setTenureModal(null)
    const token = requireStudentSession(router, pathname || "/student-dashboard/payments")
    const user = TokenManager.getUser()
    if (!token || !user) {
      return
    }
    setPaymentProcessingId(enrollment.id)
    setError(null)
    try {
      const userData = user

      const prepUrl = isRenewal
        ? getBackendApiUrl("payments/prepare-student-renewal-checkout")
        : getBackendApiUrl("payments/prepare-student-checkout")
      const prepBody = isRenewal
        ? {
            enrollment_id: enrollment.id,
            duration: tenure.id,
          }
        : {
            course_id: enrollment.course_id,
            branch_id: enrollment.branch_id,
            duration: tenure.id,
          }

      const prepRes = await fetch(prepUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(prepBody),
      })
      const prepJson = await prepRes.json().catch(() => ({}))
      if (!prepRes.ok) {
        const msg =
          typeof prepJson?.detail === "string"
            ? prepJson.detail
            : prepJson?.detail?.[0]?.msg || prepJson?.message || "Could not start checkout"
        if (prepRes.status === 401 || isSessionExpiredError(msg)) {
          TokenManager.clearAuthData()
          throw new Error(SESSION_EXPIRED_PAYMENT_MESSAGE)
        }
        throw new Error(msg)
      }

      const pendingEnrollmentId = prepJson.enrollment_id as string
      if (!pendingEnrollmentId) {
        throw new Error("Invalid checkout response from server")
      }

      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enrollment_id: pendingEnrollmentId }),
      })
      const orderJson = await orderRes.json().catch(() => ({}))
      if (!orderRes.ok) {
        const msg =
          typeof orderJson?.error === "string"
            ? orderJson.error
            : typeof orderJson?.detail === "string"
              ? orderJson.detail
              : "Payment failed, please try again"
        if (orderRes.status === 401 || isSessionExpiredError(msg)) {
          TokenManager.clearAuthData()
          throw new Error(SESSION_EXPIRED_PAYMENT_MESSAGE)
        }
        throw new Error(msg)
      }
      const order = orderJson.order as { id?: string; amount?: number; currency?: string }
      const razorpayKey =
        typeof orderJson.key === "string" && orderJson.key.trim() ? orderJson.key.trim() : undefined
      if (!order?.id || typeof order.amount !== "number" || order.amount < 100) {
        console.error("[payments] create-order invalid payload", orderJson)
        throw new Error("Payment failed, please try again")
      }

      const enrollmentData = {
        enrollment_id: pendingEnrollmentId,
        course_id: enrollment.course_id,
        branch_id: enrollment.branch_id,
        course_name: (prepJson.course_name as string) || enrollment.course_name,
        branch_name: (prepJson.branch_name as string) || enrollment.branch_name,
        duration_months: tenure.months,
        student_name: userData.full_name || userData.name || "",
        student_email: userData.email || "",
        student_phone: userData.phone || "",
      }

      await openRazorpayCheckout({
        razorpayKeyId: razorpayKey,
        amountPaise: order.amount,
        orderId: order.id,
        currency: order.currency || "INR",
        name: "Rock Martial Arts",
        description: isRenewal
          ? `Renew: ${enrollment.course_name} (${tenure.months} month${tenure.months > 1 ? "s" : ""})`
          : `Payment: ${enrollment.course_name} (${tenure.months} month${tenure.months > 1 ? "s" : ""})`,
        customerName: enrollmentData.student_name,
        customerEmail: enrollmentData.student_email,
        customerContact: enrollmentData.student_phone,
        onPaymentFailure: (msg) => {
          setError(msg || "Payment failed, please try again")
          setPaymentProcessingId(null)
        },
        onSuccess: async (response: RazorpayPaymentResponse) => {
          try {
            setError(null)
            const activeToken = TokenManager.isAuthenticated() ? TokenManager.getToken() : null
            if (!activeToken) {
              TokenManager.clearAuthData()
              throw new Error(SESSION_EXPIRED_PAYMENT_MESSAGE)
            }
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${activeToken}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                enrollmentData,
              }),
            })
            const data = await verifyRes.json().catch(() => ({}))
            if (!verifyRes.ok) {
              if (verifyRes.status === 401 || isSessionExpiredError(data?.detail || data?.error)) {
                TokenManager.clearAuthData()
                throw new Error(SESSION_EXPIRED_PAYMENT_MESSAGE)
              }
              throw new Error(data?.error ?? data?.detail ?? "Verification failed")
            }
            const paymentId =
              (typeof data?.payment_id === "string" && data.payment_id) ||
              response.razorpay_payment_id ||
              ""
            const amountInr =
              typeof order.amount === "number" ? order.amount / 100 : Number(prepJson.amount) || 0
            const params = new URLSearchParams({
              payment_id: paymentId,
              order_id: response.razorpay_order_id || order.id || "",
              amount: String(amountInr),
              course_name: enrollmentData.course_name || "",
              branch_name: enrollmentData.branch_name || "",
            })
            if (isRenewal || data?.is_renewal) {
              params.set("renewal", "1")
              if (data?.new_end_date) {
                params.set("new_end_date", String(data.new_end_date))
              }
            }
            router.replace(`/student-dashboard/payment-success?${params.toString()}`)
          } catch (e) {
            const message = getSessionErrorMessage(e, true)
            if (message === SESSION_EXPIRED_PAYMENT_MESSAGE) {
              TokenManager.clearAuthData()
              router.push(`/login?session=expired&returnUrl=${encodeURIComponent(pathname || "/student-dashboard/payments")}`)
            } else {
              setError(message)
            }
          } finally {
            setPaymentProcessingId(null)
          }
        },
        onDismiss: () => setPaymentProcessingId(null),
      })
    } catch (e) {
      const msg = getSessionErrorMessage(e, true)
      if (msg === SESSION_EXPIRED_PAYMENT_MESSAGE) {
        TokenManager.clearAuthData()
        router.push(`/login?session=expired&returnUrl=${encodeURIComponent(pathname || "/student-dashboard/payments")}`)
      } else if (msg.includes("Razorpay Key ID not configured")) {
        setError(
          "Razorpay is not configured. Add NEXT_PUBLIC_RAZORPAY_KEY_ID to .env.local and restart the dev server (npm run dev)."
        )
      } else {
        setError(msg)
      }
      setPaymentProcessingId(null)
    }
  }

  // Resolve course name for a payment (API may set top-level course_name; else course_details or enrollment)
  const getCourseName = (p: PaymentRecord) => {
    if (p.course_name) return p.course_name
    if (p.course_details?.course_name) return p.course_details.course_name
    if (p.enrollment_id && enrollments.length) {
      const en = enrollments.find(e => e.id === p.enrollment_id)
      if (en?.course_name) return en.course_name
    }
    return "—"
  }

  const getPaymentMethodDisplay = (p: PaymentRecord) => {
    if (p.gateway_payment_label) return p.gateway_payment_label
    const tx = p.transaction_id || ""
    if (tx.startsWith("pay_") && p.payment_method === "digital_wallet") {
      return "Razorpay"
    }
    const raw = (p.gateway_method || "").toLowerCase()
    if (raw === "upi") return "UPI"
    if (raw === "card") return "Card"
    if (raw === "netbanking") return "Net Banking"
    if (raw === "wallet") return "Wallet"
    if (raw === "emi") return "EMI"
    if (raw === "razorpay") return "Razorpay"
    return p.payment_method.replace(/_/g, " ")
  }

  const handleExport = () => {
    // Simple CSV export
    const headers = ["Transaction ID", "Date", "Type", "Course", "Amount", "Method", "Status"]
    const rows = paymentHistory.map(p => [
      p.transaction_id || p.id,
      formatDate(p.payment_date || p.created_at),
      studentPaymentAPI.formatPaymentType(p.payment_type),
      getCourseName(p),
      formatCurrency(p.amount),
      getPaymentMethodDisplay(p),
      p.payment_status
    ])
    
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `payment_history_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (loading) {
    return (
      <StudentDashboardLayout
        studentName={studentData?.name}
        onLogout={handleLogout}
        isLoading={true}
      >
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </StudentDashboardLayout>
    )
  }

  return (
    <StudentDashboardLayout
      studentName={studentData?.name}
      onLogout={handleLogout}
      isLoading={loading}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <CreditCard className="h-8 w-8" />
              Payment History
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your subscriptions and view transaction history
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/student-dashboard/invoices">
                <FileText className="h-4 w-4 mr-2" />
                Invoices
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/student-dashboard/billing">
                <Calendar className="h-4 w-4 mr-2" />
                Billing
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={paymentHistory.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Payment Statistics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalPaid)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                All time payments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(totalPending)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Due payments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {enrollments.filter(e => isEnrollmentActivePaid({
                  isActive: e.is_active,
                  paymentStatus: e.payment_status,
                  endDate: e.end_date
                })).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Enrolled courses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {paymentHistory.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total records
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Course Subscriptions */}
        {enrollments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Course Subscriptions
              </CardTitle>
              <CardDescription>
                Manage your course enrollments and renewal dates. You can renew anytime before or after expiration.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {enrollments.map((enrollment) => {
                  const enrollmentStatus = String(enrollment.status || "").toLowerCase()
                  const paymentStatus = String(enrollment.payment_status || "").toLowerCase()
                  const isCancelled =
                    enrollmentStatus === "cancelled" ||
                    enrollmentStatus === "canceled" ||
                    paymentStatus === "cancelled" ||
                    paymentStatus === "canceled"
                  const effectivePaymentStatus = isCancelled ? "cancelled" : paymentStatus
                  const calDays = calendarDaysUntilSubscriptionEnd(enrollment.end_date)
                  const daysUntil =
                    calDays !== null ? calDays : getDaysUntilDue(enrollment.end_date)
                  const uiStatus = getEnrollmentUiStatus({
                    isActive: enrollment.is_active,
                    paymentStatus: effectivePaymentStatus,
                    endDate: enrollment.end_date
                  })
                  const isExpired = uiStatus === "expired"
                  const isGrace = uiStatus === "grace"
                  const isExpiringSoon = uiStatus === "expiring_soon"
                  const isActivePaid = isEnrollmentActivePaid({
                    isActive: enrollment.is_active,
                    paymentStatus: effectivePaymentStatus,
                    endDate: enrollment.end_date
                  })
                  const showActiveHealthy = uiStatus === "active"
                  const overdueDays = overdueDaysAfterExpiry(enrollment.end_date)
                  const graceLeft = graceDaysRemaining(enrollment.end_date)

                  return (
                    <div
                      key={enrollment.id}
                      className={`p-4 rounded-lg border ${
                        isCancelled ? 'border-gray-200 bg-gray-50' :
                        isExpired ? 'border-red-200 bg-red-50' :
                        isGrace ? 'border-orange-200 bg-orange-50' :
                        isExpiringSoon ? 'border-yellow-200 bg-yellow-50' : 
                        showActiveHealthy ? 'border-green-200 bg-green-50' :
                        'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{enrollment.course_name}</h3>
                            {isCancelled ? (
                              <Badge className="bg-gray-100 text-gray-800 border-gray-300">
                                Cancelled
                              </Badge>
                            ) : uiStatus === "expired" ? (
                              <Badge className="bg-red-100 text-red-800 border-red-200">
                                Expired
                              </Badge>
                            ) : uiStatus === "grace" ? (
                              <Badge className="bg-orange-100 text-orange-900 border-orange-300">
                                Grace Period
                              </Badge>
                            ) : uiStatus === "expiring_soon" ? (
                              <Badge className="bg-amber-100 text-amber-900 border-amber-300">
                                Expiring Soon
                              </Badge>
                            ) : uiStatus === "active" ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200">
                                Active
                              </Badge>
                            ) : uiStatus === "pending" ? (
                              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                Pending
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-800 border-gray-200">
                                Inactive
                              </Badge>
                            )}
                            {isActivePaid && (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Paid
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>Started: {formatDate(enrollment.start_date)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span className={isExpired ? 'text-red-600 font-medium' : isExpiringSoon ? 'text-yellow-600 font-medium' : ''}>
                                {isExpired ? 'Expired' : 'Expires'}: {formatDate(enrollment.end_date)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>
                                Next due:{" "}
                                {formatDate(
                                  (enrollment as { next_due_date?: string }).next_due_date ||
                                    enrollment.end_date
                                )}
                              </span>
                            </div>
                          </div>
                          <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
                            <IndianRupee className="h-4 w-4" />
                            <span>Payment: {getStatusBadge(effectivePaymentStatus)}</span>
                          </div>

                          {/* Status Messages */}
                          {isCancelled && (
                            <div className="mt-3 p-2 rounded text-sm bg-gray-100 text-gray-700">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                <span>This enrollment payment was cancelled by admin.</span>
                              </div>
                            </div>
                          )}

                          {isGrace && (
                            <div className="mt-3 p-2 rounded text-sm bg-orange-100 text-orange-900">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>
                                  Subscription expired — you are in a {ENROLLMENT_GRACE_DAYS}-day grace window
                                  {graceLeft != null ? ` (${graceLeft} day${graceLeft === 1 ? "" : "s"} left)` : ""}.
                                  Renew now to continue without interruption.
                                </span>
                              </div>
                            </div>
                          )}

                          {isExpired && (
                            <div className="mt-3 p-2 rounded text-sm bg-red-100 text-red-800">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                <span>
                                  Grace window ended. Overdue by {overdueDays} day{overdueDays === 1 ? "" : "s"}.
                                  Renew now to restore access.
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {isExpiringSoon && (
                            <div className="mt-3 p-2 rounded text-sm bg-yellow-100 text-yellow-800">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>Subscription expires in {daysUntil} days. Renew early to avoid interruption.</span>
                              </div>
                            </div>
                          )}

                          {showActiveHealthy && (
                            <div className="mt-3 p-2 rounded text-sm bg-green-100 text-green-800">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                <span>Your subscription is active. You can renew anytime to extend for upcoming months.</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2 w-full sm:w-auto">
                          {isCancelled ? (
                            <Button
                              variant="outline"
                              className="w-full sm:w-auto border-gray-300 text-gray-600"
                              disabled
                            >
                              Cancelled
                            </Button>
                          ) : isExpired || isGrace ? (
                            <Button 
                              className={`w-full sm:w-auto ${isGrace ? "bg-orange-600 hover:bg-orange-700" : "bg-red-600 hover:bg-red-700"}`}
                              onClick={() => openTenureModal(enrollment, true)}
                              disabled={paymentProcessingId === enrollment.id}
                            >
                              {paymentProcessingId === enrollment.id ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <AlertCircle className="h-4 w-4 mr-2" />
                              )}
                              {paymentProcessingId === enrollment.id ? "Processing…" : "Renew Now"}
                            </Button>
                          ) : effectivePaymentStatus !== 'paid' ? (
                            <Button 
                              className="bg-yellow-600 hover:bg-yellow-700 w-full sm:w-auto"
                              onClick={() => {
                                if (enrollment.duration_id) {
                                  void handlePayment(enrollment, false, {
                                    months: enrollment.duration_months ?? 1,
                                    id: enrollment.duration_id,
                                  })
                                } else {
                                  openTenureModal(enrollment, false)
                                }
                              }}
                              disabled={paymentProcessingId === enrollment.id}
                            >
                              {paymentProcessingId === enrollment.id ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <CreditCard className="h-4 w-4 mr-2" />
                              )}
                              {paymentProcessingId === enrollment.id ? "Processing…" : "Pay Now"}
                            </Button>
                          ) : (
                            <>
                              <Button 
                                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                                onClick={() => openTenureModal(enrollment, true)}
                                disabled={paymentProcessingId === enrollment.id}
                              >
                                {paymentProcessingId === enrollment.id ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <ArrowRight className="h-4 w-4 mr-2" />
                                )}
                                {paymentProcessingId === enrollment.id ? "Processing…" : "Renew for Next Period"}
                              </Button>
                              {isExpiringSoon && (
                                <p className="text-xs text-center text-muted-foreground">
                                  Renew before {formatDate(enrollment.end_date)}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tenure selection modal */}
        <Dialog open={!!tenureModal} onOpenChange={(open) => !open && setTenureModal(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{tenureModal?.isRenewal ? "Renew subscription" : "Select tenure"}</DialogTitle>
              <DialogDescription>
                {tenureModal?.isRenewal
                  ? "Choose a tenure. Amounts come from the renewal quote (course fee; admission only if still applicable). Arrear is shown when configured."
                  : "Choose a tenure. Prices match checkout. Your current plan is highlighted when completing a pending first payment."}
              </DialogDescription>
            </DialogHeader>
            {tenurePricesLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading prices…</span>
              </div>
            ) : (
              <div className="space-y-3 py-2">
                {(() => {
                  const available = tenureOptions.filter(
                    (option) => typeof tenurePrices[option.id] === "number" && tenurePrices[option.id]! > 0
                  )
                  if (available.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No tenure configured for this course. Please contact support.
                      </p>
                    )
                  }
                  const enr = tenureModal?.enrollment
                  const selectedId = enr?.payment_status === "pending" ? enr.duration_id : undefined
                  const sorted = [...available].sort((a, b) => {
                    const ma = selectedId && durationKeyMatchesEnrollment(a, selectedId) ? 1 : 0
                    const mb = selectedId && durationKeyMatchesEnrollment(b, selectedId) ? 1 : 0
                    return mb - ma
                  })
                  const sampleQuote =
                    tenureModal?.isRenewal
                      ? sorted.map((o) => tenureQuotes[o.id]).find((q) => q != null) || null
                      : null
                  return (
                    <>
                      {sampleQuote && (
                        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 space-y-1">
                          {sampleQuote.message ? <p>{sampleQuote.message}</p> : null}
                          {sampleQuote.billing_state === "grace" && sampleQuote.grace_days_remaining != null ? (
                            <p>
                              Grace days remaining: {sampleQuote.grace_days_remaining}
                            </p>
                          ) : null}
                          {sampleQuote.overdue_days > 0 ? (
                            <p>Overdue days: {sampleQuote.overdue_days}</p>
                          ) : null}
                          {sampleQuote.arrear_note ? (
                            <p className="text-slate-500">{sampleQuote.arrear_note}</p>
                          ) : null}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        {sorted.map((option) => {
                          const price = tenurePrices[option.id]!
                          const quote = tenureQuotes[option.id]
                          const isSelectedPlan =
                            enr?.payment_status === "pending" &&
                            selectedId &&
                            durationKeyMatchesEnrollment(option, selectedId)
                          return (
                            <Button
                              key={option.id}
                              variant="outline"
                              className={`h-auto flex flex-col items-center justify-center py-4 gap-1 relative ${
                                isSelectedPlan ? "border-amber-500 ring-2 ring-amber-300 bg-amber-50" : ""
                              }`}
                              onClick={() =>
                                tenureModal &&
                                handlePayment(tenureModal.enrollment, tenureModal.isRenewal, {
                                  months: option.months,
                                  id: option.id,
                                })
                              }
                            >
                              {isSelectedPlan && (
                                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] px-1.5 py-0 bg-amber-600 hover:bg-amber-600">
                                  Your plan
                                </Badge>
                              )}
                              <span className="font-semibold">{option.label}</span>
                              <span className="text-sm font-medium text-green-700 flex items-center gap-1">
                                <IndianRupee className="h-3.5 w-3.5" />
                                {new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(price)}
                              </span>
                              {quote && (
                                <span className="text-[10px] text-muted-foreground text-center leading-tight px-1">
                                  Fee{" "}
                                  {new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
                                    quote.course_fee
                                  )}
                                  {quote.admission_fee > 0
                                    ? ` + adm ${new Intl.NumberFormat("en-IN", {
                                        maximumFractionDigits: 0,
                                      }).format(quote.admission_fee)}`
                                    : ""}
                                  {quote.arrear_amount > 0
                                    ? ` + arrear ${new Intl.NumberFormat("en-IN", {
                                        maximumFractionDigits: 0,
                                      }).format(quote.arrear_amount)}`
                                    : ""}
                                </span>
                              )}
                              {tenureModal?.isRenewal && (
                                <span className="text-[11px] font-medium text-slate-700 mt-0.5">
                                  Pay &amp; renew
                                </span>
                              )}
                            </Button>
                          )
                        })}
                      </div>
                    </>
                  )
                })()}
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setTenureModal(null)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              Your complete payment transaction history
            </CardDescription>
          </CardHeader>
          <CardContent>
            {paymentHistory.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No payment history found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-muted-foreground">
                      <th className="pb-3 font-medium">Transaction ID</th>
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Type</th>
                      <th className="pb-3 font-medium">Course</th>
                      <th className="pb-3 font-medium text-right">Amount</th>
                      <th className="pb-3 font-medium">Method</th>
                      <th className="pb-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((payment) => (
                      <tr key={payment.id} className="border-b last:border-b-0 hover:bg-gray-50">
                        <td className="py-4 text-sm font-mono">
                          {payment.transaction_id || payment.id.substring(0, 16).toUpperCase()}
                        </td>
                        <td className="py-4 text-sm">
                          {formatDate(payment.payment_date || payment.created_at)}
                        </td>
                        <td className="py-4 text-sm">
                          {studentPaymentAPI.formatPaymentType(payment.payment_type)}
                        </td>
                        <td className="py-4 text-sm">
                          {getCourseName(payment)}
                        </td>
                        <td className="py-4 text-sm text-right font-semibold">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="py-4 text-sm">
                          <div className="flex items-center gap-2 min-w-[8rem]">
                            {getPaymentMethodIcon(payment.payment_method)}
                            <span className="text-left leading-snug">
                              {getPaymentMethodDisplay(payment)}
                            </span>
                          </div>
                        </td>
                        <td className="py-4">
                          {getStatusBadge(payment.payment_status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StudentDashboardLayout>
  )
}
