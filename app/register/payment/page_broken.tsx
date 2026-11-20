"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useRegistration } from "@/contexts/RegistrationContext"

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

export default function PaymentPage() {
  const router = useRouter()
  const { registrationData, updateRegistrationData } = useRegistration()

  // Check if payment methods are enabled from environment variable
  const paymentMethodsEnabled = process.env.NEXT_PUBLIC_PAYMENT_METHODS_ENABLED === 'true'

  const [selectedMethod, setSelectedMethod] = useState(registrationData.paymentMethod || "credit_card")
  const [cardDetails, setCardDetails] = useState({
    cardNumber: registrationData.cardNumber || "",
    expiryDate: registrationData.expiryDate || "",
    cvv: registrationData.cvv || "",
    nameOnCard: registrationData.nameOnCard || "",
  })

  const [paymentInfo, setPaymentInfo] = useState<CoursePaymentInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Fetch payment information when component mounts
  useEffect(() => {
    const fetchPaymentInfo = async () => {
      if (!registrationData.course_id || !registrationData.branch_id || !registrationData.duration) {
        setError("Missing course or academy information. Please go back and complete your selection.")
        setLoading(false)
        return
      }

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/courses/${registrationData.course_id}/payment-info?` +
          `branch_id=${registrationData.branch_id}&duration=${registrationData.duration}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )

        if (response.ok) {
          const data = await response.json()
          setPaymentInfo(data)
        } else {
          // Fallback to default pricing if API fails
          setPaymentInfo({
            course_id: registrationData.course_id || "unknown",
            course_name: "Selected Course",
            category_name: "Martial Arts",
            branch_name: "Selected Academy",
            duration: registrationData.duration || "3-months",
            pricing: {
              course_fee: 15000,
              admission_fee: 1200,
              total_amount: 16200,
              currency: "INR",
              duration_multiplier: 1.0
            }
          })
        }
      } catch (error) {
        console.error('Error fetching payment info:', error)
        // Fallback to default pricing
        setPaymentInfo({
          course_id: registrationData.course_id || "unknown",
          course_name: "Selected Course",
          category_name: "Martial Arts",
          branch_name: "Selected Academy",
          duration: registrationData.duration || "3-months",
          pricing: {
            course_fee: 15000,
            admission_fee: 1200,
            total_amount: 16200,
            currency: "INR",
            duration_multiplier: 1.0
          }
        })
      } finally {
        setLoading(false)
      }
    }

    fetchPaymentInfo()
  }, [registrationData.course_id, registrationData.branch_id, registrationData.duration])

  const handleProceedToPay = (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedMethod) {
      setError("Please select a payment method")
      return
    }

    // Save payment data to context
    updateRegistrationData({
      paymentMethod: selectedMethod,
      cardNumber: cardDetails.cardNumber,
      expiryDate: cardDetails.expiryDate,
      cvv: cardDetails.cvv,
      nameOnCard: cardDetails.nameOnCard,
    })
    router.push("/register/payment-confirmation")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-200 items-center justify-center relative overflow-hidden">
        <div
          className="w-[512px] h-[748px] bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/images/payment-left.png')",
          }}
        />
      </div>

      {/* Right Side - Payment Details */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white mt-[100px]">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-bold text-black">Payment Details</h1>
            <p className="text-gray-500 text-sm">Review your order and proceed with payment.</p>
          </div>

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
          {paymentInfo && (
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 space-y-6">
              {/* Course Information */}
              <div className="text-center border-b border-gray-200 pb-4">
                <h3 className="text-lg font-semibold text-black mb-1">{paymentInfo.course_name}</h3>
                <p className="text-sm text-gray-600">{paymentInfo.category_name} • {paymentInfo.branch_name}</p>
                <p className="text-sm text-gray-500">Duration: {paymentInfo.duration}</p>
              </div>

              {/* Total Amount */}
              <div className="text-center">
                <p className="text-gray-600 text-sm mb-2">Total Payable Amount</p>
                <p className="text-4xl font-bold text-black">₹{paymentInfo.pricing.total_amount.toLocaleString()}</p>
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
                        <span className="text-gray-700 font-medium">Course Fee ({paymentInfo.duration})</span>
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
                    <span>Invoice: REG{Date.now().toString().slice(-8)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment Methods */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-black">Payment Methods</h3>
            <div className="grid grid-cols-1 gap-3">
              <div
                className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-colors ${
                  selectedMethod === 'credit_card'
                    ? 'border-yellow-400 bg-yellow-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                onClick={() => setSelectedMethod('credit_card')}
              >
                <input
                  type="radio"
                  name="payment"
                  id="card"
                  className="mr-3"
                  checked={selectedMethod === 'credit_card'}
                  onChange={() => setSelectedMethod('credit_card')}
                />
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <span className="font-medium text-gray-800">Credit/Debit Card</span>
                </div>
              </div>
              <div
                className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-colors ${
                  selectedMethod === 'upi'
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                onClick={() => setSelectedMethod('upi')}
              >
                <input
                  type="radio"
                  name="payment"
                  id="upi"
                  className="mr-3"
                  checked={selectedMethod === 'upi'}
                  onChange={() => setSelectedMethod('upi')}
                />
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="font-medium text-gray-800">UPI Payment</span>
                </div>
              </div>
              <div
                className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-colors ${
                  selectedMethod === 'digital_wallet'
                    ? 'border-purple-400 bg-purple-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                onClick={() => setSelectedMethod('digital_wallet')}
              >
                <input
                  type="radio"
                  name="payment"
                  id="wallet"
                  className="mr-3"
                  checked={selectedMethod === 'digital_wallet'}
                  onChange={() => setSelectedMethod('digital_wallet')}
                />
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <span className="font-medium text-gray-800">Digital Wallet</span>
                </div>
              </div>
            </div>
          </div>

          {/* Proceed to Pay Button */}
          <form onSubmit={handleProceedToPay}>
            <Button
              type="submit"
              className="w-full  font-bold py-4 px-6 rounded-xl text-sm h-14 transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl mt-6"
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>PROCEED TO PAY</span>
              </div>
            </Button>
          </form>

          {/* Step Indicator */}
          <div className="text-center py-4">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Link href="/register" className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm cursor-pointer hover:bg-green-600 transition-colors">1</Link>
              <div className="w-8 h-1 bg-green-500 rounded"></div>
              <Link href="/register/select-course" className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm cursor-pointer hover:bg-green-600 transition-colors">2</Link>
              <div className="w-8 h-1 bg-green-500 rounded"></div>
              <Link href="/register/select-branch" className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm cursor-pointer hover:bg-green-600 transition-colors">3</Link>
              <div className="w-8 h-1 bg-green-500 rounded"></div>
              <div className="w-8 h-8 bg-yellow-400 text-black rounded-full flex items-center justify-center font-bold text-sm">4</div>
              <div className="w-8 h-1 bg-gray-200 rounded"></div>
              <div className="w-8 h-8 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center font-bold text-sm">5</div>
            </div>
            <span className="text-gray-500 text-sm font-medium">Step 4 of 5 - Payment</span>
          </div>

        </div>
          {/* Security Notice */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="text-green-800 font-medium text-sm">Secure Payment</p>
              <p className="text-green-600 text-xs">Your payment information is encrypted and secure</p>
            </div>
          </div>

      </div>
    </div>
  )
}
