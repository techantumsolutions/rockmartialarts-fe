"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, CreditCard, User, BookOpen, Download, Mail, Loader2 } from "lucide-react"
import { TokenManager } from "@/lib/tokenManager"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import { paymentAPI } from "@/lib/paymentAPI"
import { invoicesAPI } from "@/lib/invoicesAPI"
import { getBackendApiUrl } from "@/lib/config"
import { useToast } from "@/hooks/use-toast"

interface PaymentDetails {
  id: string
  student_id?: string
  student_name?: string
  student_email?: string
  student_phone?: string
  amount?: number
  payment_type?: string
  payment_method?: string
  payment_status: string
  transaction_id?: string
  payment_date?: string
  course_name?: string
  course_id?: string
  branch_name?: string
  branch_id?: string
  created_at?: string
  enrollment_id?: string
}

export default function PaymentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const basePath = useDashboardBasePath()
  const { toast } = useToast()
  const paymentId = params.id as string

  const [payment, setPayment] = useState<PaymentDetails | null>(null)
  const [invoiceId, setInvoiceId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)

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

      let invoice = null as Awaited<ReturnType<typeof invoicesAPI.getByPayment>> | null
      try {
        invoice = await invoicesAPI.getByPayment(paymentId, token)
      } catch {
        invoice = null
      }

      if (!data && !invoice) {
        setError("Payment not found")
        setPayment(null)
        setInvoiceId(null)
        return
      }

      if (invoice?.id) setInvoiceId(invoice.id)
      else setInvoiceId(null)

      const line = invoice?.line_items?.[0]
      setPayment({
        id: data?.id || paymentId,
        student_id: data?.student_id,
        student_name: data?.student_name || invoice?.customer?.name,
        student_email: data?.student_email || invoice?.customer?.email,
        student_phone: data?.student_phone || invoice?.customer?.phone,
        amount: data?.amount ?? invoice?.total_amount,
        payment_type: data?.payment_type || invoice?.source,
        payment_method:
          data?.payment_method ||
          invoice?.payment_gateway_label ||
          invoice?.payment_method ||
          undefined,
        payment_status: data?.payment_status || "paid",
        transaction_id: data?.transaction_id || invoice?.payment_reference || undefined,
        payment_date: data?.payment_date || invoice?.paid_at || invoice?.created_at || undefined,
        course_name: data?.course_name || line?.course_name,
        course_id: data?.course_id,
        branch_name: data?.branch_name || line?.branch_name,
        branch_id: data?.branch_id,
        created_at: data?.created_at || invoice?.created_at || undefined,
        enrollment_id: data?.enrollment_id,
      })
    } catch (err: any) {
      console.error("Error fetching payment details:", err)
      setError(err.message || "Failed to fetch payment details")
    } finally {
      setLoading(false)
    }
  }, [paymentId])

  useEffect(() => {
    void fetchPaymentDetails()
  }, [fetchPaymentDetails])

  const resolveInvoiceId = async (): Promise<string> => {
    if (invoiceId) return invoiceId
    const invoice = await invoicesAPI.getByPayment(paymentId)
    if (!invoice?.id) throw new Error("No invoice found for this payment.")
    setInvoiceId(invoice.id)
    return invoice.id
  }

  const handleDownloadReceipt = async () => {
    setDownloading(true)
    try {
      const id = await resolveInvoiceId()
      await invoicesAPI.openPrintableDocument(id)
    } catch (err: any) {
      toast({
        title: "Could not download receipt",
        description: err?.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setDownloading(false)
    }
  }

  const handleSendEmail = async () => {
    if (!payment?.student_email) {
      toast({
        title: "No student email",
        description: "This payment has no student email on file.",
        variant: "destructive",
      })
      return
    }

    setSendingEmail(true)
    try {
      const id = await resolveInvoiceId()
      const token = TokenManager.getToken()
      const docRes = await fetch(getBackendApiUrl(`invoices/${encodeURIComponent(id)}/document`), {
        headers: {
          Accept: "text/html,application/xhtml+xml",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: "no-store",
      })
      if (!docRes.ok) {
        throw new Error("Could not load invoice document for email.")
      }
      const html = await docRes.text()
      if (!html.trim()) throw new Error("Invoice document was empty.")

      const amountLabel =
        typeof payment.amount === "number"
          ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
              payment.amount
            )
          : "your payment"
      const subject = `Payment Receipt${payment.transaction_id ? ` — ${payment.transaction_id}` : ""}`
      const textBody = [
        `Hello ${payment.student_name || "Student"},`,
        "",
        `Please find your payment receipt for ${amountLabel}.`,
        payment.course_name ? `Course: ${payment.course_name}` : null,
        payment.transaction_id ? `Reference: ${payment.transaction_id}` : null,
        "",
        "Thank you,",
        "Rock Martial Arts Academy",
      ]
        .filter(Boolean)
        .join("\n")

      const emailRes = await fetch(getBackendApiUrl("email/send-email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_email: payment.student_email,
          subject,
          message: textBody,
          html_message: html,
        }),
      })
      const emailBody = await emailRes.json().catch(() => ({}))
      if (!emailRes.ok) {
        const detail = emailBody?.detail
        const detailMsg =
          typeof detail === "string"
            ? detail
            : Array.isArray(detail)
              ? detail.map((d: any) => d?.msg || String(d)).join(", ")
              : emailBody?.message
        throw new Error(detailMsg || `Failed to send email (${emailRes.status})`)
      }

      toast({
        title: "Email sent successfully",
        description: `Receipt emailed to ${payment.student_email}`,
      })
    } catch (err: any) {
      toast({
        title: "Could not send email",
        description: err?.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSendingEmail(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { color: "bg-green-100 text-green-800", label: "Paid" },
      completed: { color: "bg-green-100 text-green-800", label: "Paid" },
      pending: { color: "bg-yellow-100 text-yellow-800", label: "Pending" },
      failed: { color: "bg-red-100 text-red-800", label: "Failed" },
      refunded: { color: "bg-gray-100 text-gray-800", label: "Refunded" },
      cancelled: { color: "bg-gray-100 text-gray-800", label: "Cancelled" },
      canceled: { color: "bg-gray-100 text-gray-800", label: "Cancelled" },
    }

    const key = String(status || "").toLowerCase() as keyof typeof statusConfig
    const config = statusConfig[key] || statusConfig.pending
    return (
      <Badge className={`${config.color} border-0`}>
        {config.label}
      </Badge>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="w-full p-4 lg:px-8 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !payment) {
    return (
      <div className="w-full p-4 lg:px-8 space-y-6">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-red-800 mb-2">Payment Not Found</h3>
            <p className="text-red-600 mb-4">{error || "The requested payment could not be found."}</p>
            <Button onClick={() => router.push(`${basePath}/payment-tracking`)}>
              Back to Payment Tracking
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full p-4 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.push(`${basePath}/payment-tracking`)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Payment Tracking</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Payment Details</h1>
              <p className="text-gray-600">Transaction ID: {payment.transaction_id || "—"}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              className="flex items-center space-x-2"
              disabled={downloading}
              onClick={() => void handleDownloadReceipt()}
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Download Receipt</span>
            </Button>
            <Button
              variant="outline"
              className="flex items-center space-x-2"
              disabled={sendingEmail}
              onClick={() => void handleSendEmail()}
            >
              {sendingEmail ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              <span>Send Email</span>
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span>Payment Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Amount</span>
                <span className="text-2xl font-bold text-gray-900">
                  {formatCurrency(payment.amount || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Status</span>
                {getStatusBadge(payment.payment_status)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Payment Method</span>
                <span className="text-gray-900">{payment.payment_method || "N/A"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Payment Type</span>
                <span className="text-gray-900">{payment.payment_type || "N/A"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Payment Date</span>
                <span className="text-gray-900">
                  {payment.payment_date ? formatDate(payment.payment_date) : "N/A"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5 text-green-600" />
                <span>Student Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Name</span>
                <span className="text-gray-900">{payment.student_name || "N/A"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Email</span>
                <span className="text-gray-900">{payment.student_email || "N/A"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Phone</span>
                <span className="text-gray-900">{payment.student_phone || "N/A"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Student ID</span>
                <span className="text-gray-900 font-mono text-sm">{payment.student_id || "N/A"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-purple-600" />
                <span>Course & Branch Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Course</span>
                <span className="text-gray-900">{payment.course_name || "N/A"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Branch</span>
                <span className="text-gray-900">{payment.branch_name || "N/A"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Enrollment ID</span>
                <span className="text-gray-900 font-mono text-sm">
                  {payment.enrollment_id || "N/A"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  )
}
