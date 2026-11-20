"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  Loader2,
  Mail,
  MessageCircle,
  Send,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import { paymentAPI } from "@/lib/paymentAPI"
import { invoicesAPI, type InvoiceDetail } from "@/lib/invoicesAPI"
import { TokenManager } from "@/lib/tokenManager"
import { getBackendApiUrl } from "@/lib/config"
import { cn } from "@/lib/utils"
import { AdminStickyFormActions } from "@/components/dashboard/AdminStickyFormActions"

interface PaymentDetails {
  id: string
  student_id?: string
  student_name?: string
  student_email?: string
  student_phone?: string
  amount?: number
  payment_type?: string
  payment_method?: string
  gateway_payment_label?: string
  payment_status: string
  transaction_id?: string
  payment_date?: string
  course_name?: string
  course_id?: string
  branch_name?: string
  branch_id?: string
  created_at?: string
  enrollment_id?: string
  partner_org_id?: string
  partner_org_name?: string
  invoice_id?: string
  invoice_number?: string
}

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

function StatusPill({
  status,
  onDark,
}: {
  status: string
  onDark?: boolean
}) {
  const s = String(status || "").toLowerCase()
  const paid = s === "paid" || s === "completed"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        onDark
          ? paid
            ? "admin-status-pill-on-dark admin-status-pill-on-dark--paid"
            : "admin-status-pill-on-dark admin-status-pill-on-dark--pending"
          : paid
            ? "bg-emerald-50 text-emerald-700"
            : "bg-amber-50 text-amber-800"
      )}
    >
      {paid ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
      {paid ? "Paid" : status || "—"}
    </span>
  )
}

function DetailCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#E8ECF4] bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-[#F1F5F9] px-5 py-4">
        <span className="h-5 w-1 rounded-full bg-[#F5C518]" />
        <h3 className="text-base font-semibold text-[#171A26]">{title}</h3>
      </div>
      <div className="space-y-4 px-5 py-5">{children}</div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-[#6B7A99]">{label}</span>
      <span className="max-w-[65%] text-right text-sm font-medium text-[#171A26]">{value}</span>
    </div>
  )
}

