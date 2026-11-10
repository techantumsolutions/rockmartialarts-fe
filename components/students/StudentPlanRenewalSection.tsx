"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getBackendApiUrl } from "@/lib/config"
import { formatPlanCalendarDate } from "@/lib/formatRegisteredDate"
import {
  openRazorpayCheckout,
  type RazorpayPaymentResponse,
} from "@/lib/razorpay"
import { BookOpen, Calendar, Clock, CreditCard, RefreshCw } from "lucide-react"

export type RenewalEnrollment = {
  id: string
  course_name: string
  course_id?: string
  branch_id?: string
  branch_name?: string
  duration_id?: string
  batch_ref?: string
  start_date?: string
  end_date?: string
  next_due_date?: string
  enrollment_date?: string
  status: string
  payment_status?: string
  is_active?: boolean
  fee_amount?: number
}

type TenureOption = {
  id: string
  code?: string
  label: string
  months: number
}

type QuotePayload = {
  enrollment_id: string
  course_name?: string
  branch_name?: string
  student_name?: string
  current_duration_id?: string
  current_plan_label?: string
  duration?: string
  duration_label?: string
  prior_end_date?: string
  plan_status?: string
  pricing?: {
    course_fee?: number
    admission_fee?: number
    renewal_fee?: number
    arrear_amount?: number
    total_amount?: number
    currency?: string
  }
  validity_preview?: {
    mode?: string
    start_date?: string
    end_date?: string
    next_renewal_due?: string
    billing_state?: string
  }
  billing?: {
    billing_state?: string
    days_until_expiry?: number
    is_expired?: boolean
    next_due_date?: string
  }
}

type HistoryItem = {
  id?: string
  renewal_date?: string
  created_at?: string
  prior_end_date?: string
  resulting_end_date?: string
  new_start_date?: string
  total_amount?: number
  duration_id?: string
  duration_months?: number
  previous_duration_id?: string
  renewed_duration_id?: string
  payment_status?: string
  payment_id?: string
  course_name?: string
  branch_name?: string
  renewed_by?: { name?: string; role?: string }
  renewed_by_admin_name?: string
}

function formatInr(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(Number(amount))) return "—"
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount))
}

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—"
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "—"
    return formatPlanCalendarDate(value.toISOString())
  }
  return formatPlanCalendarDate(value)
}

function durationMatches(opt: TenureOption, durationId?: string): boolean {
  if (!durationId) return false
  const key = String(durationId).trim().toLowerCase()
  return (
    String(opt.id).trim().toLowerCase() === key ||
    (opt.code != null && String(opt.code).trim().toLowerCase() === key)
  )
}

function planStatusFromEnrollment(enr: RenewalEnrollment): {
  label: string
  className: string
} {
  const end = enr.end_date ? new Date(enr.end_date) : null
  const now = Date.now()
  if (end && !Number.isNaN(end.getTime())) {
    const msLeft = end.getTime() - now
    const daysLeft = msLeft / (24 * 60 * 60 * 1000)
    if (msLeft < 0) {
      return { label: "Expired", className: "bg-red-100 text-red-800" }
    }
    if (daysLeft <= 7) {
      return { label: "Expiring Soon", className: "bg-yellow-100 text-yellow-800" }
    }
    return { label: "Active", className: "bg-blue-100 text-blue-800" }
  }
  const s = (enr.status || "").toLowerCase()
  if (s === "expired") return { label: "Expired", className: "bg-red-100 text-red-800" }
  if (s === "active") return { label: "Active", className: "bg-blue-100 text-blue-800" }
  return { label: enr.status || "Unknown", className: "bg-slate-100 text-slate-700" }
}

function isRenewableEnrollment(enr: RenewalEnrollment): boolean {
  const pay = String(enr.payment_status || "").toLowerCase()
  if (pay === "pending" || pay === "processing" || pay === "failed") return false
  if (!enr.course_id || !enr.branch_id) return false
  const st = String(enr.status || "").toLowerCase()
  if (st === "cancelled") return false
  // Paid enrollments only (active, expired, or still within paid history)
  return pay === "paid" || pay === "completed" || pay === ""
}

