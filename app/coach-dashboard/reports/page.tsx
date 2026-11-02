"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  TrendingUp, 
  Users, 
  BookOpen, 
  Calendar,
  Award,
  Download,
  Loader2,
  CheckCircle,
  RefreshCw
} from "lucide-react"
import CoachDashboardHeader from "@/components/coach-dashboard-header"
import { checkCoachAuth, CoachData } from "@/lib/coachAuth"
import { getBackendApiUrl } from "@/lib/config"
import { fetchCoachAssignments, filterStudentsForCoach } from "@/lib/coachStudentFilter"

interface CoachReportData {
  performance_metrics: {
    total_students: number
    active_courses: number
    average_rating: number
    total_sessions: number
    attendance_rate: number
  }
  student_progress: Array<{
    student_id?: string
    student_name: string
    email?: string
    phone?: string
    course_name: string
    batch_name?: string
    progress_percentage: number
    last_session: string | null
    attendance_rate: number
  }>
}

export default function CoachReportsPage() {
  const router = useRouter()
  const [reportData, setReportData] = useState<CoachReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [coachData, setCoachData] = useState<CoachData | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [exporting, setExporting] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)

  useEffect(() => {
    // Robust coach authentication check
    const authResult = checkCoachAuth()

    if (!authResult.isAuthenticated) {
      console.log("Coach not authenticated:", authResult.error)
      router.push("/coach/login")
      return
    }

    if (authResult.coach && authResult.token) {
      setCoachData(authResult.coach)
      fetchReportData(authResult.token, authResult.coach)
    } else {
      setError("Coach information not found")
      setLoading(false)
    }
  }, [router])

  const fetchReportData = async (token: string, coach: CoachData) => {
    try {
      setLoading(true)
      setError(null)

      const coachId = coach.id || (coach as any)._id
      const branchId = coach.branch_id
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      }

      // 1. Fetch coach assignments (courses and batches assigned to this coach)
      const coachAssignments = await fetchCoachAssignments(token, coach)
      const coursesData = coachAssignments.courses || []
      const coachCourseIds = new Set(
        coursesData.map((c) => String(c.id || c.course_id || "").trim())
      )
      const coachCourseNames = new Set(
        coursesData.map((c) => String(c.name || "").trim().toLowerCase())
      )

      // Batch lookup for human-readable batch names
      const batchLookup = new Map<string, string>()
      coursesData.forEach((c) => {
        c.batches?.forEach((b) => {
          const timeStr = b.start_time && b.end_time ? ` (${b.start_time} - ${b.end_time})` : ""
          const displayName = `${b.batch_name}${timeStr}`
          if (b.id) batchLookup.set(b.id, displayName)
          if (b.batch_id) batchLookup.set(b.batch_id, displayName)
        })
      })

      // 2. Fetch all students under this branch/coach
      const studentMap = new Map<string, any>()
      const mergeStudent = (st: any, isFromCoachEndpoint = false) => {
        const sid = st.id || st.student_id
        if (!sid) return
        if (!studentMap.has(sid)) {
          studentMap.set(sid, { ...st })
        } else {
          const existing = studentMap.get(sid)
          const existingCourses = Array.isArray(existing.courses) ? existing.courses : []
          const newCourses = Array.isArray(st.courses) ? st.courses : []
          const mergedCourses = [...existingCourses]

          newCourses.forEach((nc: any) => {
            const ncid = nc.id || nc.course_id
            if (ncid && !mergedCourses.some((mc: any) => (mc.id || mc.course_id) === ncid)) {
              mergedCourses.push(nc)
            }
          })

          if (st.course_id && !mergedCourses.some((mc: any) => (mc.id || mc.course_id) === st.course_id)) {
            mergedCourses.push({
              id: st.course_id,
              course_id: st.course_id,
              name: st.course_name,
              batch_ref: st.batch_ref,
              batch_name: st.batch_name,
              branch_id: st.branch_id,
            })
          }

          studentMap.set(sid, {
            ...existing,
            ...st,
            full_name: st.full_name || st.student_name || existing.full_name || existing.student_name,
            student_name: st.student_name || st.full_name || existing.student_name || existing.full_name,
            email: st.email || existing.email,
            phone: st.phone || existing.phone,
            course_id: isFromCoachEndpoint ? (st.course_id || existing.course_id) : (existing.course_id || st.course_id),
            course_name: isFromCoachEndpoint ? (st.course_name || existing.course_name) : (existing.course_name || st.course_name),
            batch_ref: isFromCoachEndpoint ? (st.batch_ref || existing.batch_ref) : (existing.batch_ref || st.batch_ref),
            batch_name: isFromCoachEndpoint ? (st.batch_name || existing.batch_name) : (existing.batch_name || st.batch_name),
            courses: mergedCourses,
            branches: existing.branches || st.branches,
          })
        }
      }

      // Try coach-specific endpoint
      try {
        const res = await fetch(getBackendApiUrl(`coaches/${encodeURIComponent(coachId)}/students`), { headers })
        if (res.ok) {
          const json = await res.json()
          const list = json.students || json.enrolled_students || []
          if (Array.isArray(list)) list.forEach((s) => mergeStudent(s, true))
        }
      } catch (e) {
        console.warn("Could not fetch students from coach endpoint:", e)
      }

      // Try branch search
      if (branchId) {
        try {
          const res = await fetch(
            getBackendApiUrl(`search/students?branch_id=${encodeURIComponent(branchId)}&limit=200`),
            { headers }
          )
          if (res.ok) {
            const json = await res.json()
            const list = Array.isArray(json.students) ? json.students : []
            list.forEach((s) => mergeStudent(s, false))
          }
        } catch (e) {
          console.warn("Could not fetch students from branch search:", e)
        }
      }

      const allMerged = Array.from(studentMap.values())
      // Filter strictly to students who belong to this coach's assigned courses and batches in this branch!
      const assignedStudents = filterStudentsForCoach(allMerged, coachAssignments)
      const assignedStudentIdSet = new Set(
        assignedStudents.map((s) => String(s.id || s.student_id || "").trim()).filter(Boolean)
      )

      // 3. Fetch attendance history
      let allAttendanceRecords: any[] = []
      try {
        const attRes = await fetch(
          getBackendApiUrl(`attendance/reports?branch_id=${encodeURIComponent(branchId || "")}&limit=1000`),
          { headers }
        )
        if (attRes.ok) {
          const attJson = await attRes.json()
          allAttendanceRecords = Array.isArray(attJson.attendance_records) ? attJson.attendance_records : []
        }
      } catch (e) {
        console.warn("Could not fetch attendance records:", e)
      }

      // Filter attendance records to those belonging to this coach's assigned students and assigned courses
      const coachAttendance = allAttendanceRecords.filter((rec) => {
        const sid = String(rec.student_id || "").trim()
        const cid = String(rec.course_id || "").trim()
        const cname = String(rec.course_name || "").toLowerCase().trim()
        const isStudentMatch = assignedStudentIdSet.has(sid)
        const isCourseMatch = coachCourseIds.has(cid) || coachCourseNames.has(cname)
        return isStudentMatch && isCourseMatch
      })

      // 4. Calculate student progress details
      const studentProgress = assignedStudents.map((student) => {
        const sid = String(student.id || student.student_id || "").trim()
        const sName = student.full_name || student.student_name || student.name || "Unknown Student"

        // Determine matching course
        let matchingCourse = Array.isArray(student.courses)
          ? student.courses.find(
              (c: any) =>
                coachCourseIds.has(String(c?.id || c?.course_id || "").trim()) ||
                coachCourseNames.has(String(c?.name || c?.course_name || "").toLowerCase().trim())
            )
          : null
        if (!matchingCourse) {
          if (
            coachCourseIds.has(String(student.course_id || "").trim()) ||
            coachCourseNames.has(String(student.course_name || "").toLowerCase().trim())
          ) {
            matchingCourse = student.course || student
          } else {
            matchingCourse = coursesData[0] || null
          }
        }

        const courseName =
          matchingCourse?.name ||
          matchingCourse?.course_name ||
          student.course_name ||
          coursesData[0]?.name ||
          "Martial Arts"

        // Batch determination
        const sBatchRef =
          matchingCourse?.batch_ref ||
          student.batch_ref ||
          student.batch_id ||
          student.course?.batch_ref ||
          student.courses?.[0]?.batch_ref ||
          ""
        const batchName = sBatchRef && batchLookup.has(sBatchRef)
          ? batchLookup.get(sBatchRef)!
          : (matchingCourse?.batch_name || student.batch_name || "")

        // Attendance stats for this student
        const studentRecords = coachAttendance.filter((r) => String(r.student_id).trim() === sid)
        const presentCount = studentRecords.filter((r) => {
          const st = String(r.status || "").toLowerCase()
          return st === "present" || st === "late"
        }).length
        const attendanceRate = studentRecords.length > 0
          ? Math.round((presentCount / studentRecords.length) * 100)
          : 0

        // Last session date
        const sortedRecords = [...studentRecords].sort((a, b) => {
          const da = new Date(a.attendance_date || a.created_at || 0).getTime()
          const db = new Date(b.attendance_date || b.created_at || 0).getTime()
          return db - da
        })
        const lastSession = sortedRecords.length > 0
          ? (sortedRecords[0].attendance_date || sortedRecords[0].created_at)
          : (student.enrollment_date || null)

        // Progress percentage
        let progress = 0
        if (student.progress !== undefined && student.progress !== null) {
          progress = Number(student.progress)
        } else if (matchingCourse?.progress !== undefined && matchingCourse?.progress !== null) {
          progress = Number(matchingCourse.progress)
        } else if (studentRecords.length > 0) {
          // Progress based on attended sessions (capped at 100%)
          progress = Math.min(100, Math.round((presentCount / Math.max(studentRecords.length, 12)) * 100))
        }

        return {
          student_id: sid,
          student_name: sName,
          email: student.email || "",
          phone: student.phone || "",
          course_name: courseName,
          batch_name: batchName,
          progress_percentage: Math.min(100, Math.max(0, progress)),
          last_session: lastSession,
          attendance_rate: attendanceRate,
        }
      })

      // 5. Calculate overall performance metrics
      const totalStudents = assignedStudents.length
      const activeCourses = coursesData.length
      const avgRating = Number(coach.rating || (coach as any).average_rating || 4.8)

      // Total sessions: distinct dates on which attendance was marked for this coach's course(s)
      const sessionDates = new Set(
        coachAttendance
          .map((r) => String(r.attendance_date || "").split("T")[0])
          .filter(Boolean)
      )
      const totalSessions = sessionDates.size

      // Overall attendance rate across all coach attendance records
      const totalPresent = coachAttendance.filter((r) => {
        const st = String(r.status || "").toLowerCase()
        return st === "present" || st === "late"
      }).length
      const overallAttendanceRate = coachAttendance.length > 0
        ? Math.round((totalPresent / coachAttendance.length) * 100)
        : 0

      setReportData({
        performance_metrics: {
          total_students: totalStudents,
          active_courses: activeCourses,
          average_rating: avgRating,
          total_sessions: totalSessions,
          attendance_rate: overallAttendanceRate,
        },
        student_progress: studentProgress,
      })
    } catch (err: any) {
      console.error("Error fetching report data:", err)
      setError(err?.message || "Failed to load report data")
    } finally {
      setLoading(false)
    }
  }

  const handleExportReport = () => {
    if (!reportData) return
    try {
      setExporting(true)
      const coachName = coachData?.full_name || "Coach"
      const dateStr = new Date().toISOString().split("T")[0]

      const headerInfo = [
        `"Coach Performance & Student Progress Report"`,
        `"Coach Name:","${coachName}"`,
        `"Date:","${new Date().toLocaleDateString()}"`,
        `"Total Students:","${reportData.performance_metrics.total_students}"`,
        `"Active Courses:","${reportData.performance_metrics.active_courses}"`,
        `"Average Rating:","${reportData.performance_metrics.average_rating}"`,
        `"Total Sessions:","${reportData.performance_metrics.total_sessions}"`,
        `"Attendance Rate:","${reportData.performance_metrics.attendance_rate}%"`,
        `""`,
        `"--- Student Progress Details ---"`,
        `"Student Name","Course","Batch","Progress (%)","Attendance Rate (%)","Last Session Date"`
      ]

      const rows = reportData.student_progress.map((s) => [
        `"${(s.student_name || "").replace(/"/g, '""')}"`,
        `"${(s.course_name || "").replace(/"/g, '""')}"`,
        `"${(s.batch_name || "—").replace(/"/g, '""')}"`,
        `"${s.progress_percentage}%"`,
        `"${s.attendance_rate}%"`,
        `"${s.last_session ? new Date(s.last_session).toLocaleDateString() : "—"}"`
      ].join(","))

      const csvContent = [...headerInfo, ...rows].join("\r\n")
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute(
        "download",
        `coach_report_${coachName.replace(/\s+/g, "_").toLowerCase()}_${dateStr}.csv`
      )
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 3000)
    } catch (err) {
      console.error("Error exporting report:", err)
      alert("Failed to export report CSV")
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CoachDashboardHeader 
          currentPage="Reports"
          coachName={coachData?.full_name || "Coach"}
        />
        <main className="mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error || !reportData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CoachDashboardHeader 
          currentPage="Reports"
          coachName={coachData?.full_name || "Coach"}
        />
        <main className="mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-red-600">
                  <p className="font-medium">Error loading reports</p>
                  <p className="text-sm mt-1">{error}</p>
                  <Button
                    onClick={() => coachData && fetchReportData(localStorage.getItem("access_token")!, coachData)}
                    className="mt-4"
                    variant="outline"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CoachDashboardHeader 
        currentPage="Reports"
        coachName={coachData?.full_name || "Coach"}
      />
      
      <main className="mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Performance Reports</h1>
              <p className="text-gray-600">Track your coaching performance and student progress</p>
            </div>
            <div className="flex items-center gap-3">
              {exportSuccess && (
                <span className="text-sm text-green-600 flex items-center font-medium">
                  <CheckCircle className="w-4 h-4 mr-1" /> Downloaded!
                </span>
              )}
              <Button 
                onClick={handleExportReport} 
                disabled={exporting || !reportData}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                {exporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Export Report
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="students">Student Progress</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <Users className="h-8 w-8 text-blue-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Students</p>
                        <p className="text-2xl font-bold text-gray-900">{reportData.performance_metrics.total_students}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <BookOpen className="h-8 w-8 text-green-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Active Courses</p>
                        <p className="text-2xl font-bold text-gray-900">{reportData.performance_metrics.active_courses}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <Award className="h-8 w-8 text-yellow-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Average Rating</p>
                        <p className="text-2xl font-bold text-gray-900">{reportData.performance_metrics.average_rating}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <Calendar className="h-8 w-8 text-purple-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                        <p className="text-2xl font-bold text-gray-900">{reportData.performance_metrics.total_sessions}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <TrendingUp className="h-8 w-8 text-red-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
                        <p className="text-2xl font-bold text-gray-900">{reportData.performance_metrics.attendance_rate}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="students" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Student Progress Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  {reportData.student_progress.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Users className="mx-auto h-12 w-12 text-gray-300" />
                      <h3 className="mt-3 text-base font-medium text-gray-900">No students assigned</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Students will appear here once they enroll in your courses and batches.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reportData.student_progress.map((student, index) => (
                        <div key={student.student_id || index} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors gap-4">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{student.student_name}</h3>
                            <p className="text-sm text-gray-600">{student.course_name}</p>
                            {student.batch_name && (
                              <p className="text-xs text-gray-500 mt-0.5">{student.batch_name}</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-center min-w-[70px]">
                              <p className="text-xs text-gray-600">Progress</p>
                              <Badge variant="outline" className="font-semibold">{student.progress_percentage}%</Badge>
                            </div>
                            <div className="text-center min-w-[70px]">
                              <p className="text-xs text-gray-600">Attendance</p>
                              <Badge variant="outline" className="font-semibold">{student.attendance_rate}%</Badge>
                            </div>
                            <div className="text-center min-w-[90px]">
                              <p className="text-xs text-gray-600">Last Session</p>
                              <p className="text-sm font-medium">
                                {student.last_session ? new Date(student.last_session).toLocaleDateString() : "—"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
