"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { 
  ArrowLeft, 
  Download, 
  FileText, 
  Filter, 
  Calendar as CalendarIcon,
  Loader2,
  AlertCircle,
  BarChart3,
  PieChart,
  TrendingUp
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import { reportsAPI, ReportFilters, ReportFilterOptions } from "@/lib/reportsAPI"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { exportTableReport } from "@/lib/categoryReportExport"

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

interface ReportPageData {
  reportName: string
  categoryName: string
  reportData: any
  chartData: any[]
  tableData: any[]
}

export default function IndividualReportPage() {
  const params = useParams()
  const router = useRouter()
  const basePath = useDashboardBasePath()
  const { user, token } = useAuth()
  
  const categoryId = params.categoryId as string
  const reportId = params.reportId as string
  
  // State management
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reportData, setReportData] = useState<ReportPageData | null>(null)
  const [filterOptions, setFilterOptions] = useState<ReportFilterOptions | null>(null)
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null)
  
  // Filter states
  const [filters, setFilters] = useState<ReportFilters>({
    branch_id: "",
    course_id: "",
    category_id: "",
    start_date: "",
    end_date: ""
  })

  // Get report and category information
  const category = REPORT_CATEGORIES.find(cat => cat.id === categoryId)
  const report = category?.reports.find(rep => rep.id === reportId)

  if (!category || !report) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">Report Not Found</p>
                  <p className="text-gray-600 mb-4">
                    The requested report could not be found.
                  </p>
                  <Button onClick={() => router.push(`${basePath}/reports`)}>
                    Return to Reports
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Load filter options and initial data
  useEffect(() => {
    loadFilterOptions()
    loadReportData()
  }, [categoryId, reportId])

  const loadFilterOptions = async () => {
    if (!token) return
    
    try {
      const options = await reportsAPI.getReportFilters(token)
      setFilterOptions(options)
    } catch (error) {
      console.error('Error loading filter options:', error)
      toast.error('Failed to load filter options')
    }
  }

  const loadReportData = async () => {
    if (!token) return

    setLoading(true)
    setError(null)

    try {
      // Get real report data from API
      const apiData = await reportsAPI.getIndividualReport(token, categoryId, reportId, filters)

      // Transform API data to our report format
      const transformedData: ReportPageData = {
        reportName: report.name,
        categoryName: category.name,
        reportData: transformApiData(apiData, categoryId),
        chartData: generateChartData(apiData, categoryId),
        tableData: generateTableData(apiData, categoryId)
      }

      setReportData(transformedData)
    } catch (error) {
      console.error('Error loading report data:', error)

      // Fallback to mock data if API fails
      const mockData: ReportPageData = {
        reportName: report.name,
        categoryName: category.name,
        reportData: {
          summary: {
            totalRecords: 150,
            activeRecords: 120,
            percentage: 80
          }
        },
        chartData: [
          { name: 'Jan', value: 400 },
          { name: 'Feb', value: 300 },
          { name: 'Mar', value: 500 },
          { name: 'Apr', value: 280 },
          { name: 'May', value: 390 }
        ],
        tableData: [
          { id: 1, name: 'Sample Data 1', value: 100, status: 'Active' },
          { id: 2, name: 'Sample Data 2', value: 200, status: 'Inactive' },
          { id: 3, name: 'Sample Data 3', value: 150, status: 'Active' }
        ]
      }

      setReportData(mockData)
      toast.warning('Using sample data - API connection failed')
    } finally {
      setLoading(false)
    }
  }

  // Helper function to transform API data based on category
  const transformApiData = (apiData: any, categoryId: string) => {
    switch (categoryId) {
      case 'student':
        return {
          summary: {
            totalRecords: apiData.student_reports?.enrollment_statistics?.length || 0,
            activeRecords: apiData.student_reports?.students_by_branch?.reduce((sum: number, branch: any) => sum + branch.total_students, 0) || 0,
            percentage: 85
          }
        }
      case 'financial':
        return {
          summary: {
            totalRecords: apiData.financial_reports?.total_balance_fees_statement?.total_amount || 0,
            activeRecords: apiData.financial_reports?.daily_collection_report?.length || 0,
            percentage: 92
          }
        }
      case 'coach':
        return {
          summary: {
            totalRecords: apiData.coach_reports?.coach_statistics?.length || 0,
            activeRecords: apiData.coach_reports?.coaches_by_branch?.reduce((sum: number, branch: any) => sum + branch.total_coaches, 0) || 0,
            percentage: 88
          }
        }
      case 'branch':
        return {
          summary: {
            totalRecords: apiData.branch_reports?.branch_statistics?.length || 0,
            activeRecords: apiData.branch_reports?.active_branches || 0,
            percentage: 95
          }
        }
      case 'course':
        return {
          summary: {
            totalRecords: apiData.course_reports?.course_statistics?.length || 0,
            activeRecords: apiData.course_reports?.active_courses || 0,
            percentage: 78
          }
        }
      default:
        return {
          summary: {
            totalRecords: 100,
            activeRecords: 80,
            percentage: 80
          }
        }
    }
  }

  // Helper function to generate chart data
  const generateChartData = (apiData: any, categoryId: string) => {
    // Generate chart data based on API response and category
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    return months.map(month => ({
      name: month,
      value: Math.floor(Math.random() * 500) + 100 // Replace with actual data extraction
    }))
  }

  // Helper function to generate table data
  const generateTableData = (apiData: any, categoryId: string) => {
    // Generate table data based on API response and category
    switch (categoryId) {
      case 'student':
        return apiData.student_reports?.enrollment_statistics?.slice(0, 10).map((item: any, index: number) => ({
          id: index + 1,
          name: item.course_info?.title || `Student Record ${index + 1}`,
          value: item.total_students || 0,
          status: item.total_students > 0 ? 'Active' : 'Inactive'
        })) || []
      case 'financial':
        return apiData.financial_reports?.daily_collection_report?.slice(0, 10).map((item: any, index: number) => ({
          id: index + 1,
          name: `Payment ${index + 1}`,
          value: item.amount || 0,
          status: item.status || 'Pending'
        })) || []
      default:
        return [
          { id: 1, name: 'Sample Data 1', value: 100, status: 'Active' },
          { id: 2, name: 'Sample Data 2', value: 200, status: 'Inactive' },
          { id: 3, name: 'Sample Data 3', value: 150, status: 'Active' }
        ]
    }
  }

  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value === "all" ? "" : value }))
  }

  const handleGenerateReport = async () => {
    if (!token) return

    setLoading(true)

    // Apply date filters
    const updatedFilters = {
      ...filters,
      start_date: startDate ? format(startDate, 'yyyy-MM-dd') : '',
      end_date: endDate ? format(endDate, 'yyyy-MM-dd') : ''
    }

    try {
      // Call API with updated filters
      const apiData = await reportsAPI.getIndividualReport(token, categoryId, reportId, updatedFilters)

      // Transform and set the new data
      const transformedData: ReportPageData = {
        reportName: report.name,
        categoryName: category.name,
        reportData: transformApiData(apiData, categoryId),
        chartData: generateChartData(apiData, categoryId),
        tableData: generateTableData(apiData, categoryId)
      }

      setReportData(transformedData)
      toast.success('Report generated successfully!')
    } catch (error) {
      console.error('Error generating report:', error)
      toast.error('Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (!reportData) {
      toast.error('No report data to export yet')
      return
    }

    setExporting(format)
    try {
      const summary = reportData.reportData?.summary
      const rows: (string | number)[][] = (reportData.tableData || []).map((row: any) => [
        row.id ?? '',
        row.name ?? '',
        row.value ?? '',
        row.status ?? '',
      ])
      if (summary) {
        rows.push(
          ['', '', '', ''],
          ['', 'Total Records', summary.totalRecords ?? '', ''],
          ['', 'Active Records', summary.activeRecords ?? '', ''],
          ['', 'Success Rate', `${summary.percentage ?? ''}%`, '']
        )
      }
      await exportTableReport(format, `${report.name} - ${category.name}`, ['ID', 'Name', 'Value', 'Status'], rows)
      toast.success(`Downloaded report as ${format === 'excel' ? 'Excel' : 'PDF'}`)
    } catch (error: any) {
      console.error('Report export error:', error)
      toast.error(error?.message || 'Failed to export report')
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.push(`${basePath}/reports`)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Reports</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {report.name}
              </h1>
              <p className="text-gray-600">{category.name}</p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => handleExport('pdf')}
              className="flex items-center space-x-2"
              disabled={exporting !== null || loading || !reportData}
            >
              {exporting === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>Export PDF</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport('excel')}
              className="flex items-center space-x-2"
              disabled={exporting !== null || loading || !reportData}
            >
              {exporting === 'excel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>Export Excel</span>
            </Button>
          </div>
        </div>

        {/* Filter Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <Filter className="w-5 h-5" />
              <span>Report Filters</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Branch Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch
                </label>
                <Select
                  value={filters.branch_id || "all"}
                  onValueChange={(value) => handleFilterChange('branch_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {filterOptions?.filter_options?.branches?.filter(branch => branch.id && branch.name).map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Course Filter - Show for relevant categories */}
              {(categoryId === 'course' || categoryId === 'student') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Course
                  </label>
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
              )}

              {/* Category Filter - Show for course reports */}
              {categoryId === 'course' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
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
              )}

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Generate Report Button */}
            <div className="flex justify-end">
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                onClick={handleGenerateReport}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Content */}
        {loading ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
                  <p className="text-lg font-medium text-gray-900 mb-2">Loading Report</p>
                  <p className="text-gray-600">Please wait while we generate your report...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">Error Loading Report</p>
                  <p className="text-gray-600 mb-4">{error}</p>
                  <Button onClick={loadReportData} variant="outline">
                    Try Again
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : reportData ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Records</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {reportData.reportData.summary.totalRecords}
                      </p>
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
                      <p className="text-2xl font-bold text-gray-900">
                        {reportData.reportData.summary.activeRecords}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Success Rate</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {reportData.reportData.summary.percentage}%
                      </p>
                    </div>
                    <PieChart className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chart Section */}
            <Card>
              <CardHeader>
                <CardTitle>Report Visualization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">Chart visualization will be displayed here</p>
                    <p className="text-sm text-gray-500">Integration with chart library pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Table */}
            <Card>
              <CardHeader>
                <CardTitle>Report Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Value
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.tableData.map((row) => (
                        <tr key={row.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.value}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={cn(
                              "inline-flex px-2 py-1 text-xs font-semibold rounded-full",
                              row.status === 'Active'
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            )}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  )
}
