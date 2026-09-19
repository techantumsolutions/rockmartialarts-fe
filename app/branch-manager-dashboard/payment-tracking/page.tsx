"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, RefreshCw, DollarSign, Clock, Users, TrendingUp, Eye, Download } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Header from "@/components/layout/Header"
import { getBackendApiUrl } from "@/lib/config"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
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

export default function BranchManagerPaymentTrackingPage() {
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
    if (!BranchManagerAuth.isAuthenticated()) {
      router.replace('/branch-manager/login')
      return
    }
  }, [router])

  // Load payment data for branch manager from API
  useEffect(() => {
    const loadPaymentData = async () => {
      try {
        setLoading(true)
        setError(null)

        const currentUser = BranchManagerAuth.getCurrentUser()
        const token = BranchManagerAuth.getToken()

        if (!currentUser || !token) {
          throw new Error("Authentication required. Please login again.")
        }

        console.log('🔍 PAYMENT DEBUG: Current user:', currentUser)
        console.log('🔍 PAYMENT DEBUG: Token (first 50 chars):', token?.substring(0, 50))
        console.log('🔍 PAYMENT DEBUG: User role:', currentUser.role)

        console.log('Loading payments for branch manager:', currentUser.full_name)
        console.log('Branch manager branch assignment:', currentUser.branch_assignment)
        
        // First, let's get the branches this manager manages to understand the filtering
        console.log('🔍 DEBUGGING: Fetching branches first to understand filtering...')
        const branchesResponse = await fetch(getBackendApiUrl('branches?limit=100'), {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (branchesResponse.ok) {
          const branchesData = await branchesResponse.json()
          const managedBranches = branchesData.branches || []
          const branchIds = managedBranches.map((branch: any) => branch.id)
          console.log('🏢 Branches managed by this branch manager:', managedBranches.length)
          console.log('🏢 Branch IDs:', branchIds)
          managedBranches.forEach((branch: any, index: number) => {
            console.log(`   Branch ${index + 1}: ${branch.branch?.name || 'Unknown'} (ID: ${branch.id})`)
          })
        }

        // Fetch payment stats and payments in parallel
        console.log('💰 Now fetching payment data...')
        const [statsResponse, paymentsResponse] = await Promise.all([
          fetch(getBackendApiUrl('payments/stats'), {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }),
          fetch(getBackendApiUrl('payments?limit=100'), {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          })
        ])

        console.log('Payment stats API response status:', statsResponse.status)
        console.log('Payments API response status:', paymentsResponse.status)

        if (!statsResponse.ok) {
          const errorText = await statsResponse.text()
          console.error('Payment stats API error:', statsResponse.status, errorText)
          throw new Error(`Failed to load payment statistics: ${statsResponse.status} - ${errorText}`)
        }

        if (!paymentsResponse.ok) {
          const errorText = await paymentsResponse.text()
          console.error('Payments API error:', paymentsResponse.status, errorText)
          
          if (paymentsResponse.status === 401) {
            throw new Error("Authentication failed. Please login again.")
          } else if (paymentsResponse.status === 403) {
            throw new Error("You don't have permission to access payment information.")
          } else {
            throw new Error(`Failed to load payments: ${paymentsResponse.status} - ${errorText}`)
          }
        }

        const statsData = await statsResponse.json()
        const paymentsData = await paymentsResponse.json()

        console.log('💰 Payment stats response:', statsData)
        console.log('💰 Payments response:', paymentsData)

        const branchPayments = paymentsData.payments || []
        
        // Debug: Show payment data and branch associations
        console.log('💰 Processing payments:', branchPayments.length)
        branchPayments.forEach((payment: any, index: number) => {
          const branchName = payment.branch_name || 'Unknown'
          const studentName = payment.student_name || 'Unknown'
          const amount = payment.amount || 0
          console.log(`   Payment ${index + 1}: ${studentName} - ₹${amount} - Branch: ${branchName}`)
        })

        setStats(statsData)
        setPayments(branchPayments)

        if (branchPayments.length === 0) {
          console.log('No payments found for branch manager')
          setError("No payments found for your branches. This could mean no payments have been processed yet for students at your managed branches.")
        } else {
          console.log(`✅ Loaded ${branchPayments.length} payment(s) for ${currentUser.full_name}`)
        }

      } catch (err: any) {
        console.error('Error loading payment data:', err)
        setError(err.message || 'Failed to load payment information')
      } finally {
        setLoading(false)
      }
    }

    if (BranchManagerAuth.isAuthenticated()) {
      loadPaymentData()
    }
  }, [])

  // Filter payments based on search and filters
  const filteredPayments = payments.filter(payment => {
    const matchesSearch = (payment.student_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                         (payment.transaction_id?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                         (payment.course_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                         (payment.branch_name?.toLowerCase() || '').includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || payment.payment_status === statusFilter
    const matchesType = typeFilter === "all" || payment.payment_type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const token = BranchManagerAuth.getToken()
      if (!token) {
        setError("Authentication token not found. Please login again.")
        return
      }

      // Fetch fresh payment data - backend handles filtering by managed branches
      console.log('🔄 Refreshing payment data...')
      const [statsResponse, paymentsResponse] = await Promise.all([
        fetch(getBackendApiUrl('payments/stats'), {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch(getBackendApiUrl('payments?limit=100'), {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })
      ])

      if (!statsResponse.ok || !paymentsResponse.ok) {
        throw new Error('Failed to refresh payment data')
      }

      const statsData = await statsResponse.json()
      const paymentsData = await paymentsResponse.json()

      console.log('🔄 Refreshed payment data')
      setStats(statsData)
      setPayments(paymentsData.payments || [])
      setError(null)
    } catch (err: any) {
      console.error('Error refreshing payment data:', err)
      setError(err.message || 'Failed to refresh payment information')
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

      // Use branch manager token for authentication
      const token = BranchManagerAuth.getToken()
      await paymentAPI.exportPayments({
        status: statusFilter,
        payment_type: typeFilter,
        format: 'csv'
      }, token)

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
      <Header title="Payment Tracking" role="branch_admin" />
      
      <main className="w-full p-4 lg:py-4 px-19">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start py-8 mb-4 lg:items-center gap-4">
          <div>
            <h1 className="text-2xl font-medium text-gray-600">Payment Tracking</h1>
            <p className="text-sm text-gray-500 mt-1">Monitor payments from students at your branches</p>
          </div>
          <div className="flex flex-wrap gap-2 lg:gap-3">
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

        {/* Payment Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.total_collected)}</div>
              <p className="text-xs text-muted-foreground">All time collections</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.pending_payments)}</div>
              <p className="text-xs text-muted-foreground">Awaiting payment</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.this_month_collection)}</div>
              <p className="text-xs text-muted-foreground">Current month collection</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_students}</div>
              <p className="text-xs text-muted-foreground">Students in your branches</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search by student name, transaction ID, course, or branch..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="registration_fee">Registration</SelectItem>
                  <SelectItem value="monthly_fee">Monthly Fee</SelectItem>
                  <SelectItem value="course_fee">Course Fee</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Payment Records ({filteredPayments.length})
              </h2>
            </div>

            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="max-w-md mx-auto">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-red-800 mb-2">Unable to Load Payments</h3>
                    <p className="text-red-700 mb-4">{error}</p>
                    <Button
                      onClick={() => window.location.reload()}
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-12">
                <div className="max-w-md mx-auto">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-yellow-100 rounded-full">
                      <DollarSign className="w-6 h-6 text-yellow-600" />
                    </div>
                    <h3 className="text-lg font-medium text-yellow-800 mb-2">No Payments Found</h3>
                    <p className="text-yellow-700 mb-4">
                      {searchQuery
                        ? `No payments match your search "${searchQuery}"`
                        : "You don't have any payment records for your branches yet."
                      }
                    </p>
                    {!searchQuery && (
                      <div className="text-sm text-yellow-600 mb-4 text-left">
                        <p className="mb-2">This could mean:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>No students have made payments at your branches yet</li>
                          <li>Your branch manager account may not have branch assignments</li>
                          <li>The payment records are still being processed</li>
                        </ul>
                        <p className="mt-2">
                          Please contact your system administrator for assistance.
                        </p>
                      </div>
                    )}
                    <div className="flex justify-center space-x-3">
                      {searchQuery && (
                        <Button
                          variant="outline"
                          onClick={() => setSearchQuery("")}
                          className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                        >
                          Clear Search
                        </Button>
                      )}
                      <Button
                        onClick={() => window.location.reload()}
                        variant="outline"
                        className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                      >
                        Refresh
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.student_id ? (
                            <Link
                              href={`/branch-manager-dashboard/students/${payment.student_id}`}
                              className="font-medium text-blue-700 hover:text-blue-900 hover:underline"
                            >
                              {payment.student_name || "Unknown Student"}
                            </Link>
                          ) : (
                            payment.student_name || "Unknown Student"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.course_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.branch_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {formatCurrency(payment.amount || 0)}
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
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1"
                              onClick={() => router.push(`/branch-manager-dashboard/payments/${payment.id}`)}
                              title="Explore Payment Details"
                            >
                              <Eye className="w-4 h-4 text-blue-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
