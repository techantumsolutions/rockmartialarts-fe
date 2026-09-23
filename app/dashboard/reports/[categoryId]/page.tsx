"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft,
  Download,
  Filter,
  Search,
  FileText,
  TrendingUp,
  AlertCircle,
  Loader2,
  RefreshCw
} from "lucide-react"
import DashboardHeader from "@/components/dashboard-header"
import { reportsAPI, ReportFilters, ReportFilterOptions } from "@/lib/reportsAPI"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import ErrorBoundary from "@/components/error-boundary"
import { useReportsApi } from "@/hooks/useApiWithRetry"
import {
  CategoryPageSkeleton,
  ReportItemsGridSkeleton,
  FilterSectionSkeleton,
  InlineLoader
} from "@/components/skeleton-loaders"
import { ReportsBreadcrumb } from "@/components/breadcrumb"
import { notFound } from 'next/navigation'
import { TokenManager } from "@/lib/tokenManager"

// Branch interface (same as branches page)
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

// Report categories data (same as main dashboard)
const REPORT_CATEGORIES = [
  {
    id: "student",
    name: "Student Reports",
    icon: FileText,
    description: "Student enrollment, attendance, and performance reports",
    reports: [
      { id: "student-enrollment-summary", name: "Student Enrollment Summary", icon: FileText },
      { id: "student-attendance-report", name: "Student Attendance Report", icon: TrendingUp },
      { id: "student-performance-analysis", name: "Student Performance Analysis", icon: FileText },
      { id: "student-payment-history", name: "Student Payment History", icon: FileText },
      { id: "student-transfer-requests", name: "Student Transfer Requests", icon: FileText },
      { id: "student-course-changes", name: "Student Course Changes", icon: FileText },
      { id: "student-complaints-report", name: "Student Complaints Report", icon: FileText },
      { id: "student-demographics", name: "Student Demographics", icon: TrendingUp }
    ]
  },
  {
    id: "coach",
    name: "Coach Reports",
    icon: TrendingUp,
    description: "Comprehensive system-wide reports and administrative summaries",
    reports: [
      { id: "system-overview-dashboard", name: "System Overview Dashboard", icon: TrendingUp },
      { id: "coach-enrollment-report", name: "Coach Enrollment Report", icon: FileText },
      { id: "coach-attendance-summary", name: "Coach Attendance Summary", icon: TrendingUp },
      { id: "coach-financial-summary", name: "Coach Financial Summary", icon: FileText },
      { id: "activity-log-report", name: "Activity Log Report", icon: FileText },
      { id: "system-usage-analytics", name: "System Usage Analytics", icon: TrendingUp },
      { id: "coach-user-report", name: "Coach User Report", icon: FileText },
      { id: "notification-delivery-report", name: "Notification Delivery Report", icon: FileText }
    ]
  },
  {
    id: "course",
    name: "Course Reports",
    icon: FileText,
    description: "Course enrollment, completion rates, and performance analytics",
    reports: [
      { id: "course-enrollment-statistics", name: "Course Enrollment Statistics", icon: TrendingUp },
      { id: "course-completion-rates", name: "Course Completion Rates", icon: FileText },
      { id: "course-popularity-analysis", name: "Course Popularity Analysis", icon: TrendingUp },
      { id: "course-revenue-report", name: "Course Revenue Report", icon: FileText },
      { id: "course-category-analysis", name: "Course Category Analysis", icon: TrendingUp },
      { id: "course-duration-effectiveness", name: "Course Duration Effectiveness", icon: FileText },
      { id: "course-feedback-summary", name: "Course Feedback Summary", icon: FileText },
      { id: "course-capacity-utilization", name: "Course Capacity Utilization", icon: TrendingUp }
    ]
  },
  {
    id: "coach",
    name: "Coach Reports",
    icon: FileText,
    description: "Coach performance, assignments, ratings, and analytics",
    reports: [
      { id: "coach-performance-summary", name: "Coach Performance Summary", icon: TrendingUp },
      { id: "coach-student-assignments", name: "Coach Student Assignments", icon: FileText },
      { id: "coach-ratings-analysis", name: "Coach Ratings Analysis", icon: TrendingUp },
      { id: "coach-attendance-tracking", name: "Coach Attendance Tracking", icon: FileText },
      { id: "coach-course-load", name: "Coach Course Load", icon: FileText },
      { id: "coach-feedback-report", name: "Coach Feedback Report", icon: FileText },
      { id: "coach-productivity-metrics", name: "Coach Productivity Metrics", icon: TrendingUp },
      { id: "coach-branch-distribution", name: "Coach Branch Distribution", icon: FileText }
    ]
  },
  {
    id: "branch",
    name: "Branch Reports",
    description: "Branch-wise analytics, performance, and operational reports",
    icon: TrendingUp,
    reports: [
      { id: "branch-performance-overview", name: "Branch Performance Overview", icon: TrendingUp },
      { id: "branch-enrollment-statistics", name: "Branch Enrollment Statistics", icon: FileText },
      { id: "branch-revenue-analysis", name: "Branch Revenue Analysis", icon: TrendingUp },
      { id: "branch-capacity-utilization", name: "Branch Capacity Utilization", icon: FileText },
      { id: "branch-staff-allocation", name: "Branch Staff Allocation", icon: FileText },
      { id: "branch-operational-hours", name: "Branch Operational Hours", icon: FileText },
      { id: "branch-comparison-report", name: "Branch Comparison Report", icon: TrendingUp },
      { id: "branch-growth-trends", name: "Branch Growth Trends", icon: TrendingUp }
    ]
  },
  {
    id: "financial",
    name: "Financial Reports",
    icon: FileText,
    description: "Payment, revenue, and financial analytics reports",
    reports: [
      { id: "revenue-summary-report", name: "Revenue Summary Report", icon: TrendingUp },
      { id: "payment-collection-analysis", name: "Payment Collection Analysis", icon: FileText },
      { id: "outstanding-dues-report", name: "Outstanding Dues Report", icon: FileText },
      { id: "payment-method-analysis", name: "Payment Method Analysis", icon: TrendingUp },
      { id: "monthly-financial-summary", name: "Monthly Financial Summary", icon: FileText },
      { id: "admission-fee-collection", name: "Admission Fee Collection", icon: TrendingUp },
      { id: "course-fee-breakdown", name: "Course Fee Breakdown", icon: FileText },
      { id: "refund-and-adjustments", name: "Refund and Adjustments", icon: FileText }
    ]
  }
]

