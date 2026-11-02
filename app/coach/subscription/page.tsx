"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function CoachSubscriptionAliasPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/coach-dashboard/subscription")
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
        <p className="text-sm text-gray-600">Redirecting to subscription...</p>
      </div>
    </div>
  )
}

