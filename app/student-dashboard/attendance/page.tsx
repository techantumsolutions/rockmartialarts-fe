"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import StudentDashboardLayout from "@/components/student-dashboard-layout"
import { TokenManager } from "@/lib/tokenManager"
import { getBackendApiUrl } from "@/lib/config"
import { formatSessionDateLabelYmd } from "@/lib/formatRegisteredDate"
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  RefreshCw
} from "lucide-react"

interface AttendanceRecord {
  id: string
  date: string
  course: string
  course_id: string
  branch: string
  branch_id: string
  status: "present" | "absent" | "late" | "not_marked"
  check_in_time?: string
  check_out_time?: string
  is_present: boolean
  notes: string
  admin_adjusted?: boolean
  attendance_modified_at?: string | null
}

interface AttendanceStats {
  total_classes: number
  attended: number
  absent: number
  late: number
  percentage: number
}

function normalizeAttendanceRecord(raw: Record<string, unknown>): AttendanceRecord {
  const dateRaw = raw.date ?? raw.attendance_date
  let dateStr = ""
  if (typeof dateRaw === "string") dateStr = dateRaw.split("T")[0] || dateRaw
  const statusRaw = String(raw.status || "").toLowerCase()
  let status: AttendanceRecord["status"] = "absent"
  if (statusRaw === "present" || statusRaw === "late" || statusRaw === "not_marked") {
    status = statusRaw as AttendanceRecord["status"]
  } else if (raw.is_present === true) status = "present"

  const cid = String(raw.course_id ?? "")
  const bid = String(raw.branch_id ?? "")
  return {
    id: String(raw.id ?? `${cid}-${dateStr}`),
    date: dateStr,
    course: String(raw.course ?? raw.course_name ?? "Course"),
    course_id: cid,
    branch: String(raw.branch ?? raw.branch_name ?? ""),
    branch_id: bid,
    status,
    check_in_time:
      typeof raw.check_in_time === "string" ? raw.check_in_time : raw.check_in_time != null ? String(raw.check_in_time) : undefined,
    check_out_time:
      typeof raw.check_out_time === "string" ? raw.check_out_time : raw.check_out_time != null ? String(raw.check_out_time) : undefined,
    is_present: Boolean(raw.is_present ?? status === "present"),
    notes: typeof raw.notes === "string" ? raw.notes : "",
    admin_adjusted: Boolean(raw.admin_adjusted),
    attendance_modified_at:
      typeof raw.attendance_modified_at === "string" ? raw.attendance_modified_at : null,
  }
}

