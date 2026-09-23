"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Calendar, CalendarIcon, Download, Search, Filter, Users, BookOpen, MapPin, Loader2, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import BranchManagerHeader from "@/components/branch-manager-dashboard-header"
import { checkBranchManagerAuth, getBranchManagerAuthHeaders } from "@/lib/branchManagerAuth"

interface AttendanceReport {
  id: string
  student_name: string
  course_name: string
  branch_name: string
  attendance_date: string
  check_in_time?: string
  check_out_time?: string
  is_present: boolean
  status: string
  method: string
  notes?: string
}

interface ReportFilters {
  student_id?: string
  course_id?: string
  branch_id?: string
  start_date?: string
  end_date?: string
  status?: string
  method?: string
}

export default function BranchManagerAttendanceReportsPage() {
  const router = useRouter()
  const [branchManagerData, setBranchManagerData] = useState<any>(null)
  const [reports, setReports] = useState<AttendanceReport[]>([])
  const [filteredReports, setFilteredReports] = useState<AttendanceReport[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Filter states
  const [filters, setFilters] = useState<ReportFilters>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [startDate, setStartDate] = useState<Date>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // 7 days ago
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [selectedStudent, setSelectedStudent] = useState<string>("all")
  const [selectedCourse, setSelectedCourse] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [selectedMethod, setSelectedMethod] = useState<string>("all")

  // Dropdown data
  const [students, setStudents] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])

  // Date picker states
  const [startDatePickerOpen, setStartDatePickerOpen] = useState(false)
  const [endDatePickerOpen, setEndDatePickerOpen] = useState(false)

  // Initialize component
  useEffect(() => {
    const authResult = checkBranchManagerAuth()
    if (!authResult.isAuthenticated) {
      console.log("Branch manager not authenticated")
      router.push("/branch-manager/login")
      return
    }

    if (authResult.user) {
      setBranchManagerData(authResult.user)
      loadDropdownData()
    } else {
      setError("Branch manager information not found")
      setLoading(false)
    }
  }, [router])

  // Load dropdown data for filters
  const loadDropdownData = async () => {
    try {
      const headers = getBranchManagerAuthHeaders()

      // Load students, courses, and branches for filtering
      const [studentsRes, coursesRes, branchesRes] = await Promise.all([
        fetch('/api/backend/students/search', { headers }),
        fetch('/api/backend/courses', { headers }),
        fetch('/api/backend/branches', { headers })
      ])

      if (studentsRes.ok) {
        const studentsData = await studentsRes.json()
        setStudents(studentsData.students || [])
      }

      if (coursesRes.ok) {
        const coursesData = await coursesRes.json()
        setCourses(coursesData.courses || [])
      }

      if (branchesRes.ok) {
        const branchesData = await branchesRes.json()
        setBranches(branchesData.branches || [])
      }

    } catch (error) {
      console.error("Error loading dropdown data:", error)
    }
  }

  // Fetch attendance reports
  const fetchAttendanceReports = async () => {
    try {
      setLoading(true)
      setError(null)

      const authResult = checkBranchManagerAuth()
      if (!authResult.isAuthenticated || !authResult.user) {
        setError("Authentication required")
        return
      }

      const headers = getBranchManagerAuthHeaders()
      
      // Build query parameters
      const params = new URLSearchParams()
      if (filters.student_id && filters.student_id !== "all") params.append("student_id", filters.student_id)
      if (filters.course_id && filters.course_id !== "all") params.append("course_id", filters.course_id)
      if (filters.start_date) params.append("start_date", filters.start_date)
      if (filters.end_date) params.append("end_date", filters.end_date)
      if (filters.status && filters.status !== "all") params.append("status", filters.status)
      if (filters.method && filters.method !== "all") params.append("method", filters.method)

      console.log(`🔄 Fetching attendance reports with filters:`, filters)

      const response = await fetch(`/api/backend/attendance/reports?${params.toString()}`, {
        method: 'GET',
        headers
      })

      if (response.ok) {
        const data = await response.json()
        console.log("✅ Attendance reports received:", data)
        
        const reportRecords = data.attendance_records || []
        setReports(reportRecords)
        setFilteredReports(reportRecords)
      } else {
        const errorText = await response.text()
        throw new Error(`Failed to fetch reports: ${response.status} ${errorText}`)
      }

    } catch (error) {
      console.error("❌ Error fetching attendance reports:", error)
      setError(`Failed to load attendance reports: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  // Apply filters
  const applyFilters = () => {
    const newFilters: ReportFilters = {
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd')
    }

    if (selectedStudent !== "all") newFilters.student_id = selectedStudent
    if (selectedCourse !== "all") newFilters.course_id = selectedCourse
    if (selectedStatus !== "all") newFilters.status = selectedStatus
    if (selectedMethod !== "all") newFilters.method = selectedMethod

    setFilters(newFilters)
    fetchAttendanceReports()
  }

  // Search functionality
  useEffect(() => {
    if (!searchTerm) {
      setFilteredReports(reports)
    } else {
      const filtered = reports.filter(report =>
        report.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.branch_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredReports(filtered)
    }
  }, [searchTerm, reports])

  // Export reports
  const handleExportReports = () => {
    try {
      const csvHeaders = [
        'Date',
        'Student Name',
        'Course',
        'Branch',
        'Status',
        'Check-in Time',
        'Check-out Time',
        'Method',
        'Notes'
      ]

      const csvData = filteredReports.map(report => [
        report.attendance_date,
        report.student_name,
        report.course_name,
        report.branch_name,
        report.status || (report.is_present ? 'Present' : 'Absent'),
        report.check_in_time || '',
        report.check_out_time || '',
        report.method || '',
        report.notes || ''
      ])

      const csvContent = [
        csvHeaders.join(','),
        ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance_reports_${format(new Date(), 'yyyy-MM-dd')}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      setSuccessMessage("Reports exported successfully!")
      setTimeout(() => setSuccessMessage(null), 3000)

    } catch (error) {
      console.error("Error exporting reports:", error)
      setError("Failed to export reports")
    }
  }

  const getStatusBadge = (report: AttendanceReport) => {
    const status = report.status || (report.is_present ? 'present' : 'absent')
    
    switch (status.toLowerCase()) {
      case 'present':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Present</Badge>
      case 'late':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Late</Badge>
      case 'absent':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Absent</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Unknown</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <BranchManagerHeader />
      
      <main className="w-full p-4 lg:px-8 overflow-x-hidden flex gap-4 flex-col">
        {/* Page Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0A1629]">Attendance Reports</h1>
            <p className="text-gray-600">View and analyze attendance data with advanced filtering</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <XCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-green-800 font-medium">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Filters Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Date Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Popover open={startDatePickerOpen} onOpenChange={setStartDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : <span>Pick start date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date || startDate)
                        setStartDatePickerOpen(false)
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Popover open={endDatePickerOpen} onOpenChange={setEndDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : <span>Pick end date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => {
                        setEndDate(date || endDate)
                        setEndDatePickerOpen(false)
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Student Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Student</label>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Students" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Course Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Course</label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Courses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name || course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Method Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Method</label>
                <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="biometric">Biometric</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium">Search</label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by student, course, or branch..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={applyFilters} disabled={loading}>
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 mr-2" />
                  )}
                  Apply Filters
                </Button>
                
                <Button onClick={handleExportReports} variant="outline" disabled={filteredReports.length === 0}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Attendance Reports
              </div>
              <div className="text-sm text-gray-500">
                {filteredReports.length} records found
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-yellow-600" />
                <p className="mt-2 text-sm text-gray-600">Loading attendance reports...</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No reports found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? "No records match your search criteria." : "No attendance records found for the selected filters."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-[#6B7A99]">
                      <th className="text-left py-3">Date</th>
                      <th className="text-left py-3">Student</th>
                      <th className="text-left py-3">Course</th>
                      <th className="text-left py-3">Branch</th>
                      <th className="text-left py-3">Status</th>
                      <th className="text-left py-3">Check-in</th>
                      <th className="text-left py-3">Check-out</th>
                      <th className="text-left py-3">Method</th>
                      <th className="text-left py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.map((report, index) => (
                      <tr key={`${report.id}-${index}`} className="border-b text-[#6B7A99] hover:bg-gray-50">
                        <td className="py-3">
                          {report.attendance_date ? format(new Date(report.attendance_date), 'MMM dd, yyyy') : '-'}
                        </td>
                        <td className="py-3">
                          <div className="font-medium text-gray-900">{report.student_name}</div>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3 text-gray-400" />
                            {report.course_name}
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            {report.branch_name}
                          </div>
                        </td>
                        <td className="py-3">
                          {getStatusBadge(report)}
                        </td>
                        <td className="py-3">
                          {report.check_in_time ? format(new Date(report.check_in_time), 'HH:mm') : '-'}
                        </td>
                        <td className="py-3">
                          {report.check_out_time ? format(new Date(report.check_out_time), 'HH:mm') : '-'}
                        </td>
                        <td className="py-3">
                          <Badge variant="outline" className="text-xs">
                            {report.method || 'Manual'}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <div className="max-w-[200px] truncate" title={report.notes}>
                            {report.notes || '-'}
                          </div>
                        </td>
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