/** Start of local calendar day for date-only comparison. */
function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/**
 * Renew Now is shown only when Renewal Due Date is:
 * - already past (crossed), or
 * - due within the next 7 calendar days (inclusive) from today.
 */
function isRenewalButtonEligible(enr: RenewalEnrollment, now: Date = new Date()): boolean {
  const raw = enr.next_due_date || enr.end_date
  if (!raw) return false
  const due = new Date(raw)
  if (Number.isNaN(due.getTime())) return false
  const dueDay = startOfLocalDay(due)
  const today = startOfLocalDay(now)
  const msPerDay = 24 * 60 * 60 * 1000
  const daysUntilDue = Math.round((dueDay.getTime() - today.getTime()) / msPerDay)
  // Crossed due date (negative or 0) OR due within 1 week (1..7)
  return daysUntilDue <= 7
}

/** One renew target per course+branch: prefer active, else latest end_date. */
function pickRenewableEnrollments(list: RenewalEnrollment[]): RenewalEnrollment[] {
  const eligible = list.filter(isRenewableEnrollment)
  const byKey = new Map<string, RenewalEnrollment>()
  for (const enr of eligible) {
    const key = `${enr.course_id || ""}::${enr.branch_id || ""}`
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, enr)
      continue
    }
    const enrActive = enr.is_active !== false && String(enr.status).toLowerCase() === "active"
    const exActive =
      existing.is_active !== false && String(existing.status).toLowerCase() === "active"
    if (enrActive && !exActive) {
      byKey.set(key, enr)
      continue
    }
    if (exActive && !enrActive) continue
    const enrEnd = enr.end_date ? new Date(enr.end_date).getTime() : 0
    const exEnd = existing.end_date ? new Date(existing.end_date).getTime() : 0
    if (enrEnd >= exEnd) byKey.set(key, enr)
  }
  return Array.from(byKey.values())
}

type Props = {
  studentName: string
  enrollments: RenewalEnrollment[]
  loading?: boolean
  authToken: string | null
  onRenewed?: () => void
}

