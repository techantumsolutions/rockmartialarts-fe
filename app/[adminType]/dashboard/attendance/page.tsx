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
  PieChart as PieChartIcon,
  GraduationCap,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AdminCard,
  AdminKpiCard,
  AdminKpiGrid,
  AdminPageHeader,
  AdminPageShell,
  AdminTableShell,
} from "@/components/dashboard/AdminPageShell"
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
  coach_present_today: number
  coach_absent_today: number
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
    coach_present_today: 0,
    coach_absent_today: 0,
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

  // Partner/SA TokenManager first; BM token only as fallback (never mix Rock SA into partner session).
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
      let studentRosterLoaded = false
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
        studentRosterLoaded = true
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

      // Prefer roster-derived present/absent so overview cards match Manage Students/Coaches
      // for the same date. Unmarked (not_marked) must NOT count as absent.
      const uniqueStudentRosterCount = new Set(
        studentData.map((student: any) => String(student.id || "")).filter(Boolean)
      ).size
      const uniqueCoachRosterCount = new Set(
        coachData.map((coach: any) => String(coach.id || "")).filter(Boolean)
      ).size
      const isAttended = (status?: string) => status === "present" || status === "late"
      const isExplicitAbsent = (status?: string) => status === "absent"

      const rosterStudentPresent = studentData.filter((s: any) =>
        isAttended(s.attendance?.status)
      ).length
      const rosterStudentAbsent = studentData.filter((s: any) =>
        isExplicitAbsent(s.attendance?.status)
      ).length
      const rosterCoachPresent = coachData.filter((c: any) =>
        isAttended(c.attendance?.status)
      ).length
      const rosterCoachAbsent = coachData.filter((c: any) =>
        isExplicitAbsent(c.attendance?.status)
      ).length

      let overviewStats: AttendanceOverviewStats

      if (statsData) {
        const studentPresent = studentRosterLoaded
          ? rosterStudentPresent
          : (statsData.student_present_today || 0) + (statsData.student_late_today || 0)
        const coachPresent =
          coachData.length > 0
            ? rosterCoachPresent
            : (statsData.coach_present_today || 0) + (statsData.coach_late_today || 0)
        const totalStudents = studentRosterLoaded
          ? uniqueStudentRosterCount
          : statsData.total_students || 0
        const totalCoaches =
          coachData.length > 0 ? uniqueCoachRosterCount : statsData.total_coaches || 0
        const studentAbsent = studentRosterLoaded
          ? rosterStudentAbsent
          : Math.max(0, Number(statsData.student_absent_today) || 0)
        const coachAbsent =
          coachData.length > 0
            ? rosterCoachAbsent
            : Math.max(0, Number(statsData.coach_absent_today) || 0)
        const studentRate =
          totalStudents > 0 ? (studentPresent / totalStudents) * 100 : 0
        const coachRate = totalCoaches > 0 ? (coachPresent / totalCoaches) * 100 : 0
        const totalPeople = totalStudents + totalCoaches
        const overallRate =
          totalPeople > 0 ? ((studentPresent + coachPresent) / totalPeople) * 100 : 0

        overviewStats = {
          total_students: totalStudents,
          total_coaches: totalCoaches,
          student_present_today: studentPresent,
          student_absent_today: studentAbsent,
          coach_present_today: coachPresent,
          coach_absent_today: coachAbsent,
          overall_attendance_rate: Number(overallRate.toFixed(1)),
          student_attendance_rate: Number(studentRate.toFixed(1)),
          coach_attendance_rate: Number(coachRate.toFixed(1)),
        }
      } else {
        // Fallback: calculate from student and coach roster responses
        const studentTotal = uniqueStudentRosterCount
        const coachTotal = uniqueCoachRosterCount
        const peopleTotal = studentTotal + coachTotal

        overviewStats = {
          total_students: studentTotal,
          total_coaches: coachTotal,
          student_present_today: rosterStudentPresent,
          student_absent_today: rosterStudentAbsent,
          coach_present_today: rosterCoachPresent,
          coach_absent_today: rosterCoachAbsent,
          overall_attendance_rate:
            peopleTotal > 0
              ? Number(
                  (((rosterStudentPresent + rosterCoachPresent) / peopleTotal) * 100).toFixed(1)
                )
              : 0,
          student_attendance_rate:
            studentTotal > 0
              ? Number(((rosterStudentPresent / studentTotal) * 100).toFixed(1))
              : 0,
          coach_attendance_rate:
            coachTotal > 0 ? Number(((rosterCoachPresent / coachTotal) * 100).toFixed(1)) : 0,
        }
      }

      setStats(overviewStats)

      // Calculate branch-wise statistics (present includes former "late")
      const branchStatsData: BranchStats[] = branchData.map((branch: any) => {
        const branchStudents = studentData.filter((s: any) => s.branch_id === branch.id)
        const presentStudents = branchStudents.filter((s: any) => isAttended(s.attendance?.status)).length

        const branchCoaches = coachData.filter((c: any) => c.branch_id === branch.id)
        const presentCoaches = branchCoaches.filter((c: any) => isAttended(c.attendance?.status)).length

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

  const studentNotMarked = Math.max(
    0,
    stats.total_students - stats.student_present_today - stats.student_absent_today
  )

  const studentDistributionData = [
    { name: "Present", value: stats.student_present_today, fill: "#1F9D57" },
    { name: "Absent", value: stats.student_absent_today, fill: "#E11D48" },
    { name: "Not Marked", value: studentNotMarked, fill: "#9CA3AF" },
  ]

  return (
    <AdminPageShell>
      <AdminPageHeader
        icon={Calendar}
        title="Attendance Overview"
        subtitle="Comprehensive attendance management across all branches"
        actions={
          <>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="btn-admin-outline h-10 font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "MMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button
              type="button"
              variant="outline"
              className="btn-admin-outline h-10"
              onClick={fetchAttendanceOverview}
              disabled={loading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              type="button"
              variant="outline"
              className="btn-admin-outline h-10"
              onClick={() => router.push(`${basePath}/attendance/students`)}
            >
              <Users className="mr-2 h-4 w-4" />
              Manage Students
            </Button>
            <Button
              type="button"
              variant="outline"
              className="btn-admin-outline h-10"
              onClick={() => router.push(`${basePath}/attendance/coaches`)}
            >
              <Award className="mr-2 h-4 w-4" />
              Manage Coaches
            </Button>
            <Button
              type="button"
              className="btn-admin-primary h-10"
              onClick={() => router.push(`${basePath}/attendance/students`)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Mark Attendance
            </Button>
          </>
        }
      />

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {!loading && !error && stats.total_students === 0 && stats.total_coaches === 0 && (
        <Alert className="border-blue-200 bg-blue-50">
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

      <AdminKpiGrid cols={4}>
        <AdminKpiCard
          icon={Users}
          label="Total Students"
          value={stats.total_students}
          tone="blue"
          hint={`${stats.student_present_today} present today`}
        />
        <AdminKpiCard
          icon={Award}
          label="Total Coaches"
          value={stats.total_coaches}
          tone="green"
          hint={`${stats.coach_present_today} present today`}
        />
        <AdminKpiCard
          icon={TrendingUp}
          label="Student Attendance"
          value={`${stats.student_attendance_rate.toFixed(1)}%`}
          tone="purple"
          hint={`${stats.student_present_today} of ${stats.total_students}`}
        />
        <AdminKpiCard
          icon={BarChart3}
          label="Coach Attendance"
          value={`${stats.coach_attendance_rate.toFixed(1)}%`}
          tone="amber"
          hint={`${stats.coach_present_today} of ${stats.total_coaches}`}
        />
      </AdminKpiGrid>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div
          role="button"
          tabIndex={0}
          className="cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E1BB33]/50"
          onClick={() => router.push(`${basePath}/attendance/students`)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              router.push(`${basePath}/attendance/students`)
            }
          }}
        >
        <AdminCard className="transition-shadow hover:shadow-md">
          <div className="relative block lg:flex lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="admin-icon-tile admin-icon-tile--blue">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-[#4F5077]">Student Attendance</h3>
              </div>
              <p className="mb-4 text-sm text-[#6B7A99]">
                Manage attendance for all students across branches
              </p>
              <div className="flex flex-wrap items-center gap-4 pr-8 lg:pr-0">
                <div className="flex items-center text-sm text-[#1F9D57]">
                  <CheckCircle className="mr-1 h-4 w-4" />
                  {stats.student_present_today} Present
                </div>
                <div className="flex items-center text-sm text-[#E11D48]">
                  <XCircle className="mr-1 h-4 w-4" />
                  {stats.student_absent_today} Absent
                </div>
              </div>
            </div>
            <ArrowRight className="absolute bottom-0 right-0 h-6 w-6 shrink-0 text-[#9593A8] lg:static" />
          </div>
        </AdminCard>
        </div>

        <div
          role="button"
          tabIndex={0}
          className="cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E1BB33]/50"
          onClick={() => router.push(`${basePath}/attendance/coaches`)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              router.push(`${basePath}/attendance/coaches`)
            }
          }}
        >
        <AdminCard className="transition-shadow hover:shadow-md">
          <div className="relative block lg:flex lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="admin-icon-tile admin-icon-tile--purple">
                  <User className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-[#4F5077]">Coach Attendance</h3>
              </div>
              <p className="mb-4 text-sm text-[#6B7A99]">
                Manage attendance for all coaches across branches
              </p>
              <div className="flex flex-wrap items-center gap-4 pr-8 lg:pr-0">
                <div className="flex items-center text-sm text-[#1F9D57]">
                  <CheckCircle className="mr-1 h-4 w-4" />
                  {stats.coach_present_today} Present
                </div>
                <div className="flex items-center text-sm text-[#E11D48]">
                  <XCircle className="mr-1 h-4 w-4" />
                  {stats.coach_absent_today} Absent
                </div>
              </div>
            </div>
            <ArrowRight className="absolute bottom-0 right-0 h-6 w-6 shrink-0 text-[#9593A8] lg:static" />
          </div>
        </AdminCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <AdminCard>
          <div className="mb-4 flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-[#6D28D9]" />
            <h2 className="text-[15px] font-semibold text-[#4F5077]">Today&apos;s Attendance Distribution</h2>
          </div>
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-[#4F5077]" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
              <div className="relative h-56 w-56 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={
                        studentDistributionData.some((d) => d.value > 0)
                          ? studentDistributionData.filter((d) => d.value > 0)
                          : [{ name: "Empty", value: 1, fill: "#E5E7EB" }]
                      }
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {studentDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-[#4F5077]">{stats.total_students}</span>
                  <span className="text-xs text-[#6B7A99]">Total Students</span>
                </div>
              </div>
              <div className="min-w-[10rem] space-y-2 text-sm">
                {studentDistributionData.map((row) => {
                  const pct =
                    stats.total_students > 0
                      ? ((row.value / stats.total_students) * 100).toFixed(1)
                      : "0.0"
                  return (
                    <div key={row.name} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-[#6B7A99]">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: row.fill }} />
                        {row.name}
                      </span>
                      <span className="font-medium text-[#4F5077]">
                        {row.value} ({pct}%)
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </AdminCard>

        <AdminCard>
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#2563EB]" />
            <h2 className="text-[15px] font-semibold text-[#4F5077]">7-Day Attendance Trend</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getTrendData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F4" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6B7A99" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6B7A99" }} domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="students"
                  stroke="#2563EB"
                  strokeWidth={2}
                  name="Student Attendance %"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="coaches"
                  stroke="#1F9D57"
                  strokeWidth={2}
                  name="Coach Attendance %"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>
      </div>

      <AdminCard padding={false}>
        <div className="border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-[#6D28D9]" />
            <h2 className="text-[15px] font-semibold text-[#4F5077]">Branch-wise Attendance Overview</h2>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-12 text-[#6B7A99]">
            <RefreshCw className="h-8 w-8 animate-spin" />
            Loading branch statistics…
          </div>
        ) : branchStats.length === 0 ? (
          <div className="py-12 text-center">
            <MapPin className="mx-auto mb-4 h-12 w-12 text-[#9593A8]" />
            <h3 className="mb-2 text-lg font-medium text-[#4F5077]">No branch data available</h3>
            <p className="text-sm text-[#6B7A99]">Branch statistics will appear here once data is loaded.</p>
          </div>
        ) : (
          <AdminTableShell>
            <table>
              <thead>
                <tr>
                  <th>Branch</th>
                  <th>Total Students</th>
                  <th>Students Present</th>
                  <th>Total Coaches</th>
                  <th>Coaches Present</th>
                  <th>Attendance Rate</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {branchStats.map((branch) => (
                  <tr key={branch.id}>
                    <td>
                      <div className="flex items-center gap-2 font-medium">
                        <MapPin className="h-4 w-4 text-[#9593A8]" />
                        {branch.name}
                      </div>
                    </td>
                    <td>{branch.total_students}</td>
                    <td className="font-medium text-[#1F9D57]">{branch.student_present}</td>
                    <td>{branch.total_coaches}</td>
                    <td className="font-medium text-[#1F9D57]">{branch.coach_present}</td>
                    <td className="min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-[#E1BB33]"
                            style={{ width: `${Math.min(100, branch.attendance_rate)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-[#4F5077]">
                          {branch.attendance_rate.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="btn-admin-outline h-8"
                        onClick={() =>
                          router.push(`${basePath}/attendance/students?branch=${branch.id}`)
                        }
                      >
                        <Eye className="mr-1 h-4 w-4" />
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminTableShell>
        )}
      </AdminCard>
    </AdminPageShell>
  )
}
