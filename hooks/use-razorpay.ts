import { useState, useCallback } from 'react'
import { loadRazorpayScript } from '@/lib/razorpay'
import { TokenManager } from '@/lib/tokenManager'
import {
  getSessionErrorMessage,
  isSessionExpiredError,
  SESSION_EXPIRED_PAYMENT_MESSAGE,
} from '@/lib/sessionAuth'

interface RazorpayOptions {
  /** @deprecated Amount is derived from the enrollment on the server when creating the Razorpay order. */
  amount?: number
  currency?: string
  enrollmentData: any
  onSuccess: (response: any) => void
  onFailure: (error: any) => void
}

declare global {
  interface Window {
    Razorpay: any
  }
}

export function useRazorpay() {
  const [loading, setLoading] = useState(false)

  const initiatePayment = useCallback(async (options: RazorpayOptions) => {
    setLoading(true)
    
    try {
      if (!TokenManager.isAuthenticated()) {
        TokenManager.clearAuthData()
        throw new Error(SESSION_EXPIRED_PAYMENT_MESSAGE)
      }

      const token = TokenManager.getToken()
      if (!token) {
        throw new Error(SESSION_EXPIRED_PAYMENT_MESSAGE)
      }

      const loaded = await loadRazorpayScript()
      if (!loaded || typeof window === 'undefined' || !window.Razorpay) {
        throw new Error('Failed to load Razorpay. Please refresh and try again.')
      }

      const enrollmentId = options.enrollmentData?.enrollment_id
      if (!enrollmentId) {
        throw new Error('Missing enrollment. Complete checkout preparation first.')
      }

      const orderResponse = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enrollment_id: enrollmentId }),
      })

      if (!orderResponse.ok) {
        const err = await orderResponse.json().catch(() => ({}))
        const msg = err?.error || err?.detail || 'Failed to create order'
        console.error('[useRazorpay] create-order failed', orderResponse.status, err)

        if (orderResponse.status === 401 || isSessionExpiredError(msg)) {
          TokenManager.clearAuthData()
          throw new Error(SESSION_EXPIRED_PAYMENT_MESSAGE)
        }

        throw new Error(typeof msg === 'string' ? msg : 'Payment failed, please try again')
      }

      const { order, key } = await orderResponse.json()

      if (!order?.id || typeof order.amount !== 'number' || order.amount < 100) {
        console.error('[useRazorpay] invalid order payload', { order, key: !!key })
        throw new Error('Payment failed, please try again')
      }

      // Open Razorpay checkout
      const razorpayOptions = {
        key,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Rock Martial Arts',
        description: `Enrollment: ${options.enrollmentData.course_name}`,
        order_id: order.id,
        handler: async function (response: any) {
          try {
            const activeToken = TokenManager.isAuthenticated()
              ? TokenManager.getToken()
              : null
            if (!activeToken) {
              TokenManager.clearAuthData()
              throw new Error(SESSION_EXPIRED_PAYMENT_MESSAGE)
            }

            // Verify payment on backend
            const verifyResponse = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${activeToken}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                enrollmentData: options.enrollmentData,
              }),
            })

            if (!verifyResponse.ok) {
              if (verifyResponse.status === 401) {
                TokenManager.clearAuthData()
                throw new Error(SESSION_EXPIRED_PAYMENT_MESSAGE)
              }
              throw new Error('Payment verification failed')
            }

            const result = await verifyResponse.json()
            options.onSuccess(result)
          } catch (error) {
            options.onFailure(error)
          }
        },
        prefill: {
          name: options.enrollmentData.student_name || '',
          email: options.enrollmentData.student_email || '',
          contact: options.enrollmentData.student_phone || '',
        },
        theme: {
          color: '#f59e0b',
        },
        modal: {
          ondismiss: function () {
            setLoading(false)
            options.onFailure({ message: 'Payment cancelled' })
          },
        },
      }

      const razorpay = new window.Razorpay(razorpayOptions)
      razorpay.on('payment.failed', function (response: { error?: { description?: string; code?: string } }) {
        console.error('[useRazorpay] payment.failed', response)
        setLoading(false)
        const desc = response?.error?.description || response?.error?.code || 'Payment failed, please try again'
        options.onFailure(new Error(desc))
      })
      razorpay.open()
      setLoading(false)

    } catch (error) {
      setLoading(false)
      const friendly = getSessionErrorMessage(error, true)
      options.onFailure(error instanceof Error ? error : new Error(friendly))
    }
  }, [])

  return { initiatePayment, loading }
}