export function StudentPlanRenewalSection({
  studentName,
  enrollments,
  loading,
  authToken,
  onRenewed,
}: Props) {
  const renewable = useMemo(
    () => pickRenewableEnrollments(enrollments),
    [enrollments]
  )

  const [selectedId, setSelectedId] = useState<string>("")
  const selected = useMemo(
    () => renewable.find((e) => e.id === selectedId) || renewable[0] || null,
    [renewable, selectedId]
  )

  useEffect(() => {
    if (!selectedId && renewable.length === 1) {
      setSelectedId(renewable[0].id)
    } else if (selectedId && !renewable.some((e) => e.id === selectedId)) {
      setSelectedId(renewable[0]?.id || "")
    }
  }, [renewable, selectedId])

  const [modalOpen, setModalOpen] = useState(false)
  const [tenureOptions, setTenureOptions] = useState<TenureOption[]>([])
  const [selectedTenure, setSelectedTenure] = useState<string>("")
  const [tenureLoading, setTenureLoading] = useState(false)
  const [quote, setQuote] = useState<QuotePayload | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "physical_cash">(
    "razorpay"
  )
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [history, setHistory] = useState<HistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const authHeaders = useCallback(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" }
    if (authToken) h.Authorization = `Bearer ${authToken}`
    return h
  }, [authToken])

  const loadHistory = useCallback(
    async (enrollmentId: string) => {
      if (!authToken || !enrollmentId) {
        setHistory([])
        return
      }
      setHistoryLoading(true)
      try {
        const res = await fetch(
          getBackendApiUrl(
            `payments/admin/renewal-history?enrollment_id=${encodeURIComponent(enrollmentId)}`
          ),
          { headers: authHeaders(), cache: "no-store" }
        )
        const data = await res.json().catch(() => ({}))
        if (res.ok) {
          setHistory(Array.isArray(data.history) ? data.history : [])
        } else {
          setHistory([])
        }
      } catch {
        setHistory([])
      } finally {
        setHistoryLoading(false)
      }
    },
    [authToken, authHeaders]
  )

  useEffect(() => {
    if (selected?.id) {
      void loadHistory(selected.id)
    } else {
      setHistory([])
    }
  }, [selected?.id, loadHistory])

  const loadTenures = useCallback(
    async (enr: RenewalEnrollment) => {
      if (!enr.course_id || !enr.branch_id) return
      setTenureLoading(true)
      try {
        const res = await fetch(
          getBackendApiUrl(
            `durations/public/by-course/${enr.course_id}?active_only=true&include_pricing=true&branch_id=${enr.branch_id}`
          )
        )
        const data = await res.json().catch(() => ({}))
        const durations: any[] = Array.isArray(data.durations) ? data.durations : []
        const options: TenureOption[] = durations
          .map((d) => ({
            id: String(d.id),
            code:
              d.code != null && String(d.code) !== String(d.id)
                ? String(d.code)
                : undefined,
            label: String(d.name || d.code || ""),
            months:
              typeof d.duration_months === "number"
                ? d.duration_months
                : parseInt(String(d.duration_months), 10) || 0,
          }))
          .filter((opt) => opt.id && opt.label && opt.months > 0)
        setTenureOptions(options)
        const match = options.find((o) => durationMatches(o, enr.duration_id))
        setSelectedTenure(match?.id || options[0]?.id || "")
      } catch {
        setTenureOptions([])
        setSelectedTenure("")
      } finally {
        setTenureLoading(false)
      }
    },
    []
  )

  const fetchQuote = useCallback(
    async (enrollmentId: string, duration: string, batchRef?: string) => {
      if (!authToken || !enrollmentId || !duration) return
      setQuoteLoading(true)
      setQuoteError(null)
      try {
        const res = await fetch(getBackendApiUrl("payments/admin/renewal-quote"), {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            enrollment_id: enrollmentId,
            duration,
            batch_ref: batchRef || undefined,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(
            typeof data.detail === "string"
              ? data.detail
              : data.message || "Failed to load renewal quote"
          )
        }
        setQuote(data as QuotePayload)
      } catch (err: any) {
        setQuote(null)
        setQuoteError(err?.message || "Failed to load renewal quote")
      } finally {
        setQuoteLoading(false)
      }
    },
    [authToken, authHeaders]
  )

  useEffect(() => {
    if (!modalOpen || !selected || !selectedTenure) return
    void fetchQuote(selected.id, selectedTenure, selected.batch_ref)
  }, [modalOpen, selected, selectedTenure, fetchQuote])

  const openRenewModal = async () => {
    if (!selected) return
    setSuccessMsg(null)
    setConfirmError(null)
    setQuote(null)
    setQuoteError(null)
    setModalOpen(true)
    await loadTenures(selected)
  }

  const cancelPendingRenewal = useCallback(
    async (pendingEnrollmentId: string) => {
      if (!authToken || !pendingEnrollmentId) return
      try {
        await fetch(getBackendApiUrl("payments/admin/renew-plan/cancel"), {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ enrollment_id: pendingEnrollmentId }),
        })
      } catch {
        // Best-effort cleanup after dismiss/fail
      }
    },
    [authToken, authHeaders]
  )

  const handleConfirm = async () => {
    if (!selected || !selectedTenure || confirming) return
    setConfirming(true)
    setConfirmError(null)
    let pendingEnrollmentId = ""
    try {
      const res = await fetch(getBackendApiUrl("payments/admin/renew-plan"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          enrollment_id: selected.id,
          duration: selectedTenure,
          batch_ref: selected.batch_ref || undefined,
          payment_method: paymentMethod,
          notes:
            paymentMethod === "physical_cash"
              ? "Admin counter-cash plan renewal from Student Details"
              : "Admin plan renewal from Student Details",
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : data.message || "Could not start renewal payment"
        )
      }

      pendingEnrollmentId = String(data.enrollment_id || "")

      // Counter cash: already activated server-side.
      if (data.requires_payment === false || paymentMethod === "physical_cash") {
        const newEnd = data.new_end_date || data.end_date
        setSuccessMsg(
          `Counter cash recorded. Plan renewed. New expiry: ${formatDate(newEnd)}. Amount: ${formatInr(
            typeof data.amount === "number" ? data.amount : quote?.pricing?.total_amount
          )}`
        )
        setModalOpen(false)
        if (pendingEnrollmentId) {
          setSelectedId(pendingEnrollmentId)
          void loadHistory(pendingEnrollmentId)
        } else if (selected.id) {
          void loadHistory(selected.id)
        }
        onRenewed?.()
        setConfirming(false)
        return
      }

      const order = data.order as
        | { id?: string; amount?: number; currency?: string }
        | undefined
      const razorpayKey =
        typeof data.key === "string" && data.key.trim() ? data.key.trim() : undefined

      if (!pendingEnrollmentId || !order?.id || typeof order.amount !== "number") {
        throw new Error("Payment gateway order was not created. Please try again.")
      }

      const sourceEnrollmentId = selected.id
      const amountInr =
        typeof data.amount === "number" ? data.amount : order.amount / 100

      // Close our Dialog first — Radix overlay/focus-trap blocks Razorpay clicks.
      setModalOpen(false)
      await new Promise((resolve) => setTimeout(resolve, 80))

      await openRazorpayCheckout({
        razorpayKeyId: razorpayKey,
        amountPaise: order.amount,
        orderId: order.id,
        currency: order.currency || "INR",
        name: "Rock Martial Arts",
        description: `Renew: ${data.course_name || selected.course_name || "Plan"}`,
        customerName: data.student_name || studentName || "",
        customerEmail: data.student_email || "",
        customerContact: data.student_phone || "",
        onDismiss: () => {
          void cancelPendingRenewal(pendingEnrollmentId)
          setConfirming(false)
          setConfirmError("Payment cancelled. Renewal was not completed.")
          setModalOpen(true)
        },
        onPaymentFailure: (msg) => {
          void cancelPendingRenewal(pendingEnrollmentId)
          setConfirming(false)
          setConfirmError(msg || "Payment failed. Renewal was not completed.")
          setModalOpen(true)
        },
        onSuccess: async (response: RazorpayPaymentResponse) => {
          try {
            const verifyRes = await fetch(
              getBackendApiUrl("payments/admin/renew-plan/confirm-razorpay"),
              {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({
                  enrollment_id: pendingEnrollmentId,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id || order.id,
                  razorpay_signature: response.razorpay_signature,
                }),
              }
            )
            const verifyData = await verifyRes.json().catch(() => ({}))
            if (!verifyRes.ok) {
              throw new Error(
                typeof verifyData.detail === "string"
                  ? verifyData.detail
                  : verifyData.message || "Payment verification failed"
              )
            }
            const newEnd =
              verifyData.new_end_date || data.end_date || data.provisional_end_date
            setSuccessMsg(
              `Payment successful. Plan renewed. New expiry: ${formatDate(newEnd)}. Amount: ${formatInr(amountInr)}`
            )
            setModalOpen(false)
            setConfirmError(null)
            if (pendingEnrollmentId) {
              setSelectedId(pendingEnrollmentId)
              void loadHistory(pendingEnrollmentId)
            } else if (sourceEnrollmentId) {
              void loadHistory(sourceEnrollmentId)
            }
            onRenewed?.()
          } catch (err: any) {
            setConfirmError(err?.message || "Payment verification failed")
            setModalOpen(true)
          } finally {
            setConfirming(false)
          }
        },
      })
      // Keep confirming=true while Razorpay modal is open; handlers clear it.
    } catch (err: any) {
      if (pendingEnrollmentId) {
        void cancelPendingRenewal(pendingEnrollmentId)
      }
      setConfirmError(err?.message || "Renewal payment failed")
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-bold text-[#4D5077]">Current Plan & Renewal</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[#7F8592]">Loading plan details…</p>
        </CardContent>
      </Card>
    )
  }

  if (renewable.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-bold text-[#4D5077]">
            <RefreshCw className="h-5 w-5" />
            Current Plan & Renewal
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-[#7F8592]">
          No paid course enrollment is available to renew for this student yet.
        </CardContent>
      </Card>
    )
  }

  const status = selected ? planStatusFromEnrollment(selected) : null
  const canShowRenewButton = selected ? isRenewalButtonEligible(selected) : false
  const planLabel =
    quote?.current_plan_label ||
    tenureOptions.find((t) => durationMatches(t, selected?.duration_id))?.label ||
    selected?.duration_id ||
    "—"

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between font-bold text-[#4D5077]">
            <span className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Current Plan & Renewal
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-[#7F8592]">
          {successMsg ? (
            <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              {successMsg}
            </div>
          ) : null}

          {renewable.length > 1 ? (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-[#4D5077]">Enrollment</Label>
              <Select value={selected?.id || ""} onValueChange={setSelectedId}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Select enrollment to renew" />
                </SelectTrigger>
                <SelectContent>
                  {renewable.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.course_name}
                      {e.end_date ? ` · exp ${formatDate(e.end_date)}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {selected ? (
            <>
              <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Current Plan</p>
                  <p className="mt-0.5 font-medium text-[#4D5077]">{planLabel}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Plan Status</p>
                  <div className="mt-0.5">
                    {status ? (
                      <Badge variant="secondary" className={`text-xs ${status.className}`}>
                        {status.label}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Plan Start Date</p>
                  <p className="mt-0.5 font-medium text-[#4D5077]">
                    {formatDate(selected.start_date || selected.enrollment_date)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Plan Expiry Date</p>
                  <p className="mt-0.5 font-medium text-[#4D5077]">
                    {formatDate(selected.end_date)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Renewal Due Date</p>
                  <p className="mt-0.5 font-medium text-amber-700">
                    {formatDate(selected.next_due_date || selected.end_date)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Current Course</p>
                  <p className="mt-0.5 flex items-center gap-1 font-medium text-[#4D5077]">
                    <BookOpen className="h-3.5 w-3.5" />
                    {selected.course_name}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Branch</p>
                  <p className="mt-0.5 font-medium text-[#4D5077]">
                    {selected.branch_name || quote?.branch_name || "—"}
                  </p>
                </div>
              </div>

              {canShowRenewButton ? (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    type="button"
                    onClick={() => void openRenewModal()}
                    className="bg-[#4D5077] hover:bg-[#3d4060]"
                    disabled={!authToken}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Renew Now
                  </Button>
                </div>
              ) : (
                <p className="pt-1 text-xs text-slate-500">
                  Renew Now is available when the renewal due date is within 1 week or has already
                  passed.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm">Select an enrollment to renew.</p>
          )}

          {/* Renewal history */}
          <div className="border-t pt-3">
            <p className="mb-2 text-sm font-semibold text-[#4D5077]">Renewal History</p>
            {historyLoading ? (
              <p className="text-xs text-slate-500">Loading history…</p>
            ) : history.length === 0 ? (
              <p className="text-xs text-slate-500">No renewals recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {history.slice(0, 8).map((h, idx) => (
                  <div
                    key={h.id || idx}
                    className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-[#4D5077]">
                        {formatDate(h.renewal_date || h.created_at)}
                      </span>
                      <span className="font-semibold text-blue-700">
                        {formatInr(h.total_amount)}
                      </span>
                    </div>
                    <div className="mt-1 grid grid-cols-1 gap-1 text-slate-600 sm:grid-cols-2">
                      <span>Previous expiry: {formatDate(h.prior_end_date)}</span>
                      <span>
                        New validity: {formatDate(h.new_start_date)} –{" "}
                        {formatDate(h.resulting_end_date)}
                      </span>
                      {(h.renewed_by?.name || h.renewed_by_admin_name) && (
                        <span>
                          By: {h.renewed_by?.name || h.renewed_by_admin_name}
                          {h.renewed_by?.role ? ` (${h.renewed_by.role})` : ""}
                        </span>
                      )}
                      {h.payment_status ? (
                        <span>Payment: {h.payment_status}</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={(o) => !confirming && setModalOpen(o)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Renew Student Plan</DialogTitle>
            <DialogDescription>
              Course and branch stay the same. Choose a renewal tenure, then complete payment on
              Razorpay to activate the renewed plan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="rounded-md border bg-slate-50 p-3 text-sm space-y-1.5">
              <p>
                <span className="text-slate-500">Student:</span>{" "}
                <span className="font-medium text-[#4D5077]">
                  {quote?.student_name || studentName}
                </span>
              </p>
              <p>
                <span className="text-slate-500">Course:</span>{" "}
                <span className="font-medium">{selected?.course_name}</span>
              </p>
              <p>
                <span className="text-slate-500">Branch:</span>{" "}
                <span className="font-medium">
                  {selected?.branch_name || quote?.branch_name || "—"}
                </span>
              </p>
              <p>
                <span className="text-slate-500">Current plan:</span>{" "}
                <span className="font-medium">{planLabel}</span>
              </p>
              <p className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-slate-500">Current expiry:</span>{" "}
                <span className="font-medium">{formatDate(selected?.end_date)}</span>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="renewal-tenure">Renewal Tenure</Label>
              <Select
                value={selectedTenure}
                onValueChange={setSelectedTenure}
                disabled={tenureLoading || tenureOptions.length === 0}
              >
                <SelectTrigger id="renewal-tenure">
                  <SelectValue
                    placeholder={tenureLoading ? "Loading tenures…" : "Select tenure"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {tenureOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tenureOptions.length === 0 && !tenureLoading ? (
                <p className="text-xs text-red-600">
                  No active tenure pricing found for this course and branch.
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="renewal-pay-method">Payment method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) =>
                  setPaymentMethod(v === "physical_cash" ? "physical_cash" : "razorpay")
                }
                disabled={confirming}
              >
                <SelectTrigger id="renewal-pay-method">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="razorpay">Online (Razorpay gateway)</SelectItem>
                  <SelectItem value="physical_cash">
                    Counter cash (admin collected)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                {paymentMethod === "razorpay"
                  ? "Opens Razorpay. Plan activates only after successful payment."
                  : "Records cash collected at the counter and activates the plan immediately."}
              </p>
            </div>

            <div className="rounded-md border p-3 text-sm space-y-2">
              <p className="font-semibold text-[#4D5077]">Fee summary</p>
              {quoteLoading ? (
                <p className="text-xs text-slate-500">Calculating fee…</p>
              ) : quoteError ? (
                <p className="text-xs text-red-600">{quoteError}</p>
              ) : quote ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-600">
                      <CreditCard className="h-3.5 w-3.5" />
                      Renewal fee
                    </span>
                    <span className="font-semibold text-blue-700">
                      {formatInr(
                        quote.pricing?.total_amount ?? quote.pricing?.renewal_fee
                      )}
                    </span>
                  </div>
                  {(quote.pricing?.arrear_amount || 0) > 0 ? (
                    <div className="flex justify-between text-xs text-amber-700">
                      <span>Includes arrear</span>
                      <span>{formatInr(quote.pricing?.arrear_amount)}</span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Renewal start
                    </span>
                    <span className="font-medium">
                      {formatDate(quote.validity_preview?.start_date)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>New expiry</span>
                    <span className="font-medium">
                      {formatDate(quote.validity_preview?.end_date)}
                    </span>
                  </div>
                  {quote.validity_preview?.mode === "stack_from_prior_end" ? (
                    <p className="text-xs text-green-700">
                      Active plan — unused validity is preserved (starts after current expiry).
                    </p>
                  ) : (
                    <p className="text-xs text-amber-700">
                      Expired / overdue — new validity starts from renewal activation.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-500">Select a tenure to see fees.</p>
              )}
            </div>

            {confirmError ? (
              <p className="text-sm text-red-600">{confirmError}</p>
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={confirming}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={
                confirming ||
                quoteLoading ||
                !quote ||
                !selectedTenure ||
                !!quoteError ||
                (quote.pricing?.total_amount != null &&
                  Number(quote.pricing.total_amount) <= 0 &&
                  Number(quote.pricing.course_fee || 0) <= 0)
              }
              className="bg-[#4D5077] hover:bg-[#3d4060]"
            >
              {confirming
                ? paymentMethod === "physical_cash"
                  ? "Recording…"
                  : "Opening payment…"
                : paymentMethod === "physical_cash"
                  ? "Confirm Cash Renewal"
                  : "Pay & Renew"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
