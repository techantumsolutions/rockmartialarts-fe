"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"

/** Invoices merged into Payment Tracking (Transactions). */
export default function AdminInvoicesPage() {
  const router = useRouter()
  const basePath = useDashboardBasePath()

  useEffect(() => {
    router.replace(`${basePath}/payment-tracking`)
  }, [router, basePath])

  return (
    <div className="flex min-h-[40vh] items-center justify-center p-8 text-sm text-[#6B7A99]">
      Redirecting to Payment Tracking…
    </div>
  )
}
