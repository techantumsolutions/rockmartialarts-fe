"use client"

import { getBackendApiUrl } from "@/lib/config"
import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
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
import Header from "@/components/layout/Header"
import { reportsAPI } from "@/lib/reportsAPI"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { toast } from "sonner"

// Branch interface (same as superadmin)
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

// Filter state interface
interface ReportFilters {
  branch_id?: string
  course_id?: string
  date_range?: string
  status?: string
  [key: string]: any
}

export default function BranchManagerStudentReports() {
  const router = useRouter()

  // Authentication state
  const [currentBranchManager, setCurrentBranchManager] = useState<any>(null)
  const [token, setToken] = useState<string | null>(null)

  // Filter state (same as superadmin)
  const [filters, setFilters] = useState<ReportFilters>({
    branch_id: "all",
    course_id: "all",
    date_range: "all",
    status: "all"
  })

  // Branch and course data
  const [branches, setBranches] = useState<Branch[]>([])
  const [branchesLoading, setBranchesLoading] = useState(false)
  const [branchesError, setBranchesError] = useState<string | null>(null)

  // Student search specific state (same as superadmin)
  const [searchLoading, setSearchLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [studentResults, setStudentResults] = useState<any[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [studentExportFormat, setStudentExportFormat] = useState<"csv" | "excel">("csv")

  // Custom date range state
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  const [showCustomDateInputs, setShowCustomDateInputs] = useState(false)

  // Authentication check (same as superadmin pattern)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authToken = BranchManagerAuth.getToken()
        if (!authToken) {
          toast.error('Please log in to access student reports')
          router.push('/branch-manager-login')
          return
        }

        const branchManager = BranchManagerAuth.getCurrentUser()
        if (!branchManager) {
          toast.error('Branch manager information not found')
          router.push('/branch-manager-login')
          return
        }

        setToken(authToken)
        setCurrentBranchManager(branchManager)

        // Fetch managed branches to ensure they're available for filtering
        try {
          const managedBranches = await BranchManagerAuth.fetchManagedBranches()
          console.log('Fetched managed branches:', managedBranches)

          // Update the current branch manager with managed branches
          const updatedBranchManager = BranchManagerAuth.getCurrentUser()
          if (updatedBranchManager) {
            setCurrentBranchManager(updatedBranchManager)
          }
        } catch (error) {
          console.error('Error fetching managed branches:', error)
        }
      } catch (error) {
        console.error('Authentication error:', error)
        toast.error('Authentication failed')
        router.push('/branch-manager-login')
      }
    }

    checkAuth()
  }, [router])

  // Load branches with courses (adapted for branch manager)
  useEffect(() => {
    const fetchBranchesWithCourses = async () => {
      if (!token) return

      setBranchesLoading(true)
      setBranchesError(null)

      try {
        // For branch managers, we'll get their assigned branches
        const response = await fetch(getBackendApiUrl('branches'), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        const branchesData = data.branches || []

        // Filter to only show branches managed by this branch manager
        const managedBranches = branchesData.filter((branch: Branch) =>
          currentBranchManager?.managed_branches?.includes(branch.id)
        )

        setBranches(managedBranches)
      } catch (error) {
        console.error('Error fetching branches:', error)
        setBranchesError('Failed to load branches')
        setBranches([])
      } finally {
        setBranchesLoading(false)
      }
    }

    if (token && currentBranchManager) {
      fetchBranchesWithCourses()
    }
  }, [token, currentBranchManager])

  // Computed courses based on selected branch (same as superadmin)
  const filteredCourses = useMemo(() => {
    if (!branches || branches.length === 0) return []

    if (!filters.branch_id || filters.branch_id === 'all') {
      // Return all courses from all managed branches
      const allCourses: any[] = []
      branches.forEach(branch => {
        if (branch.operational_details?.courses_offered) {
          branch.operational_details.courses_offered.forEach(courseId => {
            if (!allCourses.find(c => c.id === courseId)) {
              allCourses.push({
                id: courseId,
                title: courseId, // We'll need to map this to actual course data
                code: courseId,
                name: courseId
              })
            }
          })
        }
      })
      return allCourses
    } else {
      // Return courses for selected branch
      const selectedBranch = branches.find(b => b.id === filters.branch_id)
      if (!selectedBranch?.operational_details?.courses_offered) return []

      return selectedBranch.operational_details.courses_offered.map(courseId => ({
        id: courseId,
        title: courseId,
        code: courseId,
        name: courseId
      }))
    }
  }, [branches, filters.branch_id])

  // Handle filter changes (same as superadmin)
  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))

    // Handle custom date range visibility
    if (key === 'date_range') {
      setShowCustomDateInputs(value === 'custom')
      if (value !== 'custom') {
        setCustomStartDate("")
        setCustomEndDate("")
      }
    }
  }, [])

  // Student search function (same as superadmin)
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
      if (filters.date_range === 'custom') {
        if (customStartDate) searchParams.start_date = customStartDate
        if (customEndDate) searchParams.end_date = customEndDate
      } else {
        const now = new Date()
        let startDate: Date | null = null
        let endDate: Date | null = null

        switch (filters.date_range) {
          case 'current-month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1)
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
            break
          case 'last-month':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            endDate = new Date(now.getFullYear(), now.getMonth(), 0)
            break
          case 'current-quarter': {
            const currentQuarter = Math.floor(now.getMonth() / 3)
            startDate = new Date(now.getFullYear(), currentQuarter * 3, 1)
            endDate = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0)
            break
          }
          case 'last-quarter': {
            const lastQuarter = Math.floor(now.getMonth() / 3) - 1
            const lastQuarterYear = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear()
            const adjustedQuarter = lastQuarter < 0 ? 3 : lastQuarter
            startDate = new Date(lastQuarterYear, adjustedQuarter * 3, 1)
            endDate = new Date(lastQuarterYear, (adjustedQuarter + 1) * 3, 0)
            break
          }
          case 'current-year':
            startDate = new Date(now.getFullYear(), 0, 1)
            endDate = new Date(now.getFullYear(), 11, 31)
            break
          case 'last-year':
            startDate = new Date(now.getFullYear() - 1, 0, 1)
            endDate = new Date(now.getFullYear() - 1, 11, 31)
            break
        }

        if (startDate) searchParams.start_date = startDate.toISOString()
        if (endDate) searchParams.end_date = endDate.toISOString()
      }
    }

    return searchParams
  }

  const handleStudentSearch = async () => {
    const authToken = BranchManagerAuth.getToken()
    if (!authToken) {
      toast.error('Authentication required')
      return
    }

    setHasSearched(true)
    setSearchLoading(true)

    try {
      const searchParams: any = {
        ...buildStudentReportFilters(),
        skip: 0,
        limit: 100,
      }

      console.log('Student search params:', searchParams)

      const response = await reportsAPI.listStudentReportRows(authToken, searchParams)

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

  const handleExportStudents = async () => {
    const authToken = BranchManagerAuth.getToken()
    if (!authToken) {
      toast.error('Authentication required')
      return
    }

    setExportLoading(true)
    try {
      const result = await reportsAPI.exportStudentReports(
        { ...buildStudentReportFilters(), format: studentExportFormat } as any,
        authToken
      )
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

  // Handle view student details (same as superadmin)
  const handleViewStudentDetails = (studentId: string) => {
    if (!studentId) {
      toast.error('Student ID not available')
      return
    }
    router.push(`/branch-manager-dashboard/students/${studentId}`)
  }

  if (!currentBranchManager || !token) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Reports" role="branch_admin" />
        <main className="w-full p-4 lg:py-4 px-19">
          <div className="mx-auto">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
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
        <div className="mx-auto space-y-6">

          {/* Header Section - Same as superadmin */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/branch-manager-dashboard/reports')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Reports
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={handleExportStudents}
                disabled={exportLoading || searchLoading}
              >
                {exportLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {exportLoading ? 'Exporting...' : `Export ${studentExportFormat === 'excel' ? 'Excel' : 'CSV'}`}
              </Button>
            </div>
          </div>

          {/* Page Title and Description - Same as superadmin */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">Student Reports</h1>
            <p className="text-gray-600">
              Student enrollment, attendance, and performance reports
              {currentBranchManager?.managed_branches?.length && (
                <span className="ml-1">
                  - Managing {currentBranchManager.managed_branches.length} branch{currentBranchManager.managed_branches.length !== 1 ? 'es' : ''}.
                </span>
              )}
            </p>
          </div>

          {/* Student Reports Search/Filter Card - Exact copy from superadmin */}
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

              {/* Custom Date Range Inputs */}
              {showCustomDateInputs && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={handleExportStudents}
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

          {/* Results Table - Exact copy from superadmin */}
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

        </div>
      </main>
    </div>
  )
}
