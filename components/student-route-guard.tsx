"use client"

import { createContext, useContext, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useStudentSubscription, type SubscriptionStatus } from "@/hooks/use-student-subscription"
import { AlertCircle, CreditCard, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TokenManager } from "@/lib/tokenManager"
import { buildLoginUrl, safeStudentReturnUrl } from "@/lib/sessionAuth"
import StudentDeactivatedScreen from "@/components/student-deactivated-screen"
import {
  STUDENT_DEACTIVATED_EVENT,
  fetchStudentSessionStatus,
  type StudentSessionStatus,
} from "@/lib/studentSessionStatus"

export interface StudentSubscriptionContextValue extends SubscriptionStatus {
  isExpired: boolean
}

export const StudentSubscriptionContext = createContext<StudentSubscriptionContextValue>({
  isActive: true,
  hasActiveEnrollment: true,
  loading: false,
  isExpired: false,
})

export function useStudentSubscriptionContext() {
  return useContext(StudentSubscriptionContext)
}

interface StudentRouteGuardProps {
  children: React.ReactNode
}

function GuardLoading({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  )
}

/**
 * Route guard for student pages.
 * When course tenure is expired:
 * - Allows viewing all existing dashboard pages (dashboard, courses, attendance, performance, progress, syllabus, invoices, billing, profile).
 * - Allows full access to payment page for renewals and adding new students.
 * - Restricts profile editing (profile/edit) with a renewal prompt.
 * - Displays a persistent view-only tenure expiry banner across dashboard pages.
 */
export default function StudentRouteGuard({ children }: StudentRouteGuardProps) {
  const pathname = usePathname()
  const router = useRouter()
  const subscriptionStatus = useStudentSubscription()
  const [hasSession, setHasSession] = useState<boolean | null>(null)
  const [statusChecked, setStatusChecked] = useState(false)
  const [sessionStatus, setSessionStatus] = useState<StudentSessionStatus | null>(null)

  const isPaymentPage = pathname.startsWith("/student-dashboard/payments")
  const isAddStudentPage = pathname.startsWith("/student-dashboard/add-student")
  const isActionOnlyRoute = pathname.startsWith("/student-dashboard/profile/edit")

  useEffect(() => {
    const authed = TokenManager.isAuthenticated()
    setHasSession(authed)
    if (!authed) {
      TokenManager.clearAuthData()
      router.replace(
        buildLoginUrl({
          returnUrl: safeStudentReturnUrl(pathname || "/student-dashboard"),
        })
      )
    }
  }, [pathname, router])

  useEffect(() => {
    if (hasSession !== true) return
    if (TokenManager.getUser()?.role !== "student") {
      setStatusChecked(true)
      return
    }
    let cancelled = false
    const check = async () => {
      const status = await fetchStudentSessionStatus()
      if (cancelled) return
      if (status) setSessionStatus(status)
      setStatusChecked(true)
    }
    check()
    const onFocus = () => check()
    const onVisibility = () => {
      if (document.visibilityState === "visible") check()
    }
    window.addEventListener("focus", onFocus)
    window.addEventListener(STUDENT_DEACTIVATED_EVENT, onFocus)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      cancelled = true
      window.removeEventListener("focus", onFocus)
      window.removeEventListener(STUDENT_DEACTIVATED_EVENT, onFocus)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [pathname, hasSession])

  const isDeactivated = sessionStatus?.is_active === false

  if (hasSession !== true) {
    return <GuardLoading message="Redirecting to login..." />
  }

  if (!statusChecked) {
    return <GuardLoading message="Verifying account status..." />
  }

  if (isDeactivated) {
    return (
      <StudentDeactivatedScreen
        studentName={sessionStatus?.full_name}
        currentStudentId={sessionStatus?.student_id}
        profiles={sessionStatus?.profiles || []}
      />
    )
  }

  if (subscriptionStatus.loading) {
    return <GuardLoading message="Verifying subscription status..." />
  }

  const isExpired = !subscriptionStatus.isActive

  // Restrict access to action-only routes when tenure is expired
  if (isExpired && isActionOnlyRoute) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <AlertCircle className="h-7 w-7 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Action Restricted</h2>
          <p className="text-sm text-gray-600 mb-6">
            Your course tenure has completed. Dashboard actions are restricted until you renew your course. You can still view all your existing dashboard records.
          </p>
          <div className="flex flex-col gap-2.5">
            <Button
              asChild
              className="w-full bg-[#FFB70F] hover:bg-[#e0a20d] text-[#171A26] font-semibold"
            >
              <Link href="/student-dashboard/payments">
                <CreditCard className="w-4 h-4 mr-2" /> Renew Course / Go to Payment
              </Link>
            </Button>
            <Button
              variant="outline"
              asChild
              className="w-full"
            >
              <Link href="/student-dashboard">
                Return to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <StudentSubscriptionContext.Provider
      value={{
        ...subscriptionStatus,
        isExpired,
      }}
    >
      {isExpired && !isPaymentPage && !isAddStudentPage && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-amber-950 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="font-semibold text-amber-900">Course Tenure Completed</p>
              <p className="text-amber-800 text-xs sm:text-sm">
                Your course tenure has expired. You can view all existing dashboard records, but actions remain restricted until renewal.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            asChild
            className="bg-[#FFB70F] hover:bg-[#e0a20d] text-[#171A26] font-semibold shrink-0 shadow-xs w-full sm:w-auto"
          >
            <Link href="/student-dashboard/payments">
              <CreditCard className="w-4 h-4 mr-1.5" /> Renew Course / Pay Now
            </Link>
          </Button>
        </div>
      )}
      {children}
    </StudentSubscriptionContext.Provider>
  )
}
