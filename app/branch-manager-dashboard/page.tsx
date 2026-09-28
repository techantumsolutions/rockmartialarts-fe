"use client"
import { getBackendApiUrl } from "@/lib/config"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star, Users, BookOpen, Loader2, AlertCircle, MapPin, Building2, DollarSign, GraduationCap, UserCheck, TrendingUp, Calendar, RefreshCw } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Header from "@/components/layout/Header"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { dashboardAPI, DashboardStats, Coach } from "@/lib/api"
import { paymentAPI, PaymentStats, Payment } from "@/lib/paymentAPI"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"

interface BranchInfo {
  id: string
  branch: {
    name: string
    address: {
      city: string
      state: string
      line1?: string
      area?: string
    }
  }
  total_students?: number
  total_coaches?: number
  active_courses?: number
  monthly_revenue?: number
}

export default function BranchManagerDashboard() {
  const router = useRouter();
  
  // State management
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [coachesLoading, setCoachesLoading] = useState(true)
  const [coachesError, setCoachesError] = useState<string | null>(null)

  // Branch information state
  const [managedBranches, setManagedBranches] = useState<BranchInfo[]>([])
  const [branchesLoading, setBranchesLoading] = useState(true)
  const [branchesError, setBranchesError] = useState<string | null>(null)

  // Payment data state
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null)
  const [recentPayments, setRecentPayments] = useState<Payment[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(true)
  const [paymentsError, setPaymentsError] = useState<string | null>(null)

  // Authentication check
  useEffect(() => {
    if (!BranchManagerAuth.isAuthenticated()) {
      router.replace('/branch-manager/login')
      return
    }
  }, [router])

  // Load dashboard data with proper error handling
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Check authentication
      if (!BranchManagerAuth.isAuthenticated()) {
        router.replace('/branch-manager/login')
        return
      }

      const token = BranchManagerAuth.getToken()
      if (!token) {
        setError('Authentication token not found. Please login again.')
        return
      }

      console.log('🔄 Loading dashboard statistics...')

      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const pad = (n: number) => String(n).padStart(2, "0")
      const dateRange = {
        start_date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
        end_date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      }

      // Get dashboard statistics from API (period = current month for M23-S03)
      const response = await dashboardAPI.getBranchManagerDashboardStats(token, dateRange)
      console.log('📊 Dashboard stats response:', response)
      console.log('📊 Raw stats from API:', response.dashboard_stats)

      const stats = response.dashboard_stats

      // Map API response to expected format with enhanced metrics
      const dashboardStats: DashboardStats = {
        total_students: stats.active_students || 0,
        active_students: stats.active_students || 0,
        total_users: stats.total_users || 0,
        total_coaches: stats.total_coaches || 0,
        active_coaches: stats.active_coaches || 0,
        total_branches: stats.total_branches || 1,
        active_branches: stats.active_branches || 1,
        total_courses: stats.total_courses || 0,
        active_courses: stats.active_courses || 0,
        monthly_active_users: stats.monthly_active_users || 0,
        total_enrollments: stats.active_enrollments || 0,
        active_enrollments: stats.active_enrollments || 0,
        this_month_enrollments: stats.active_enrollments || 0,
        last_month_enrollments: 0,
        total_revenue: stats.total_revenue || 0,
        monthly_revenue: stats.monthly_revenue || 0,
        pending_payments: stats.pending_payments || 0,
        today_attendance: stats.today_attendance || 0
      }

      console.log('📊 Mapped dashboard stats:', dashboardStats)
      console.log('🎯 Key metrics check:')
      console.log(`   Total Students: ${dashboardStats.total_students}`)
      console.log(`   Total Coaches: ${dashboardStats.total_coaches}`)
      console.log(`   Total Courses: ${dashboardStats.total_courses}`)
      console.log(`   Total Revenue: ₹${dashboardStats.total_revenue}`)

      setDashboardStats(dashboardStats)
      console.log('✅ Dashboard stats loaded successfully and state updated')
    } catch (err) {
      console.error('❌ Error loading dashboard data:', err)
      setError('Failed to load dashboard statistics. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [router])

  const loadCoachesData = useCallback(async () => {
    try {
      setCoachesLoading(true)
      setCoachesError(null)

      // Check authentication
      if (!BranchManagerAuth.isAuthenticated()) {
        return
      }

      const token = BranchManagerAuth.getToken()
      if (!token) {
        setCoachesError('Authentication token not found. Please login again.')
        return
      }

      console.log('🔄 Loading coaches data...')

      // Get coaches data from API
      const response = await dashboardAPI.getBranchManagerCoaches(token, {
        active_only: true,
        limit: 10
      })

      console.log('👥 Coaches response:', response)
      setCoaches(response.coaches || [])
      console.log('✅ Coaches data loaded successfully')
    } catch (err) {
      console.error('❌ Error loading coaches data:', err)
      setCoachesError('Failed to load coaches data. Please try again.')
    } finally {
      setCoachesLoading(false)
    }
  }, [])

  const loadBranchesData = useCallback(async () => {
    try {
      setBranchesLoading(true)
      setBranchesError(null)

      // Check authentication
      if (!BranchManagerAuth.isAuthenticated()) {
        return
      }

      const token = BranchManagerAuth.getToken()
      if (!token) {
        setBranchesError('Authentication token not found. Please login again.')
        return
      }

      console.log('🔄 Loading managed branches...')

      // Get dashboard stats for revenue data
      let dashboardRevenue = 0
      try {
        const dashboardResponse = await fetch(`${getBackendApiUrl('dashboard/stats')}?_t=${Date.now()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          cache: 'no-cache'
        })
        if (dashboardResponse.ok) {
          const dashboardData = await dashboardResponse.json()
          dashboardRevenue = dashboardData.dashboard_stats?.monthly_revenue || 0
          console.log('💰 Dashboard revenue:', dashboardRevenue)
        }
      } catch (err) {
        console.warn('⚠️ Could not fetch dashboard revenue:', err)
      }

      // Use backend API via proxy (avoids 405 / double-slash)
      const response = await fetch(`${getBackendApiUrl('branches')}?_t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-cache'
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch branches: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log('🏢 Branches response:', data)

      const branches = data.branches || []
      console.log('🏢 Raw branches data:', branches)

      // Transform branch data to match expected interface
      const branchesWithStats: BranchInfo[] = branches.map((branch: any) => {
        const stats = branch.statistics || {}
        console.log(`🏢 Processing branch ${branch.branch?.name}:`, {
          id: branch.id,
          statistics: stats,
          student_count: stats.student_count,
          coach_count: stats.coach_count,
          active_courses: stats.active_courses,
          dashboard_revenue: dashboardRevenue
        })

        const transformedBranch = {
          id: branch.id,
          branch: {
            name: branch.branch?.name || 'Unknown Branch',
            address: {
              city: branch.branch?.address?.city || '',
              state: branch.branch?.address?.state || '',
              line1: branch.branch?.address?.line1 || '',
              area: branch.branch?.address?.area || ''
            }
          },
          // Use actual statistics from the API response
          total_students: stats.student_count || 0,
          total_coaches: stats.coach_count || 0,
          active_courses: stats.active_courses || 0,
          monthly_revenue: dashboardRevenue // Use revenue from dashboard stats
        }

        console.log(`✅ Transformed branch data:`, transformedBranch)
        return transformedBranch
      })

      setManagedBranches(branchesWithStats)
      console.log('✅ Managed branches loaded successfully:', branchesWithStats.length)
      console.log('🏢 Final branches with stats:', branchesWithStats)
    } catch (err) {
      console.error('❌ Error loading branches data:', err)
      setBranchesError('Failed to load branches data. Please try again.')
    } finally {
      setBranchesLoading(false)
    }
  }, [])

  const loadPaymentData = useCallback(async () => {
    try {
      setPaymentsLoading(true)
      setPaymentsError(null)

      // Check authentication
      if (!BranchManagerAuth.isAuthenticated()) {
        return
      }

      const token = BranchManagerAuth.getToken()
      if (!token) {
        setPaymentsError('Authentication token not found. Please login again.')
        return
      }

      console.log('🔄 Loading payment data...')

      // Get payment statistics from API
      const paymentStatsResponse = await paymentAPI.getPaymentStats(token)
      console.log('💰 Payment stats response:', paymentStatsResponse)

      // Get recent payments from API
      const recentPaymentsResponse = await paymentAPI.getRecentPayments(10, token)
      console.log('📋 Recent payments response:', recentPaymentsResponse)

      setPaymentStats(paymentStatsResponse)
      setRecentPayments(recentPaymentsResponse)
      console.log('✅ Payment data loaded successfully')
    } catch (err) {
      console.error('❌ Error loading payment data:', err)
      setPaymentsError('Failed to load payment data. Please try again.')
    } finally {
      setPaymentsLoading(false)
    }
  }, [])

  // Load all data on component mount
  useEffect(() => {
    if (BranchManagerAuth.isAuthenticated()) {
      console.log('🚀 Initializing branch manager dashboard...')
      loadBranchesData()
      loadDashboardData()
      loadCoachesData()
      loadPaymentData()
    }
  }, [loadBranchesData, loadDashboardData, loadCoachesData, loadPaymentData])

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  return (
    <>
      <Header title="Dashboard" role="branch_admin" />
      {branchesLoading ? (
        <div className="flex items-center space-x-2 mb-4">
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          <p className="text-sm text-gray-600">Loading branch information...</p>
        </div>
      ) : branchesError ? (
        <div className="flex items-center space-x-2 mb-4">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <p className="text-sm text-red-600">Error loading branches: {branchesError}</p>
        </div>
      ) : managedBranches.length > 0 ? (
        <p className="text-sm text-gray-600 mb-4">
          Managing {managedBranches.length} branch{managedBranches.length !== 1 ? "es" : ""}: {managedBranches.map((b) => b.branch.name).join(", ")}
        </p>
      ) : null}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="rounded-xl border bg-white shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                      <div className="h-8 bg-gray-200 rounded animate-pulse w-16"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-32"></div>
                    </div>
                    <div className="h-12 w-12 bg-gray-200 rounded-lg animate-pulse"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : error ? (
            <Card className="md:col-span-4 rounded-xl border bg-white shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-center space-x-3 text-red-600">
                  <AlertCircle className="w-6 h-6" />
                  <div>
                    <p className="font-medium">Failed to load dashboard statistics</p>
                    <p className="text-sm text-gray-500 mt-1">{error}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadDashboardData}
                    className="ml-4"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-green-700">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-800">
                        {dashboardStats ? paymentAPI.formatCurrency(dashboardStats.total_revenue || 0) : '₹0'}
                      </p>
                      <p className="text-xs text-green-600">All branches combined</p>
                    </div>
                    <div className="p-3 bg-green-200 rounded-lg">
                      <DollarSign className="w-6 h-6 text-green-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-blue-700">Total Students</p>
                      <p className="text-2xl font-bold text-blue-800">
                        {dashboardStats ? dashboardStats.total_students : 0}
                      </p>
                      <p className="text-xs text-blue-600">Across all branches</p>
                    </div>
                    <div className="p-3 bg-blue-200 rounded-lg">
                      <Users className="w-6 h-6 text-blue-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-purple-700">Active Courses</p>
                      <p className="text-2xl font-bold text-purple-800">
                        {dashboardStats ? dashboardStats.active_courses : 0}
                      </p>
                      <p className="text-xs text-purple-600">Available courses</p>
                    </div>
                    <div className="p-3 bg-purple-200 rounded-lg">
                      <GraduationCap className="w-6 h-6 text-purple-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-orange-700">Total Coaches</p>
                      <p className="text-2xl font-bold text-orange-800">
                        {dashboardStats ? dashboardStats.total_coaches : 0}
                      </p>
                      <p className="text-xs text-orange-600">Active instructors</p>
                    </div>
                    <div className="p-3 bg-orange-200 rounded-lg">
                      <UserCheck className="w-6 h-6 text-orange-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Managed Branches Section */}
        <div className="mb-8">
          <Card className="rounded-xl border bg-white shadow-sm hover:shadow-md transition-all">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-gray-900 text-lg font-semibold">
                <Building2 className="w-5 h-5 mr-3 text-blue-600" />
                Managed Branches
                {!branchesLoading && managedBranches.length > 0 && (
                  <Badge variant="secondary" className="ml-3 bg-blue-100 text-blue-700">
                    {managedBranches.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {branchesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Card key={index} className="bg-gray-50 rounded-xl border">
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div>
                            <div className="h-5 bg-gray-200 rounded animate-pulse mb-3"></div>
                            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                              <div key={i} className="text-center p-3 bg-white rounded-lg">
                                <div className="h-6 bg-gray-200 rounded animate-pulse mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : branchesError ? (
                <div className="text-center py-12">
                  <div className="p-4 bg-red-50 rounded-lg inline-block mb-4">
                    <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Branches</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">{branchesError}</p>
                  <Button
                    onClick={loadBranchesData}
                    variant="outline"
                    className="bg-white hover:bg-gray-50"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              ) : managedBranches.length === 0 ? (
                <div className="text-center py-12">
                  <div className="p-4 bg-gray-100 rounded-lg inline-block mb-4">
                    <Building2 className="w-8 h-8 text-gray-400 mx-auto" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Branches Assigned</h3>
                  <p className="text-gray-600 max-w-md mx-auto">No branches are currently assigned to this manager. Contact your administrator for branch assignments.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {managedBranches.map((branch) => (
                    <Card
                      key={branch.id}
                      className="bg-gradient-to-br from-white to-gray-50 rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group"
                      onClick={() => router.push(`/branch-manager-dashboard/branches/${branch.id}`)}
                    >
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg group-hover:text-blue-600 transition-colors truncate">
                              {branch.branch.name}
                            </h3>
                            <p className="text-sm text-gray-500 flex items-center mt-2">
                              <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                              {`${branch.branch.address.city}, ${branch.branch.address.state}`.replace(/^,\s*/, '') || 'Location not specified'}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                              <p className="text-lg font-bold text-blue-600">{branch.total_students || 0}</p>
                              <p className="text-xs text-gray-600 font-medium">Students</p>
                            </div>
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                              <p className="text-lg font-bold text-green-600">{branch.total_coaches || 0}</p>
                              <p className="text-xs text-gray-600 font-medium">Coaches</p>
                            </div>
                            <div className="text-center p-3 bg-purple-50 rounded-lg">
                              <p className="text-lg font-bold text-purple-600">{branch.active_courses || 0}</p>
                              <p className="text-xs text-gray-600 font-medium">Courses</p>
                            </div>
                            <div className="text-center p-3 bg-orange-50 rounded-lg">
                              <p className="text-lg font-bold text-orange-600">
                                ₹{(branch.monthly_revenue || 0).toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-600 font-medium">Revenue</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Revenue Chart and Coaches List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Revenue Chart */}
            <Card className="rounded-xl border bg-white shadow-sm hover:shadow-md transition-all">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <CardTitle className="text-gray-900 text-lg font-semibold flex items-center">
                    <TrendingUp className="w-5 h-5 mr-3 text-green-600" />
                    Revenue Overview
                  </CardTitle>
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="flex items-center space-x-2 bg-green-50 px-3 py-1 rounded-full">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-green-700 font-medium">
                        Monthly: {dashboardStats ? paymentAPI.formatCurrency(dashboardStats.monthly_revenue || 0) : '₹0'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Revenue Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-700 mb-1">
                      {dashboardStats ? paymentAPI.formatCurrency(dashboardStats.total_revenue || 0) : '₹0'}
                    </p>
                    <p className="text-sm text-green-600 font-medium">Total Revenue</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <p className="text-2xl font-bold text-orange-700 mb-1">
                      {dashboardStats ? dashboardStats.pending_payments || 0 : 0}
                    </p>
                    <p className="text-sm text-orange-600 font-medium">Pending Payments</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-700 mb-1">
                      {dashboardStats ? dashboardStats.total_enrollments || 0 : 0}
                    </p>
                    <p className="text-sm text-blue-600 font-medium">Total Enrollments</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coaches List */}
          <div className="space-y-6">
            <Card className="rounded-xl border bg-white shadow-sm hover:shadow-md transition-all">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-gray-900 text-lg font-semibold">
                  <Users className="w-5 h-5 mr-3 text-blue-600" />
                  Branch Coaches
                  {!coachesLoading && coaches.length > 0 && (
                    <Badge variant="secondary" className="ml-3 bg-blue-100 text-blue-700">
                      {coaches.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {coachesLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg animate-pulse">
                        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : coachesError ? (
                  <div className="text-center py-8">
                    <div className="p-4 bg-red-50 rounded-lg inline-block mb-4">
                      <AlertCircle className="w-6 h-6 text-red-500 mx-auto" />
                    </div>
                    <h3 className="font-medium text-gray-900 mb-2">Error Loading Coaches</h3>
                    <p className="text-sm text-gray-600 mb-4">{coachesError}</p>
                    <Button
                      onClick={loadCoachesData}
                      variant="outline"
                      size="sm"
                      className="bg-white hover:bg-gray-50"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                  </div>
                ) : coaches.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="p-4 bg-gray-100 rounded-lg inline-block mb-4">
                      <Users className="w-6 h-6 text-gray-400 mx-auto" />
                    </div>
                    <h3 className="font-medium text-gray-900 mb-2">No Coaches Found</h3>
                    <p className="text-sm text-gray-600">No coaches are currently assigned to your branches.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {coaches.slice(0, 5).map((coach) => (
                      <div
                        key={coach.id}
                        className="flex items-center space-x-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg hover:from-blue-50 hover:to-white transition-all duration-200 cursor-pointer group"
                        onClick={() => router.push(`/branch-manager-dashboard/coaches/${coach.id}`)}
                      >
                        <Avatar className="w-12 h-12 ring-2 ring-gray-100 group-hover:ring-blue-200 transition-all">
                          <AvatarImage src="" />
                          <AvatarFallback className="bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 font-semibold">
                            {coach.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                            {coach.full_name}
                          </p>
                          <p className="text-sm text-gray-600 truncate">
                            {coach.areas_of_expertise?.join(', ') || 'General Training'}
                          </p>
                          <div className="flex items-center mt-1 space-x-3">
                            <div className="flex items-center">
                              <Star className="w-3 h-3 text-yellow-400 fill-current" />
                              <span className="text-xs text-gray-500 ml-1">
                                {coach.professional_info?.professional_experience || 'New'} experience
                              </span>
                            </div>
                            <div className="flex items-center">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-500 ml-1">
                                Active
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${coach.is_active ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                          <Badge
                            variant={coach.is_active ? "default" : "secondary"}
                            className={coach.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}
                          >
                            {coach.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    ))}

                    {coaches.length > 5 && (
                      <div className="text-center pt-4">
                        <Button
                          variant="outline"
                          onClick={() => router.push('/branch-manager-dashboard/coaches')}
                          className="bg-white hover:bg-gray-50"
                        >
                          View All Coaches ({coaches.length})
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
    </>
  )
}
