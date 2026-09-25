"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Download, Filter, FileText, TrendingUp, AlertCircle, Loader2, RefreshCw, Eye } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { reportsAPI, ReportFilters, ReportFilterOptions } from "@/lib/reportsAPI"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import ErrorBoundary from "@/components/error-boundary"
import { useReportsApi } from "@/hooks/useApiWithRetry"
import {
  ReportCategoriesGridSkeleton,
  PageHeaderSkeleton,
  SearchBarSkeleton,
  InlineLoader
} from "@/components/skeleton-loaders"
import {
  useDebounce,
  useOptimizedSearch,
  usePerformanceMonitor,
  useStableCallback
} from "@/hooks/usePerformance"

// Report categories aligned with system entities
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
  },
  {
    id: "enrollments",
    name: "Enrollment Reports",
    icon: FileText,
    description: "Operational enrollment listings and exports (API: /reports/enrollments)",
    reports: [
      { id: "enrollments-list", name: "Enrollments List", icon: FileText },
    ]
  },
  {
    id: "renewals",
    name: "Renewal Reports",
    icon: TrendingUp,
    description: "Payment renewals operational report (API: /reports/renewals)",
    reports: [
      { id: "renewals-list", name: "Renewals List", icon: FileText },
    ]
  },
  {
    id: "leads",
    name: "Lead Reports",
    icon: FileText,
    description: "CRM leads operational report (API: /reports/leads)",
    reports: [
      { id: "leads-list", name: "Leads List", icon: FileText },
    ]
  },
  {
    id: "events",
    name: "Event Reports",
    icon: FileText,
    description: "Event registrations operational report (API: /reports/events)",
    reports: [
      { id: "events-list", name: "Event Registrations", icon: FileText },
    ]
  },
  {
    id: "attendance",
    name: "Attendance Reports",
    icon: TrendingUp,
    description: "Use Attendance module reports for full UI",
    reports: [
      { id: "attendance-module", name: "Open Attendance Reports", icon: TrendingUp },
    ]
  }
]

