"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import StudentDashboardLayout from "@/components/student-dashboard-layout"
import { CardSkeleton } from "@/components/ui/loading-skeleton"
import {
  TrendingUp,
  BookOpen,
  Calendar,
  Clock,
  AlertCircle,
  RefreshCw,
  Target
} from "lucide-react"
import { studentProfileAPI, type StudentEnrollment } from "@/lib/studentProfileAPI"
import { getBackendApiUrl } from "@/lib/config"
import {
  getEnrollmentUiStatus,
  formatEnrollmentUiStatusLabel,
  isEnrollmentActivePaid,
} from "@/lib/student-enrollment-status"

interface AttendanceStats {
  total_classes: number
  attended: number
  absent: number
  late: number
  percentage: number
}

export default function StudentProgressPage() {
  const router = useRouter()
  const [studentData, setStudentData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([])
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null)

  const loadData = async () => {
    const token = localStorage.getItem("token")
    const user = localStorage.getItem("user")

    if (!token) {
      router.push("/login")
      return
    }

    if (user) {
      try {
        const userData = JSON.parse(user)
        if (userData.role !== "student") {
          if (userData.role === "coach") {
            router.push("/coach-dashboard")
          } else {
            router.push("/dashboard")
          }
          return
        }
        setStudentData({
          name: userData.full_name || `${userData.first_name} ${userData.last_name}` || userData.name || "Student",
          email: userData.email || "",
        })
      } catch (err) {
        console.error("Error parsing user data:", err)
      }
    }

    try {
      setLoading(true)
      setError(null)

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }

      // Fetch profile with enrollments
      const profileResponse = await studentProfileAPI.getProfile(token)
      const profile = profileResponse.profile
      setEnrollments(profile.enrollments || [])

      // Fetch attendance stats
      const attendanceResponse = await fetch(getBackendApiUrl("attendance/student/my-attendance"), {
        method: 'GET',
        headers
      })

      if (attendanceResponse.ok) {
        const attendanceData = await attendanceResponse.json()
        setAttendanceStats(attendanceData.statistics || null)
      }
    } catch (err: any) {
      console.error("Error loading progress data:", err)
      setError(err.message || "Failed to load progress data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/login")
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <StudentDashboardLayout
        studentName={studentData?.name}
        onLogout={handleLogout}
        isLoading={true}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CardSkeleton lines={5} />
            <CardSkeleton lines={5} />
          </div>
        </div>
      </StudentDashboardLayout>
    )
  }

  if (error && !enrollments.length) {
    return (
      <StudentDashboardLayout
        studentName={studentData?.name}
        onLogout={handleLogout}
      >
        <div className="space-y-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button
                onClick={loadData}
                variant="outline"
                size="sm"
                className="ml-2"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </StudentDashboardLayout>
    )
  }

  const activeCourses = enrollments.filter(e => isEnrollmentActivePaid({
    isActive: e.is_active,
    paymentStatus: e.payment_status,
    endDate: e.end_date
  })).length
  const attendedClasses = attendanceStats?.attended || 0
  const attendanceRate = attendanceStats?.percentage || 0
  const estimatedHours = Math.round(attendedClasses * 1.5)

  return (
    <StudentDashboardLayout
      studentName={studentData?.name}
      onLogout={handleLogout}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <TrendingUp className="h-8 w-8" />
              Training Progress
            </h1>
            <p className="text-muted-foreground mt-1">
              Track your martial arts journey and achievements
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Some data may not be up to date. {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Overall Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="rounded-xl border bg-white shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold text-blue-600">{estimatedHours}</p>
                  <p className="text-sm text-gray-500 mt-1">Training Hours</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border bg-white shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold text-green-600">{activeCourses}</p>
                  <p className="text-sm text-gray-500 mt-1">Active Courses</p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <BookOpen className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border bg-white shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold text-purple-600">{attendedClasses}</p>
                  <p className="text-sm text-gray-500 mt-1">Classes Attended</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Target className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border bg-white shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold text-orange-600">{attendanceRate}%</p>
                  <p className="text-sm text-gray-500 mt-1">Attendance Rate</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-xl">
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Progress */}
        <Card className="rounded-xl border bg-white shadow-sm hover:shadow-md transition-all">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Attendance Progress
            </CardTitle>
            <CardDescription>Your overall class attendance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Attendance Rate</span>
                <span className="font-medium">{attendanceRate}%</span>
              </div>
              <Progress value={attendanceRate} className="h-3" />

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-xl font-bold text-green-600">{attendedClasses}</p>
                  <p className="text-sm text-gray-500">Present</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-red-600">{attendanceStats?.absent || 0}</p>
                  <p className="text-sm text-gray-500">Absent</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-yellow-600">{attendanceStats?.late || 0}</p>
                  <p className="text-sm text-gray-500">Late</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Course Enrollment Cards */}
        {enrollments.length === 0 ? (
          <Card className="rounded-xl border bg-white shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No courses enrolled</h3>
              <p className="text-muted-foreground mb-4 text-center">
                Enroll in courses to start tracking your progress.
              </p>
              <Button
                onClick={() => router.push('/student-dashboard/courses')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Browse Courses
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {enrollments.map((enrollment) => (
              (() => {
                const uiStatus = getEnrollmentUiStatus({
                  isActive: enrollment.is_active,
                  paymentStatus: enrollment.payment_status,
                  endDate: enrollment.end_date
                })
                const statusClass =
                  uiStatus === "active"
                    ? "bg-green-100 text-green-800"
                    : uiStatus === "expiring_soon"
                      ? "bg-amber-100 text-amber-900"
                      : uiStatus === "grace"
                        ? "bg-orange-100 text-orange-900"
                        : uiStatus === "expired"
                          ? "bg-red-100 text-red-800"
                          : uiStatus === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                const paymentLabel =
                  uiStatus === "expired"
                    ? "Expired"
                    : enrollment.payment_status === "paid"
                      ? "Paid"
                      : enrollment.payment_status === "pending"
                        ? "Pending"
                        : enrollment.payment_status

                return (
              <Card key={enrollment.id} className="rounded-xl border bg-white shadow-sm hover:shadow-md transition-all">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-blue-600" />
                        {enrollment.course_name}
                      </CardTitle>
                      <CardDescription className="text-sm text-gray-500 mt-1">
                        {enrollment.branch_name}
                      </CardDescription>
                    </div>
                    <Badge
                      variant="secondary"
                      className={statusClass}
                    >
                      {formatEnrollmentUiStatusLabel(uiStatus)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Start Date</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatDate(enrollment.start_date)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">End Date</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatDate(enrollment.end_date)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-600">Payment:</p>
                      <Badge
                        variant="outline"
                        className={
                          paymentLabel === "Paid"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : paymentLabel === "Expired"
                              ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-yellow-50 text-yellow-700 border-yellow-200"
                        }
                      >
                        {paymentLabel}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
                )
              })()
            ))}
          </div>
        )}
      </div>
    </StudentDashboardLayout>
  )
}
