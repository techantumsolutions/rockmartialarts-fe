"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import { invoicesAPI } from "@/lib/invoicesAPI"
import { TokenManager } from "@/lib/tokenManager"

/** Invoice detail merged into Payment Tracking transaction detail. */
export default function AdminInvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const basePath = useDashboardBasePath()
  const invoiceId = params.id as string
  const [message, setMessage] = useState("Redirecting…")

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const token = TokenManager.getToken()
        const inv = await invoicesAPI.get(invoiceId, token)
        if (cancelled) return
        if (inv?.payment_id) {
          router.replace(`${basePath}/payments/${encodeURIComponent(inv.payment_id)}`)
          return
        }
      } catch {
        /* fall through */
      }
      if (!cancelled) {
        setMessage("Redirecting to Payment Tracking…")
        router.replace(`${basePath}/payment-tracking`)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [invoiceId, router, basePath])

  return (
    <div className="flex min-h-[40vh] items-center justify-center p-8 text-sm text-[#6B7A99]">
      {message}
    </div>
  )
}
