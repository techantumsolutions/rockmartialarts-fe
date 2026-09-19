"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, DollarSign, Clock, Users, TrendingUp, Download, RefreshCw, Eye } from "lucide-react"
import CoachDashboardHeader from "@/components/coach-dashboard-header"
import { checkCoachAuth } from "@/lib/coachAuth"
import { useToast } from "@/hooks/use-toast"
import paymentAPI from "@/lib/paymentAPI"

interface Payment {
  id: string
  student_id?: string
  student_name?: string | null
  amount?: number | null
  payment_type?: string
  payment_method?: string | null
  payment_status: string
  transaction_id?: string | null
  payment_date?: string | null
  course_name?: string | null
  branch_name?: string | null
  created_at?: string | null
}

interface PaymentStats {
  total_collected: number
  pending_payments: number
  total_students: number
  this_month_collection: number
}

export default function CoachPaymentTrackingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [payments, setPayments] = useState<Payment[]>([])
  const [stats, setStats] = useState<PaymentStats>({
    total_collected: 0,
    pending_payments: 0,
    total_students: 0,
    this_month_collection: 0
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [exporting, setExporting] = useState(false)

  // Authentication check
  useEffect(() => {
    const authResult = checkCoachAuth()
    if (!authResult.isAuthenticated) {
      console.log("Coach not authenticated:", authResult.error)
      router.replace('/coach/login')
      return
    }
  }, [router])

  // Load payment data
  useEffect(() => {
    const loadPaymentData = async () => {
      try {
        setLoading(true)
        setError(null)

        const authResult = checkCoachAuth()
        if (!authResult.isAuthenticated || !authResult.token) {
          setError("Authentication required. Please login again.")
          return
        }

        console.log('🔍 DEBUG: Coach auth result:', {
          isAuthenticated: authResult.isAuthenticated,
          hasToken: !!authResult.token,
          coachId: authResult.coach?.id,
          tokenPreview: authResult.token?.substring(0, 20) + '...'
        })

        // Use the correct API base URL from environment
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8003'

        // Fetch payment stats and payments in parallel using coach-accessible endpoints
        const [statsResponse, paymentsResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/api/payments/stats`, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authResult.token}`
            }
          }),
          fetch(`${apiBaseUrl}/api/payments?limit=100&skip=0`, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authResult.token}`
            }
          })
        ])

        console.log('🔍 DEBUG: Payment stats response:', {
          status: statsResponse.status,
          ok: statsResponse.ok
        })

        console.log('🔍 DEBUG: Payments list response:', {
          status: paymentsResponse.status,
          ok: paymentsResponse.ok
        })

        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          console.log('🔍 DEBUG: Payment stats data:', statsData)
          setStats(statsData)
        } else {
          const errorText = await statsResponse.text()
          console.error('🔍 DEBUG: Payment stats error:', errorText)
          if (statsResponse.status === 403) {
            console.warn("Coach doesn't have access to payment stats")
            // Set default stats for coaches without payment access
            setStats({
              total_collected: 0,
              pending_payments: 0,
              total_students: 0,
              this_month_collection: 0
            })
          } else {
            setError(`Failed to load payment statistics: ${errorText}`)
          }
        }

        if (paymentsResponse.ok) {
          const paymentsData = await paymentsResponse.json()
          console.log('🔍 DEBUG: Payments data:', {
            totalPayments: paymentsData.payments?.length || 0,
            firstPayment: paymentsData.payments?.[0]
          })
          setPayments(paymentsData.payments || paymentsData || [])
        } else {
          const errorText = await paymentsResponse.text()
          console.error('🔍 DEBUG: Payments list error:', errorText)
          if (paymentsResponse.status === 403) {
            console.warn("Coach doesn't have access to payment data")
            setError("Payment tracking access is currently being configured for your account. Please contact an administrator if you need access.")
          } else {
            setError(`Failed to load payments: ${errorText}`)
          }
          setPayments([])
        }
      } catch (err) {
        console.error("Error loading payment data:", err)
        setError("Failed to load payment data")
      } finally {
        setLoading(false)
      }
    }

    loadPaymentData()
  }, [])

  // Filter payments
  const filteredPayments = payments.filter(payment => {
    const matchesSearch = !searchQuery || 
      payment.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.transaction_id?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || payment.payment_status === statusFilter
    const matchesType = typeFilter === "all" || payment.payment_type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const authResult = checkCoachAuth()
      if (!authResult.token) {
        setError("Authentication token not found. Please login again.")
        return
      }

      // Use the correct API base URL from environment
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8003'

      // Fetch fresh payment data
      const [statsResponse, paymentsResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/api/payments/stats`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authResult.token}`
          }
        }),
        fetch(`${apiBaseUrl}/api/payments?limit=100&skip=0`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authResult.token}`
          }
        })
      ])

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }

      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json()
        setPayments(paymentsData.payments || [])
        setError(null)
      }
    } catch (err) {
      console.error("Error refreshing data:", err)
      setError("Failed to refresh payment data")
    } finally {
      setRefreshing(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>
      default:
        return <Badge variant="secondary">{status || 'Unknown'}</Badge>
    }
  }

  // Handle export
  const handleExport = async () => {
    if (exporting) return
    
    setExporting(true)
    try {
      toast({
        title: "Exporting payments...",
        description: "Your payment report is being generated.",
      })

      // Use coach token for authentication
      const authResult = checkCoachAuth()
      await paymentAPI.exportPayments({
        status: statusFilter,
        payment_type: typeFilter,
        format: 'csv'
      }, authResult.token)

      toast({
        title: "Export successful",
        description: "Payment report has been downloaded.",
      })
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Failed to export payment report",
        variant: "destructive"
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CoachDashboardHeader />
      
      <main className="mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Payment Tracking</h1>
              <p className="text-gray-600">Monitor payments from your students</p>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>{exporting ? "Exporting..." : "Export CSV"}</span>
              </Button>
            </div>
          </div>

          {/* Notice for sample data */}
          {error && filteredPayments.length > 0 && (
            <div className="mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <Eye className="w-5 h-5 text-blue-600 mt-0.5" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Demo Mode</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      You're viewing sample payment data. Once payment access is configured for coaches, you'll see real payment information from your assigned students.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Payment Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.total_collected)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.pending_payments)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_students}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.this_month_collection)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by student name or transaction ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="admission_fee">Admission Fee</SelectItem>
              <SelectItem value="course_fee">Course Fee</SelectItem>
              <SelectItem value="monthly_fee">Monthly Fee</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Records</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Loading payments...</span>
              </div>
            ) : error && filteredPayments.length === 0 ? (
              <div className="text-center py-12">
                <div className="max-w-md mx-auto">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-yellow-100 rounded-full">
                      <Eye className="w-6 h-6 text-yellow-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Payment Access Limited</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <div className="space-y-2">
                      <Button onClick={handleRefresh} variant="outline" className="w-full">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Try Again
                      </Button>
                      <p className="text-xs text-gray-500">
                        If you need access to payment information, please contact your administrator.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No payments found matching your criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Method
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Transaction ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {payment.student_id ? (
                              <Link
                                href={`/coach-dashboard/students/${payment.student_id}`}
                                className="text-blue-700 hover:text-blue-900 hover:underline"
                              >
                                {payment.student_name || "Unknown Student"}
                              </Link>
                            ) : (
                              payment.student_name || "Unknown Student"
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {payment.course_name || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.amount ? formatCurrency(payment.amount) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.payment_type || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.payment_method || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(payment.payment_status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(payment.payment_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                          {payment.transaction_id || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1"
                            title="View Payment Details"
                          >
                            <Eye className="w-4 h-4 text-blue-600" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </main>
    </div>
  )
}
