"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  AlertCircle,
  BarChart3,
  TrendingUp,
  RefreshCw,
  Filter,
  Search,
  Calendar as CalendarIcon,
  PieChart,
  Users,
  DollarSign,
  BookOpen,
  Building
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import Header from "@/components/layout/Header"
import { reportsAPI } from "@/lib/reportsAPI"
import { toast } from "sonner"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import BranchSelectionField from "@/components/layout/BranchSelectionField"
import { useDebounce } from "@/hooks/usePerformance"

// Filter state interface
interface FilterState {
  date_range: string
  branch_id: string
  course_id: string
  category_id: string
  status: string
  search: string
}

// Chart data interface
interface ChartData {
  labels: string[]
  datasets: Array<{
    label: string
    data: number[]
    backgroundColor?: string[]
    borderColor?: string
    borderWidth?: number
  }>
}

// Report categories data (same as main dashboard)
const REPORT_CATEGORIES = [
  {
    id: "coach",
    name: "Coach Reports",
    icon: Users,
    description: "Comprehensive coach (coach) information and analytics",
    reports: [
      { id: "coach-overview", name: "Coach Overview", icon: Users },
      { id: "coach-performance", name: "Coach Performance", icon: TrendingUp },
      { id: "coach-assignments", name: "Coach Assignments", icon: FileText },
    ]
  },
  {
    id: "branch",
    name: "Branch Reports",
    icon: Building,
    description: "Branch-specific analytics, performance, and operational reports",
    reports: [
      { id: "branch-performance-overview", name: "Branch Performance Overview", icon: TrendingUp },
      { id: "branch-enrollment-statistics", name: "Branch Enrollment Statistics", icon: FileText },
      { id: "branch-revenue-analysis", name: "Branch Revenue Analysis", icon: TrendingUp },
      { id: "branch-capacity-utilization", name: "Branch Capacity Utilization", icon: FileText },
      { id: "branch-staff-allocation", name: "Branch Staff Allocation", icon: FileText },
      { id: "branch-operational-hours", name: "Branch Operational Hours", icon: FileText },
    ]
  },
  {
    id: "student",
    name: "Student Reports",
    icon: Users,
    description: "Student enrollment, attendance, and performance analytics",
    reports: [
      { id: "student-enrollment-trends", name: "Student Enrollment Trends", icon: TrendingUp },
      { id: "student-attendance-summary", name: "Student Attendance Summary", icon: FileText },
      { id: "student-performance-analytics", name: "Student Performance Analytics", icon: TrendingUp },
      { id: "student-demographics", name: "Student Demographics", icon: FileText },
      { id: "student-retention-analysis", name: "Student Retention Analysis", icon: TrendingUp },
      { id: "student-feedback-summary", name: "Student Feedback Summary", icon: FileText },
    ]
  },
  {
    id: "course",
    name: "Course Reports",
    icon: BookOpen,
    description: "Course popularity, completion rates, and effectiveness metrics",
    reports: [
      { id: "course-popularity-analysis", name: "Course Popularity Analysis", icon: TrendingUp },
      { id: "course-completion-rates", name: "Course Completion Rates", icon: FileText },
      { id: "course-revenue-breakdown", name: "Course Revenue Breakdown", icon: TrendingUp },
      { id: "course-capacity-analysis", name: "Course Capacity Analysis", icon: FileText },
      { id: "course-instructor-performance", name: "Course Instructor Performance", icon: TrendingUp },
      { id: "course-feedback-analysis", name: "Course Feedback Analysis", icon: FileText },
    ]
  },
  {
    id: "financial",
    name: "Financial Reports",
    icon: DollarSign,
    description: "Revenue, payments, and financial performance tracking",
    reports: [
      { id: "revenue-summary", name: "Revenue Summary", icon: TrendingUp },
      { id: "payment-collection-report", name: "Payment Collection Report", icon: FileText },
      { id: "outstanding-dues-analysis", name: "Outstanding Dues Analysis", icon: TrendingUp },
      { id: "refund-and-adjustments", name: "Refund and Adjustments", icon: FileText },
      { id: "financial-forecasting", name: "Financial Forecasting", icon: TrendingUp },
      { id: "expense-tracking", name: "Expense Tracking", icon: FileText },
    ]
  },
  {
    id: "operational",
    name: "Operational Reports",
    icon: FileText,
    description: "Daily operations, scheduling, and resource utilization",
    reports: [
      { id: "daily-operations-summary", name: "Daily Operations Summary", icon: TrendingUp },
      { id: "resource-utilization", name: "Resource Utilization", icon: FileText },
      { id: "scheduling-efficiency", name: "Scheduling Efficiency", icon: TrendingUp },
      { id: "equipment-maintenance", name: "Equipment Maintenance", icon: FileText },
      { id: "facility-usage-analysis", name: "Facility Usage Analysis", icon: TrendingUp },
      { id: "operational-costs", name: "Operational Costs", icon: FileText },
    ]
  }
]

