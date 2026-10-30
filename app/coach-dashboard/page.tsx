"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { format, startOfWeek, endOfWeek } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import CoachDashboardHeader from "@/components/coach-dashboard-header"
import { checkCoachAuth, CoachData } from "@/lib/coachAuth"
import { getBackendApiUrl } from "@/lib/config"
import { coachSessionBookingAPI } from "@/lib/coachSessionBookingAPI"
import { fetchCoachAssignments, filterStudentsForCoach } from "@/lib/coachStudentFilter"

interface DashboardStats {
  totalStudents: number
  todaysClassesCount: number
  thisWeeksClassesCount: number
  avgAttendanceRate: number
  nextClass: {
    courseName: string
    batchName: string
    time: string
    isToday: boolean
    dayName?: string
  } | null
}

function formatClassTime(timeStr?: string) {
  if (!timeStr) return ""
  if (timeStr.includes("AM") || timeStr.includes("PM") || timeStr.includes("am") || timeStr.includes("pm")) {
    return timeStr
  }
  const parts = timeStr.split(":")
  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10)
    const minutes = parts[1]
    const ampm = hours >= 12 ? "PM" : "AM"
    hours = hours % 12 || 12
    return `${hours}:${minutes} ${ampm}`
  }
  return timeStr
}

export default function CoachDashboard() {
  const router = useRouter()
  const [coachData, setCoachData] = useState<CoachData | null>(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    todaysClassesCount: 0,
    thisWeeksClassesCount: 0,
    avgAttendanceRate: 0,
    nextClass: null,
  })

  const fetchDashboardData = useCallback(async (token: string, coach: CoachData) => {
    setStatsLoading(true)
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      }
      const coachId = coach.id

      // 1. Fetch coach courses & batches assigned to him
      const coachAssignments = await fetchCoachAssignments(token, coach)
      const coursesData = coachAssignments.courses || []

      // 2. Fetch students from branch search & coach endpoints
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

      try {
        const res = await fetch(getBackendApiUrl(`coaches/${encodeURIComponent(coachId)}/students`), { headers })
        if (res.ok) {
          const json = await res.json()
          const extra = json.students || json.enrolled_students || []
          if (Array.isArray(extra)) {
            extra.forEach((s: any) => mergeStudent(s, true))
          }
        }
      } catch (e) {
        console.warn("Could not fetch students from coach endpoint:", e)
      }

      if (coach.branch_id) {
        try {
          const res = await fetch(
            getBackendApiUrl(`search/students?branch_id=${encodeURIComponent(coach.branch_id)}&limit=200`),
            { headers }
          )
          if (res.ok) {
            const json = await res.json()
            const students = Array.isArray(json.students) ? json.students : []
            students.forEach((s: any) => mergeStudent(s, false))
          }
        } catch (e) {
          console.warn("Could not fetch students from branch search:", e)
        }
      }

      const rawStudents = Array.from(studentMap.values())

      // 3. Filter strictly based on assigned courses and assigned batches in this branch!
      const assignedStudents = filterStudentsForCoach(rawStudents, coachAssignments)
      const studentCount = assignedStudents.length

      // 3. Classes and Schedule calculation
      const now = new Date()
      const weekStart = startOfWeek(now, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
      const fromStr = format(weekStart, "yyyy-MM-dd")
      const toStr = format(weekEnd, "yyyy-MM-dd")
      const todayStr = format(now, "yyyy-MM-dd")
      const todayDayName = format(now, "EEEE").toLowerCase()
      const todayShort = format(now, "EEE").toLowerCase()

      let bookings: any[] = []
      try {
        const scheduleRes = await coachSessionBookingAPI.mySchedule(fromStr, toStr)
        bookings = Array.isArray(scheduleRes.bookings) ? scheduleRes.bookings : []
      } catch (e) {
        console.warn("Could not fetch coach schedule bookings:", e)
      }

      // Extract all assigned batches
      const allBatches: Array<{
        batch_name: string
        days: string[]
        start_time: string
        end_time: string
        branch_name?: string
        course_name: string
      }> = []

      coursesData.forEach((course) => {
        const cName = course.name || course.title || "Martial Arts"
        if (Array.isArray(course.batches)) {
          course.batches.forEach((b: any) => {
            allBatches.push({
              batch_name: b.batch_name || "Batch",
              days: Array.isArray(b.days) ? b.days : [],
              start_time: b.start_time || "",
              end_time: b.end_time || "",
              branch_name: b.branch_name,
              course_name: cName,
            })
          })
        }
      })

      // Today's classes: batches matching today + bookings on todayStr
      const todayBatches = allBatches.filter((b) =>
        b.days.some((d) => {
          const dl = String(d).trim().toLowerCase()
          return dl === todayDayName || dl === todayShort || dl.startsWith(todayShort)
        })
      )
      const todayBookings = bookings.filter(
        (b) => b.session_date === todayStr && b.status !== "cancelled"
      )
      const todaysClasses = todayBatches.length + todayBookings.length

      // This week's classes: total weekly batch occurrences + week bookings
      const weeklyBatchOccurrences = allBatches.reduce((acc, b) => acc + (b.days.length || 0), 0)
      const weekBookingsCount = bookings.filter((b) => b.status !== "cancelled").length
      const thisWeeksClasses = weeklyBatchOccurrences + weekBookingsCount

      // Next Class determination
      let nextClassInfo = null
      const sortedToday = [...todayBatches].sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""))
      if (sortedToday.length > 0) {
        const currentHourMinute = format(now, "HH:mm")
        const upcomingToday = sortedToday.find((b) => (b.start_time || "") >= currentHourMinute) || sortedToday[0]
        nextClassInfo = {
          courseName: upcomingToday.course_name,
          batchName: upcomingToday.batch_name,
          time: upcomingToday.start_time,
          isToday: true,
        }
      } else if (allBatches.length > 0) {
        const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        const todayIdx = dayOrder.indexOf(todayDayName)
        let foundBatch = null
        let foundDay = ""

        for (let offset = 1; offset <= 7; offset++) {
          const nextDayIdx = (todayIdx + offset) % 7
          const nextDayName = dayOrder[nextDayIdx]
          const match = allBatches.find((b) =>
            b.days.some((d) => String(d).trim().toLowerCase() === nextDayName)
          )
          if (match) {
            foundBatch = match
            foundDay = nextDayName.charAt(0).toUpperCase() + nextDayName.slice(1)
            break
          }
        }

        if (foundBatch) {
          nextClassInfo = {
            courseName: foundBatch.course_name,
            batchName: foundBatch.batch_name,
            time: foundBatch.start_time,
            isToday: false,
            dayName: foundDay,
          }
        }
      }

      // 4. Average Attendance calculation
      let avgAttendance = 0
      try {
        const branchId = coach.branch_id
        const thirtyDaysAgoStr = format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")
        let gotReports = false

        if (branchId) {
          const reportsRes = await fetch(
            getBackendApiUrl(`attendance/reports?branch_id=${encodeURIComponent(branchId)}&start_date=${thirtyDaysAgoStr}&end_date=${todayStr}`),
            { headers }
          )
          if (reportsRes.ok) {
            const reportsData = await reportsRes.json()
            const reports = reportsData.reports || []
            if (reports.length > 0) {
              const present = reports.filter((r: any) => r.status === "present" || r.status === "late" || r.is_present === true).length
              avgAttendance = Math.round((present / reports.length) * 100)
              gotReports = true
            }
          }
        }

        if (!gotReports) {
          const todayAttendanceRes = await fetch(
            getBackendApiUrl(`attendance/students?date=${encodeURIComponent(todayStr)}`),
            { headers }
          )
          if (todayAttendanceRes.ok) {
            const data = await todayAttendanceRes.json()
            const students = data.students || []
            const marked = students.filter((s: any) => s.attendance?.status && s.attendance.status !== "not_marked")
            if (marked.length > 0) {
              const present = marked.filter((s: any) => s.attendance?.status === "present" || s.attendance?.status === "late").length
              avgAttendance = Math.round((present / marked.length) * 100)
            }
          }
        }
      } catch (e) {
        console.warn("Could not fetch attendance records:", e)
      }

      setStats({
        totalStudents: studentCount,
        todaysClassesCount: todaysClasses,
        thisWeeksClassesCount: thisWeeksClasses,
        avgAttendanceRate: avgAttendance,
        nextClass: nextClassInfo,
      })
    } catch (err) {
      console.error("Error loading coach dashboard stats:", err)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Use the robust coach authentication check
    const authResult = checkCoachAuth()

    console.log("Coach dashboard authentication check:", {
      isAuthenticated: authResult.isAuthenticated,
      hasCoach: !!authResult.coach,
      hasToken: !!authResult.token,
      error: authResult.error
    })

    if (!authResult.isAuthenticated) {
      console.log("Coach not authenticated:", authResult.error)
      router.push("/coach/login")
      return
    }

    if (authResult.coach) {
      setCoachData(authResult.coach)
      console.log("Coach authenticated successfully:", authResult.coach.full_name)
      if (authResult.token) {
        fetchDashboardData(authResult.token, authResult.coach)
      }
    } else {
      console.log("No coach data available, redirecting to login")
      router.push("/coach/login")
      return
    }

    setLoading(false)
  }, [router, fetchDashboardData])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-400"></div>
      </div>
    )
  }

  if (!coachData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-2">No coach data available</p>
          <p className="text-sm text-gray-600">Please try logging in again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <CoachDashboardHeader
        currentPage="Dashboard"
        coachName={coachData?.full_name}
      />

      {/* Main Content */}
      <main className="mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">

            {/* Total Students Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {statsLoading ? (
                    <span className="inline-block w-8 h-7 bg-blue-100 animate-pulse rounded" />
                  ) : (
                    stats.totalStudents
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Active students under your guidance</p>
              </CardContent>
            </Card>

            {/* Today's Classes */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Classes</CardTitle>
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {statsLoading ? (
                    <span className="inline-block w-8 h-7 bg-green-100 animate-pulse rounded" />
                  ) : (
                    stats.todaysClassesCount
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Classes scheduled for today</p>
              </CardContent>
            </Card>

            {/* This Week's Classes */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Week</CardTitle>
                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {statsLoading ? (
                    <span className="inline-block w-8 h-7 bg-purple-100 animate-pulse rounded" />
                  ) : (
                    stats.thisWeeksClassesCount
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Total classes this week</p>
              </CardContent>
            </Card>

            {/* Average Attendance */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Attendance</CardTitle>
                <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {statsLoading ? (
                    <span className="inline-block w-12 h-7 bg-orange-100 animate-pulse rounded" />
                  ) : (
                    `${stats.avgAttendanceRate}%`
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Average class attendance</p>
              </CardContent>
            </Card>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Coach Profile</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage
                        src={coachData?.profile_photo || coachData?.photo || coachData?.avatar || "/placeholder-user.jpg"}
                        alt={coachData?.full_name || "Coach"}
                      />
                      <AvatarFallback className="text-lg font-semibold bg-yellow-100 text-yellow-800">
                        {coachData?.full_name?.charAt(0) || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg">{coachData?.full_name}</h3>
                      <p className="text-sm text-gray-500">{coachData?.contact_info?.email || coachData?.email}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p><strong>Specialization:</strong>
                      <Badge className="ml-2 bg-yellow-100 text-yellow-800">
                        {coachData?.professional_info?.specialization || coachData?.specialization || 'Martial Arts'}
                      </Badge>
                    </p>
                    <p><strong>Experience:</strong>
                      <Badge variant="outline" className="ml-2">
                        {coachData?.professional_info?.years_of_experience || (coachData?.experience_years ? `${coachData.experience_years} years` : coachData?.experience) || '5 years'}
                      </Badge>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Next Class Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Next Class</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-lg font-semibold text-green-600 mb-4">
                    {statsLoading ? (
                      <span className="inline-block w-40 h-6 bg-green-100 animate-pulse rounded" />
                    ) : stats.nextClass ? (
                      `${stats.nextClass.courseName} - ${stats.nextClass.batchName} (${stats.nextClass.isToday ? "" : `${stats.nextClass.dayName} `}${formatClassTime(stats.nextClass.time)})`
                    ) : (
                      "No classes scheduled"
                    )}
                  </p>
                  <p className="text-sm text-gray-500">
                    {stats.nextClass
                      ? "Make sure to prepare class materials"
                      : "Check your schedule for upcoming assignments"}
                  </p>

                  <Button
                    onClick={() => router.push("/coach-dashboard/schedule")}
                    className="mt-14 w-full bg-yellow-400 hover:bg-yellow-500 text-black cursor-pointer"
                  >
                    View Class Details
                  </Button>

                </div>
              </CardContent>
            </Card>

            {/* Quick Actions Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Quick Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start cursor-pointer hover:bg-gray-100"
                    onClick={() => router.push("/coach-dashboard/attendance")}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Mark Attendance
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start cursor-pointer hover:bg-gray-100"
                    onClick={() => router.push("/coach-dashboard/students")}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    View Students
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start cursor-pointer hover:bg-gray-100"
                    onClick={() => router.push("/coach-dashboard/schedule")}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Class Schedule
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start cursor-pointer hover:bg-gray-100"
                    onClick={() => router.push("/coach-dashboard/reports")}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Progress Reports
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Achievements */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  <span>Recent Achievements</span>
                </CardTitle>
                <CardDescription>Latest milestones and accomplishments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {coachData?.achievements && Array.isArray(coachData.achievements) && coachData.achievements.length > 0 ? (
                    coachData.achievements.map((achievement: any, index: number) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {typeof achievement === "string" ? achievement : (achievement.title || achievement.description || achievement.name || "Achievement")}
                          </p>
                        </div>
                        <div className="text-xs text-gray-500">
                          {achievement.date ? format(new Date(achievement.date), "MMM d, yyyy") : "Verified"}
                        </div>
                      </div>
                    ))
                  ) : (
                    [
                      `${stats.totalStudents || 0} active students currently enrolled under your guidance`,
                      `${stats.thisWeeksClassesCount || 0} scheduled classes active for this week`,
                      "Certified Coach profile active in academy management system"
                    ].map((achievement: string, index: number) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{achievement}</p>
                        </div>
                        <div className="text-xs text-gray-500">
                          {index === 0 ? "Current" : index === 1 ? "This week" : "Active"}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </main>
    </div>
  )
}

