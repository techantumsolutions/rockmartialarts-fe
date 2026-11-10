"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Download,
  Search,
  Loader2,
  AlertCircle,
  Users,
  BookOpen,
  MapPin,
  Award,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Building,
  DollarSign,
  TrendingUp,
  RefreshCw
} from "lucide-react"
import Header from "@/components/layout/Header"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { reportsAPI } from "@/lib/reportsAPI"
import { toast } from "sonner"

interface FilterState {
  branch_id: string
  course_id: string
  category_id: string
  status: string
  search: string
  payment_type?: string
  payment_method?: string
  date_range?: string
}

interface Branch {
  id: string
  branch: {
    name: string
    code: string
    email: string
    phone: string
    address: {
      line1: string
      area: string
      city: string
      state: string
      pincode: string
      country: string
    }
  }
  manager_id: string
  is_active?: boolean
  operational_details: {
    courses_offered: string[]
    timings: Array<{
      day: string
      open: string
      close: string
    }>
    holidays: string[]
  }
  assignments: {
    accessories_available: boolean
    courses: string[]
    branch_admins: string[]
  }
  bank_details: {
    bank_name: string
    account_number: string
    upi_id: string
  }
  statistics?: {
    coach_count: number
    student_count: number
    course_count: number
    active_courses: number
  }
  created_at: string
  updated_at: string
}

