"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useCoachSubscriptionGuard } from "@/lib/coachSubscriptionGuard"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface CoachSubscriptionGuardProps {
  children: React.ReactNode
}

export default function CoachSubscriptionGuard({ children }: CoachSubscriptionGuardProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const { isRestricted, loading } = useCoachSubscriptionGuard()
  const toastShownRef = useRef(false)

  const isSubscriptionPage =
    pathname === "/coach-dashboard/subscription" ||
    pathname.startsWith("/coach-dashboard/subscription/")

  useEffect(() => {
    if (!loading && isRestricted && !isSubscriptionPage) {
      if (!toastShownRef.current) {
        toastShownRef.current = true
        toast({
          title: "Subscription Required",
          description: "Please activate or renew your subscription to access this feature.",
          variant: "destructive",
        })
      }
      router.replace("/coach-dashboard/subscription")
    } else if (isSubscriptionPage || !isRestricted) {
      toastShownRef.current = false
    }
  }, [loading, isRestricted, isSubscriptionPage, router, toast])

  // While restricted and trying to view another page, block rendering to prevent layout flashing
  if (isRestricted && !isSubscriptionPage) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
        <p className="text-sm font-medium text-gray-600">
          Redirecting to subscription renewal...
        </p>
      </div>
    )
  }

  return <>{children}</>
}

