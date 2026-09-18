"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import StudentDashboardLayout from "@/components/student-dashboard-layout"
import { PaymentReceipt } from "@/components/payment-receipt"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { studentProfileAPI } from "@/lib/studentProfileAPI"
import { usePreventBackNavigation } from "@/hooks/use-prevent-back-navigation"
import { invoicesAPI } from "@/lib/invoicesAPI"

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [studentName, setStudentName] = useState<string>("Student")
  const [loading, setLoading] = useState(true)
  const [invoiceId, setInvoiceId] = useState<string | null>(null)
  const [whatsappHint, setWhatsappHint] = useState<string | null>(null)

  usePreventBackNavigation(true)

  const paymentId = searchParams.get("payment_id") || ""
  const orderId = searchParams.get("order_id") || paymentId
  const amount = parseFloat(searchParams.get("amount") || "0")
  const courseName = searchParams.get("course_name") || "Course Enrollment"
  const branchName = searchParams.get("branch_name") || "Main Branch"
  const isRenewal = searchParams.get("renewal") === "1"
  const newEndDateRaw = searchParams.get("new_end_date")
  const newEndDateLabel = (() => {
    if (!newEndDateRaw) return null
    try {
      return new Date(newEndDateRaw).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    } catch {
      return null
    }
  })()

  useEffect(() => {
    const fetchStudentProfile = async () => {
      try {
        const token = localStorage.getItem("token")
        if (!token) return

        const response = await studentProfileAPI.getProfile(token)
        const profile = response.profile
        setStudentName(profile.full_name || `${profile.first_name} ${profile.last_name}`)
      } catch (error) {
        console.error("Error fetching profile:", error)
      } finally {
        setLoading(false)
      }
    }

    void fetchStudentProfile()
  }, [])

  useEffect(() => {
    if (!paymentId) return
    let cancelled = false
    invoicesAPI
      .getByPayment(paymentId)
      .then(async (inv) => {
        if (cancelled || !inv?.id) return
        setInvoiceId(inv.id)
        try {
          const full = await invoicesAPI.get(inv.id)
          const st = (full.whatsapp_delivery?.status || "").toLowerCase()
          if (st === "sent" || st === "delivered") {
            setWhatsappHint(
              `Invoice ${full.invoice_number} was sent on WhatsApp${
                full.whatsapp_delivery?.phone_masked
                  ? ` to ${full.whatsapp_delivery.phone_masked}`
                  : ""
              }.`
            )
          } else if (st === "failed" || st === "skipped") {
            setWhatsappHint(
              "Invoice is ready. You can resend it on WhatsApp from the invoice page."
            )
          }
        } catch {
          /* optional enrichment */
        }
      })
      .catch(() => {
        /* invoice may still be generating; ignore */
      })
    return () => {
      cancelled = true
    }
  }, [paymentId])

  const goToCourses = () => {
    router.replace("/student-dashboard/courses")
  }

  if (!paymentId) {
    return (
      <StudentDashboardLayout>
        <div className="container mx-auto p-6 max-w-3xl">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-red-600">Invalid Payment Information</h1>
            <p className="text-muted-foreground">No payment details found. Please try again.</p>
            <Button onClick={goToCourses}>Continue to My Courses</Button>
          </div>
        </div>
      </StudentDashboardLayout>
    )
  }

  if (loading) {
    return (
      <StudentDashboardLayout>
        <div className="container mx-auto p-6 max-w-3xl flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
        </div>
      </StudentDashboardLayout>
    )
  }

  return (
    <StudentDashboardLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-green-700 mb-2">
            {isRenewal ? "Subscription renewed" : "Payment successful"}
          </h1>
          <p className="text-muted-foreground">
            {isRenewal
              ? newEndDateLabel
                ? `Your subscription is active again. Valid through ${newEndDateLabel}.`
                : "Your subscription is active again. Continue to view your courses."
              : "Your enrollment is confirmed. Continue to view your courses."}
          </p>
          {whatsappHint ? (
            <p className="mt-2 text-sm text-emerald-800">{whatsappHint}</p>
          ) : null}
        </div>

        <PaymentReceipt
          paymentId={paymentId}
          orderId={orderId}
          amount={amount}
          courseName={courseName}
          branchName={branchName}
          date={new Date().toISOString()}
          studentName={studentName}
          currency="INR"
        />

        <div className="mt-8 text-center flex flex-col sm:flex-row gap-3 justify-center">
          {invoiceId ? (
            <Button variant="outline" asChild size="lg">
              <Link href={`/student-dashboard/invoices/${invoiceId}`}>View invoice</Link>
            </Button>
          ) : (
            <Button variant="outline" asChild size="lg">
              <Link href="/student-dashboard/invoices">My invoices</Link>
            </Button>
          )}
          <Button
            onClick={goToCourses}
            size="lg"
            className="bg-amber-600 hover:bg-amber-700"
          >
            Continue to My Courses
          </Button>
          {isRenewal ? (
            <Button variant="outline" asChild size="lg">
              <Link href="/student-dashboard/payments">Back to Payments</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </StudentDashboardLayout>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <StudentDashboardLayout>
          <div className="container mx-auto p-6 max-w-3xl flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
          </div>
        </StudentDashboardLayout>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  )
}
