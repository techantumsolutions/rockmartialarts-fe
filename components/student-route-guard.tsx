"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useStudentSubscription } from "@/hooks/use-student-subscription"
import SubscriptionExpiredModal from "@/components/subscription-expired-modal"
import { Loader2 } from "lucide-react"
import { TokenManager } from "@/lib/tokenManager"
import { buildLoginUrl, safeStudentReturnUrl } from "@/lib/sessionAuth"
import StudentDeactivatedScreen from "@/components/student-deactivated-screen"
import {
  STUDENT_DEACTIVATED_EVENT,
  fetchStudentSessionStatus,
  type StudentSessionStatus,
} from "@/lib/studentSessionStatus"

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
 * Restricts access to most pages when subscription is inactive,
 * but keeps payment and course management pages accessible for renewals/new purchases.
 */
export default function StudentRouteGuard({ children }: StudentRouteGuardProps) {
  const pathname = usePathname()
  const router = useRouter()
  const subscriptionStatus = useStudentSubscription()
  const [showModal, setShowModal] = useState(false)
  const [hasSession, setHasSession] = useState<boolean | null>(null)
  const [statusChecked, setStatusChecked] = useState(false)
  const [sessionStatus, setSessionStatus] = useState<StudentSessionStatus | null>(null)

  const isPaymentPage = pathname.startsWith("/student-dashboard/payments")
  const isCoursesPage = pathname.startsWith("/student-dashboard/courses")
  const isSubscriptionAccessPage = isPaymentPage || isCoursesPage

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

  useEffect(() => {
    if (subscriptionStatus.loading || hasSession !== true || isDeactivated) return

    const user = localStorage.getItem("user")
    if (!user) return

    const userData = JSON.parse(user)

    if (userData.role !== "student") return

    if (!subscriptionStatus.isActive && !isSubscriptionAccessPage) {
      setShowModal(true)
    } else {
      setShowModal(false)
    }
  }, [subscriptionStatus, isSubscriptionAccessPage, hasSession, isDeactivated])

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

  if (!subscriptionStatus.isActive && !isSubscriptionAccessPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <SubscriptionExpiredModal
          isOpen={showModal}
          expiryDate={subscriptionStatus.expiryDate}
          paymentStatus={subscriptionStatus.paymentStatus}
          onClose={() => {
            // Prevent closing - user must go to payment page
          }}
        />
        <div className="text-center max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-10 w-10 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
            <p className="text-gray-600 mb-4">
              Your subscription has expired. Please renew your subscription to continue accessing the platform.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