// Enhanced component with error boundary wrapper
function ReportsPageContent() {
  const router = useRouter()
  const params = useParams()
  const adminType = (params?.adminType as string) || "super-admin"
  const basePath = `/${adminType}/dashboard`
  const { user, token } = useAuth()

  // Enhanced state management with performance monitoring
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryLoading, setCategoryLoading] = useState<string | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)

  // Performance monitoring
  const { logPerformance } = usePerformanceMonitor('ReportsPage')

  // Debounced search for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Use enhanced API hook with retry mechanism
  const {
    data: filterOptions,
    loading,
    error,
    retry: retryLoadOptions,
    reset: resetApiState
  } = useReportsApi(
    useCallback(() => {
      if (!token) throw new Error('Authentication token not available')
      return reportsAPI.getReportFilters(token)
    }, [token]),
    {
      maxRetries: 2,
      retryDelay: 1500,
      showErrorToast: true,
      errorMessage: 'Failed to load filter options. Please try again.'
    }
  )

  // Load filter options on component mount
  useEffect(() => {
    if (token) {
      resetApiState() // Reset any previous state
      // The API call will be triggered automatically by the hook
    }
  }, [token, resetApiState])

  // Handle API errors with user feedback
  useEffect(() => {
    if (error && error !== lastError) {
      setLastError(error)
      console.error('Reports page error:', error)
    }
  }, [error, lastError])

  // Optimized handlers with stable callbacks
  const handleSearch = useStableCallback(() => {
    try {
      logPerformance('Search triggered')
      if (!debouncedSearchTerm.trim()) {
        toast.info('Enter a search term to filter report categories')
        return
      }
      toast.success('Use the search box to filter report categories')
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Search functionality encountered an error')
    }
  }, [debouncedSearchTerm, logPerformance])

  const handleDownloadReport = useStableCallback(() => {
    logPerformance('Download report clicked')
    toast.info('Select a specific report to download')
  }, [logPerformance])

  const handleCategoryClick = useStableCallback((categoryId: string) => {
    try {
      logPerformance(`Category click: ${categoryId}`)

      // Validate category ID
      if (!categoryId || typeof categoryId !== 'string') {
        toast.error('Invalid category selected')
        return
      }

      // Find category for validation and user feedback
      const category = REPORT_CATEGORIES.find(cat => cat.id === categoryId)
      if (!category) {
        toast.error('Category not found')
        return
      }

      // Prevent multiple simultaneous clicks
      if (categoryLoading) {
        return
      }

      // Show loading state for this specific category
      setCategoryLoading(categoryId)

      // M23: Attendance reports live under Attendance module
      if (categoryId === "attendance") {
        router.push(`${basePath}/attendance/reports`)
        setCategoryLoading(null)
        return
      }

      // Navigate with error handling and performance tracking (use basePath for branch-admin/super-admin)
      const navigationTimeout = setTimeout(() => {
        try {
          setCategoryLoading(null)
          router.push(`${basePath}/reports/${categoryId}`)
          toast.success(`Opening ${category.name} reports...`)
          logPerformance(`Navigation completed: ${categoryId}`)
        } catch (navError) {
          console.error('Navigation error:', navError)
          setCategoryLoading(null)
          toast.error('Failed to navigate to category page')
        }
      }, 300)

      // Cleanup timeout if component unmounts
      return () => clearTimeout(navigationTimeout)
    } catch (error) {
      console.error('Category click error:', error)
      setCategoryLoading(null)
      toast.error('Failed to open category')
    }
  }, [categoryLoading, router, logPerformance, basePath])

  const handleReportClick = (reportId: string, categoryId: string) => {
    const category = REPORT_CATEGORIES.find(cat => cat.id === categoryId)
    const report = category?.reports.find(rep => rep.id === reportId)
    const reportName = report?.name || reportId
    setCategoryLoading(reportId)
    setTimeout(() => {
      setCategoryLoading(null)
      router.push(`${basePath}/reports/${categoryId}/${reportId}`)
      toast.success(`Opening ${reportName} report...`)
    }, 300)
  }

  // Optimized filtering with debounced search and memoization
  const filteredCategories = useMemo(() => {
    try {
      logPerformance('Filtering categories')

      if (!debouncedSearchTerm.trim()) {
        return REPORT_CATEGORIES
      }

      const searchLower = debouncedSearchTerm.toLowerCase().trim()
      const filtered = REPORT_CATEGORIES.filter(category => {
        if (!category || typeof category !== 'object') return false

        const nameMatch = category.name?.toLowerCase().includes(searchLower) || false
        const descMatch = category.description?.toLowerCase().includes(searchLower) || false

        return nameMatch || descMatch
      })

      logPerformance(`Filtered ${filtered.length} categories from ${REPORT_CATEGORIES.length}`)
      return filtered
    } catch (error) {
      console.error('Filter error:', error)
      toast.error('Error filtering categories')
      return REPORT_CATEGORIES // Fallback to all categories
    }
  }, [debouncedSearchTerm, logPerformance])

  // Validation for critical data
  const hasValidCategories = useMemo(() => {
    return Array.isArray(filteredCategories) && filteredCategories.length > 0
  }, [filteredCategories])



  // Show skeleton loading state for initial load
  if (loading && !filterOptions) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="w-full p-4 lg:px-8 mx-auto">
          <PageHeaderSkeleton />
          <SearchBarSkeleton />
          <ReportCategoriesGridSkeleton />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <main className="w-full p-4 lg:px-8 mx-auto">
        {/* Page Header - Enhanced with loading states */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <p className="text-gray-600">
              Comprehensive system reports and analytics
              {loading && <InlineLoader size="sm" className="ml-2" />}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              className="flex items-center space-x-2"
              onClick={handleSearch}
              disabled={loading || categoryLoading !== null}
            >
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </Button>
            <Button
              className="bg-yellow-400 hover:bg-yellow-500 text-white flex items-center space-x-2"
              onClick={handleDownloadReport}
              disabled={loading || categoryLoading !== null}
            >
              <Download className="w-4 h-4" />
              <span>Download Report</span>
            </Button>
          </div>
        </div>

        {/* Enhanced Search Bar with Accessibility */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <label htmlFor="category-search" className="sr-only">
              Search report categories
            </label>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black w-4 h-4 pointer-events-none" />
            <Input
              id="category-search"
              type="text"
              placeholder="Search report categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-16 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading || categoryLoading !== null}
              aria-describedby="search-help"
              autoComplete="off"
              role="searchbox"
              aria-label="Search through report categories"
            />
            <div id="search-help" className="sr-only">
              Type to filter report categories by name or description
            </div>

            {/* Search Results Count */}
            {debouncedSearchTerm && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {filteredCategories.length} found
                </span>
              </div>
            )}
          </div>

          {/* Search Status */}
          {searchTerm !== debouncedSearchTerm && (
            <div className="mt-2 text-sm text-gray-500 flex items-center">
              <InlineLoader size="sm" className="mr-2" />
              Searching...
            </div>
          )}
        </div>

        {/* Report categories list with basic info and view option */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                    <span className="sr-only">Icon</span>
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Report category
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Description
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Reports
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCategories.map((category, index) => {
                  const IconComponent = category.icon
                  const rowKey = `${category.id}-${index}`
                  const isLoading = categoryLoading === category.id
                  return (
                    <tr
                      key={rowKey}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isLoading ? (
                          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                        ) : (
                          <IconComponent className="w-5 h-5 text-blue-600" aria-hidden />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{category.name}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell max-w-xs">
                        {category.description}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {category.reports.length} available
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCategoryClick(category.id)}
                          disabled={isLoading}
                          className="text-[#5A6ACF] border-[#5A6ACF] hover:bg-[#5A6ACF]/10"
                        >
                          <Eye className="w-4 h-4 mr-1.5 inline" aria-hidden />
                          {isLoading ? 'Opening...' : 'View'}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Enhanced No Results Section with Better UX */}
        {debouncedSearchTerm && filteredCategories.length === 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-center py-12">
                <div className="text-center max-w-md">
                  <Search className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">No Categories Found</p>
                  <p className="text-gray-600 mb-4">
                    No report categories match your search term "{debouncedSearchTerm}".
                  </p>
                  <div className="space-y-2 text-sm text-gray-500">
                    <p>Try searching for:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Student, Course, Coach, Branch, or Financial</li>
                      <li>Report types like "enrollment" or "revenue"</li>
                      <li>Shorter or more general terms</li>
                    </ul>
                  </div>
                  <Button
                    onClick={() => setSearchTerm('')}
                    variant="outline"
                    className="mt-4"
                  >
                    Clear Search
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Loading State - Only show when retrying */}
        {loading && filterOptions && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-4 animate-spin" />
                  <p className="text-gray-600 font-medium">Refreshing reports data...</p>
                  <p className="text-sm text-gray-500 mt-1">This should only take a moment</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Error State with Recovery Options */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-center py-12">
                <div className="text-center max-w-md">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">Unable to Load Reports</p>
                  <p className="text-gray-600 mb-4">
                    {error.includes('Authentication')
                      ? 'Please check your login status and try again.'
                      : 'There was a problem loading the reports data. This might be a temporary issue.'
                    }
                  </p>

                  {/* Error details for development */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="bg-red-100 border border-red-300 rounded p-2 mb-4 text-left">
                      <p className="text-xs text-red-800 font-mono break-all">{error}</p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button
                      onClick={retryLoadOptions}
                      className="bg-red-600 hover:bg-red-700 text-white"
                      disabled={loading}
                    >
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
                      onClick={() => window.location.reload()}
                      variant="outline"
                    >
                      Refresh Page
                    </Button>
                  </div>

                  <p className="text-xs text-gray-500 mt-4">
                    If the problem persists, please contact support or try again later.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Critical Error Fallback - when categories can't be loaded */}
        {!loading && !error && !hasValidCategories && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">No Report Categories Available</p>
                  <p className="text-gray-600 mb-4">
                    Report categories could not be loaded. This might be a configuration issue.
                  </p>
                  <Button
                    onClick={() => window.location.reload()}
                    variant="outline"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Page
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}

// Main component wrapped with error boundary
export default function ReportsPage() {
  return (
    <ErrorBoundary
      title="Reports Dashboard Error"
      description="The reports dashboard encountered an unexpected error. Please try refreshing the page or contact support if the problem persists."
      showRetry={true}
      showHome={true}
      showBack={true}
      onError={(error, errorInfo) => {
        // Log error to monitoring service
        console.error('Reports dashboard error:', error, errorInfo)

        // In production, send to error monitoring service
        // errorMonitoringService.captureException(error, {
        //   tags: { component: 'ReportsPage' },
        //   extra: errorInfo
        // })
      }}
    >
      <ReportsPageContent />
    </ErrorBoundary>
  )
}
