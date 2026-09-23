"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { CheckCircle2, Loader2, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { fetchCartCheckout, formatInr } from "@/lib/enrollmentCart"

function CartSuccessInner() {
  const params = useSearchParams()
  const checkoutId = params.get("checkout_id") || ""
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<string>("")
  const [links, setLinks] = useState<
    Array<{ enrollment_id: string; course_name?: string; student_label?: string; branch_name?: string }>
  >([])
  const [amount, setAmount] = useState(0)
  const [invoiceId, setInvoiceId] = useState<string | null>(null)

  useEffect(() => {
    if (!checkoutId) {
      setLoading(false)
      return
    }
    fetchCartCheckout(checkoutId)
      .then((data) => {
        setStatus(data.checkout.status)
        setLinks(data.checkout.enrollment_links || [])
        setAmount(data.checkout.amount_inr || data.checkout.totals?.total_amount || 0)
        const inv = (data.checkout as { invoice_id?: string }).invoice_id
        if (inv) setInvoiceId(inv)
      })
      .catch(() => {
        setStatus("unknown")
      })
      .finally(() => setLoading(false))
  }, [checkoutId])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#171A26] flex items-center justify-center pt-24">
        <Loader2 className="w-10 h-10 animate-spin text-[#FFB70F]" />
      </main>
    )
  }

  const fulfilled = status === "fulfilled" || status === "paid"

  return (
    <main className="min-h-screen bg-[#171A26] text-white pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-2xl text-center">
        <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-[#FFB70F] mb-2">
          {fulfilled ? "Enrollments confirmed" : "Payment received"}
        </h1>
        <p className="text-gray-400 mb-8">
          {fulfilled
            ? "Your cart payment was verified and each course enrollment is now active."
            : "We are finishing enrollment activation. This usually completes within a minute."}
        </p>
        {amount > 0 ? (
          <p className="text-lg text-white mb-6">
            Amount paid: <span className="text-[#FFB70F] font-semibold">{formatInr(amount)}</span>
          </p>
        ) : null}
        {links.length > 0 ? (
          <ul className="text-left rounded-xl border border-gray-800 bg-gray-900/40 divide-y divide-gray-800 mb-8">
            {links.map((l) => (
              <li key={l.enrollment_id} className="px-5 py-3">
                <p className="font-medium text-white">{l.course_name || "Course"}</p>
                <p className="text-sm text-gray-400">
                  {l.student_label || "Student"}
                  {l.branch_name ? ` · ${l.branch_name}` : ""}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild className="bg-[#FFB70F] text-black hover:bg-[#FFB70F]/90">
            <Link href="/student-dashboard/courses">View my courses</Link>
          </Button>
          {invoiceId ? (
            <Button asChild variant="outline" className="border-gray-600">
              <Link href={`/student-dashboard/invoices/${invoiceId}`}>View invoice</Link>
            </Button>
          ) : (
            <Button asChild variant="outline" className="border-gray-600">
              <Link href="/student-dashboard/invoices">My invoices</Link>
            </Button>
          )}
          <Button asChild variant="outline" className="border-gray-600">
            <Link href="/courses">Browse more courses</Link>
          </Button>
          <Button asChild variant="ghost" className="text-gray-400">
            <Link href="/cart">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Back to cart
            </Link>
          </Button>
        </div>
      </div>
    </main>
  )
}

export default function CartCheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#171A26] flex items-center justify-center pt-24">
          <Loader2 className="w-10 h-10 animate-spin text-[#FFB70F]" />
        </main>
      }
    >
      <CartSuccessInner />
    </Suspense>
  )
}
