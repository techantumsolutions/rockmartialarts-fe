"use client"
import { getBackendApiUrl } from "@/lib/config"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useRegistration } from "@/contexts/RegistrationContext"
import { usePreventBackNavigation } from "@/hooks/use-prevent-back-navigation"
import { RegistrationStepIndicator } from "@/components/register/RegistrationStepIndicator"

interface PaymentCalculation {
  course_fee: number
  admission_fee: number
  total_amount: number
  currency: string
  duration_multiplier: number
}

interface CoursePaymentInfo {
  course_id: string
  course_name: string
  category_name: string
  branch_name: string
  duration: string
  pricing: PaymentCalculation
}

interface PaymentResult {
  payment_id: string
  student_id: string
  transaction_id: string
  amount: number
  status: string
  message: string
}

export default function PaymentConfirmationPage() {
  const router = useRouter()
  const { registrationData, getApiPayload, clearRegistrationData } = useRegistration()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null)
  const [transactionId, setTransactionId] = useState("")
  const [paymentInfo, setPaymentInfo] = useState<CoursePaymentInfo | null>(null)
  const [loadingPaymentInfo, setLoadingPaymentInfo] = useState(true)

  usePreventBackNavigation(true)

  // Generate transaction ID on component mount
  useEffect(() => {
    const txnId = `TXN${Date.now()}${Math.random().toString(36).substring(2, 7).toUpperCase()}`
    setTransactionId(txnId)
  }, [])

  // Build payment info from registration context
  const durationLabel = registrationData.duration_name || `${registrationData.duration_months || 1} month${(registrationData.duration_months || 1) > 1 ? 's' : ''}`
  const isFamily =
    registrationData.accountType === "family" &&
    Array.isArray(registrationData.familyStudents) &&
    registrationData.familyStudents.length > 0
  const familyStudents = registrationData.familyStudents || []

  // Fetch payment info on component mount (same API as payment page)
  useEffect(() => {
    const fetchPaymentInfo = async () => {
      if (isFamily) {
        const total = familyStudents.reduce((sum, s) => sum + (s.amount || 0), 0)
        const courseFee = familyStudents.reduce((sum, s) => sum + (s.course_price || 0), 0)
        const first = familyStudents[0]
        setPaymentInfo({
          course_id: first.course_id,
          course_name: `Family registration (${familyStudents.length} students)`,
          category_name: first.category_name || "Family",
          branch_name: first.branch_name,
          duration: "Combined",
          pricing: {
            course_fee: courseFee,
            admission_fee: Math.max(0, total - courseFee),
            total_amount: total,
            currency: registrationData.course_currency || "INR",
            duration_multiplier: 1,
          },
        })
        setLoadingPaymentInfo(false)
        return
      }

      if (!registrationData.course_id || !registrationData.branch_id || !registrationData.duration) {
        setPaymentInfo(null)
        setLoadingPaymentInfo(false)
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

        if (response.ok) {
          const data = await response.json()
          if (!data.duration || data.duration === registrationData.duration) {
            data.duration = durationLabel
          }
          setPaymentInfo(data as CoursePaymentInfo)
        } else {
          setPaymentInfo(null)
        }
      } catch (error) {
        console.error("Error fetching payment info:", error)
        setPaymentInfo(null)
      } finally {
        setLoadingPaymentInfo(false)
      }
    }

    fetchPaymentInfo()
  }, [registrationData.course_id, registrationData.branch_id, registrationData.duration, registrationData.batch_ref])

  const handleResendLink = () => {
    // Handle resend link logic
    console.log("Resending payment link...")
  }

  const handleConfirm = async () => {
    setIsLoading(true)
    setError("")

    try {
      const apiPayload = getApiPayload()
      
      // Prepare payment data
      const paymentData = {
        student_data: apiPayload,
        course_id: registrationData.course_id,
        branch_id: registrationData.branch_id,
        category_id: registrationData.category_id,
        // Send both duration id (current UI selection) and duration_months to help backend calculate validity correctly.
        duration: registrationData.duration || '1-month',
        duration_id: registrationData.duration || undefined,
        duration_months: registrationData.duration_months || undefined,
        duration_name: registrationData.duration_name || undefined,
        batch_ref: registrationData.batch_ref?.trim() || undefined,
        payment_method: 'digital_wallet',
        payment_id: registrationData.paymentId,
        order_id: registrationData.orderId,
        family_students: isFamily
          ? familyStudents.map((s) => ({
              first_name: s.firstName,
              last_name: s.lastName,
              date_of_birth: s.dob || undefined,
              gender: s.gender || undefined,
              relationship: s.relationship || "self",
              course_id: s.course_id,
              branch_id: s.branch_id,
              category_id: s.category_id,
              duration: s.duration,
              duration_months: s.duration_months || undefined,
              batch_ref: s.batch_ref?.trim() || undefined,
            }))
          : undefined,
      }

      console.log('Sending payment data:' , JSON.stringify(paymentData, null, 2))

      // Make API call to payment processing endpoint
      const response = await fetch(getBackendApiUrl('payments/process-registration'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      })

      console.log('Response status:', response.status)

      if (response.ok) {
        const result = await response.json()
        console.log('Payment processed successfully:', result)
        setPaymentResult(result)

        // Clear registration data after successful payment
        setTimeout(() => {
          clearRegistrationData()
          router.replace("/register/account-created")
        }, 2000)
      } else {
        const errorData = await response.json()
        console.error('Full error response:', JSON.stringify(errorData, null, 2))
        let errorMessage = Array.isArray(errorData.detail) ? errorData.detail.map((e: any) => e.msg).join(", ") : (errorData.detail || errorData.message || 'Payment processing failed. Please try again.');
        
        // Check if user already exists
        if (errorMessage.includes('already exists') || errorMessage.includes('User with this email')) {
          errorMessage = 'An account with this email or phone number already exists. Please login to continue or use different credentials.'
        }
        
        setError(errorMessage)
      }
    } catch (error: any) {
      console.error('Network error:', error)
      setError('Network error. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Right Side - Payment Confirmation */}
      <div className="w-full flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>

          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-black">
              {paymentResult ? 'Payment Successful!' : 'Payment Confirmation'}
            </h1>
            <div className="space-y-3">
              {paymentResult ? (
                <>
                  <p className="text-gray-600 text-base">Your registration has been completed successfully</p>
                  <p className="text-gray-600 text-base">Welcome to our martial arts academy!</p>
                </>
              ) : (
                <>
                  <p className="text-gray-600 text-base">Processing your payment and registration</p>
                  <p className="text-gray-600 text-base">Please wait while we confirm your payment</p>
                </>
              )}
            </div>
          </div>

          {/* Status Card */}
          <div className={`rounded-xl p-6 space-y-4 ${
            paymentResult
              ? 'bg-green-50 border border-green-200'
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                paymentResult
                  ? 'bg-green-400'
                  : 'bg-yellow-400'
              }`}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {paymentResult ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                </svg>
              </div>
              <div>
                <h3 className={`font-semibold ${
                  paymentResult
                    ? 'text-green-800'
                    : 'text-yellow-800'
                }`}>
                  {paymentResult ? 'Payment Completed' : 'Payment Processing'}
                </h3>
                <p className={`text-sm ${
                  paymentResult
                    ? 'text-green-700'
                    : 'text-yellow-700'
                }`}>
                  {paymentResult
                    ? 'Registration confirmed and account created'
                    : 'Awaiting payment confirmation'}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-100 space-y-3">
              {/* Course Information */}
              {paymentInfo && (
                <div className="border-b border-gray-100 pb-3">
                  <h4 className="font-semibold text-gray-800 mb-2">
                    {isFamily ? "Students" : "Course Details"}
                  </h4>
                  {isFamily ? (
                    <div className="space-y-2 text-sm">
                      {familyStudents.map((s) => (
                        <div key={s.id} className="flex justify-between gap-3">
                          <span className="text-gray-800">
                            {s.firstName} {s.lastName}
                            <span className="block text-xs text-gray-500">
                              {s.course_name} · {s.branch_name}
                            </span>
                          </span>
                          <span className="text-gray-800 shrink-0">₹{(s.amount || 0).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Course:</span>
                      <span className="text-gray-800">{paymentInfo.course_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Category:</span>
                      <span className="text-gray-800">{paymentInfo.category_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Branch:</span>
                      <span className="text-gray-800">{paymentInfo.branch_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="text-gray-800">{paymentInfo.duration}</span>
                    </div>
                  </div>
                  )}
                </div>
              )}

              {/* Payment Breakdown */}
              {paymentInfo && (
                <div className="border-b border-gray-100 pb-3">
                  <h4 className="font-semibold text-gray-800 mb-2">Payment Breakdown</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Course Fee:</span>
                      <span className="text-gray-800">₹{paymentInfo.pricing.course_fee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Admission Fee:</span>
                      <span className="text-gray-800">₹{paymentInfo.pricing.admission_fee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span className="text-gray-800">Total Amount:</span>
                      <span className="text-gray-800">₹{paymentInfo.pricing.total_amount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Transaction Details */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Transaction Details</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaction ID:</span>
                    <span className="font-mono text-gray-800">
                      {paymentResult?.transaction_id || transactionId}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      paymentResult
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {paymentResult ? 'Completed' : 'Processing'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col space-y-4">
            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-red-700 font-medium">{error}</p>
                    {error.includes('already exists') && (
                      <a href="/login" className="text-yellow-600 hover:text-yellow-700 font-medium underline mt-2 inline-block">
                        Go to Login Page
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <Button
              onClick={handleResendLink}
              variant="outline"
              className="w-full h-14 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 bg-white rounded-xl transition-all duration-200 text-gray-700 font-medium"
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>RESEND CONFIRMATION LINK</span>
              </div>
            </Button>
            
            <Button
              onClick={handleConfirm}
              disabled={isLoading}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-white font-bold py-4 px-6 rounded-xl text-sm h-14 transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <div className="flex items-center justify-center space-x-2">
                {isLoading ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>PROCESSING...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>CONFIRM & CONTINUE</span>
                  </>
                )}
              </div>
            </Button>
          </div>

          {/* Step Indicator — forward-only after payment */}
          <RegistrationStepIndicator
            accountType={registrationData.accountType === "family" ? "family" : "single"}
            currentStep={registrationData.accountType === "family" ? 4 : 5}
            disableBackLinks
          />

          {/* Help Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-blue-800 font-medium text-sm">Need Help?</p>
              <p className="text-blue-600 text-xs">Contact our support team if confirmation takes longer than expected</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