// Function to fetch real data based on category
const fetchCategoryData = async (category: string) => {
  const currentUser = BranchManagerAuth.getCurrentUser()
  const token = BranchManagerAuth.getToken()

  if (!currentUser || !token) {
    throw new Error("Authentication required. Please login again.")
  }

  switch (category) {
    case 'branch':
      // Fetch real branch data from API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/branches?limit=100`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Branches API error:', response.status, errorText)

        if (response.status === 401) {
          throw new Error("Authentication failed. Please login again.")
        } else if (response.status === 403) {
          throw new Error("You don't have permission to access branch information.")
        } else {
          throw new Error(`Failed to load branches: ${response.status} - ${errorText}`)
        }
      }

      const branchData = await response.json()
      console.log('✅ Branch Reports API response:', branchData)

      const branchesData = branchData.branches || []

      // Transform branch data to match the expected format for the table
      return branchesData.map((branch: Branch) => ({
        id: branch.id,
        name: branch.branch.name,
        location: `${branch.branch.address.city}, ${branch.branch.address.state}`,
        address: `${branch.branch.address.line1}, ${branch.branch.address.area}, ${branch.branch.address.city}`,
        manager_name: 'Branch Manager', // We don't have manager name in the response
        student_count: branch.statistics?.student_count || 0,
        coach_count: branch.statistics?.coach_count || 0,
        course_count: branch.statistics?.course_count || 0,
        status: branch.is_active ? 'active' : 'inactive',
        created_at: branch.created_at,
        email: branch.branch.email,
        phone: branch.branch.phone,
        code: branch.branch.code
      }))

    case 'course':
      // Get the branch manager's branch ID
      const branchManagerBranchId = currentUser.branch_id || currentUser.managed_branches?.[0]

      if (!branchManagerBranchId) {
        throw new Error("Branch manager is not assigned to any branch.")
      }

      console.log('🔍 Fetching courses for branch:', branchManagerBranchId)

      // Fetch real course data from API
      const courseResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/courses/by-branch/${branchManagerBranchId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!courseResponse.ok) {
        const errorText = await courseResponse.text()
        console.error('Courses API error:', courseResponse.status, errorText)

        if (courseResponse.status === 401) {
          throw new Error("Authentication failed. Please login again.")
        } else if (courseResponse.status === 403) {
          console.warn('Branch manager access restricted - returning empty course list')
          // Return empty array for 403 errors (branch manager can only see their own branch courses)
          return []
        } else if (courseResponse.status === 404) {
          console.info('No courses found for branch - returning empty course list')
          // Return empty array for 404 errors (no courses assigned to branch)
          return []
        } else {
          throw new Error(`Failed to load courses: ${courseResponse.status} - ${errorText}`)
        }
      }

      const courseData = await courseResponse.json()
      console.log('✅ Courses API response:', courseData)

      const coursesData = courseData.courses || []

      // Transform course data to match the expected format for the table
      return coursesData.map((course: any) => ({
        id: course.id,
        name: course.title || course.name || 'Untitled Course',
        code: course.code || 'N/A',
        category: course.category_name || 'General',
        difficulty_level: course.difficulty_level || 'Beginner',
        instructor_name: course.instructor_name || 'TBA',
        instructor_id: course.instructor_id || null,
        max_students: course.student_requirements?.max_students || 0,
        enrolled_students: course.enrolled_students || 0,
        active_enrollments: course.active_enrollments || 0,
        total_enrollments: course.total_enrollments || 0,
        completion_rate: course.completion_rate || 0,
        pricing: course.pricing?.amount || 0,
        currency: course.pricing?.currency || 'INR',
        duration_months: course.duration_months || 3,
        status: course.settings?.active ? 'active' : 'inactive',
        offers_certification: course.settings?.offers_certification || false,
        created_at: course.created_at,
        updated_at: course.updated_at,
        description: course.description || 'No description available'
      }))

    case 'financial':
      // Get the branch manager's branch ID for filtering
      const managerBranchId = currentUser.branch_id || currentUser.managed_branches?.[0]

      if (!managerBranchId) {
        throw new Error("Branch manager is not assigned to any branch.")
      }

      console.log('🔍 Fetching financial data for branch:', managerBranchId)

      // Fetch financial reports from API with branch filtering
      const financialResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/reports/financial?branch_id=${managerBranchId}&limit=100`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!financialResponse.ok) {
        const errorText = await financialResponse.text()
        console.error('Financial API error:', financialResponse.status, errorText)

        if (financialResponse.status === 401) {
          throw new Error("Authentication failed. Please login again.")
        } else if (financialResponse.status === 403) {
          throw new Error("You don't have permission to access financial information.")
        } else {
          throw new Error(`Failed to load financial data: ${financialResponse.status} - ${errorText}`)
        }
      }

      const financialData = await financialResponse.json()
      console.log('✅ Financial API response:', financialData)

      const payments = financialData.payments || []

      // Transform payment data to match the expected format for the table
      return payments.map((payment: any) => ({
        id: payment.id || payment._id,
        transaction_id: payment.transaction_id,
        student_name: payment.student_details?.full_name || payment.student_name || 'Unknown Student',
        course_name: payment.course_details?.course_name || payment.course_name || 'Unknown Course',
        branch_name: payment.branch_details?.branch_name || payment.branch_name || 'Unknown Branch',
        amount: payment.amount || 0,
        payment_method: payment.payment_method || 'Unknown',
        payment_type: payment.payment_type || 'Unknown',
        payment_status: payment.payment_status || 'pending',
        payment_date: payment.payment_date || payment.created_at,
        due_date: payment.due_date,
        notes: payment.notes || '',
        status: payment.payment_status || 'pending',
        created_at: payment.created_at,
        updated_at: payment.updated_at
      }))

    default:
      // No mock data — return empty array for unhandled categories
      console.warn(`[reports] No API handler for category "${category}". Returning empty results.`)
      return []
  }
}



export default function BranchManagerCategoryReportsPage() {
  const params = useParams()
  const router = useRouter()
  const categoryId = params.categoryId as string

  // State management
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reportData, setReportData] = useState<any[]>([])
  const [filteredData, setFilteredData] = useState<any[]>([])

  // Filter states
  const [filters, setFilters] = useState<FilterState>({
    branch_id: "",
    course_id: "",
    category_id: "",
    status: "",
    search: "",
    payment_type: "",
    payment_method: "",
    date_range: ""
  })

  // Financial search specific state
  const [searchLoading, setSearchLoading] = useState(false)
  const [filterOptions, setFilterOptions] = useState<{
    branches: any[]
    payment_types: any[]
    payment_methods: any[]
    payment_statuses: any[]
    date_ranges: any[]
  }>({
    branches: [],
    payment_types: [],
    payment_methods: [],
    payment_statuses: [],
    date_ranges: []
  })

  // Authentication check
  useEffect(() => {
    if (!BranchManagerAuth.isAuthenticated()) {
      router.replace('/branch-manager/login')
      return
    }
  }, [router])

  // Load data when category changes
  useEffect(() => {
    const loadCategoryData = async () => {
      if (!BranchManagerAuth.isAuthenticated()) {
        return
      }

      try {
        setLoading(true)
        setError(null)

        console.log(`Loading ${categoryId} data for branch manager reports...`)
        const data = await fetchCategoryData(categoryId)

        console.log(`✅ Loaded ${data.length} ${categoryId} records`)
        setReportData(data)
        setFilteredData(data)
      } catch (err: any) {
        console.error(`Error loading ${categoryId} data:`, err)
        setError(err.message || `Failed to load ${categoryId} information`)
        setReportData([])
        setFilteredData([])
      } finally {
        setLoading(false)
      }
    }

    loadCategoryData()
  }, [categoryId])

  // Filter data when filters change
  useEffect(() => {
    let filtered = [...reportData]

    if (filters.search) {
      filtered = filtered.filter(item =>
        Object.values(item).some(value =>
          String(value).toLowerCase().includes(filters.search.toLowerCase())
        )
      )
    }

    if (filters.status && filters.status !== 'all_status') {
      filtered = filtered.filter(item => item.status === filters.status)
    }

    setFilteredData(filtered)
  }, [filters, reportData])



  // Retry function for failed requests
  const retryLoadData = async () => {
    if (!BranchManagerAuth.isAuthenticated()) {
      router.replace('/branch-manager/login')
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log(`Retrying ${categoryId} data load...`)
      const data = await fetchCategoryData(categoryId)

      console.log(`✅ Retry successful: Loaded ${data.length} ${categoryId} records`)
      setReportData(data)
      setFilteredData(data)
    } catch (err: any) {
      console.error(`Retry failed for ${categoryId} data:`, err)
      setError(err.message || `Failed to load ${categoryId} information`)
    } finally {
      setLoading(false)
    }
  }

  // Load financial report filters when on financial category
  useEffect(() => {
    const loadFinancialReportFilters = async () => {
      if (categoryId !== 'financial') return

      try {
        const token = BranchManagerAuth.getToken()
        if (!token) return

        const response = await reportsAPI.getFinancialReportFilters(token)

        // Update filter options with financial-specific data
        setFilterOptions(prev => ({
          ...prev,
          branches: response.filters.branches,
          payment_types: response.filters.payment_types,
          payment_methods: response.filters.payment_methods,
          payment_statuses: response.filters.payment_statuses,
          date_ranges: response.filters.date_ranges
        }))
      } catch (error) {
        console.error('Error loading financial report filters:', error)
      }
    }

    loadFinancialReportFilters()
  }, [categoryId])

  // Financial Reports Handler
  const handleFinancialSearch = async () => {
    const token = BranchManagerAuth.getToken()
    if (!token) {
      toast.error('Authentication required')
      return
    }

    setSearchLoading(true)

    try {
      // Prepare filters for API call
      const apiFilters: any = {
        branch_id: filters.branch_id || undefined,
        payment_type: filters.payment_type || undefined,
        payment_method: filters.payment_method || undefined,
        payment_status: filters.status || undefined,
        date_range: filters.date_range || undefined,
        search: filters.search || undefined,
        skip: 0,
        limit: 50
      }

      // Remove undefined values and 'all' values
      Object.keys(apiFilters).forEach(key => {
        if (apiFilters[key] === undefined || apiFilters[key] === 'all' || apiFilters[key] === '') {
          delete apiFilters[key]
        }
      })

      const response = await reportsAPI.getFinancialReports(token, apiFilters)
      const payments = response.payments || []

      // Transform payment data to match the expected format for the main table
      const transformedData = payments.map((payment: any) => ({
        id: payment.id || payment._id,
        transaction_id: payment.transaction_id,
        student_name: payment.student_details?.full_name || payment.student_name || 'Unknown Student',
        course_name: payment.course_details?.course_name || payment.course_name || 'Unknown Course',
        branch_name: payment.branch_details?.branch_name || payment.branch_name || 'Unknown Branch',
        amount: payment.amount || 0,
        payment_method: payment.payment_method || 'Unknown',
        payment_type: payment.payment_type || 'Unknown',
        payment_status: payment.payment_status || 'pending',
        payment_date: payment.payment_date || payment.created_at,
        due_date: payment.due_date,
        notes: payment.notes || '',
        status: payment.payment_status || 'pending',
        created_at: payment.created_at,
        updated_at: payment.updated_at
      }))

      // Update the main table data with search results
      setReportData(transformedData)
      setFilteredData(transformedData)

      const count = transformedData.length
      toast.success(`Found ${count} financial record${count !== 1 ? 's' : ''}`)
    } catch (error) {
      console.error('Error searching financial records:', error)
      toast.error('Failed to load financial records. Please try again.')
      // Reset to original data on error
      const data = await fetchCategoryData(categoryId)
      setReportData(data)
      setFilteredData(data)
    } finally {
      setSearchLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Reports" role="branch_admin" />

      <main className="w-full p-4 lg:px-8 mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/branch-manager-dashboard/reports')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Reports
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {categoryId.charAt(0).toUpperCase() + categoryId.slice(1)} Reports
              </h1>
              <p className="text-gray-600">
                {categoryId === 'branch' ? 'Branch performance and analytics' :
                 categoryId === 'student' ? 'Student enrollment and performance' :
                 categoryId === 'course' ? 'Course popularity and completion' :
                 categoryId === 'financial' ? 'Revenue and payment analytics' :
                 categoryId === 'operational' ? 'Operations and efficiency metrics' :
                 'Comprehensive analytics and insights'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => alert('PDF export is not available yet.')}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => alert('Excel export is not available yet.')}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total {categoryId === 'branch' ? 'Branches' :
                       categoryId === 'student' ? 'Students' :
                       categoryId === 'course' ? 'Courses' :
                       categoryId === 'financial' ? 'Revenue' :
                       categoryId === 'operational' ? 'Operations' : 'Records'}
              </CardTitle>
              {categoryId === 'branch' ? <Building className="h-4 w-4 text-muted-foreground" /> :
               categoryId === 'student' ? <Users className="h-4 w-4 text-muted-foreground" /> :
               categoryId === 'course' ? <BookOpen className="h-4 w-4 text-muted-foreground" /> :
               categoryId === 'financial' ? <DollarSign className="h-4 w-4 text-muted-foreground" /> :
               categoryId === 'operational' ? <TrendingUp className="h-4 w-4 text-muted-foreground" /> :
               <Award className="h-4 w-4 text-muted-foreground" />}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  filteredData.length.toLocaleString()
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {categoryId === 'financial' ? 'Total amount' : 'Total count'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active {categoryId === 'branch' ? 'Branches' :
                        categoryId === 'student' ? 'Students' :
                        categoryId === 'course' ? 'Courses' :
                        categoryId === 'financial' ? 'Payments' :
                        categoryId === 'operational' ? 'Operations' : 'Records'}
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  filteredData.filter(item =>
                    categoryId === 'student' ? item.status === 'active' :
                    categoryId === 'course' ? item.status === 'active' :
                    categoryId === 'financial' ? item.status === 'paid' :
                    categoryId === 'operational' ? item.status === 'success' :
                    item.status === 'active'
                  ).length.toLocaleString()
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {categoryId === 'financial' ? 'Pending' : 'Inactive'} {categoryId === 'branch' ? 'Branches' :
                                                                        categoryId === 'student' ? 'Students' :
                                                                        categoryId === 'course' ? 'Courses' :
                                                                        categoryId === 'financial' ? 'Payments' :
                                                                        categoryId === 'operational' ? 'Operations' : 'Records'}
              </CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  filteredData.filter(item =>
                    categoryId === 'student' ? item.status === 'inactive' :
                    categoryId === 'course' ? item.status === 'inactive' :
                    categoryId === 'financial' ? item.status === 'pending' :
                    categoryId === 'operational' ? item.status === 'pending' :
                    item.status === 'inactive'
                  ).length.toLocaleString()
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {categoryId === 'financial' ? 'Awaiting payment' : 'Not active'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {categoryId === 'course' ? 'Total Enrollments' : 'Growth Rate'}
              </CardTitle>
              {categoryId === 'course' ? (
                <Users className="h-4 w-4 text-blue-600" />
              ) : (
                <TrendingUp className="h-4 w-4 text-blue-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : categoryId === 'course' ? (
                  filteredData.reduce((total, course) => total + (course.total_enrollments || course.enrolled_students || 0), 0).toLocaleString()
                ) : (
                  "+12.5%"
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {categoryId === 'course' ? 'Across all courses' : 'From last month'}
              </p>
            </CardContent>
          </Card>
        </div>



        {/* Financial Reports Search/Filter Card - Only show for financial category */}
        {categoryId === 'financial' && (
          <>
            {/* Search/Filter Card */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Financial Reports Search
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
                  {/* Search */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Transaction ID, Student, Course..."
                        value={filters.search || ""}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Payment Type */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Payment Type</label>
                    <Select
                      value={filters.payment_type || "all"}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, payment_type: value === "all" ? "" : value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {filterOptions.payment_types.map((type: any) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Payment Method</label>
                    <Select
                      value={filters.payment_method || "all"}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, payment_method: value === "all" ? "" : value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Methods" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Methods</SelectItem>
                        {filterOptions.payment_methods.map((method: any) => (
                          <SelectItem key={method.id} value={method.id}>
                            {method.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payment Status */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Payment Status</label>
                    <Select
                      value={filters.status || "all"}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === "all" ? "" : value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {filterOptions.payment_statuses.map((status: any) => (
                          <SelectItem key={status.id} value={status.id}>
                            {status.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Range */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date Range</label>
                    <Select
                      value={filters.date_range || "all"}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, date_range: value === "all" ? "" : value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Dates" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Dates</SelectItem>
                        {filterOptions.date_ranges.map((range: any) => (
                          <SelectItem key={range.id} value={range.id}>
                            {range.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Search Button */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium invisible">Search</label>
                    <Button
                      className="text-white w-full"
                      onClick={handleFinancialSearch}
                      disabled={searchLoading}
                    >
                      {searchLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4 mr-2" />
                          Search
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Reset Button */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium invisible">Reset</label>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={async () => {
                        // Clear all filters
                        setFilters({
                          branch_id: "",
                          course_id: "",
                          category_id: "",
                          status: "",
                          search: "",
                          payment_type: "",
                          payment_method: "",
                          date_range: ""
                        })

                        // Reload original financial data
                        try {
                          const data = await fetchCategoryData(categoryId)
                          setReportData(data)
                          setFilteredData(data)
                          toast.success('Filters cleared - showing all financial records')
                        } catch (error) {
                          console.error('Error reloading data:', error)
                          toast.error('Failed to reload data')
                        }
                      }}
                      disabled={searchLoading}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>


          </>
        )}

        {/* Main Data Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                {categoryId === 'financial' ? 'Financial Records' :
                 categoryId.charAt(0).toUpperCase() + categoryId.slice(1) + ' Data'}
              </span>
              <Badge variant="secondary">
                {filteredData.length} records
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading {categoryId} data...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">Error Loading Data</p>
                <p className="text-gray-600 mb-4">{error}</p>
                <Button onClick={retryLoadData} className="text-white">
                  Try Again
                </Button>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">No Data Found</p>
                <p className="text-gray-600">
                  No {categoryId} records found. Try adjusting your filters or check back later.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {categoryId === 'financial' ? (
                        <>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Transaction ID</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Student</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Course</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Branch</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Amount</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Method</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Date</th>
                        </>
                      ) : categoryId === 'branch' ? (
                        <>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Branch Name</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Location</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Students</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Coaches</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Courses</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                        </>
                      ) : categoryId === 'course' ? (
                        <>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Course Name</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Category</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Instructor</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Enrolled</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Max Students</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Price</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                        </>
                      ) : (
                        <>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Name</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item: any, index: number) => (
                      <tr key={item.id || index} className="border-b border-gray-100 hover:bg-gray-50">
                        {categoryId === 'financial' ? (
                          <>
                            <td className="py-3 px-4 text-sm font-medium text-blue-600">
                              {item.transaction_id || 'N/A'}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-900">
                              {item.student_name || 'Unknown'}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {item.course_name || 'Unknown'}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {item.branch_name || 'Unknown'}
                            </td>
                            <td className="py-3 px-4 text-sm font-medium text-gray-900">
                              ₹{item.amount?.toLocaleString() || '0'}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {item.payment_method || 'Unknown'}
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={
                                  item.payment_status === 'paid' || item.payment_status === 'completed'
                                    ? 'default'
                                    : item.payment_status === 'pending'
                                    ? 'secondary'
                                    : 'destructive'
                                }
                              >
                                {item.payment_status || item.status || 'pending'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {item.payment_date ? new Date(item.payment_date).toLocaleDateString() : 'N/A'}
                            </td>
                          </>
                        ) : categoryId === 'branch' ? (
                          <>
                            <td className="py-3 px-4 text-sm font-medium text-gray-900">
                              {item.name}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {item.location}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {item.student_count || 0}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {item.coach_count || 0}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {item.course_count || 0}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                                {item.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : categoryId === 'course' ? (
                          <>
                            <td className="py-3 px-4 text-sm font-medium text-gray-900">
                              {item.name}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {item.category}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {item.instructor_name || 'TBA'}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {item.enrolled_students || item.active_enrollments || 0}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {item.max_students || 0}
                            </td>
                            <td className="py-3 px-4 text-sm font-medium text-gray-900">
                              ₹{item.pricing?.toLocaleString() || '0'}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                                {item.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-3 px-4 text-sm font-medium text-gray-900">
                              {item.name}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                                {item.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}