export default function BranchManagerIndividualReport() {
  const params = useParams()
  const router = useRouter()
  const categoryId = params.categoryId as string
  const reportId = params.reportId as string

  // State management
  const [loading, setLoading] = useState(false)
  const [filtersLoading, setFiltersLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reportData, setReportData] = useState<any>(null)
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [filterOptions, setFilterOptions] = useState<any>(null)
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  })

  // Get current branch manager data for filtering
  const currentBranchManager = BranchManagerAuth.getCurrentUser()
  const branchManagerBranchId = currentBranchManager?.branch_id

  // Filter states - automatically set branch_id to current branch manager's branch
  const [filters, setFilters] = useState<FilterState>({
    date_range: "current-month",
    branch_id: branchManagerBranchId || "",
    course_id: "",
    category_id: "",
    status: "",
    search: ""
  })

  // Search state for debouncing
  const [searchInput, setSearchInput] = useState("")
  const debouncedSearchTerm = useDebounce(searchInput, 500)

  // Authentication check
  useEffect(() => {
    if (!BranchManagerAuth.isAuthenticated()) {
      router.replace('/branch-manager/login')
      return
    }
  }, [router])

  // Update filters when debounced search term changes
  useEffect(() => {
    setFilters(prev => ({ ...prev, search: debouncedSearchTerm }))
  }, [debouncedSearchTerm])

  // Update branch_id filter when branch manager data is available
  useEffect(() => {
    if (branchManagerBranchId) {
      setFilters(prev => ({ ...prev, branch_id: branchManagerBranchId }))
    }
  }, [branchManagerBranchId])

  // Find the current category and report
  const currentCategory = REPORT_CATEGORIES.find(cat => cat.id === categoryId)
  const currentReport = currentCategory?.reports.find(report => report.id === reportId)

  if (!currentCategory || !currentReport) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Report Not Found</h2>
          <p className="text-gray-600">The requested report could not be found.</p>
          <Button
            onClick={() => router.push('/branch-manager-dashboard/reports')}
            className="mt-4"
          >
            Back to Reports
          </Button>
        </div>
      </div>
    )
  }

  // Handle filter changes
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchInput(value)
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      date_range: "current-month",
      branch_id: branchManagerBranchId || "",
      course_id: "",
      category_id: "",
      status: "",
      search: ""
    })
    setSearchInput("")
    setDateRange({ from: undefined, to: undefined })
  }

  // Export functionality
  const handleExport = (format: 'pdf' | 'excel') => {
    toast.success(`Exporting ${currentReport?.name} as ${format.toUpperCase()}...`)
    // TODO: Implement actual export functionality
  }

  // Refresh data
  const handleRefresh = () => {
    loadReportData()
  }

  // Retry loading data
  const retryLoadData = () => {
    setError(null)
    loadReportData()
  }

  // Get chart label based on report type
  const getChartLabel = () => {
    if (categoryId === 'financial') return 'Revenue (₹)'
    if (categoryId === 'student') return 'Student Count'
    if (categoryId === 'course') return 'Enrollments'
    if (categoryId === 'coach') return 'Coach Count'
    return 'Performance'
  }

  // Fetch course popularity data from API
  const fetchCoursePopularityData = async (token: string, branchId: string) => {
    try {
      console.log('🔍 Fetching course popularity data for branch:', branchId)

      // Fetch course reports from the backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/reports/courses?branch_id=${branchId}&limit=100`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication failed. Please login again.")
        }
        throw new Error(`Failed to fetch course data: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ Course Reports API response:', data)

      const courseReports = data.course_reports || {}
      const enrollmentStats = courseReports.course_enrollment_statistics || []
      const completionStats = courseReports.course_completion_statistics || []

      // Transform data for the report
      const coursePopularityData = enrollmentStats.map((course: any) => {
        const completionData = completionStats.find((comp: any) => comp._id === course._id)

        return {
          id: course._id,
          title: course.title || 'Unknown Course',
          code: course.code || 'N/A',
          category_name: course.category_name || 'General',
          total_enrollments: course.total_enrollments || 0,
          active_enrollments: course.active_enrollments || 0,
          completion_rate: completionData?.completion_rate || 0,
          popularity_score: calculatePopularityScore(course.total_enrollments, course.active_enrollments, completionData?.completion_rate || 0),
          enrollment_rate: course.total_enrollments > 0 ? ((course.active_enrollments / course.total_enrollments) * 100).toFixed(1) : '0.0'
        }
      }).sort((a: any, b: any) => b.popularity_score - a.popularity_score) // Sort by popularity

      // Calculate summary statistics
      const totalCourses = coursePopularityData.length
      const totalEnrollments = coursePopularityData.reduce((sum: number, course: any) => sum + course.total_enrollments, 0)
      const avgCompletionRate = totalCourses > 0
        ? (coursePopularityData.reduce((sum: number, course: any) => sum + course.completion_rate, 0) / totalCourses).toFixed(1)
        : '0.0'
      const topPerformingCourses = coursePopularityData.filter((course: any) => course.popularity_score > 70).length

      return {
        title: "Course Popularity Analysis",
        branch_id: branchId,
        branch_name: currentBranchManager?.branch_name || "Branch",
        generated_at: new Date().toISOString(),
        data: {
          summary: {
            total_courses: totalCourses,
            total_enrollments: totalEnrollments,
            average_completion_rate: avgCompletionRate + '%',
            top_performing_courses: topPerformingCourses
          },
          courses: coursePopularityData,
          charts: [
            {
              type: "bar",
              title: "Course Popularity Ranking",
              data: coursePopularityData.slice(0, 10).map((course: any) => ({
                name: course.title,
                enrollments: course.total_enrollments,
                completion_rate: course.completion_rate,
                popularity_score: course.popularity_score
              }))
            }
          ]
        }
      }
    } catch (error) {
      console.error('❌ Error fetching course popularity data:', error)
      throw error
    }
  }

  // Calculate popularity score based on enrollments and completion rate
  const calculatePopularityScore = (totalEnrollments: number, activeEnrollments: number, completionRate: number) => {
    // Weighted score: 40% total enrollments, 30% active enrollments, 30% completion rate
    const enrollmentScore = Math.min((totalEnrollments / 50) * 40, 40) // Max 40 points for enrollments
    const activeScore = Math.min((activeEnrollments / 30) * 30, 30) // Max 30 points for active enrollments
    const completionScore = (completionRate / 100) * 30 // Max 30 points for completion rate

    return Math.round(enrollmentScore + activeScore + completionScore)
  }

  // Load report data
  const loadReportData = useCallback(async () => {
    if (!currentBranchManager || !branchManagerBranchId) {
      toast.error("Branch manager authentication required")
      return
    }

    setLoading(true)
    setError(null)
    try {
      const token = BranchManagerAuth.getToken()
      if (!token) {
        throw new Error("Authentication token not found")
      }

      // Load real data based on report type
      if (reportId === 'course-popularity-analysis') {
        const courseData = await fetchCoursePopularityData(token, branchManagerBranchId)
        setReportData(courseData)
      } else {
        // For other reports, use mock data for now
        const mockData = generateMockReportData(reportId, branchManagerBranchId)
        setReportData(mockData)
      }

      toast.success("Report data loaded successfully")
    } catch (error) {
      console.error('Error loading report data:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load report data'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [currentBranchManager, branchManagerBranchId, reportId])

  // Generate mock data for demonstration
  const generateMockReportData = (reportId: string, branchId: string) => {
    // This would be replaced with real API calls in production
    return {
      title: currentReport?.name || "Report",
      branch_id: branchId,
      branch_name: currentBranchManager?.branch_name || "Branch",
      generated_at: new Date().toISOString(),
      data: {
        summary: {
          total_records: Math.floor(Math.random() * 100) + 50,
          active_records: Math.floor(Math.random() * 80) + 30,
          growth_rate: (Math.random() * 20 - 10).toFixed(1) + "%"
        },
        charts: [
          {
            type: "bar",
            title: "Monthly Trends",
            data: Array.from({length: 6}, (_, i) => ({
              month: new Date(2024, i, 1).toLocaleDateString('en-US', {month: 'short'}),
              value: Math.floor(Math.random() * 100) + 20
            }))
          }
        ]
      }
    }
  }

  useEffect(() => {
    if (currentReport && currentBranchManager) {
      loadReportData()
    }
  }, [currentReport, currentBranchManager, loadReportData])

  if (!currentCategory || !currentReport) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Reports" role="branch_admin" />
        <main className="w-full p-4 lg:py-4 px-19">
          <div className="mx-auto">
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Report Not Found</h2>
              <p className="text-gray-600 mb-6">The requested report could not be found.</p>
              <Button onClick={() => router.push("/branch-manager-dashboard/reports")}>
                Back to Reports
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Reports" role="branch_admin" />
      
      <main className="w-full p-4 lg:py-4 px-19">
        <div className="mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/branch-manager-dashboard/reports/${categoryId}`)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to {currentCategory.name}</span>
            </Button>
          </div>

          {/* Report Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <currentReport.icon className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{currentReport.name}</h1>
                  <p className="text-gray-600">Branch: {currentBranchManager?.branch_name}</p>
                </div>
              </div>
              <div className="flex space-x-3">
                <Button variant="outline" onClick={() => handleExport('excel')}>
                  <Download className="w-4 h-4 mr-2" />
                  Excel
                </Button>
                <Button variant="outline" onClick={() => handleExport('pdf')}>
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </Button>
                <Button onClick={handleRefresh} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          {/* Filters Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="w-5 h-5" />
                <span>Filters</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start pb-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search..."
                    className="pl-10"
                    value={searchInput}
                    onChange={(e) => handleSearchChange(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap justify-between">
                {/* Branch Filter - Disabled for branch managers */}
                <BranchSelectionField readOnly />

                {/* Course Filter */}
                <Select
                  value={filters.course_id || "all"}
                  onValueChange={(value) => handleFilterChange('course_id', value)}
                  disabled={filtersLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {filterOptions?.filter_options?.courses?.map((course: any) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Status Filter */}
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
                    {categoryId === 'financial' && (
                      <>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>

                {/* Date Range Filter */}
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
                    <SelectItem value="current-year">Current Year</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex justify-end">
                  <Button variant="outline" onClick={clearFilters}>
                    Clear All Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report Content */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading report data...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Report</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <div className="flex space-x-3 justify-center">
                  <Button onClick={retryLoadData} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Try Again
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => router.push('/branch-manager-dashboard/reports')}
                  >
                    Back to Reports
                  </Button>
                </div>
              </div>
            </div>
          ) : reportData ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {reportId === 'course-popularity-analysis' ? (
                  <>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Total Courses</p>
                            <p className="text-2xl font-bold text-gray-900">{reportData.data.summary.total_courses}</p>
                          </div>
                          <BookOpen className="w-8 h-8 text-blue-600" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Total Enrollments</p>
                            <p className="text-2xl font-bold text-green-600">{reportData.data.summary.total_enrollments}</p>
                          </div>
                          <Users className="w-8 h-8 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Avg Completion Rate</p>
                            <p className="text-2xl font-bold text-purple-600">{reportData.data.summary.average_completion_rate}</p>
                          </div>
                          <TrendingUp className="w-8 h-8 text-purple-500" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Top Performers</p>
                            <p className="text-2xl font-bold text-orange-600">{reportData.data.summary.top_performing_courses}</p>
                          </div>
                          <BarChart3 className="w-8 h-8 text-orange-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Total Records</p>
                            <p className="text-2xl font-bold text-gray-900">{reportData.data.summary.total_records}</p>
                          </div>
                          <FileText className="w-8 h-8 text-blue-600" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Active Records</p>
                            <p className="text-2xl font-bold text-green-600">{reportData.data.summary.active_records}</p>
                          </div>
                          <TrendingUp className="w-8 h-8 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Growth Rate</p>
                            <p className="text-2xl font-bold text-purple-600">{reportData.data.summary.growth_rate}</p>
                          </div>
                          <BarChart3 className="w-8 h-8 text-purple-500" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Branch</p>
                            <p className="text-lg font-bold text-orange-600">{reportData.branch_name}</p>
                          </div>
                          <Building className="w-8 h-8 text-orange-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>

              {/* Chart Visualization */}
              {chartData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart3 className="w-5 h-5" />
                      <span>Trend Analysis</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80 flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <PieChart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Chart Visualization</h3>
                        <p className="text-gray-600 mb-4">
                          Interactive charts showing {getChartLabel()} trends over time
                        </p>
                        <Badge variant="secondary">
                          Chart implementation coming soon
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Data Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{reportId === 'course-popularity-analysis' ? 'Course Popularity Rankings' : 'Detailed Data'}</span>
                    <Badge variant="secondary">
                      {reportId === 'course-popularity-analysis'
                        ? reportData.data.courses?.length || 0
                        : reportData.data.charts[0]?.data?.length || 0} records
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          {reportId === 'course-popularity-analysis' ? (
                            <>
                              <th className="text-left py-3 px-4 font-medium text-gray-900">Rank</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-900">Course</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-900">Category</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-900">Total Enrollments</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-900">Active Enrollments</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-900">Completion Rate</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-900">Popularity Score</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                            </>
                          ) : (
                            <>
                              <th className="text-left py-3 px-4 font-medium text-gray-900">Period</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-900">Value</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {reportId === 'course-popularity-analysis' ? (
                          reportData.data.courses?.map((course: any, index: number) => (
                            <tr key={course.id || index} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-4 px-4">
                                <div className="flex items-center space-x-2">
                                  <span className="text-lg font-bold text-blue-600">#{index + 1}</span>
                                  {index < 3 && (
                                    <Badge variant={index === 0 ? "default" : index === 1 ? "secondary" : "outline"}>
                                      {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div>
                                  <div className="font-medium text-gray-900">{course.title}</div>
                                  <div className="text-sm text-gray-500">{course.code}</div>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <Badge variant="outline">{course.category_name}</Badge>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center space-x-1">
                                  <Users className="w-4 h-4 text-blue-500" />
                                  <span className="font-medium">{course.total_enrollments}</span>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center space-x-1">
                                  <Users className="w-4 h-4 text-green-500" />
                                  <span className="font-medium">{course.active_enrollments}</span>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center space-x-2">
                                  <div className="w-16 bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-green-500 h-2 rounded-full"
                                      style={{ width: `${Math.min(course.completion_rate, 100)}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-medium">{course.completion_rate.toFixed(1)}%</span>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <Badge
                                  variant={course.popularity_score >= 80 ? "default" :
                                          course.popularity_score >= 60 ? "secondary" : "outline"}
                                >
                                  {course.popularity_score}/100
                                </Badge>
                              </td>
                              <td className="py-4 px-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toast.info(`Viewing details for ${course.title}`)}
                                  className="flex items-center space-x-1"
                                >
                                  <FileText className="w-3 h-3" />
                                  <span>View</span>
                                </Button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          reportData.data.charts[0]?.data?.map((item: any, index: number) => (
                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-4 px-4">
                                <span className="text-sm text-gray-900">{item.month}</span>
                              </td>
                              <td className="py-4 px-4">
                                <span className="text-sm text-gray-900">{item.value}</span>
                              </td>
                              <td className="py-4 px-4">
                                <Badge variant={item.value > 50 ? "default" : "secondary"}>
                                  {item.value > 50 ? 'High' : 'Low'}
                                </Badge>
                              </td>
                              <td className="py-4 px-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toast.info(`Viewing details for ${item.month}`)}
                                  className="flex items-center space-x-1"
                                >
                                  <FileText className="w-3 h-3" />
                                  <span>View</span>
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                {reportId === 'course-popularity-analysis' ? (
                  <>
                    <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Course Data Available</h3>
                    <p className="text-gray-600 mb-4">
                      No courses or enrollment data found for your branch.
                      Course popularity analysis requires active courses with student enrollments.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                      <p className="text-sm text-blue-800">
                        <strong>To see course popularity data:</strong><br />
                        • Ensure courses are created and active<br />
                        • Students must be enrolled in courses<br />
                        • Enrollment data must be available for analysis
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
                    <p className="text-gray-600">No report data found for the selected filters.</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