// Enhanced component with error boundary wrapper
function CategoryReportsPageContent() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()

  const categoryId = params.categoryId as string

  // Authentication check
  useEffect(() => {
    if (!TokenManager.isAuthenticated()) {
      console.log("❌ User not authenticated")
      router.push('/login')
      return
    }

    const currentUser = TokenManager.getUser()
    if (!currentUser) {
      console.log("❌ No user data found")
      router.push('/login')
      return
    }

    // Check if user is superadmin
    if (currentUser.role !== "superadmin" && currentUser.role !== "super_admin") {
      console.log("❌ User is not superadmin:", currentUser.role)
      // Redirect based on user role
      if (currentUser.role === "student") {
        router.push("/student-dashboard")
      } else if (currentUser.role === "coach") {
        router.push("/coach-dashboard")
      } else if (currentUser.role === "branch_manager") {
        router.push("/branch-manager-dashboard")
      } else {
        router.push("/login")
      }
      return
    }
  }, [router])

  // Enhanced state management
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryLoading, setCategoryLoading] = useState<string | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)

  // Student search specific state
  const [searchLoading, setSearchLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [studentResults, setStudentResults] = useState<any[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [studentExportFormat, setStudentExportFormat] = useState<"csv" | "excel">("csv")

  // Financial search specific state
  const [financialResults, setFinancialResults] = useState<any[]>([])

  // Branch search specific state
  const [branchResults, setBranchResults] = useState<any[]>([])

  // Coach search specific state
  const [coachResults, setCoachResults] = useState<any[]>([])

  // Course search specific state
  const [courseResults, setCourseResults] = useState<any[]>([])

  // Coach search specific state

  // Branch state (same as branches page)
  const [branches, setBranches] = useState<Branch[]>([])
  const [branchesLoading, setBranchesLoading] = useState(false)
  const [branchesError, setBranchesError] = useState<string | null>(null)

  // Courses state for dynamic filtering
  const [allCourses, setAllCourses] = useState<any[]>([])
  const [filteredCourses, setFilteredCourses] = useState<any[]>([])
  const [branchesWithCourses, setBranchesWithCourses] = useState<any[]>([])

  // Filter states with validation
  const [filters, setFilters] = useState<ReportFilters & {
    payment_type?: string
    payment_method?: string
    search?: string
  }>({
    session: "",
    class: "",
    section: "",
    fees_type: "",
    branch_id: "",
    course_id: "",
    date_range: "",
    status: "",
    payment_type: "",
    payment_method: "",
    search: ""
  })

  // Custom date range state
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  const [showCustomDateInputs, setShowCustomDateInputs] = useState(false)

  // Filter options state
  const [filterOptions, setFilterOptions] = useState<any>({
    branches: [],
    payment_types: [],
    payment_methods: [],
    payment_statuses: [],
    date_ranges: [],
    filter_options: {
      courses: [],
      categories: []
    }
  })

  // Use enhanced API hook with retry mechanism
  const {
    data: baseFilterOptions,
    loading,
    error,
    retry: retryLoadOptions,
    reset: resetApiState
  } = useReportsApi(
    useCallback(() => {
      const token = TokenManager.getToken()
      if (!token) throw new Error('Authentication token not available')
      return reportsAPI.getReportFilters(token)
    }, []),
    {
      maxRetries: 2,
      retryDelay: 1500,
      showErrorToast: true,
      errorMessage: 'Failed to load filter options for this category.'
    }
  )

  // Update filterOptions when baseFilterOptions changes (but not for financial category)
  useEffect(() => {
    if (baseFilterOptions && categoryId !== 'financial') {
      setFilterOptions(baseFilterOptions)
    }
  }, [baseFilterOptions, categoryId])

  // Get category information with validation
  const category = useMemo(() => {
    if (!categoryId || typeof categoryId !== 'string') return null
    return REPORT_CATEGORIES.find(cat => cat.id === categoryId) || null
  }, [categoryId])

  // Load filter options on component mount
  useEffect(() => {
    const token = TokenManager.getToken()
    if (token) {
      resetApiState()
    }
  }, [resetApiState])

  // Handle API errors with user feedback
  useEffect(() => {
    if (error && error !== lastError) {
      setLastError(error)
      console.error('Category page error:', error)
    }
  }, [error, lastError])

  // Fetch branches with courses for dynamic filtering
  useEffect(() => {
    const fetchBranchesWithCourses = async () => {
      try {
        setBranchesLoading(true)
        setBranchesError(null)

        const token = TokenManager.getToken()
        if (!token) {
          throw new Error("Authentication token not found. Please login again.")
        }

        // Use the backend API endpoint for branches with courses
        const response = await fetch(`/api/branches-with-courses`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || errorData.message || `Failed to fetch branches with courses (${response.status})`)
        }

        const data = await response.json()
        console.log("Branches with courses fetched successfully for reports:", data)

        const branchesData = data.branches || []

        // Store branches with courses for dynamic filtering
        setBranchesWithCourses(branchesData)

        // Extract branches for dropdown (maintain compatibility)
        const branchesForDropdown = branchesData.map((branch: any) => ({
          id: branch.id,
          branch: branch.branch
        }))
        setBranches(branchesForDropdown)

        // Extract all courses from all branches
        const allCoursesFromBranches: any[] = []
        branchesData.forEach((branch: any) => {
          if (branch.courses && Array.isArray(branch.courses)) {
            branch.courses.forEach((course: any) => {
              // Add branch info to course for reference
              const courseWithBranch = {
                ...course,
                branch_id: branch.id,
                branch_name: branch.branch?.name || 'Unknown Branch'
              }
              allCoursesFromBranches.push(courseWithBranch)
            })
          }
        })

        console.log("All courses extracted:", allCoursesFromBranches)
        setAllCourses(allCoursesFromBranches)
        setFilteredCourses(allCoursesFromBranches) // Initially show all courses

      } catch (error) {
        console.error('Error fetching branches with courses for reports:', error)
        setBranchesError(error instanceof Error ? error.message : 'Failed to fetch branches with courses')
        toast.error('Failed to load branches and courses for filtering')
      } finally {
        setBranchesLoading(false)
      }
    }

    // Fetch branches with courses for all report categories that have branch dropdowns
    if (categoryId && ['student', 'financial', 'branch', 'coach', 'course', 'coach'].includes(categoryId)) {
      fetchBranchesWithCourses()
    }
  }, [categoryId])

  // Load branch report filters when on branch category
  useEffect(() => {
    const loadBranchReportFilters = async () => {
      if (categoryId !== 'branch') return

      try {
        const token = TokenManager.getToken()
        if (!token) return

        const response = await reportsAPI.getBranchReportFilters(token)

        // Update filter options with branch-specific data
        setFilterOptions(prev => ({
          ...prev,
          branches: response.filters.branches,
          metrics: response.filters.metrics,
          date_ranges: response.filters.date_ranges,
          statuses: response.filters.statuses
        }))
      } catch (error) {
        console.error('Error loading branch report filters:', error)
      }
    }

    loadBranchReportFilters()
  }, [categoryId])

  // Load financial report filters when on financial category
  useEffect(() => {
    const loadFinancialReportFilters = async () => {
      if (categoryId !== 'financial') return

      try {
        const token = TokenManager.getToken()
        if (!token) {
          console.error('No authentication token available for financial filters')
          return
        }

        console.log('🔍 Loading financial report filters...')
        const response = await reportsAPI.getFinancialReportFilters(token)
        console.log('✅ Financial report filters response:', response)

        // Update filter options with financial-specific data
        setFilterOptions(prev => {
          const newOptions = {
            ...prev,
            branches: response.filters.branches || [],
            payment_types: response.filters.payment_types || [],
            payment_methods: response.filters.payment_methods || [],
            payment_statuses: response.filters.payment_statuses || [],
            date_ranges: response.filters.date_ranges || []
          }
          console.log('📊 Updated filter options:', newOptions)
          return newOptions
        })
      } catch (error) {
        console.error('❌ Error loading financial report filters:', error)
        toast.error('Failed to load financial report filter options')
      }
    }

    loadFinancialReportFilters()
  }, [categoryId])

  // Dynamic course filtering based on selected branch
  useEffect(() => {
    if (!allCourses.length) return

    const selectedBranchId = filters.branch_id

    if (!selectedBranchId || selectedBranchId === 'all') {
      // Show all courses when no branch is selected or "All Branches" is selected
      setFilteredCourses(allCourses)
    } else {
      // Filter courses for the selected branch
      const coursesForBranch = allCourses.filter(course => course.branch_id === selectedBranchId)
      setFilteredCourses(coursesForBranch)

      // Clear course selection if the currently selected course is not available in the new branch
      if (filters.course_id && filters.course_id !== 'all') {
        const isCourseAvailable = coursesForBranch.some(course => course.id === filters.course_id)
        if (!isCourseAvailable) {
          // Clear course selection
          setFilters(prev => ({ ...prev, course_id: 'all' }))
        }
      }
    }
  }, [filters.branch_id, allCourses, filters.course_id])

  // Show skeleton loading for initial load
  if (loading && !filterOptions) {
    return <CategoryPageSkeleton />
  }

  // Show skeleton loading state for initial load
  if (loading && !filterOptions) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader currentPage="Reports" />
        <main className="w-full p-4 lg:px-8 mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  const handleSearch = () => {
    toast.success('Search applied to report categories')
  }

  const buildStudentReportFilters = () => {
    const searchParams: Record<string, string | boolean | number> = {}

    if (searchQuery && searchQuery.trim().length >= 2) {
      searchParams.q = searchQuery.trim()
    }

    if (filters.branch_id && filters.branch_id !== 'all') {
      searchParams.branch_id = filters.branch_id
    }

    if (filters.course_id && filters.course_id !== 'all') {
      searchParams.course_id = filters.course_id
    }

    if (filters.status && filters.status !== 'all') {
      searchParams.is_active = filters.status === 'active'
    }

    if (filters.date_range && filters.date_range !== 'all') {
      const today = new Date()
      let startDate: Date | null = null
      let endDate: Date | null = null

      switch (filters.date_range) {
        case 'current-month':
          startDate = new Date(today.getFullYear(), today.getMonth(), 1)
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
          break
        case 'last-month':
          startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
          endDate = new Date(today.getFullYear(), today.getMonth(), 0)
          break
        case 'current-quarter': {
          const currentQuarter = Math.floor(today.getMonth() / 3)
          startDate = new Date(today.getFullYear(), currentQuarter * 3, 1)
          endDate = new Date(today.getFullYear(), (currentQuarter + 1) * 3, 0)
          break
        }
        case 'last-quarter': {
          const lastQuarter = Math.floor(today.getMonth() / 3) - 1
          const quarterYear = lastQuarter < 0 ? today.getFullYear() - 1 : today.getFullYear()
          const adjustedQuarter = lastQuarter < 0 ? 3 : lastQuarter
          startDate = new Date(quarterYear, adjustedQuarter * 3, 1)
          endDate = new Date(quarterYear, (adjustedQuarter + 1) * 3, 0)
          break
        }
        case 'current-year':
          startDate = new Date(today.getFullYear(), 0, 1)
          endDate = new Date(today.getFullYear(), 11, 31)
          break
        case 'last-year':
          startDate = new Date(today.getFullYear() - 1, 0, 1)
          endDate = new Date(today.getFullYear() - 1, 11, 31)
          break
        case 'custom':
          if (customStartDate) startDate = new Date(customStartDate)
          if (customEndDate) endDate = new Date(customEndDate)
          break
      }

      if (startDate) searchParams.start_date = startDate.toISOString()
      if (endDate) searchParams.end_date = endDate.toISOString()
    }

    return searchParams
  }

  const handleDownloadReport = async () => {
    if (categoryId !== 'student') {
      toast.info('Download comprehensive reports')
      return
    }

    const token = TokenManager.getToken()
    if (!token) {
      toast.error('Authentication required')
      return
    }

    setExportLoading(true)
    try {
      const filtersForExport = {
        ...buildStudentReportFilters(),
        format: studentExportFormat,
      }
      const result = await reportsAPI.exportStudentReports(filtersForExport as any, token)
      toast.success(
        result.total > 0
          ? `Downloaded ${result.total} student${result.total === 1 ? '' : 's'} (${result.filename})`
          : `Downloaded empty report (${result.filename})`
      )
    } catch (error: any) {
      console.error('Student export error:', error)
      toast.error(error?.message || 'Failed to export student report')
    } finally {
      setExportLoading(false)
    }
  }

  const handleViewStudentDetails = (studentId: string) => {
    if (!studentId) {
      toast.error('Student ID not available')
      return
    }
    router.push(`/dashboard/students/${studentId}`)
  }

  const handleCategoryClick = (categoryId: string) => {
    // Find the category name for better user feedback
    const category = REPORT_CATEGORIES.find(cat => cat.id === categoryId)
    const categoryName = category?.name || categoryId

    // Show loading state for this specific category
    setCategoryLoading(categoryId)

    // Navigate to the category page
    setTimeout(() => {
      setCategoryLoading(null)
      router.push(`/dashboard/reports/${categoryId}`)
      toast.success(`Opening ${categoryName}...`)
    }, 300)
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === "all" ? "" : value
    }))

    // Handle custom date range visibility
    if (key === 'date_range') {
      setShowCustomDateInputs(value === 'custom')
      if (value !== 'custom') {
        setCustomStartDate("")
        setCustomEndDate("")
      }
    }
  }

  const handleStudentSearch = async () => {
    const token = TokenManager.getToken()
    if (!token) {
      toast.error('Authentication required')
      return
    }

    setSearchLoading(true)
    setHasSearched(true)

    try {
      const searchParams: any = {
        ...buildStudentReportFilters(),
        skip: 0,
        limit: 100,
      }

      console.log('Student search parameters:', searchParams)

      const response = await reportsAPI.listStudentReportRows(token, searchParams)

      console.log('Student search response:', response)

      const students = response.students || []
      setStudentResults(students)

      const total = typeof response.total === 'number' ? response.total : students.length
      const searchMessage = searchQuery
        ? `Found ${total} student${total !== 1 ? 's' : ''} matching "${searchQuery}"`
        : `Found ${total} student${total !== 1 ? 's' : ''}`

      toast.success(searchMessage)
    } catch (error: any) {
      console.error('Error searching students:', error)
      toast.error(error?.message || 'Failed to search students. Please try again.')
      setStudentResults([])
    } finally {
      setSearchLoading(false)
    }
  }


  // Financial Reports Handler
  const handleFinancialSearch = async () => {
    const token = TokenManager.getToken()
    if (!token) {
      toast.error('Authentication required')
      return
    }

    setSearchLoading(true)
    setHasSearched(true)

    try {
      // Prepare filters for API call
      const apiFilters = {
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
      setFinancialResults(response.payments || [])

      const count = response.payments?.length || 0
      toast.success(`Found ${count} financial record${count !== 1 ? 's' : ''}`)
    } catch (error) {
      console.error('Error searching financial records:', error)
      toast.error('Failed to load financial records. Please try again.')
      setFinancialResults([])
    } finally {
      setSearchLoading(false)
    }
  }


  // Branch Reports Handler
  const handleBranchSearch = async () => {
    const token = TokenManager.getToken()
    if (!token) {
      toast.error('Authentication required')
      return
    }

    setSearchLoading(true)
    setHasSearched(true)

    try {
      // Prepare filter parameters
      const searchFilters = {
        branch_id: filters.branch_id === "all" ? undefined : filters.branch_id,
        metric: filters.metric === "all" ? undefined : filters.metric,
        date_range: filters.date_range === "all" ? undefined : filters.date_range,
        status: filters.status === "all" ? undefined : filters.status,
        skip: 0,
        limit: 50
      }

      // Call real API
      const response = await reportsAPI.getBranchReports(token, searchFilters)

      // Transform data to match expected format
      const transformedResults = response.branches.map(branch => ({
        id: branch.id,
        name: branch.branch_name || 'Unknown Branch',
        student_count: branch.active_enrollments,
        revenue: branch.total_revenue,
        status: branch.status,
        performance_score: branch.performance_score
      }))

      setBranchResults(transformedResults)
      toast.success(`Found ${transformedResults.length} branch${transformedResults.length !== 1 ? 'es' : ''}`)
    } catch (error) {
      console.error('Error searching branch reports:', error)
      toast.error('Failed to load branch reports. Please try again.')
      setBranchResults([])
    } finally {
      setSearchLoading(false)
    }
  }


  // Coach Reports Handler
  const handleCoachSearch = async () => {
    const token = TokenManager.getToken()
    if (!token) {
      toast.error('Authentication required')
      return
    }

    setSearchLoading(true)
    setHasSearched(true)

    try {
      const apiFilters: Record<string, string> = {}
      if (filters.branch_id && filters.branch_id !== 'all') apiFilters.branch_id = filters.branch_id
      if (filters.status && filters.status !== 'all') apiFilters.status = filters.status
      if (filters.experience) apiFilters.experience = filters.experience
      if (filters.rating) apiFilters.rating = filters.rating

      const response = await reportsAPI.getCoachReports(token, apiFilters)
      const coaches = response.coaches || []
      setCoachResults(coaches)
      toast.success(`Found ${coaches.length} coach${coaches.length !== 1 ? 'es' : ''}`)
    } catch (error) {
      console.error('Error searching coach reports:', error)
      toast.error('Failed to load coach reports. Please try again.')
      setCoachResults([])
    } finally {
      setSearchLoading(false)
    }
  }


  // Course Reports Handler
  const handleCourseSearch = async () => {
    const token = TokenManager.getToken()
    if (!token) {
      toast.error('Authentication required')
      return
    }

    setSearchLoading(true)
    setHasSearched(true)

    try {
      const apiFilters: Record<string, string> = {}
      if (filters.course_id) apiFilters.course_id = filters.course_id
      if (filters.category_id && filters.category_id !== 'all') apiFilters.category_id = filters.category_id
      if (filters.branch_id && filters.branch_id !== 'all') apiFilters.branch_id = filters.branch_id
      if (filters.enrollment_status && filters.enrollment_status !== 'all') apiFilters.enrollment_status = filters.enrollment_status

      const response = await reportsAPI.getCourseReports(token, apiFilters)
      const courses = response.courses || []
      setCourseResults(courses)
      toast.success(`Found ${courses.length} course${courses.length !== 1 ? 's' : ''}`)
    } catch (error) {
      console.error('Error searching course reports:', error)
      toast.error('Failed to load course reports. Please try again.')
      setCourseResults([])
    } finally {
      setSearchLoading(false)
    }
  }


  // Filter categories based on search term
  const filteredCategories = REPORT_CATEGORIES.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader currentPage="Reports" />

      <main className="w-full p-4 lg:px-8 mx-auto">


        {/* Page Header - Same as main reports page */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <p className="text-gray-600">
              Comprehensive system reports and analytics
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              className="flex items-center space-x-2"
              onClick={handleSearch}
            >
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </Button>
            <Button
              className="bg-yellow-400 hover:bg-yellow-500 text-white flex items-center space-x-2"
              onClick={handleDownloadReport}
              disabled={exportLoading || (categoryId === 'student' && searchLoading)}
            >
              {exportLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{exportLoading ? 'Downloading...' : 'Download Report'}</span>
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search report categories..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Report Categories Grid - Same as main page */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {filteredCategories.map((category) => {
            const IconComponent = category.icon
            return (
              <Card
                key={category.id}
                className="cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all duration-200 bg-white border border-gray-200 active:scale-95 h-full flex flex-col"
                onClick={() => handleCategoryClick(category.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleCategoryClick(category.id)
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`View ${category.name}`}
              >
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    {categoryLoading === category.id ? (
                      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                    ) : (
                      <IconComponent className="w-6 h-6 text-blue-600" />
                    )}
                    <CardTitle className="text-lg">
                      {category.name}
                      {categoryLoading === category.id && (
                        <span className="text-sm text-blue-600 ml-2">Opening...</span>
                      )}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <p className="text-gray-600 mb-4 flex-1">{category.description}</p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-sm text-gray-500">
                      {category.reports.length} reports available
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation() // Prevent event bubbling
                        handleCategoryClick(category.id)
                      }}
                      disabled={categoryLoading === category.id}
                      className="min-w-[100px] text-[#5A6ACF]" // Prevent button size changes
                    >
                      {categoryLoading === category.id ? 'Opening...' : 'View Reports'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Financial Reports Search/Filter Card - Only show for financial category */}
        {categoryId === 'financial' && (
          <>
            {/* Search/Filter Card */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Search Financial Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                  {/* Branch Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                    <Select
                      value={filters.branch_id || "all"}
                      onValueChange={(value) => handleFilterChange('branch_id', value)}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={loading ? "Loading..." : "Select Branch"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Branches</SelectItem>
                        {filterOptions?.branches?.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payment Type Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
                    <Select
                      value={filters.payment_type || "all"}
                      onValueChange={(value) => handleFilterChange('payment_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {filterOptions?.payment_types?.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payment Method Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                    <Select
                      value={filters.payment_method || "all"}
                      onValueChange={(value) => handleFilterChange('payment_method', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Methods</SelectItem>
                        {filterOptions?.payment_methods?.map((method) => (
                          <SelectItem key={method.id} value={method.id}>
                            {method.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payment Status Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                    <Select
                      value={filters.status || "all"}
                      onValueChange={(value) => handleFilterChange('status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        {filterOptions?.payment_statuses?.map((status) => (
                          <SelectItem key={status.id} value={status.id}>
                            {status.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Range Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                    <Select
                      value={filters.date_range || "all"}
                      onValueChange={(value) => handleFilterChange('date_range', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Date Range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        {filterOptions?.date_ranges?.map((range) => (
                          <SelectItem key={range.id} value={range.id}>
                            {range.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Search Input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                  <Input
                    type="text"
                    placeholder="Search by transaction ID, course, branch, or notes..."
                    value={filters.search || ""}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* Search Button */}
                <div className="flex justify-end">
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6"
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
                        Search Financial Records
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Results Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Financial Reports Results</CardTitle>
                {financialResults.length > 0 && (
                  <p className="text-sm text-gray-600">
                    Found {financialResults.length} financial record{financialResults.length !== 1 ? 's' : ''}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {searchLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-4 animate-spin" />
                      <p className="text-gray-600">Loading financial data...</p>
                    </div>
                  </div>
                ) : financialResults.length > 0 ? (
                  <div className="overflow-x-auto -mx-6 sm:mx-0">
                    <div className="inline-block min-w-full align-middle">
                      <table className="min-w-full border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm">Transaction ID</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm hidden sm:table-cell">Amount</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm hidden md:table-cell">Branch</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm hidden lg:table-cell">Course</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm">Status</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm hidden xl:table-cell">Method</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm hidden lg:table-cell">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {financialResults.map((record, index) => (
                            <tr key={record.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="py-3 px-4 text-sm text-gray-900">
                                {record.transaction_id || 'N/A'}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-900 hidden sm:table-cell">
                                ₹{record.amount?.toLocaleString() || '0'}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600 hidden md:table-cell">
                                {record.branch_name || 'N/A'}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600 hidden lg:table-cell">
                                {record.course_name || 'N/A'}
                              </td>
                              <td className="py-3 px-4 text-sm">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                  record.payment_status === 'paid' || record.payment_status === 'completed' ? 'bg-green-100 text-green-800' :
                                  record.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  record.payment_status === 'overdue' ? 'bg-red-100 text-red-800' :
                                  record.payment_status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {record.payment_status?.charAt(0).toUpperCase() + record.payment_status?.slice(1) || 'Unknown'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600 hidden xl:table-cell">
                                {record.payment_method?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600 hidden lg:table-cell">
                                {record.formatted_date || record.payment_date || 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-center">
                      <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-900 mb-2">No Financial Records Found</p>
                      <p className="text-gray-600">
                        No financial records match your search criteria. Try adjusting your filters.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Branch Reports Search/Filter Card - Only show for branch category */}
        {categoryId === 'branch' && (
          <>
            {/* Search/Filter Card */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Search Branch Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  {/* Branch Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                    <Select
                      value={filters.branch_id || "all"}
                      onValueChange={(value) => handleFilterChange('branch_id', value)}
                      disabled={branchesLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={branchesLoading ? "Loading branches..." : "Select Branch"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Branches</SelectItem>
                        {branches.filter(branch => branch.id && branch.branch?.name).map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.branch?.name || 'N/A'} ({branch.branch?.code || branch.id})
                          </SelectItem>
                        ))}
                        {branchesError && (
                          <SelectItem value="" disabled>
                            Error loading branches
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {branchesError && (
                      <p className="text-sm text-red-600 mt-1">
                        {branchesError}
                      </p>
                    )}
                  </div>

                  {/* Performance Metric */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Performance Metric</label>
                    <Select
                      value={filters.metric || "all"}
                      onValueChange={(value) => handleFilterChange('metric', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Metric" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Metrics</SelectItem>
                        <SelectItem value="enrollment">Enrollment Rate</SelectItem>
                        <SelectItem value="revenue">Revenue</SelectItem>
                        <SelectItem value="retention">Student Retention</SelectItem>
                        <SelectItem value="satisfaction">Satisfaction Score</SelectItem>
                        <SelectItem value="attendance">Attendance Rate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Range Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                    <Select
                      value={filters.date_range || "all"}
                      onValueChange={(value) => handleFilterChange('date_range', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Date Range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="current-month">Current Month</SelectItem>
                        <SelectItem value="last-month">Last Month</SelectItem>
                        <SelectItem value="current-quarter">Current Quarter</SelectItem>
                        <SelectItem value="last-quarter">Last Quarter</SelectItem>
                        <SelectItem value="current-year">Current Year</SelectItem>
                        <SelectItem value="last-year">Last Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Branch Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch Status</label>
                    <Select
                      value={filters.status || "all"}
                      onValueChange={(value) => handleFilterChange('status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="under-review">Under Review</SelectItem>
                        <SelectItem value="expanding">Expanding</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Search Button */}
                <div className="flex justify-end">
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                    onClick={handleBranchSearch}
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
                        Search Branch Reports
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Results Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Branch Reports Results</CardTitle>
                {branchResults.length > 0 && (
                  <p className="text-sm text-gray-600">
                    Found {branchResults.length} branch{branchResults.length !== 1 ? 'es' : ''}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {searchLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-4 animate-spin" />
                      <p className="text-gray-600">Loading branch data...</p>
                    </div>
                  </div>
                ) : branchResults.length > 0 ? (
                  <div className="overflow-x-auto -mx-6 sm:mx-0">
                    <div className="inline-block min-w-full align-middle">
                      <table className="min-w-full border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm">Branch Name</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm hidden sm:table-cell">Students</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm hidden md:table-cell">Revenue</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm">Status</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm hidden lg:table-cell">Performance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {branchResults.map((branch, index) => (
                            <tr key={branch.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="py-3 px-4 text-sm text-gray-900">{branch.name}</td>
                              <td className="py-3 px-4 text-sm text-gray-900 hidden sm:table-cell">{branch.student_count}</td>
                              <td className="py-3 px-4 text-sm text-gray-900 hidden md:table-cell">₹{branch.revenue?.toLocaleString()}</td>
                              <td className="py-3 px-4 text-sm">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                  branch.status === 'active' ? 'bg-green-100 text-green-800' :
                                  branch.status === 'inactive' ? 'bg-red-100 text-red-800' :
                                  branch.status === 'under-review' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {branch.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600 hidden lg:table-cell">{branch.performance_score}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-center">
                      <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-900 mb-2">No Branch Reports Found</p>
                      <p className="text-gray-600">
                        No branch reports match your search criteria. Try adjusting your filters.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Coach Reports Search/Filter Card - Only show for coach category */}
        {categoryId === 'coach' && (
          <>
            {/* Search/Filter Card */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Search Coach Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  {/* Branch Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                    <Select
                      value={filters.branch_id || "all"}
                      onValueChange={(value) => handleFilterChange('branch_id', value)}
                      disabled={branchesLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={branchesLoading ? "Loading branches..." : "Select Branch"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Branches</SelectItem>
                        {branches.filter(branch => branch.id && branch.branch?.name).map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.branch?.name || 'N/A'} ({branch.branch?.code || branch.id})
                          </SelectItem>
                        ))}
                        {branchesError && (
                          <SelectItem value="" disabled>
                            Error loading branches
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {branchesError && (
                      <p className="text-sm text-red-600 mt-1">
                        {branchesError}
                      </p>
                    )}
                  </div>

                  {/* Experience Level */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Experience Level</label>
                    <Select
                      value={filters.experience || "all"}
                      onValueChange={(value) => handleFilterChange('experience', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Experience" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Levels</SelectItem>
                        <SelectItem value="0-1 years">0-1 years</SelectItem>
                        <SelectItem value="1-3 years">1-3 years</SelectItem>
                        <SelectItem value="3-5 years">3-5 years</SelectItem>
                        <SelectItem value="5-10 years">5-10 years</SelectItem>
                        <SelectItem value="10+ years">10+ years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Performance Rating */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Performance Rating</label>
                    <Select
                      value={filters.rating || "all"}
                      onValueChange={(value) => handleFilterChange('rating', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Rating" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Ratings</SelectItem>
                        <SelectItem value="excellent">Excellent (90-100%)</SelectItem>
                        <SelectItem value="good">Good (80-89%)</SelectItem>
                        <SelectItem value="average">Average (70-79%)</SelectItem>
                        <SelectItem value="below-average">Below Average (60-69%)</SelectItem>
                        <SelectItem value="poor">Poor (Below 60%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Coach Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Coach Status</label>
                    <Select
                      value={filters.status || "all"}
                      onValueChange={(value) => handleFilterChange('status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="on-leave">On Leave</SelectItem>
                        <SelectItem value="probation">On Probation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Search Button */}
                <div className="flex justify-end">
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                    onClick={handleCoachSearch}
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
                        Search Coach Reports
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Results Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Coach Reports Results</CardTitle>
                {coachResults.length > 0 && (
                  <p className="text-sm text-gray-600">
                    Found {coachResults.length} coach{coachResults.length !== 1 ? 'es' : ''}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {searchLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-4 animate-spin" />
                      <p className="text-gray-600">Loading coach data...</p>
                    </div>
                  </div>
                ) : coachResults.length > 0 ? (
                  <div className="overflow-x-auto -mx-6 sm:mx-0">
                    <div className="inline-block min-w-full align-middle">
                      <table className="min-w-full border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm">Coach Name</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm hidden sm:table-cell">Branch</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm hidden md:table-cell">Experience</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm">Status</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm hidden lg:table-cell">Rating</th>
                          </tr>
                        </thead>
                        <tbody>
                          {coachResults.map((coach, index) => (
                            <tr key={coach.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="py-3 px-4 text-sm text-gray-900">{coach.name}</td>
                              <td className="py-3 px-4 text-sm text-gray-900 hidden sm:table-cell">{coach.branch}</td>
                              <td className="py-3 px-4 text-sm text-gray-900 hidden md:table-cell">{coach.experience}</td>
                              <td className="py-3 px-4 text-sm">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                  coach.status === 'active' ? 'bg-green-100 text-green-800' :
                                  coach.status === 'inactive' ? 'bg-red-100 text-red-800' :
                                  coach.status === 'on-leave' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-orange-100 text-orange-800'
                                }`}>
                                  {coach.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600 hidden lg:table-cell">{coach.rating}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-center">
                      <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-900 mb-2">No Coach Reports Found</p>
                      <p className="text-gray-600">
                        No coach reports match your search criteria. Try adjusting your filters.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Course Reports Search/Filter Card - Only show for course category */}
        {categoryId === 'course' && (
          <>
            {/* Search/Filter Card */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Search Course Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  {/* Course Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                    <Select
                      value={filters.course_id || "all"}
                      onValueChange={(value) => handleFilterChange('course_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Course" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Courses</SelectItem>
                        {filterOptions?.filter_options?.courses?.filter(course => course.id && course.title).map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Category Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <Select
                      value={filters.category_id || "all"}
                      onValueChange={(value) => handleFilterChange('category_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {filterOptions?.filter_options?.categories?.filter(category => category.id && category.name).map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Branch Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                    <Select
                      value={filters.branch_id || "all"}
                      onValueChange={(value) => handleFilterChange('branch_id', value)}
                      disabled={branchesLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={branchesLoading ? "Loading branches..." : "Select Branch"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Branches</SelectItem>
                        {branches.filter(branch => branch.id && branch.branch?.name).map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.branch?.name || 'N/A'} ({branch.branch?.code || branch.id})
                          </SelectItem>
                        ))}
                        {branchesError && (
                          <SelectItem value="" disabled>
                            Error loading branches
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {branchesError && (
                      <p className="text-sm text-red-600 mt-1">
                        {branchesError}
                      </p>
                    )}
                  </div>

                  {/* Enrollment Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Enrollment Status</label>
                    <Select
                      value={filters.enrollment_status || "all"}
                      onValueChange={(value) => handleFilterChange('enrollment_status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="open">Open for Enrollment</SelectItem>
                        <SelectItem value="full">Full</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Search Button */}
                <div className="flex justify-end">
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                    onClick={handleCourseSearch}
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
                        Search Course Reports
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Results Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Course Reports Results</CardTitle>
                {courseResults.length > 0 && (
                  <p className="text-sm text-gray-600">
                    Found {courseResults.length} course{courseResults.length !== 1 ? 's' : ''}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {searchLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-4 animate-spin" />
                      <p className="text-gray-600">Loading course data...</p>
                    </div>
                  </div>
                ) : courseResults.length > 0 ? (
                  <div className="overflow-x-auto -mx-6 sm:mx-0">
                    <div className="inline-block min-w-full align-middle">
                      <table className="min-w-full border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm">Course Name</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm hidden sm:table-cell">Category</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm hidden md:table-cell">Enrolled</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm">Status</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm hidden lg:table-cell">Instructor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {courseResults.map((course, index) => (
                            <tr key={course.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="py-3 px-4 text-sm text-gray-900">{course.title}</td>
                              <td className="py-3 px-4 text-sm text-gray-900 hidden sm:table-cell">{course.category}</td>
                              <td className="py-3 px-4 text-sm text-gray-900 hidden md:table-cell">{course.enrolled}/{course.capacity}</td>
                              <td className="py-3 px-4 text-sm">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                  course.status === 'open' ? 'bg-green-100 text-green-800' :
                                  course.status === 'full' ? 'bg-yellow-100 text-yellow-800' :
                                  course.status === 'closed' ? 'bg-red-100 text-red-800' :
                                  course.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {course.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600 hidden lg:table-cell">{course.instructor}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-center">
                      <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-900 mb-2">No Course Reports Found</p>
                      <p className="text-gray-600">
                        No course reports match your search criteria. Try adjusting your filters.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Coach Reports Search/Filter Card - Only show for coach category */}
        {categoryId === 'coach' && (
          <>
            {/* Search/Filter Card */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Search Coach Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  {/* Report Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                    <Select
                      value={filters.report_type || "all"}
                      onValueChange={(value) => handleFilterChange('report_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Report Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Reports</SelectItem>
                        <SelectItem value="enrollment">Enrollment Analytics</SelectItem>
                        <SelectItem value="financial">Financial Summary</SelectItem>
                        <SelectItem value="performance">Performance Metrics</SelectItem>
                        <SelectItem value="attendance">Attendance Analytics</SelectItem>
                        <SelectItem value="user-activity">User Activity</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Branch Scope */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch Scope</label>
                    <Select
                      value={filters.branch_id || "all"}
                      onValueChange={(value) => handleFilterChange('branch_id', value)}
                      disabled={branchesLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={branchesLoading ? "Loading branches..." : "Select Scope"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Branches</SelectItem>
                        {branches.filter(branch => branch.id && branch.branch?.name).map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.branch?.name || 'N/A'} ({branch.branch?.code || branch.id})
                          </SelectItem>
                        ))}
                        {branchesError && (
                          <SelectItem value="" disabled>
                            Error loading branches
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {branchesError && (
                      <p className="text-sm text-red-600 mt-1">
                        {branchesError}
                      </p>
                    )}
                  </div>

                  {/* Date Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                    <Select
                      value={filters.date_range || "all"}
                      onValueChange={(value) => handleFilterChange('date_range', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Date Range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="current-month">Current Month</SelectItem>
                        <SelectItem value="last-month">Last Month</SelectItem>
                        <SelectItem value="current-quarter">Current Quarter</SelectItem>
                        <SelectItem value="last-quarter">Last Quarter</SelectItem>
                        <SelectItem value="current-year">Current Year</SelectItem>
                        <SelectItem value="last-year">Last Year</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Data Granularity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Granularity</label>
                    <Select
                      value={filters.granularity || "all"}
                      onValueChange={(value) => handleFilterChange('granularity', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Granularity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Data</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Search Button */}
                <div className="flex justify-end">
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                    onClick={handleCoachSearch}
                    disabled={searchLoading}
                  >
                    {searchLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Generate Coach Report
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Results Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Coach Reports Results</CardTitle>
                {coachResults.length > 0 && (
                  <p className="text-sm text-gray-600">
                    Generated {coachResults.length} coach report{coachResults.length !== 1 ? 's' : ''}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {searchLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-4 animate-spin" />
                      <p className="text-gray-600">Generating coach reports...</p>
                    </div>
                  </div>
                ) : coachResults.length > 0 ? (
                  <div className="overflow-x-auto -mx-6 sm:mx-0">
                    <div className="inline-block min-w-full align-middle">
                      <table className="min-w-full border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm">Report Name</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm hidden sm:table-cell">Type</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm hidden md:table-cell">Scope</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm">Status</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm hidden lg:table-cell">Generated</th>
                          </tr>
                        </thead>
                        <tbody>
                          {coachResults.map((report, index) => (
                            <tr key={report.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="py-3 px-4 text-sm text-gray-900">{report.name}</td>
                              <td className="py-3 px-4 text-sm text-gray-900 hidden sm:table-cell">{report.type}</td>
                              <td className="py-3 px-4 text-sm text-gray-900 hidden md:table-cell">{report.scope}</td>
                              <td className="py-3 px-4 text-sm">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                  report.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  report.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                                  report.status === 'failed' ? 'bg-red-100 text-red-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {report.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600 hidden lg:table-cell">{report.generated_date}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-center">
                      <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-900 mb-2">No Coach Reports Generated</p>
                      <p className="text-gray-600">
                        No coach reports match your criteria. Try adjusting your filters and generate new reports.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Student Reports Search/Filter Card - Only show for student category */}
        {categoryId === 'student' && (
          <>
            {/* Search/Filter Card */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Search Student Reports</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Search Input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search Students</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      type="text"
                      placeholder="Search by name, email, or phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleStudentSearch()
                        }
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Search by student name, email, or phone number (minimum 2 characters)
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  {/* Branch Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                    <Select
                      value={filters.branch_id || "all"}
                      onValueChange={(value) => handleFilterChange('branch_id', value)}
                      disabled={branchesLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={branchesLoading ? "Loading branches..." : "Select Branch"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Branches</SelectItem>
                        {branches.filter(branch => branch.id && branch.branch?.name).map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.branch?.name || 'N/A'} ({branch.branch?.code || branch.id})
                          </SelectItem>
                        ))}
                        {branchesError && (
                          <SelectItem value="" disabled>
                            Error loading branches
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {branchesError && (
                      <p className="text-sm text-red-600 mt-1">
                        {branchesError}
                      </p>
                    )}
                  </div>

                  {/* Course Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                    <Select
                      value={filters.course_id || "all"}
                      onValueChange={(value) => handleFilterChange('course_id', value)}
                      disabled={branchesLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={branchesLoading ? "Loading courses..." : "Select Course"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Courses</SelectItem>
                        {filteredCourses.filter(course => course.id && (course.title || course.name)).map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title || course.name} ({course.code || course.id})
                          </SelectItem>
                        ))}
                        {filteredCourses.length === 0 && filters.branch_id && filters.branch_id !== 'all' && (
                          <SelectItem value="" disabled>
                            No courses available for selected branch
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {filteredCourses.length === 0 && filters.branch_id && filters.branch_id !== 'all' && (
                      <p className="text-sm text-gray-500 mt-1">
                        No courses assigned to the selected branch
                      </p>
                    )}
                  </div>

                  {/* Date Range Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                    <Select
                      value={filters.date_range || "all"}
                      onValueChange={(value) => handleFilterChange('date_range', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Date Range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="current-month">Current Month</SelectItem>
                        <SelectItem value="last-month">Last Month</SelectItem>
                        <SelectItem value="current-quarter">Current Quarter</SelectItem>
                        <SelectItem value="last-quarter">Last Quarter</SelectItem>
                        <SelectItem value="current-year">Current Year</SelectItem>
                        <SelectItem value="last-year">Last Year</SelectItem>
                        <SelectItem value="custom">Custom Date Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Custom Date Range Inputs */}
                  {showCustomDateInputs && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <Input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <Input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}

                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <Select
                      value={filters.status || "all"}
                      onValueChange={(value) => handleFilterChange('status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="graduated">Graduated</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Search + Export format */}
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                  <div className="w-full sm:w-48">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Export Format</label>
                    <Select
                      value={studentExportFormat}
                      onValueChange={(value) => setStudentExportFormat(value as "csv" | "excel")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="excel">Excel</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      Download uses your current filters
                    </p>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={handleDownloadReport}
                      disabled={exportLoading || searchLoading}
                    >
                      {exportLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Export {studentExportFormat === 'excel' ? 'Excel' : 'CSV'}
                        </>
                      )}
                    </Button>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                      onClick={handleStudentSearch}
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
                          Search Students
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Student Reports Results</CardTitle>
                {studentResults.length > 0 && (
                  <p className="text-sm text-gray-600">
                    Found {studentResults.length} student{studentResults.length !== 1 ? 's' : ''}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {searchLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-4 animate-spin" />
                      <p className="text-gray-600">Loading student data...</p>
                    </div>
                  </div>
                ) : studentResults.length > 0 ? (
                  <div className="overflow-x-auto -mx-6 sm:mx-0">
                    <div className="inline-block min-w-full align-middle">
                      <table className="min-w-full border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm">Student Details</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm hidden sm:table-cell">Contact</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm hidden md:table-cell">Courses</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm hidden lg:table-cell">Branch</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm">Status</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm hidden xl:table-cell">Registration</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {studentResults.map((student, index) => (
                            <tr key={student.id || index} className="hover:bg-gray-50 transition-colors">
                              {/* Student Details */}
                              <td className="py-4 px-4">
                                <div className="flex items-center">
                                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                                    <span className="text-blue-600 font-medium text-sm">
                                      {(student.full_name || student.first_name || 'N').charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-gray-900 truncate">
                                      {student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'N/A'}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                      ID: {student.id?.substring(0, 8) || 'N/A'}
                                    </p>
                                    {student.date_of_birth && (
                                      <p className="text-xs text-gray-400 truncate">
                                        DOB: {new Date(student.date_of_birth).toLocaleDateString()}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Contact Information */}
                              <td className="py-4 px-4 hidden sm:table-cell">
                                <div className="text-sm">
                                  <p className="text-gray-900 truncate">{student.email || 'No email'}</p>
                                  <p className="text-gray-500 truncate">{student.phone || 'No phone'}</p>
                                  {student.gender && (
                                    <p className="text-xs text-gray-400 capitalize">{student.gender}</p>
                                  )}
                                </div>
                              </td>

                              {/* Courses */}
                              <td className="py-4 px-4 hidden md:table-cell">
                                <div className="text-sm">
                                  {student.courses && student.courses.length > 0 ? (
                                    <div className="space-y-1">
                                      {student.courses.slice(0, 2).map((course: any, idx: number) => (
                                        <div key={idx} className="flex items-center">
                                          <span className="inline-flex px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded">
                                            {course.name || course.title || 'Unknown Course'}
                                          </span>
                                        </div>
                                      ))}
                                      {student.courses.length > 2 && (
                                        <p className="text-xs text-gray-500">
                                          +{student.courses.length - 2} more
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-xs">No courses</span>
                                  )}
                                </div>
                              </td>

                              {/* Branch */}
                              <td className="py-4 px-4 hidden lg:table-cell">
                                <div className="text-sm">
                                  {student.branches && student.branches.length > 0 ? (
                                    <div className="space-y-1">
                                      {student.branches.slice(0, 1).map((branch: any, idx: number) => (
                                        <div key={idx}>
                                          <p className="text-gray-900 truncate">{branch.name || 'Unknown Branch'}</p>
                                          {branch.code && (
                                            <p className="text-xs text-gray-500">({branch.code})</p>
                                          )}
                                        </div>
                                      ))}
                                      {student.branches.length > 1 && (
                                        <p className="text-xs text-gray-500">
                                          +{student.branches.length - 1} more
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-xs">No branch</span>
                                  )}
                                </div>
                              </td>

                              {/* Status */}
                              <td className="py-4 px-4">
                                <div className="flex flex-col space-y-1">
                                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                    student.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {student.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                  {student.total_enrollments > 0 && (
                                    <span className="text-xs text-gray-500">
                                      {student.active_enrollments}/{student.total_enrollments} enrollments
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Registration Date */}
                              <td className="py-4 px-4 text-gray-900 text-sm hidden xl:table-cell">
                                <div className="text-sm">
                                  {student.created_at ? (
                                    <>
                                      <p>{new Date(student.created_at).toLocaleDateString()}</p>
                                      <p className="text-xs text-gray-500">
                                        {new Date(student.created_at).toLocaleDateString('en-US', {
                                          month: 'short',
                                          year: 'numeric'
                                        })}
                                      </p>
                                    </>
                                  ) : (
                                    'N/A'
                                  )}
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="py-4 px-4">
                                <div className="flex space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewStudentDetails(student.id)}
                                    className="text-xs px-2 py-1"
                                  >
                                    View
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : hasSearched ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-900 mb-2">No Students Found</p>
                      <p className="text-gray-600">
                        No students match your search criteria. Try adjusting your filters.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-900 mb-2">Search for Students</p>
                      <p className="text-gray-600">
                        Use the filters above to search for student reports and data.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}

// Main component wrapped with error boundary
export default function CategoryReportsPage() {
  return (
    <ErrorBoundary
      title="Category Reports Error"
      description="The category reports page encountered an unexpected error. Please try refreshing the page or return to the main reports dashboard."
      showRetry={true}
      showHome={true}
      showBack={true}
      onError={(error, errorInfo) => {
        console.error('Category reports page error:', error, errorInfo)
      }}
    >
      <CategoryReportsPageContent />
    </ErrorBoundary>
  )
}
