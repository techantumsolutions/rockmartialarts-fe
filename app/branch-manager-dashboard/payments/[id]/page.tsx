"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, CreditCard, User, Calendar, MapPin, BookOpen, DollarSign, Receipt, Download, Mail, MessageCircle } from "lucide-react"
import Header from "@/components/layout/Header"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { paymentAPI } from "@/lib/paymentAPI"
import { invoicesAPI } from "@/lib/invoicesAPI"

interface PaymentDetails {
  id: string
  student_id?: string
  student_name?: string
  student_email?: string
  student_phone?: string
  amount?: number
  payment_type?: string
  payment_method?: string
  payment_status: string
  transaction_id?: string
  payment_date?: string
  course_name?: string
  course_id?: string
  branch_name?: string
  branch_id?: string
  created_at?: string
  notes?: string
  enrollment_id?: string
}

export default function BranchManagerPaymentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const paymentId = params.id as string

  const [payment, setPayment] = useState<PaymentDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Authentication check
  useEffect(() => {
    if (!BranchManagerAuth.isAuthenticated()) {
      router.replace('/branch-manager/login')
      return
    }
  }, [router])

  const fetchPaymentDetails = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const token = BranchManagerAuth.getToken()
      if (!token) {
        setError("Authentication required. Please login again.")
        setPayment(null)
        return
      }

      let data: PaymentDetails | null = null
      try {
        data = (await paymentAPI.getPaymentById(paymentId, token)) as PaymentDetails
      } catch {
        data = null
      }

      let invoice = null as Awaited<ReturnType<typeof invoicesAPI.getByPayment>> | null
      try {
        invoice = await invoicesAPI.getByPayment(paymentId, token)
      } catch {
        invoice = null
      }

      if (!data && !invoice) {
        setError("Payment not found")
        setPayment(null)
        return
      }

      const line = invoice?.line_items?.[0]
      setPayment({
        id: data?.id || paymentId,
        student_id: data?.student_id,
        student_name: data?.student_name || invoice?.customer?.name,
        student_email: data?.student_email || invoice?.customer?.email,
        student_phone: data?.student_phone || invoice?.customer?.phone,
        amount: data?.amount ?? invoice?.total_amount,
        payment_type: data?.payment_type || invoice?.source,
        payment_method:
          data?.payment_method ||
          invoice?.payment_gateway_label ||
          invoice?.payment_method ||
          undefined,
        payment_status: data?.payment_status || "paid",
        transaction_id: data?.transaction_id || invoice?.payment_reference || undefined,
        payment_date: data?.payment_date || invoice?.paid_at || invoice?.created_at || undefined,
        course_name: data?.course_name || line?.course_name,
        course_id: data?.course_id,
        branch_name: data?.branch_name || line?.branch_name,
        branch_id: data?.branch_id,
        created_at: data?.created_at || invoice?.created_at || undefined,
        enrollment_id: data?.enrollment_id,
      })
    } catch (err: unknown) {
      console.error("Error fetching payment details:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch payment details")
      setPayment(null)
    } finally {
      setLoading(false)
    }
  }, [paymentId])

  useEffect(() => {
    if (BranchManagerAuth.isAuthenticated()) {
      void fetchPaymentDetails()
    }
  }, [paymentId, fetchPaymentDetails])

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { color: "bg-green-100 text-green-800", label: "Paid" },
      completed: { color: "bg-green-100 text-green-800", label: "Paid" },
      pending: { color: "bg-yellow-100 text-yellow-800", label: "Pending" },
      failed: { color: "bg-red-100 text-red-800", label: "Failed" },
      refunded: { color: "bg-gray-100 text-gray-800", label: "Refunded" },
      cancelled: { color: "bg-gray-100 text-gray-800", label: "Cancelled" },
      canceled: { color: "bg-gray-100 text-gray-800", label: "Cancelled" },
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    return (
      <Badge className={`${config.color} border-0`}>
        {config.label}
      </Badge>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!BranchManagerAuth.isAuthenticated()) {
    return null // Will redirect to login
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Payment" role="branch_admin" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Payment" role="branch_admin" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-red-800 mb-2">Payment Not Found</h3>
              <p className="text-red-600 mb-4">{error || "The requested payment could not be found."}</p>
              <Button onClick={() => router.push("/branch-manager-dashboard/payment-tracking")}>
                Back to Payment Tracking
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Payment" role="branch_admin" />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.push('/branch-manager-dashboard/payment-tracking')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Payment Tracking</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Payment Details</h1>
              <p className="text-gray-600">Transaction ID: {payment.transaction_id}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" className="flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Download Receipt</span>
            </Button>
            <Button variant="outline" className="flex items-center space-x-2">
              <Mail className="w-4 h-4" />
              <span>Send Email</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Payment Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <span>Payment Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Amount</span>
                  <span className="text-2xl font-bold text-gray-900">{formatCurrency(payment.amount || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status</span>
                  {getStatusBadge(payment.payment_status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Payment Method</span>
                  <span className="text-gray-900">{payment.payment_method || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Payment Type</span>
                  <span className="text-gray-900">{payment.payment_type || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Payment Date</span>
                  <span className="text-gray-900">{payment.payment_date ? formatDate(payment.payment_date) : 'N/A'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Student Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-green-600" />
                  <span>Student Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Name</span>
                  <span className="text-gray-900">{payment.student_name || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Email</span>
                  <span className="text-gray-900">{payment.student_email || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Phone</span>
                  <span className="text-gray-900">{payment.student_phone || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Student ID</span>
                  <span className="text-gray-900 font-mono text-sm">{payment.student_id || 'N/A'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Course & Branch Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                  <span>Course & Branch Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Course</span>
                  <span className="text-gray-900">{payment.course_name || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Branch</span>
                  <span className="text-gray-900">{payment.branch_name || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Enrollment ID</span>
                  <span className="text-gray-900 font-mono text-sm">{payment.enrollment_id || 'N/A'}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push(`/branch-manager-dashboard/students/${payment.student_id}`)}
                >
                  <User className="w-4 h-4 mr-2" />
                  View Student Profile
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Contact Student
                </Button>
              </CardContent>
            </Card>

            {/* Payment Notes */}
            {payment.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 text-sm">{payment.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