export default function StudentAttendancePage() {
  const router = useRouter()
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  /** Null until a successful API response (avoid showing zeros as if they were live counts). */
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10))

  // Fetch attendance data
  const fetchAttendanceData = async (overrideStart?: string, overrideEnd?: string) => {
    try {
      setLoading(true)
      setError(null)

      if (!TokenManager.isAuthenticated()) {
        router.push("/login")
        return
      }

      const user = TokenManager.getUser()
      if (!user || user.role !== "student") {
        console.log("❌ User is not a student:", user?.role)
        if (user?.role === "coach") {
          router.push("/coach-dashboard")
        } else if (user?.role === "superadmin" || user?.role === "super_admin") {
          router.push("/dashboard")
        } else if (user?.role === "branch_manager") {
          router.push("/branch-manager-dashboard")
        } else {
          router.push("/login")
        }
        return
      }

      const headers = TokenManager.getAuthHeaders()
      console.log("🔄 Fetching student attendance data...")

      const qs = new URLSearchParams()
      const s = overrideStart ?? startDate
      const e = overrideEnd ?? endDate
      if (s) qs.set("start_date", s)
      if (e) qs.set("end_date", e)

      const response = await fetch(
        getBackendApiUrl(`attendance/student/my-attendance?${qs.toString()}`),
        {
          method: "GET",
          headers,
        }
      )

      if (!response.ok) {
        if (response.status === 401) {
          console.log("❌ Authentication failed, redirecting to login")
          TokenManager.clearAuthData()
          router.push("/login")
          return
        }
        throw new Error(`Failed to fetch attendance data: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log("✅ Attendance data received:", data)

      const rawList = Array.isArray(data.attendance_records) ? data.attendance_records : []
      setAttendanceRecords(rawList.map((r: Record<string, unknown>) => normalizeAttendanceRecord(r)))

      const st = data.statistics
      if (st && typeof st === "object") {
        setAttendanceStats({
          total_classes: Number(st.total_classes) || 0,
          attended: Number(st.attended) || 0,
          absent: Number(st.absent) || 0,
          late: Number(st.late) || 0,
          percentage: typeof st.percentage === "number" ? st.percentage : Number(st.percentage) || 0,
        })
      } else {
        setAttendanceStats({
          total_classes: 0,
          attended: 0,
          absent: 0,
          late: 0,
          percentage: 0,
        })
      }
    } catch (error) {
      console.error("❌ Error fetching attendance data:", error)
      setError(error instanceof Error ? error.message : "Failed to load attendance data")
      setAttendanceRecords([])
      setAttendanceStats(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAttendanceData()
  }, [router])

  const handleLogout = () => {
    TokenManager.clearAuthData()
    router.push("/login")
  }

  if (loading) {
    return (
      <StudentDashboardLayout
        pageTitle="Attendance"
        pageDescription="Track your class attendance and punctuality"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="rounded-xl border bg-white shadow-sm">
              <CardContent className="p-6">
                <div className="text-center space-y-2">
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mx-auto"></div>
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mx-auto"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="rounded-xl border bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 animate-pulse">
                  <div className="h-4 w-24 bg-gray-200 rounded"></div>
                  <div className="h-4 w-32 bg-gray-200 rounded"></div>
                  <div className="h-4 w-20 bg-gray-200 rounded"></div>
                  <div className="h-6 w-16 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </StudentDashboardLayout>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return <Badge className="bg-green-100 text-green-800">Present</Badge>
      case "absent":
        return <Badge className="bg-red-100 text-red-800">Absent</Badge>
      case "late":
        return <Badge className="bg-yellow-100 text-yellow-800">Late</Badge>
      case "not_marked":
        return <Badge variant="secondary">Not marked</Badge>
      default:
        return <Badge variant="secondary">{status || "—"}</Badge>
    }
  }

  return (
    <StudentDashboardLayout
      pageTitle="Attendance"
      pageDescription="Track your class attendance and punctuality"
      showBreadcrumb={true}
      breadcrumbItems={[
        { label: "Dashboard", href: "/student-dashboard" },
        { label: "Attendance" }
      ]}
    >
      {/* Error Alert */}
      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
            <Button
              onClick={() => fetchAttendanceData()}
              variant="outline"
              size="sm"
              className="ml-2 h-6 text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card className="rounded-xl border bg-white shadow-sm mb-6">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="space-y-1 flex-1">
            <label className="text-xs font-medium text-slate-600">From</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1 flex-1">
            <label className="text-xs font-medium text-slate-600">To</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => fetchAttendanceData()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Apply dates
          </Button>
        </CardContent>
      </Card>

      {/* Attendance Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card className="rounded-xl border bg-white shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-6">
            <div className="text-center">
              <Calendar className="w-5 h-5 mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-bold text-blue-600">
                {attendanceStats !== null ? attendanceStats.total_classes : "—"}
              </p>
              <p className="text-sm text-gray-500 mt-1">Total Classes</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border bg-white shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-6">
            <div className="text-center">
              <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold text-green-600">
                {attendanceStats !== null ? attendanceStats.attended : "—"}
              </p>
              <p className="text-sm text-gray-500 mt-1">Attended</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border bg-white shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-6">
            <div className="text-center">
              <XCircle className="w-5 h-5 mx-auto mb-1 text-red-500" />
              <p className="text-2xl font-bold text-red-600">
                {attendanceStats !== null ? attendanceStats.absent : "—"}
              </p>
              <p className="text-sm text-gray-500 mt-1">Absent</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border bg-white shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-6">
            <div className="text-center">
              <Clock className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
              <p className="text-2xl font-bold text-yellow-600">
                {attendanceStats !== null ? attendanceStats.late : "—"}
              </p>
              <p className="text-sm text-gray-500 mt-1">Late</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border bg-white shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-6">
            <div className="text-center">
              <TrendingUp className="w-5 h-5 mx-auto mb-1 text-purple-500" />
              <p className="text-2xl font-bold text-purple-600">
                {attendanceStats !== null ? `${attendanceStats.percentage}%` : "—"}
              </p>
              <p className="text-sm text-gray-500 mt-1">Attendance Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Records */}
      <Card className="rounded-xl border bg-white shadow-sm hover:shadow-md transition-all">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Attendance</CardTitle>
            <CardDescription>Your attendance history for the past classes</CardDescription>
          </div>
          <Button
            onClick={fetchAttendanceData}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {attendanceRecords.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">No attendance records found</p>
              <p className="text-gray-400 text-sm">Your attendance records will appear here once you start attending classes.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Course</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Branch</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Check In</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Check Out</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 min-w-[8rem]">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900">
                        {formatSessionDateLabelYmd(record.date)}
                      </td>
                      <td className="py-3 px-4 text-gray-900">{record.course}</td>
                      <td className="py-3 px-4 text-gray-600">{record.branch}</td>
                      <td className="py-3 px-4">{getStatusBadge(record.status)}</td>
                      <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{record.check_in_time || "-"}</td>
                      <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{record.check_out_time || "-"}</td>
                      <td className="py-3 px-4 text-gray-600 text-xs">
                        {record.admin_adjusted ? (
                          <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-amber-900 ring-1 ring-inset ring-amber-200">
                            Updated by Admin
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </StudentDashboardLayout>
  )
}
