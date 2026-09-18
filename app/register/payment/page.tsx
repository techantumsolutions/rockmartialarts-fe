"use client"

import type React from "react"
import { getBackendApiUrl } from "@/lib/config"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useRegistration } from "@/contexts/RegistrationContext"
import { useCMS } from "@/contexts/CMSContext"
import { openRazorpayCheckout, type RazorpayPaymentResponse } from "@/lib/razorpay"
import { submitLead } from "@/lib/submitLead"
import { normalizeToIndianE164 } from "@/lib/indianMobile"

interface PaymentCalculation {
  course_fee: number
  admission_fee: number
  total_amount: number
  currency: string
  duration_multiplier: number
  original_price?: number
  discount_amount?: number
  is_flat_price?: boolean
}

interface CoursePaymentInfo {
  course_id: string
  course_name: string
  category_name: string
  branch_name: string
  duration: string
  pricing: PaymentCalculation
}

export default function PaymentPage() {
  const router = useRouter()
  const { registrationData, updateRegistrationData, registrationStorageReady } = useRegistration()
  const { cms } = useCMS()

  const [paymentInfo, setPaymentInfo] = useState<CoursePaymentInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState("")
  const [loadError, setLoadError] = useState<string | null>(null)

  const durationLabel =
    registrationData.duration_name ||
    `${registrationData.duration_months || 1} month${(registrationData.duration_months || 1) > 1 ? "s" : ""}`

  const batchLabel = (registrationData.batch_display_label || "").trim()

  const paymentPhoneE164 =
    normalizeToIndianE164(registrationData.mobile?.trim() || "") || ""

  // Fetch payment breakdown from backend only (same source as Razorpay amount)
  useEffect(() => {
    let cancelled = false

    const fetchPaymentInfo = async () => {
      setLoadError(null)

      if (!registrationData.course_id || !registrationData.branch_id || !registrationData.duration) {
        if (!cancelled) {
          setPaymentInfo(null)
          setLoadError("Please complete course selection before payment.")
          setLoading(false)
        }
        return
      }

      try {
        const durationQ = encodeURIComponent(registrationData.duration)
        const batchQ =
          registrationData.batch_ref?.trim()
            ? `&batch_ref=${encodeURIComponent(registrationData.batch_ref.trim())}`
            : ""
        const response = await fetch(
          getBackendApiUrl(
            `courses/${encodeURIComponent(registrationData.course_id)}/payment-info?branch_id=${encodeURIComponent(registrationData.branch_id)}&duration=${durationQ}${batchQ}`
          ),
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
          }
        )

        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          const detail =
            typeof data?.detail === "string"
              ? data.detail
              : "Could not load payment details. Please go back and try again."
          if (!cancelled) {
            setPaymentInfo(null)
            setLoadError(detail)
          }
          return
        }

        const p = data?.pricing
        if (
          !p ||
          typeof p.course_fee !== "number" ||
          typeof p.total_amount !== "number" ||
          typeof p.admission_fee !== "number"
        ) {
          if (!cancelled) {
            setPaymentInfo(null)
            setLoadError("Invalid pricing data from server.")
          }
          return
        }

        if (!data.duration || data.duration === registrationData.duration) {
          data.duration = durationLabel
        }
        if (!cancelled) {
          setPaymentInfo(data as CoursePaymentInfo)
          updateRegistrationData({
            course_price: p.course_fee,
            amount: p.total_amount,
            course_currency: p.currency || registrationData.course_currency || "INR",
          })
        }
      } catch (err) {
        console.error("Error fetching payment info:", err)
        if (!cancelled) {
          setPaymentInfo(null)
          setLoadError("Network error loading payment details.")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    setLoading(true)
    fetchPaymentInfo()
    return () => {
      cancelled = true
    }
  }, [
    registrationData.course_id,
    registrationData.branch_id,
    registrationData.duration,
    registrationData.batch_ref,
    registrationData.duration_name,
    registrationData.duration_months,
    registrationData.course_currency,
  ])

  useEffect(() => {
    if (!registrationStorageReady) return
    if (loading) return
    if (!paymentPhoneE164) return
    if (!registrationData.phoneVerificationToken?.trim()) {
      router.replace("/otp-verification?next=" + encodeURIComponent("/register/payment"))
    }
  }, [
    registrationStorageReady,
    loading,
    paymentPhoneE164,
    registrationData.phoneVerificationToken,
    router,
  ])

  const subscriptionEndISO = (months: number) => {
    const d = new Date()
    d.setMonth(d.getMonth() + Math.max(1, Math.floor(months)))
    return d.toISOString()
  }

  const handlePayment = async () => {
    if (!paymentInfo) {
      setError("Payment information not loaded")
      return
    }

    const total = paymentInfo.pricing.total_amount
    if (typeof total !== "number" || !Number.isFinite(total) || total <= 0) {
      setError("Price unavailable for this selection. Please go back and choose again.")
      return
    }

    if (!paymentPhoneE164) {
      setError("Mobile number is required. Go back and complete your profile.")
      return
    }
    if (!registrationData.phoneVerificationToken?.trim()) {
      router.replace("/otp-verification?next=" + encodeURIComponent("/register/payment"))
      return
    }

    setProcessing(true)
    setError("")

    try {
      const fullName =
        [registrationData.firstName, registrationData.lastName].filter(Boolean).join(" ").trim() || "Student"
      await submitLead({
        name: fullName,
        email: registrationData.email || "",
        phone: paymentPhoneE164,
        course: paymentInfo.course_name || registrationData.course_name || "",
        source: "registration_payment",
        source_type: "registration_payment",
      })

      const orderRes = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: paymentPhoneE164,
          amount: total,
          name: fullName,
          course_name: paymentInfo.course_name,
          duration: paymentInfo.duration,
          verification_token: registrationData.phoneVerificationToken,
        }),
      })
      const orderJson = await orderRes.json().catch(() => ({}))
      if (!orderRes.ok) {
        const detail =
          typeof orderJson?.detail === "string"
            ? orderJson.detail
            : "Could not start payment. Check Razorpay keys on the server."
        throw new Error(detail)
      }
      const orderId = orderJson.order_id as string | undefined
      const amountPaise = orderJson.amount as number | undefined
      const razorpayKey =
        typeof orderJson.key === "string" && orderJson.key.trim() ? orderJson.key.trim() : undefined
      if (!orderId || typeof amountPaise !== "number") {
        throw new Error("Invalid order response from server.")
      }

      await openRazorpayCheckout({
        razorpayKeyId: razorpayKey,
        amount: total,
        amountPaise,
        currency: paymentInfo.pricing.currency,
        name: "Rock Martial Arts Academy",
        description: `${paymentInfo.course_name} - ${paymentInfo.duration}`,
        orderId,
        customerName: registrationData.fullName || fullName,
        customerEmail: registrationData.email,
        customerContact: paymentPhoneE164,
        onSuccess: async (response: RazorpayPaymentResponse) => {
          try {
            if (!response.razorpay_order_id || !response.razorpay_payment_id || !response.razorpay_signature) {
              throw new Error("Incomplete payment response from Razorpay.")
            }
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                phone: paymentPhoneE164,
                name: fullName,
                course_name: paymentInfo.course_name,
                duration: paymentInfo.duration,
                end_date: subscriptionEndISO(registrationData.duration_months || 1),
                amount: total,
                verification_token: registrationData.phoneVerificationToken,
              }),
            })
            const verifyJson = await verifyRes.json().catch(() => ({}))
            if (!verifyRes.ok) {
              const detail =
                typeof verifyJson?.detail === "string"
                  ? verifyJson.detail
                  : "Payment verification failed."
              throw new Error(detail)
            }
            if (verifyJson?.status === "failed") {
              throw new Error(verifyJson?.detail || "Payment verification failed.")
            }
            updateRegistrationData({
              paymentId: response.razorpay_payment_id,
              paymentStatus: "completed",
              paymentMethod: "razorpay",
              amount: total,
              orderId: response.razorpay_order_id,
            })
            router.replace("/register/payment-confirmation")
          } catch (e) {
            console.error(e)
            setError(e instanceof Error ? e.message : "Verification failed")
          } finally {
            setProcessing(false)
          }
        },
        onDismiss: () => {
          setProcessing(false)
          setError("Payment cancelled by user")
        },
      })
    } catch (err) {
      console.error("Payment error:", err)
      setError(err instanceof Error ? err.message : "Failed to initialize payment")
      setProcessing(false)
    }
  }

  const registrationMediaUrl = cms?.homepage?.registration_media_url
  const registrationMediaType = cms?.homepage?.registration_media_type || "auto"

  if (!registrationStorageReady || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {!registrationStorageReady ? "Restoring your session…" : "Loading payment information..."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-200 items-center justify-center relative overflow-hidden">
        <div className="w-[512px] h-[748px] bg-cover bg-center bg-no-repeat overflow-hidden rounded-xl">
          {registrationMediaUrl ? (
            registrationMediaType === "video" || /\.(mp4|webm)$/i.test(registrationMediaUrl) ? (
              <video
                src={registrationMediaUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={registrationMediaUrl}
                alt="Registration"
                className="w-full h-full object-cover"
              />
            )
          ) : (
            <div
              className="w-full h-full bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: "url('/images/payment-left.png')" }}
            />
          )}
        </div>
      </div>

      {/* Right Side - Payment Details */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-bold text-black">Payment Details</h1>
            <p className="text-gray-500 text-sm">Review your order and proceed with payment.</p>
          </div>

          {loadError && !loading && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <p className="text-amber-900 text-sm font-medium">{loadError}</p>
              <Link
                href="/register/select-course"
                className="inline-block text-sm font-semibold text-amber-800 underline"
              >
                Back to course selection
              </Link>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Payment Summary Card */}
          {paymentInfo && !loadError && (
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 space-y-6">
              {/* Course Information */}
              <div className="text-center border-b border-gray-200 pb-4">
                <h3 className="text-lg font-semibold text-black mb-1">{paymentInfo.course_name}</h3>
                <p className="text-sm text-gray-600">{paymentInfo.category_name} • {paymentInfo.branch_name}</p>
                {batchLabel ? (
                  <p className="text-sm text-gray-700 font-medium mt-1">
                    Batch: {batchLabel}
                  </p>
                ) : null}
                <p className="text-sm text-gray-500">Payment Duration: {paymentInfo.duration}</p>
              </div>

              {/* Total Amount */}
              <div className="text-center">
                <p className="text-gray-600 text-sm mb-2">Total Payable Amount ({durationLabel})</p>
                {paymentInfo.pricing.is_flat_price && paymentInfo.pricing.original_price ? (
                  <>
                    <p className="text-lg text-gray-400 line-through">₹{paymentInfo.pricing.original_price.toLocaleString()}</p>
                    <p className="text-4xl font-bold text-black">₹{paymentInfo.pricing.total_amount.toLocaleString()}</p>
                    <p className="text-sm text-green-600 font-medium mt-1">
                      You save ₹{paymentInfo.pricing.discount_amount?.toLocaleString() || 0} with this offer!
                    </p>
                  </>
                ) : (
                  <p className="text-4xl font-bold text-black">₹{paymentInfo.pricing.total_amount.toLocaleString()}</p>
                )}
              </div>

              {/* Fee Breakdown */}
              <div className="space-y-4">
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-semibold text-black mb-3">Fee Breakdown</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 px-3 bg-white rounded-lg border border-gray-100">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="text-gray-700 font-medium">Admission Fee</span>
                      </div>
                      <span className="text-gray-900 font-semibold">₹{paymentInfo.pricing.admission_fee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 px-3 bg-white rounded-lg border border-gray-100">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <span className="text-gray-700 font-medium">Course Fee ({durationLabel})</span>
                      </div>
                      <span className="text-gray-900 font-semibold">₹{paymentInfo.pricing.course_fee.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-3">
                  <div className="flex items-center justify-center space-x-2 text-gray-500 text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Powered by Razorpay</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-blue-900 mb-1">Secure Payment</h4>
                <p className="text-xs text-blue-700">Your payment is processed securely through Razorpay. We accept UPI, Credit/Debit Cards, Net Banking, and Wallets.</p>
              </div>
            </div>
          </div>

          {/* Pay Now Button */}
          <Button
            onClick={handlePayment}
            disabled={processing || !paymentInfo || !!loadError}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-white font-bold py-4 px-6 rounded-xl text-sm h-14 transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Processing...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>PAY NOW - ₹{paymentInfo?.pricing.total_amount.toLocaleString()}</span>
              </div>
            )}
          </Button>

          {/* Step Indicator */}
          <div className="text-center py-4">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Link href="/register" className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm cursor-pointer hover:bg-green-600 transition-colors">1</Link>
              <div className="w-8 h-1 bg-green-500 rounded"></div>
              <Link href="/register/select-branch" className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm cursor-pointer hover:bg-green-600 transition-colors">2</Link>
              <div className="w-8 h-1 bg-green-500 rounded"></div>
              <Link href="/register/select-course" className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm cursor-pointer hover:bg-green-600 transition-colors">3</Link>
              <div className="w-8 h-1 bg-green-500 rounded"></div>
              <div className="w-8 h-8 bg-yellow-400 text-black rounded-full flex items-center justify-center font-bold text-sm">4</div>
              <div className="w-8 h-1 bg-gray-200 rounded"></div>
              <div className="w-8 h-8 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center font-bold text-sm">5</div>
            </div>
            <span className="text-gray-500 text-sm font-medium">Step 4 of 5 - Payment</span>
          </div>
        </div>
      </div>
    </div>
  )
}
