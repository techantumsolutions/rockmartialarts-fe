import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getBackendApiUrl } from '@/lib/config'
import { isEnrollmentExpiredByDate } from '@/lib/student-enrollment-status'
import { TokenManager } from '@/lib/tokenManager'
import { buildLoginUrl } from '@/lib/sessionAuth'

export interface SubscriptionStatus {
  isActive: boolean
  hasActiveEnrollment: boolean
  expiryDate?: string
  paymentStatus?: string
  loading: boolean
}

/**
 * Hook to check student subscription status
 * Returns subscription status and handles redirects for inactive students
 */
export function useStudentSubscription() {
  const router = useRouter()
  const [status, setStatus] = useState<SubscriptionStatus>({
    isActive: true, // Default to true to avoid flash
    hasActiveEnrollment: true,
    loading: true
  })

  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      try {
        if (!TokenManager.isAuthenticated()) {
          TokenManager.clearAuthData()
          setStatus({
            isActive: false,
            hasActiveEnrollment: false,
            loading: false
          })
          return
        }

        const token = TokenManager.getToken()
        const user = TokenManager.getUser()

        if (!token || !user) {
          setStatus({
            isActive: false,
            hasActiveEnrollment: false,
            loading: false
          })
          return
        }

        // Only check for students
        if (user.role !== 'student') {
          setStatus({
            isActive: true,
            hasActiveEnrollment: true,
            loading: false
          })
          return
        }

        // Fetch profile (use proxy in browser so URL is correct and consistent)
        const response = await fetch(getBackendApiUrl('auth/profile'), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.status === 401) {
          TokenManager.clearAuthData()
          router.replace(buildLoginUrl({ session: 'expired', returnUrl: '/student-dashboard' }))
          setStatus({
            isActive: false,
            hasActiveEnrollment: false,
            loading: false
          })
          return
        }

        if (response.ok) {
          const result = await response.json()
          const profile = result.profile

          // Check if profile is active
          const isProfileActive = profile.is_active !== false

          // At least one enrollment whose subscription period has not ended (ignore stale payment_status=expired)
          const hasActiveEnrollment =
            profile.enrollments?.some((enrollment: any) => {
              const ps = (enrollment.payment_status || '').toLowerCase()
              if (ps === 'cancelled') return false
              return !isEnrollmentExpiredByDate({
                endDate: enrollment.end_date,
                paymentStatus: enrollment.payment_status,
              })
            }) || false

          // Expiry date: use latest end_date (or completion_date) from any enrollment for display
          const withDate = (profile.enrollments || []).filter(
            (e: any) => e?.end_date || e?.completion_date
          )
          const sortedByEnd = [...withDate].sort(
            (a: any, b: any) =>
              new Date(b.end_date || b.completion_date || 0).getTime() -
              new Date(a.end_date || a.completion_date || 0).getTime()
          )
          const latestEnrollment = sortedByEnd[0] || profile.enrollments?.[0]
          const expiryDate = latestEnrollment?.end_date || latestEnrollment?.completion_date

          setStatus({
            isActive: isProfileActive && hasActiveEnrollment,
            hasActiveEnrollment,
            expiryDate,
            paymentStatus: latestEnrollment?.payment_status,
            loading: false
          })
        } else {
          // If API call fails, default to inactive for safety
          setStatus({
            isActive: false,
            hasActiveEnrollment: false,
            loading: false
          })
        }
      } catch (error) {
        console.error('Error checking subscription status:', error)
        // On error, default to inactive for safety
        setStatus({
          isActive: false,
          hasActiveEnrollment: false,
          loading: false
        })
      }
    }

    checkSubscriptionStatus()
  }, [router])

  return status
}
