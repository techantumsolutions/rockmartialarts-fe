"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import StudentDashboardLayout from "@/components/student-dashboard-layout"
import { CardSkeleton, LoadingSkeleton } from "@/components/ui/loading-skeleton"
import {
  Calendar,
  Clock,
  TrendingUp,
  Award,
  Users,
  BookOpen,
  CreditCard,
  Bell,
  ArrowRight,
  Target,
  Zap,
  Star,
  AlertCircle
} from "lucide-react"
import { getBackendApiUrl } from "@/lib/config"
import { formatRegisteredDateTime } from "@/lib/formatRegisteredDate"
import { getEnrollmentUiStatus, formatEnrollmentUiStatusLabel } from "@/lib/student-enrollment-status"
import { TokenManager } from "@/lib/tokenManager"
import { requireStudentSession } from "@/lib/sessionAuth"

export default function StudentDashboard() {
  const router = useRouter()
  const [studentData, setStudentData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dashboardStats, setDashboardStats] = useState<any>(null)
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
  const [quickActions, setQuickActions] = useState<any[]>([])
  const [attendanceData, setAttendanceData] = useState<any>(null)
  /** True when attendance API returned an error — do not show fabricated zeros as live data. */
  const [attendanceLoadFailed, setAttendanceLoadFailed] = useState(false)
  const [enrollmentData, setEnrollmentData] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [myAchievements, setMyAchievements] = useState<{ id: string; title: string; description?: string | null }[]>([])
  const [achievementsLoading, setAchievementsLoading] = useState(false)

  useEffect(() => {
    const token = requireStudentSession(router, "/student-dashboard")
    if (!token) return

    const user = TokenManager.getUser()
    if (!user) {
      router.push("/login")
      return
    }

    // Load comprehensive student data from APIs
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        const userData = user

        // Check if user is actually a student
        if (userData.role !== "student") {
          if (userData.role === "coach") {
            router.push("/coach-dashboard")
          } else {
            router.push("/dashboard")
          }
          return
        }

        let profileData: any = null

        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }

        console.log("🔄 Fetching student profile data...")

        // Fetch student profile data (use proxy to avoid CORS / Method Not Allowed)
        const profileResponse = await fetch(getBackendApiUrl("auth/profile"), {
          method: 'GET',
          headers
        })

        if (profileResponse.ok) {
          const profileResult = await profileResponse.json()
          profileData = profileResult.profile

          setStudentData({
            name: profileData.full_name || `${profileData.first_name} ${profileData.last_name}` || "Student",
            email: profileData.email || "",
            studentId: profileData.id || "",
            joinDate: profileData.created_at ? formatRegisteredDateTime(profileData.created_at) : "",
            course: profileData.enrollments?.[0]?.course_name || "No Course",
            phone: profileData.phone || "",
            dateOfBirth: profileData.date_of_birth || "",
            gender: profileData.gender || ""
          })

          setEnrollmentData(profileData.enrollments || [])

          const sid = profileData.id || ""
          if (sid) {
            setAchievementsLoading(true)
            fetch(getBackendApiUrl(`achievements/student/${encodeURIComponent(sid)}`), {
              method: "GET",
              headers,
            })
              .then(async (achRes) => {
                if (!achRes.ok) return { achievements: [] }
                return achRes.json()
              })
              .then((achJson) => {
                const raw = achJson?.achievements
                const list = Array.isArray(raw)
                  ? raw.map((a: {
                      id?: string
                      _id?: string
                      title?: string
                      achievement_title?: string
                      description?: string | null
                    }, idx: number) => ({
                      id: a.id || a._id || `achievement-${idx}`,
                      title: a.title || a.achievement_title || "Achievement",
                      description: a.description ?? null,
                    }))
                  : []
                // Keep all valid rows and avoid dropping legacy docs that only have Mongo `_id`.
                setMyAchievements(list.filter((a: { title: string }) => !!a.title))
              })
              .catch(() => setMyAchievements([]))
              .finally(() => setAchievementsLoading(false))
          }
        } else if (profileResponse.status === 401) {
          TokenManager.clearAuthData()
          router.push("/login?session=expired&returnUrl=/student-dashboard")
          return
        } else {
          console.error("❌ Profile API failed:", profileResponse.status, profileResponse.statusText)
          throw new Error(`Failed to fetch profile: ${profileResponse.status}`)
        }

        console.log("🔄 Fetching attendance data...")

        // Fetch attendance data
        const attendanceResponse = await fetch(getBackendApiUrl("attendance/student/my-attendance"), {
          method: 'GET',
          headers
        })

        let attendanceResult: any = null

        if (attendanceResponse.ok) {
          attendanceResult = await attendanceResponse.json()
          setAttendanceData(attendanceResult)
          setAttendanceLoadFailed(false)

          console.log("✅ Attendance data received:", attendanceResult)

          const progressPct = attendanceResult.statistics?.percentage
          const roundedProgress = typeof progressPct === "number" ? Math.round(progressPct) : 0
          setDashboardStats({
            enrolledCourses: profileData?.enrollments?.length || 0,
            completedClasses: attendanceResult.statistics?.attended || 0,
            upcomingClasses: 0,
            overallProgress: roundedProgress,
            attendanceRate: roundedProgress,
            rank: 0,
            streakDays: 0,
            nextClassTime: "",
            totalClasses: attendanceResult.statistics?.total_classes || 0,
            absentClasses: attendanceResult.statistics?.absent || 0,
            lateClasses: attendanceResult.statistics?.late || 0,
          })
        } else {
          console.error("❌ Attendance API failed:", attendanceResponse.status, attendanceResponse.statusText)
          setAttendanceLoadFailed(true)
          setAttendanceData(null)

          setDashboardStats({
            enrolledCourses: profileData?.enrollments?.length || 0,
            completedClasses: 0,
            upcomingClasses: 0,
            overallProgress: 0,
            attendanceRate: 0,
            rank: 0,
            streakDays: 0,
            nextClassTime: "",
            totalClasses: 0,
            absentClasses: 0,
            lateClasses: 0,
          })
        }

        // Set recent activity based on attendance data
        const recentAttendance = attendanceResult?.attendance_records?.slice(0, 4) || []
        const activityList = recentAttendance.map((record: any, index: number) => ({
          id: index + 1,
          type: "class",
          title: record.course || "Class",
          date: record.date || "Unknown",
          status: record.status === "present" ? "completed" : record.status,
          icon: record.status === "present" ? BookOpen : record.status === "late" ? Clock : Target,
          branch: record.branch || "Unknown Branch"
        }))

        setRecentActivity(activityList)

        // Set upcoming events - empty, no static data
        setUpcomingEvents([])

        // Set quick actions
        setQuickActions([
          { id: 1, title: "View Courses", description: "See all enrolled courses", icon: BookOpen, href: "/student-dashboard/courses", color: "blue" },
          { id: 2, title: "Check Attendance", description: "View attendance record", icon: Calendar, href: "/student-dashboard/attendance", color: "green" },
          { id: 3, title: "Track Progress", description: "Monitor your development", icon: TrendingUp, href: "/student-dashboard/progress", color: "purple" },
          { id: 4, title: "Make Payment", description: "Pay fees and dues", icon: CreditCard, href: "/student-dashboard/payments", color: "orange" }
        ])

      } catch (error: any) {
        console.error("Error loading dashboard data:", error)
        setError(error.message || "Failed to load dashboard data")

        if (user) {
          setStudentData({
            name: user.full_name || `${user.first_name} ${user.last_name}` || "Student",
            email: user.email || "",
            studentId: user.id || "",
            joinDate: "",
            course: ""
          })
        }
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  const handleLogout = () => {
    TokenManager.clearAuthData()
    router.push("/login")
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'class': return BookOpen
      case 'achievement': return Award
      case 'payment': return CreditCard
      default: return Target
    }
  }

  const getActivityColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50'
      case 'earned': return 'text-yellow-600 bg-yellow-50'
      case 'paid': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
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

  if (error && !studentData) {
    return (
      <StudentDashboardLayout
        studentName="Student"
        onLogout={handleLogout}
      >
        <div className="space-y-6">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-red-800">Error Loading Dashboard</h3>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                  <Button
                    onClick={() => window.location.reload()}
                    variant="outline"
                    size="sm"
                    className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
                  >
                    Retry
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </StudentDashboardLayout>
    )
  }

  return (
    <StudentDashboardLayout
      studentName={studentData?.name}
      onLogout={handleLogout}
      pageTitle="Dashboard"
    >
      <div className="space-y-8">
        {/* Error Warning Banner */}
        {error && studentData && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-sm text-yellow-800">
                    Some data may not be up to date. {error}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

          {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Enrolled Courses */}
          <Card className="rounded-xl border bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/60 shadow-sm hover:shadow-md transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-1">Enrolled Courses</p>
                  <p className="text-3xl font-bold text-blue-900">{dashboardStats?.enrolledCourses || 0}</p>
                </div>
                <div className="p-3 bg-blue-200/50 rounded-xl">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-blue-700">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>Active learning</span>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Rate */}
          <Card className="rounded-xl border bg-gradient-to-br from-green-50 to-green-100/50 border-green-200/60 shadow-sm hover:shadow-md transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 mb-1">Attendance Rate</p>
                  <p className="text-3xl font-bold text-green-900">
                    {attendanceLoadFailed ? "—" : `${dashboardStats?.attendanceRate ?? 0}%`}
                  </p>
                </div>
                <div className="p-3 bg-green-200/50 rounded-xl">
                  <Calendar className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-green-700">
                <Star className="w-4 h-4 mr-1" />
                <span>Excellent!</span>
              </div>
            </CardContent>
          </Card>

          {/* Sessions in API window (backend defaults to last 30 days for my-attendance) */}
          <Card className="rounded-xl border bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200/60 shadow-sm hover:shadow-md transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 mb-1">Sessions logged</p>
                  <p className="text-3xl font-bold text-purple-900">
                    {attendanceLoadFailed ? "—" : dashboardStats?.totalClasses ?? 0}
                  </p>
                </div>
                <div className="p-3 bg-purple-200/50 rounded-xl">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-purple-700">
                <Zap className="w-4 h-4 mr-1" />
                <span>From attendance records</span>
              </div>
            </CardContent>
          </Card>

          {/* Completed Classes */}
          <Card className="rounded-xl border bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-yellow-200/60 shadow-sm hover:shadow-md transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600 mb-1">Classes attended</p>
                  <p className="text-3xl font-bold text-yellow-900">
                    {attendanceLoadFailed ? "—" : dashboardStats?.completedClasses ?? 0}
                  </p>
                </div>
                <div className="p-3 bg-yellow-200/50 rounded-xl">
                  <Award className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-yellow-700">
                <Target className="w-4 h-4 mr-1" />
                <span>Total attended</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Progress & Quick Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Attendance Overview */}
            <Card className="rounded-xl border bg-white shadow-sm hover:shadow-md transition-all overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-yellow-100">
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-yellow-600" />
                  <span>Attendance Overview</span>
                </CardTitle>
                <CardDescription>Your class attendance summary</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Attendance Rate</span>
                      <span className="text-gray-600">
                        {attendanceLoadFailed ? "—" : `${dashboardStats?.attendanceRate ?? 0}%`}
                      </span>
                    </div>
                    <Progress
                      value={attendanceLoadFailed ? 0 : dashboardStats?.attendanceRate || 0}
                      className="h-3"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {attendanceLoadFailed ? "—" : dashboardStats?.completedClasses ?? 0}
                      </p>
                      <p className="text-sm text-gray-600">Attended</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">
                        {attendanceLoadFailed ? "—" : dashboardStats?.absentClasses ?? 0}
                      </p>
                      <p className="text-sm text-gray-600">Absent</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-600">
                        {attendanceLoadFailed ? "—" : dashboardStats?.lateClasses ?? 0}
                      </p>
                      <p className="text-sm text-gray-600">Late</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Achievements (from coaches / branch admins) */}
            <Card className="rounded-xl border bg-white shadow-sm hover:shadow-md transition-all">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-100">
                <CardTitle className="flex items-center space-x-2">
                  <Award className="w-5 h-5 text-amber-600" />
                  <span>Your achievements</span>
                </CardTitle>
                <CardDescription>Awards and milestones added by your academy</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {achievementsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : myAchievements.length === 0 ? (
                  <p className="text-sm text-gray-500">No achievements yet. Keep training — your coaches can add them here.</p>
                ) : (
                  <ul className="space-y-3">
                    {myAchievements.slice(0, 6).map((a) => (
                      <li key={a.id} className="border border-amber-100 rounded-lg p-3 bg-amber-50/30">
                        <p className="font-medium text-gray-900">{a.title}</p>
                        {a.description?.trim() ? (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-3">{a.description}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
                {myAchievements.length > 6 ? (
                  <p className="text-xs text-gray-500 mt-3">Showing 6 of {myAchievements.length}</p>
                ) : null}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="rounded-xl border bg-white shadow-sm hover:shadow-md transition-all">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-blue-600" />
                  <span>Quick Actions</span>
                </CardTitle>
                <CardDescription>Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {quickActions.map((action) => {
                    const Icon = action.icon
                    const colorClasses = {
                      blue: "bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200",
                      green: "bg-green-50 text-green-600 hover:bg-green-100 border-green-200",
                      purple: "bg-purple-50 text-purple-600 hover:bg-purple-100 border-purple-200",
                      orange: "bg-orange-50 text-orange-600 hover:bg-orange-100 border-orange-200"
                    }

                    return (
                      <Button
                        key={action.id}
                        variant="outline"
                        className={`h-auto p-4 justify-start space-x-3 ${colorClasses[action.color as keyof typeof colorClasses]} transition-all duration-200 hover:shadow-md`}
                        onClick={() => router.push(action.href)}
                      >
                        <Icon className="w-5 h-5" />
                        <div className="text-left">
                          <p className="font-medium">{action.title}</p>
                          <p className="text-xs opacity-80">{action.description}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 ml-auto" />
                      </Button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Upcoming Events & Recent Activity */}
          <div className="space-y-6">
            {/* Enrolled Courses Quick View */}
            <Card className="rounded-xl border bg-gradient-to-br from-green-50 to-emerald-50 border-green-200/60 shadow-sm hover:shadow-md transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-green-800">
                  <BookOpen className="w-5 h-5" />
                  <span>My Courses</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-3">
                  <div className="p-4 bg-white/60 rounded-lg">
                    <p className="text-2xl font-bold text-green-700">{dashboardStats?.enrolledCourses || 0}</p>
                    <p className="text-sm text-green-600 mt-1">Enrolled courses</p>
                  </div>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => router.push('/student-dashboard/courses')}
                  >
                    View Courses
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Enrolled Courses List */}
            <Card className="rounded-xl border bg-white shadow-sm hover:shadow-md transition-all">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <span>Enrollments</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {enrollmentData.length === 0 ? (
                  <div className="p-6 text-center">
                    <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No enrollments found</p>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {enrollmentData.slice(0, 5).map((enrollment: any, index: number) => (
                      <div
                        key={enrollment.id || index}
                        className={`p-4 hover:bg-gray-50 transition-colors duration-200 ${
                          index !== Math.min(enrollmentData.length, 5) - 1 ? 'border-b border-gray-100' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{enrollment.course_name}</p>
                            <p className="text-sm text-gray-600">{enrollment.branch_name || 'Branch'}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatEnrollmentUiStatusLabel(
                                getEnrollmentUiStatus({
                                  isActive: enrollment.is_active,
                                  paymentStatus: enrollment.payment_status,
                                  endDate: enrollment.end_date
                                })
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="p-4 border-t border-gray-100">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/student-dashboard/courses')}
                  >
                    View All Courses
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="rounded-xl border bg-white shadow-sm hover:shadow-md transition-all">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="w-5 h-5 text-purple-600" />
                  <span>Recent Activity</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-0">
                  {recentActivity.map((activity, index) => {
                    const Icon = getActivityIcon(activity.type)
                    const colorClass = getActivityColor(activity.status)

                    return (
                      <div
                        key={activity.id}
                        className={`p-4 hover:bg-gray-50 transition-colors duration-200 ${
                          index !== recentActivity.length - 1 ? 'border-b border-gray-100' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-lg ${colorClass}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{activity.title}</p>
                            <p className="text-sm text-gray-600 capitalize">{activity.status}</p>
                            <p className="text-xs text-gray-500 mt-1">{activity.date}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="p-4 border-t border-gray-100">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/student-dashboard/progress')}
                  >
                    View All Activity
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </StudentDashboardLayout>
  )
}
