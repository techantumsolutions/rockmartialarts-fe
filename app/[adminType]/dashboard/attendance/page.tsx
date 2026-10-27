"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import { format } from "date-fns"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts"
import { 
  Calendar, 
  CalendarIcon, 
  Download, 
  Search, 
  Filter, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  RefreshCw,
  FileText,
  TrendingUp,
  MapPin,
  BookOpen,
  User,
  Award,
  ArrowRight,
  Eye,
  BarChart3,
  PieChart as PieChartIcon
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TokenManager } from "@/lib/tokenManager"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { getBackendApiUrl } from "@/lib/config"

interface AttendanceOverviewStats {
  total_students: number
  total_coaches: number
  student_present_today: number
  student_absent_today: number
  student_late_today: number
  coach_present_today: number
  coach_absent_today: number
  coach_late_today: number
  overall_attendance_rate: number
  student_attendance_rate: number
  coach_attendance_rate: number
}

interface BranchStats {
  id: string
  name: string
  total_students: number
  total_coaches: number
  student_present: number
  coach_present: number
  attendance_rate: number
}

export default function AttendanceOverviewPage() {
  const router = useRouter()
  const basePath = useDashboardBasePath()
  
  // State management
  const [stats, setStats] = useState<AttendanceOverviewStats>({
    total_students: 0,
    total_coaches: 0,
    student_present_today: 0,
    student_absent_today: 0,
    student_late_today: 0,
    coach_present_today: 0,
    coach_absent_today: 0,
    coach_late_today: 0,
    overall_attendance_rate: 0,
    student_attendance_rate: 0,
    coach_attendance_rate: 0
  })
  const [branchStats, setBranchStats] = useState<BranchStats[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  // Clear error after timeout
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 8000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // Get auth token from either TokenManager or BranchManagerAuth
  const getAuthToken = () => {
    return TokenManager.getToken() || BranchManagerAuth.getToken() || null
  }

  // Fetch attendance overview data
  const fetchAttendanceOverview = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = getAuthToken()
      if (!token) {
        setError("Authentication required")
        return
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
      const dateStr = format(selectedDate, 'yyyy-MM-dd')

      console.log(`🔄 Fetching attendance overview for date: ${dateStr}`)

      // Fetch attendance statistics from the dedicated endpoint with date filtering
      const statsResponse = await fetch(`${getBackendApiUrl('attendance/stats')}?date=${dateStr}`, {
        method: 'GET',
        headers
      })

      // Fetch students attendance data
      const studentsResponse = await fetch(`${getBackendApiUrl('attendance/students')}?date=${dateStr}`, {
        method: 'GET',
        headers
      })

      // Fetch coaches attendance data
      const coachesResponse = await fetch(`${getBackendApiUrl('attendance/coaches')}?date=${dateStr}`, {
        method: 'GET',
        headers
      })

      // Fetch branches data for branch-wise statistics
      const branchesResponse = await fetch(getBackendApiUrl('branches'), {
        method: 'GET',
        headers
      })

      let statsData = null
      let studentData = []
      let coachData = []
      let branchData = []

      // Process stats response
      if (statsResponse.ok) {
        statsData = await statsResponse.json()
        console.log("📊 Stats data received:", statsData)
      } else {
        console.warn("⚠️ Stats endpoint failed:", statsResponse.status)
      }

      // Process students response
      if (studentsResponse.ok) {
        const data = await studentsResponse.json()
        studentData = data.students || []
        console.log(`📚 Students data received: ${studentData.length} students`)
      } else {
        console.warn("⚠️ Students endpoint failed:", studentsResponse.status)
      }

      // Process coaches response
      if (coachesResponse.ok) {
        const data = await coachesResponse.json()
        coachData = data.coaches || []
        console.log(`👨‍🏫 Coaches data received: ${coachData.length} coaches`)
      } else {
        console.warn("⚠️ Coaches endpoint failed:", coachesResponse.status)
      }

      // Process branches response
      if (branchesResponse.ok) {
        const data = await branchesResponse.json()
        branchData = data.branches || []
        console.log(`🏢 Branches data received: ${branchData.length} branches`)
      } else {
        console.warn("⚠️ Branches endpoint failed:", branchesResponse.status)
      }

      // Use stats data if available, otherwise calculate from student data
      let overviewStats: AttendanceOverviewStats

      if (statsData) {
        // Use the backend stats API data
        overviewStats = {
          total_students: statsData.total_students || 0,
          total_coaches: statsData.total_coaches || 0,
          student_present_today: statsData.today_present_students || 0,
          student_absent_today: Math.max(0, (statsData.total_students || 0) - (statsData.today_present_students || 0)),
          student_late_today: 0, // Not provided by current API
          coach_present_today: statsData.today_present_coaches || 0,
          coach_absent_today: Math.max(0, (statsData.total_coaches || 0) - (statsData.today_present_coaches || 0)),
          coach_late_today: 0, // Not provided by current API
          overall_attendance_rate: 0,
          student_attendance_rate: statsData.average_student_attendance || 0,
          coach_attendance_rate: statsData.average_coach_attendance || 0
        }

        // Calculate overall attendance rate
        const totalPeople = overviewStats.total_students + overviewStats.total_coaches
        if (totalPeople > 0) {
          const totalPresent = overviewStats.student_present_today + overviewStats.coach_present_today
          overviewStats.overall_attendance_rate = (totalPresent / totalPeople) * 100
        }
      } else {
        // Fallback: calculate from student and coach data
        const studentStats = {
          total: studentData.length,
          present: studentData.filter((s: any) => s.attendance?.status === "present").length,
          absent: studentData.filter((s: any) => s.attendance?.status === "absent" || !s.attendance).length,
          late: studentData.filter((s: any) => s.attendance?.status === "late").length
        }

        const coachStats = {
          total: coachData.length,
          present: coachData.filter((c: any) => c.attendance?.status === "present").length,
          absent: coachData.filter((c: any) => c.attendance?.status === "absent" || !c.attendance).length,
          late: coachData.filter((c: any) => c.attendance?.status === "late").length
        }

        overviewStats = {
          total_students: studentStats.total,
          total_coaches: coachStats.total,
          student_present_today: studentStats.present,
          student_absent_today: studentStats.absent,
          student_late_today: studentStats.late,
          coach_present_today: coachStats.present,
          coach_absent_today: coachStats.absent,
          coach_late_today: coachStats.late,
          overall_attendance_rate: (studentStats.total + coachStats.total) > 0 ?
            ((studentStats.present + studentStats.late + coachStats.present + coachStats.late) / (studentStats.total + coachStats.total)) * 100 : 0,
          student_attendance_rate: studentStats.total > 0 ?
            ((studentStats.present + studentStats.late) / studentStats.total) * 100 : 0,
          coach_attendance_rate: coachStats.total > 0 ?
            ((coachStats.present + coachStats.late) / coachStats.total) * 100 : 0
        }
      }

      setStats(overviewStats)

      // Calculate branch-wise statistics
      const branchStatsData: BranchStats[] = branchData.map((branch: any) => {
        const branchStudents = studentData.filter((s: any) => s.branch_id === branch.id)
        const presentStudents = branchStudents.filter((s: any) => s.attendance?.status === "present").length

        const branchCoaches = coachData.filter((c: any) => c.branch_id === branch.id)
        const presentCoaches = branchCoaches.filter((c: any) => c.attendance?.status === "present").length

        const totalPeople = branchStudents.length + branchCoaches.length
        const totalPresent = presentStudents + presentCoaches

        return {
          id: branch.id,
          name: branch.branch?.name || branch.name || 'Unknown Branch',
          total_students: branchStudents.length,
          total_coaches: branchCoaches.length,
          student_present: presentStudents,
          coach_present: presentCoaches,
          attendance_rate: totalPeople > 0 ? (totalPresent / totalPeople) * 100 : 0
        }
      }).filter(branch => branch.total_students > 0 || branch.total_coaches > 0)

      setBranchStats(branchStatsData)
      console.log("✅ Attendance overview data loaded successfully")

      // Show helpful message if no data
      if (overviewStats.total_students === 0 && overviewStats.total_coaches === 0) {
        console.log("ℹ️ No students or coaches found. This might be expected if no enrollments exist.")
      }

    } catch (error) {
      console.error("❌ Error fetching attendance overview:", error)
      setError("Failed to load attendance overview. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  // Load data on component mount and date change
  useEffect(() => {
    fetchAttendanceOverview()
  }, [selectedDate])

  // Chart data
  const getAttendanceChartData = () => [
    { name: 'Students Present', value: stats.student_present_today, fill: '#10B981' },
    { name: 'Students Absent', value: stats.student_absent_today, fill: '#EF4444' },
    { name: 'Students Late', value: stats.student_late_today, fill: '#F59E0B' },
    { name: 'Coaches Present', value: stats.coach_present_today, fill: '#3B82F6' },
    { name: 'Coaches Absent', value: stats.coach_absent_today, fill: '#DC2626' },
    { name: 'Coaches Late', value: stats.coach_late_today, fill: '#D97706' }
  ]

  const getTrendData = () => {
    // Mock trend data - in real app, this would come from API
    return [
      { date: '2025-01-01', students: 85, coaches: 95 },
      { date: '2025-01-02', students: 88, coaches: 92 },
      { date: '2025-01-03', students: 82, coaches: 98 },
      { date: '2025-01-04', students: 90, coaches: 94 },
      { date: '2025-01-05', students: 87, coaches: 96 },
      { date: '2025-01-06', students: 91, coaches: 93 },
      { date: '2025-01-07', students: 89, coaches: 97 }
    ]
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Attendance Overview</h1>
          <p className="text-gray-600">Comprehensive attendance management across all branches</p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Empty State Info */}
        {!loading && !error && stats.total_students === 0 && stats.total_coaches === 0 && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>No attendance data available.</strong> This could be because:
              <ul className="mt-2 ml-4 list-disc">
                <li>No students are enrolled in courses</li>
                <li>No attendance records have been created yet</li>
                <li>No coaches are assigned to branches</li>
              </ul>
              <p className="mt-2">
                To get started, ensure students are enrolled in courses and attendance is being tracked.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Date Selector and Actions */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Select Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(selectedDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto min-w-0">
                <Button
                  onClick={fetchAttendanceOverview}
                  variant="outline"
                  disabled={loading}
                  className="w-full sm:w-auto"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  onClick={() => router.push(`${basePath}/attendance/students`)}
                  className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manage Students
                </Button>
                <Button
                  onClick={() => router.push(`${basePath}/attendance/coaches`)}
                  className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                >
                  <Award className="h-4 w-4 mr-2" />
                  Manage Coaches
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_students}</p>
                  <p className="text-xs text-green-600">
                    {stats.student_present_today} present today
                  </p>
                  {stats.total_students === 0 && (
                    <p className="text-xs text-gray-400 mt-1">No enrolled students</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Award className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Coaches</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_coaches}</p>
                  <p className="text-xs text-green-600">
                    {stats.coach_present_today} present today
                  </p>
                  {stats.total_coaches === 0 && (
                    <p className="text-xs text-gray-400 mt-1">No active coaches</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Student Attendance</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.student_attendance_rate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500">
                    {stats.student_present_today + stats.student_late_today} of {stats.total_students}
                  </p>
                  {stats.total_students === 0 && (
                    <p className="text-xs text-gray-400 mt-1">No data available</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Coach Attendance</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {stats.coach_attendance_rate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500">
                    {stats.coach_present_today + stats.coach_late_today} of {stats.total_coaches}
                  </p>
                  {stats.total_coaches === 0 && (
                    <p className="text-xs text-gray-400 mt-1">No data available</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push(`${basePath}/attendance/students`)}>
            <CardContent className="p-6">
              {/* Mobile + tablet: arrow bottom-right; desktop (lg+) unchanged */}
              <div className="relative block lg:flex lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Student Attendance</h3>
                  <p className="text-gray-600 mb-4">Manage attendance for all students across branches</p>
                  <div className="flex items-center space-x-4 pr-8 lg:pr-0">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                      <span className="text-sm text-green-600">{stats.student_present_today} Present</span>
                    </div>
                    <div className="flex items-center">
                      <XCircle className="h-4 w-4 text-red-600 mr-1" />
                      <span className="text-sm text-red-600">{stats.student_absent_today} Absent</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-yellow-600 mr-1" />
                      <span className="text-sm text-yellow-600">{stats.student_late_today} Late</span>
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-6 w-6 text-gray-400 shrink-0 absolute right-0 bottom-0 lg:static" />
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push(`${basePath}/attendance/coaches`)}>
            <CardContent className="p-6">
              {/* Mobile + tablet: arrow bottom-right; desktop (lg+) unchanged */}
              <div className="relative block lg:flex lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Coach Attendance</h3>
                  <p className="text-gray-600 mb-4">Manage attendance for all coaches across branches</p>
                  <div className="flex items-center space-x-4 pr-8 lg:pr-0">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                      <span className="text-sm text-green-600">{stats.coach_present_today} Present</span>
                    </div>
                    <div className="flex items-center">
                      <XCircle className="h-4 w-4 text-red-600 mr-1" />
                      <span className="text-sm text-red-600">{stats.coach_absent_today} Absent</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-yellow-600 mr-1" />
                      <span className="text-sm text-yellow-600">{stats.coach_late_today} Late</span>
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-6 w-6 text-gray-400 shrink-0 absolute right-0 bottom-0 lg:static" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Attendance Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChartIcon className="h-5 w-5 mr-2" />
                Today's Attendance Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getAttendanceChartData().filter(item => item.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {getAttendanceChartData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attendance Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                7-Day Attendance Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getTrendData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="students"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      name="Student Attendance %"
                    />
                    <Line
                      type="monotone"
                      dataKey="coaches"
                      stroke="#10B981"
                      strokeWidth={2}
                      name="Coach Attendance %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Branch-wise Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Branch-wise Attendance Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-3 text-gray-600">Loading branch statistics...</span>
              </div>
            ) : branchStats.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No branch data available</h3>
                <p className="text-gray-500">Branch statistics will appear here once data is loaded.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Branch
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Students
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Students Present
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Coaches
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Coaches Present
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Attendance Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {branchStats.map((branch) => (
                      <tr key={branch.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm font-medium text-gray-900">{branch.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {branch.total_students}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                          {branch.student_present}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {branch.total_coaches}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                          {branch.coach_present}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${branch.attendance_rate}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {branch.attendance_rate.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`${basePath}/attendance/students?branch=${branch.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
