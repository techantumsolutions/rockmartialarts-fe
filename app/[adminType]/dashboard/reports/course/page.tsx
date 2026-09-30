"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  Filter,
  Download,
  FileText,
  TrendingUp,
  AlertCircle,
  Loader2,
  ArrowLeft
} from "lucide-react"
import { reportsAPI, CourseReportsResponse, CourseReportFiltersResponse, CourseData } from "@/lib/reportsAPI"
import { TokenManager } from "@/lib/tokenManager"
import { toast } from "sonner"
import { exportCourseReport } from "@/lib/categoryReportExport"

interface FilterState {
  branch_id: string
  category_id: string
  difficulty_level: string
  active_only: boolean
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

export default function CourseReportPage() {
  const router = useRouter()
  const basePath = useDashboardBasePath()

  // State management
  const [searchLoading, setSearchLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [courseResults, setCourseResults] = useState<CourseData[]>([])
  const [filterOptions, setFilterOptions] = useState<CourseReportFiltersResponse | null>(null)

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    branch_id: "",
    category_id: "",
    difficulty_level: "",
    active_only: true
  })

  // Load filter options and all courses on component mount
  useEffect(() => {
    loadFilterOptions()
    handleCourseSearch({ silent: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load filter options
  const loadFilterOptions = async () => {
    const token = TokenManager.getToken()
    if (!token) {
      toast.error("Authentication required. Please login again.")
      router.push("/superadmin/login")
      return
    }

    try {
      const response = await reportsAPI.getCourseReportFilters(token)
      setFilterOptions(response)
    } catch (error) {
      console.error('Error loading filter options:', error)
      toast.error('Failed to load filter options')
    }
  }

  // Handle search functionality
  const handleSearch = () => {
    handleCourseSearch()
  }

  // Handle download functionality
  const handleDownloadReport = async () => {
    const token = TokenManager.getToken()
    if (!token) {
      toast.error('Authentication required')
      return
    }

    setExportLoading(true)
    try {
      const count = await exportCourseReport(token, filters)
      toast.success(count > 0 ? `Downloaded ${count} course${count === 1 ? '' : 's'}` : 'Downloaded empty report')
    } catch (error: any) {
      console.error('Course export error:', error)
      toast.error(error?.message || 'Failed to download course report')
    } finally {
      setExportLoading(false)
    }
  }

  // Handle filter changes
  const handleFilterChange = (key: keyof FilterState, value: string | boolean) => {
    const processedValue = typeof value === 'string' && value === 'all' ? '' : value
    setFilters(prev => ({ ...prev, [key]: processedValue }))
  }

  // Handle course search
  const handleCourseSearch = async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true
    const token = TokenManager.getToken()
    if (!token) {
      if (!silent) toast.error('Authentication required')
      return
    }

    setSearchLoading(true)
    setHasSearched(true)

    try {
      const response = await reportsAPI.getCourseReports(token, {
        ...filters,
        skip: 0,
        limit: 50
      })

      setCourseResults(response.courses)
      if (!silent) toast.success(`Found ${response.courses.length} course${response.courses.length !== 1 ? 's' : ''}`)
    } catch (error) {
      console.error('Error searching courses:', error)
      toast.error('Failed to search courses. Please try again.')
      setCourseResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  const courseCategory = REPORT_CATEGORIES.find(category => category.id === "course")

  // Check authentication
  const token = TokenManager.getToken()
  const user = TokenManager.getUser()

  if (!TokenManager.isAuthenticated() || !token || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please log in to access course reports.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <main className="w-full p-4 lg:px-8 mx-auto">
        {/* Page Header - Same as main reports page */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center space-x-1 px-0 mb-1 text-gray-600 hover:text-gray-900 hover:bg-transparent"
              onClick={() => router.push(`${basePath}/reports`)}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Reports</span>
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">{courseCategory?.name || "Course Reports"}</h1>
            <p className="text-gray-600">
              {courseCategory?.description || "Comprehensive system reports and analytics"}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              className="flex items-center space-x-2"
              onClick={handleSearch}
              disabled={searchLoading}
            >
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </Button>
            <Button
              className="bg-yellow-400 hover:bg-yellow-500 text-black flex items-center space-x-2"
              onClick={handleDownloadReport}
              disabled={exportLoading}
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

        {/* Course Reports Search/Filter Card - Only show for course category */}
        <>
          {/* Search/Filter Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Search Course Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {/* Branch Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                  <Select
                    value={filters.branch_id || "all"}
                    onValueChange={(value) => handleFilterChange('branch_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {filterOptions?.filters.branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
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
                      {filterOptions?.filters.categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Difficulty Level Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty Level</label>
                  <Select
                    value={filters.difficulty_level || "all"}
                    onValueChange={(value) => handleFilterChange('difficulty_level', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      {filterOptions?.filters.difficulty_levels.map((level) => (
                        <SelectItem key={level.id} value={level.id}>
                          {level.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Active Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Active Status</label>
                  <Select
                    value={filters.active_only ? "true" : "false"}
                    onValueChange={(value) => handleFilterChange('active_only', value === 'true')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Active Only</SelectItem>
                      <SelectItem value="false">Include Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Search Button */}
              <div className="flex justify-end">
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                  onClick={() => handleCourseSearch()}
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
                          <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm hidden md:table-cell">Enrollments</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm hidden lg:table-cell">Pricing</th>
                        </tr>
                      </thead>
                      <tbody>
                        {courseResults.map((course, index) => (
                          <tr key={course.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="py-3 px-4 text-sm text-gray-900">
                              <div>
                                <p className="font-medium">{course.title}</p>
                                <p className="text-xs text-gray-500">Code: {course.code}</p>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-900 hidden sm:table-cell">{course.category_name}</td>
                            <td className="py-3 px-4 text-sm text-gray-900 hidden md:table-cell">
                              {course.total_enrollments} ({course.active_enrollments} active)
                            </td>
                            <td className="py-3 px-4 text-sm">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                course.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {course.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 hidden lg:table-cell">
                              {course.pricing.currency} {course.pricing.amount}
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
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No courses found matching your criteria.</p>
                    <p className="text-sm text-gray-500 mt-2">Try adjusting your search filters.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Use the search filters above to find course reports.</p>
                    <p className="text-sm text-gray-500 mt-2">Select your criteria and click "Search Course Reports".</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      </main>
    </div>
  )
}