export default function PaymentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const basePath = useDashboardBasePath()
  const { toast } = useToast()
  const paymentId = params.id as string

  const [payment, setPayment] = useState<PaymentDetails | null>(null)
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [sending, setSending] = useState<"email" | "whatsapp" | null>(null)

  const fetchPaymentDetails = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const token = TokenManager.getToken()
      if (!token) {
        setError("Authentication required. Please login again.")
        return
      }

      let data: PaymentDetails | null = null
      try {
        data = (await paymentAPI.getPaymentById(paymentId, token)) as PaymentDetails
      } catch {
        data = null
      }

      let inv: InvoiceDetail | null = null
      try {
        inv = await invoicesAPI.getByPayment(paymentId, token)
      } catch {
        inv = null
      }

      if (!data && !inv) {
        setError("Payment not found")
        setPayment(null)
        setInvoice(null)
        return
      }

      setInvoice(inv)
      const line = inv?.line_items?.[0]
      setPayment({
        id: data?.id || paymentId,
        student_id: data?.student_id,
        student_name: data?.student_name || inv?.customer?.name,
        student_email: data?.student_email || inv?.customer?.email,
        student_phone: data?.student_phone || inv?.customer?.phone,
        amount: data?.amount ?? inv?.total_amount,
        payment_type: data?.payment_type || inv?.source,
        payment_method:
          data?.gateway_payment_label ||
          data?.payment_method ||
          inv?.payment_gateway_label ||
          inv?.payment_method ||
          undefined,
        gateway_payment_label: data?.gateway_payment_label || inv?.payment_gateway_label || undefined,
        payment_status: data?.payment_status || inv?.status || "paid",
        transaction_id: data?.transaction_id || inv?.payment_reference || undefined,
        payment_date: data?.payment_date || inv?.paid_at || inv?.created_at || undefined,
        course_name: data?.course_name || line?.course_name,
        course_id: data?.course_id,
        branch_name: data?.branch_name || line?.branch_name,
        branch_id: data?.branch_id,
        created_at: data?.created_at || inv?.created_at || undefined,
        enrollment_id: data?.enrollment_id,
        partner_org_id: data?.partner_org_id,
        partner_org_name: data?.partner_org_name,
        invoice_id: data?.invoice_id || inv?.id,
        invoice_number: data?.invoice_number || inv?.invoice_number,
      })
    } catch (err: any) {
      setError(err?.message || "Failed to fetch payment details")
    } finally {
      setLoading(false)
    }
  }, [paymentId])

  useEffect(() => {
    void fetchPaymentDetails()
  }, [fetchPaymentDetails])

  const resolveInvoiceId = async (): Promise<string> => {
    if (invoice?.id) return invoice.id
    if (payment?.invoice_id) return payment.invoice_id
    const inv = await invoicesAPI.getByPayment(paymentId)
    if (!inv?.id) throw new Error("No invoice found for this payment.")
    setInvoice(inv)
    return inv.id
  }

  const handleDownloadInvoice = async () => {
    setDownloading(true)
    try {
      const id = await resolveInvoiceId()
      await invoicesAPI.openPrintableDocument(id)
    } catch (err: any) {
      toast({
        title: "Could not download invoice",
        description: err?.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setDownloading(false)
    }
  }

  const handleSendInvoiceEmail = async () => {
    const email = payment?.student_email
    if (!email) {
      toast({
        title: "No email on file",
        description: "This transaction has no customer email.",
        variant: "destructive",
      })
      return
    }
    const token = TokenManager.getToken()
    if (!token) {
      toast({
        title: "Not authenticated",
        description: "Please sign in again, then retry Send Invoice.",
        variant: "destructive",
      })
      return
    }
    setSending("email")
    try {
      const id = await resolveInvoiceId()
      const docRes = await fetch(getBackendApiUrl(`invoices/${encodeURIComponent(id)}/document`), {
        headers: {
          Accept: "text/html,application/xhtml+xml",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      })
      if (!docRes.ok) throw new Error("Could not load invoice document.")
      const html = await docRes.text()
      if (!html.trim()) throw new Error("Invoice document was empty.")

      const amountLabel = formatCurrency(payment?.amount)
      const subject = `Invoice${payment?.invoice_number ? ` ${payment.invoice_number}` : ""}${
        payment?.transaction_id ? ` — ${payment.transaction_id}` : ""
      }`
      const textBody = [
        `Hello ${payment?.student_name || payment?.partner_org_name || "Customer"},`,
        "",
        `Please find your invoice for ${amountLabel}.`,
        payment?.course_name ? `Course: ${payment.course_name}` : null,
        payment?.transaction_id ? `Reference: ${payment.transaction_id}` : null,
        "",
        "Thank you,",
        "Rock Martial Arts Academy",
      ]
        .filter(Boolean)
        .join("\n")

      const emailRes = await fetch(getBackendApiUrl("email/send-email"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to_email: email,
          subject,
          message: textBody,
          html_message: html,
        }),
      })
      const emailBody = await emailRes.json().catch(() => ({}))
      if (!emailRes.ok) {
        const detail = emailBody?.detail
        throw new Error(
          typeof detail === "string"
            ? detail
            : emailBody?.message || `Failed to send email (${emailRes.status})`
        )
      }
      toast({
        title: "Invoice emailed",
        description: `Sent to ${email}`,
      })
    } catch (err: any) {
      toast({
        title: "Could not send invoice",
        description: err?.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSending(null)
    }
  }

  const handleSendInvoiceWhatsApp = async () => {
    const phone = payment?.student_phone
    if (!phone) {
      toast({
        title: "No phone on file",
        description: "This transaction has no customer mobile number for WhatsApp.",
        variant: "destructive",
      })
      return
    }
    const token = TokenManager.getToken()
    if (!token) {
      toast({
        title: "Not authenticated",
        description: "Please sign in again, then retry Send Invoice.",
        variant: "destructive",
      })
      return
    }
    setSending("whatsapp")
    try {
      const id = await resolveInvoiceId()
      const result = await invoicesAPI.resendWhatsApp(id, { token })
      toast({
        title: "Invoice sent on WhatsApp",
        description: result.phone_masked
          ? `Sent to ${result.phone_masked}`
          : result.message || `Sent to ${phone}`,
      })
    } catch (err: any) {
      toast({
        title: "Could not send WhatsApp invoice",
        description: err?.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSending(null)
    }
  }

  const isPartnerPayment = Boolean(payment?.partner_org_id && !payment?.student_id)
  const payerName = isPartnerPayment
    ? payment?.partner_org_name || payment?.student_name || "Partner"
    : payment?.student_name || "—"

  const lineItems = useMemo(() => {
    if (invoice?.line_items?.length) return invoice.line_items
    if (!payment) return []
    return [
      {
        description: payment.course_name
          ? `${payment.course_name} enrollment`
          : isPartnerPayment
            ? "Partner registration fee"
            : "Payment",
        line_total: payment.amount || 0,
        course_fee: payment.amount || 0,
        admission_fee: 0,
        discount_amount: 0,
      },
    ]
  }, [invoice, payment, isPartnerPayment])

  const subtotal =
    invoice?.subtotal_amount ??
    lineItems.reduce((sum, l) => sum + Number(l.course_fee ?? l.line_total ?? 0), 0)
  const admission = invoice?.admission_total ?? 0
  const discount = invoice?.discount_total ?? 0
  const total = invoice?.total_amount ?? payment?.amount ?? 0
  const methodLabel =
    payment?.gateway_payment_label || payment?.payment_method || invoice?.payment_gateway_label || "—"
  const paidLabel = `Paid on ${formatDateTime(payment?.payment_date || payment?.created_at)}`

  if (loading) {
    return (
      <div className="w-full space-y-6 p-4 lg:px-8 lg:py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 rounded bg-slate-200" />
          <div className="h-28 rounded-2xl bg-slate-200" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-56 rounded-2xl bg-slate-200" />
            <div className="h-56 rounded-2xl bg-slate-200" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !payment) {
    return (
      <div className="w-full p-4 lg:px-8 lg:py-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <h3 className="mb-2 text-lg font-semibold text-rose-800">Transaction not found</h3>
          <p className="mb-4 text-rose-600">{error || "The requested transaction could not be found."}</p>
          <Button onClick={() => router.push(`${basePath}/payment-tracking`)}>
            Back to Payment Tracking
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page-with-sticky-actions w-full space-y-6 p-4 lg:px-8 lg:py-6">
      <div>
        <button
          type="button"
          onClick={() => router.push(`${basePath}/payment-tracking`)}
          className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-[#4F5077] hover:text-[#171A26]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Payment Tracking
        </button>
        <h1 className="text-2xl font-bold tracking-tight text-[#171A26] sm:text-3xl">
          Transaction Details
        </h1>
        <p className="mt-1 text-sm text-[#6B7A99]">
          Transaction ID: {payment.transaction_id || payment.id}
        </p>
      </div>

      <div className="admin-dark-surface flex flex-col gap-4 rounded-2xl bg-[#171A26] px-5 py-5 text-white sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F5C518] text-[#171A26]">
            <FileText className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-white">
                Invoice {payment.invoice_number || "—"}
              </h2>
              <StatusPill status={payment.payment_status} onDark />
            </div>
            <p className="mt-1 text-sm text-slate-200">
              {paidLabel}
              <span className="mx-2 text-slate-300">•</span>
              Source: {methodLabel}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {formatCurrency(total)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DetailCard title={isPartnerPayment ? "Partner Information" : "Student Information"}>
          <Field label="Name" value={payerName} />
          {!isPartnerPayment ? (
            <Field label="Student ID" value={payment.student_id || "—"} />
          ) : (
            <Field label="Partner ID" value={payment.partner_org_id || "—"} />
          )}
          <Field label="Email" value={payment.student_email || "—"} />
          <Field label="Phone" value={payment.student_phone || "—"} />
        </DetailCard>

        <DetailCard title={isPartnerPayment ? "Payment Context" : "Course & Academy Details"}>
          {!isPartnerPayment ? (
            <>
              <Field label="Course" value={payment.course_name || "—"} />
              <Field label="Academy" value={payment.branch_name || "—"} />
              <Field label="Enrollment ID" value={payment.enrollment_id || "—"} />
            </>
          ) : (
            <>
              <Field
                label="Payment Type"
                value={(payment.payment_type || "registration_fee").replace(/_/g, " ")}
              />
              <Field label="Academy" value={payment.branch_name || "—"} />
              <Field label="Organization" value={payment.partner_org_name || "—"} />
            </>
          )}
        </DetailCard>

        <DetailCard title="Payment Details">
          <Field label="Payment Method" value={methodLabel} />
          <Field
            label="Payment Type"
            value={(payment.payment_type || "course_fee").replace(/_/g, " ")}
          />
          <Field
            label="Transaction Date"
            value={formatDateTime(payment.payment_date || payment.created_at)}
          />
          <Field label="Payment ID" value={payment.transaction_id || payment.id} />
          <Field label="Status" value={<StatusPill status={payment.payment_status} />} />
        </DetailCard>

        <DetailCard title="Invoice Summary">
          <div className="overflow-hidden rounded-xl border border-[#E8ECF4]">
            <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-[#F1F5F9] bg-[#F8FAFC] px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[#6B7A99]">
              <span>Description</span>
              <span>Amount</span>
            </div>
            <div className="divide-y divide-[#F1F5F9]">
              {lineItems.map((line, i) => (
                <div
                  key={line.id || i}
                  className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3 text-sm"
                >
                  <span className="text-[#171A26]">
                    {line.description ||
                      (line.course_name ? `${line.course_name} enrollment` : "Line item")}
                  </span>
                  <span className="font-medium text-[#171A26]">
                    {formatCurrency(line.line_total ?? line.course_fee ?? 0)}
                  </span>
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t border-[#F1F5F9] px-4 py-3 text-sm">
              <div className="flex justify-between text-[#6B7A99]">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#6B7A99]">
                <span>Admission</span>
                <span>{formatCurrency(admission)}</span>
              </div>
              <div className="flex justify-between text-[#6B7A99]">
                <span>Discount</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between bg-[#F5C518] px-4 py-3 text-sm font-bold text-[#171A26]">
              <span>Total Paid</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </DetailCard>
      </div>

      <AdminStickyFormActions>
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-xl border-[#171A26] bg-white px-4 font-semibold text-[#171A26]"
          disabled={downloading || !!sending}
          onClick={() => void handleDownloadInvoice()}
        >
          {downloading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Download Invoice
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              className="h-11 rounded-xl bg-[#E1BB33] px-4 font-semibold text-[#171A26] hover:bg-[#d4ae2a]"
              disabled={!!sending || downloading}
            >
              {sending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Invoice
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem
              disabled={!!sending}
              onClick={() => void handleSendInvoiceEmail()}
              className="cursor-pointer gap-2"
            >
              <Mail className="h-4 w-4 text-[#C9971A]" />
              Send Email
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!!sending}
              onClick={() => void handleSendInvoiceWhatsApp()}
              className="cursor-pointer gap-2"
            >
              <MessageCircle className="h-4 w-4 text-[#25D366]" />
              Send WhatsApp
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </AdminStickyFormActions>
    </div>
  )
}
