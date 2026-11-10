"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronRight as Chevron,
  Clock,
  Edit,
  Search,
  Target,
  TrendingUp,
  Users,
} from "lucide-react"
import { TokenManager } from "@/lib/tokenManager"
import { getBackendApiUrl } from "@/lib/config"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import { loadCourseEnrollmentsForAdmin, mapPageContentReviews } from "@/lib/courseAdminDetail"
import { parseCourseModulesFromApi } from "@/lib/courseModulesFromApi"

interface CourseDetails {
  id: string
  name: string
  description?: string
  difficulty_level: string
  duration?: string
  category?: string
  category_id?: string
  prerequisites?: string[]
  learning_objectives?: string[]
  instructor_id?: string
  instructor_name?: string
  branch_assignments?: string[]
  pricing?: {
    amount: number
    currency: string
  }
  schedule?: {
    days: string[]
    time: string
    duration_minutes: number
  }
  is_active: boolean
  created_at: string
  updated_at: string
  total_enrolled?: number
  completion_rate?: number
  average_rating?: number
  total_revenue?: number
  created_by?: string
  created_by_role?: string
  branch_ids?: string[]
  icon?: string
}

interface EnrolledStudent {
  id: string
  student_id?: string
  student_name: string
  enrollment_date: string
  branch_id?: string
  branch_name?: string
  progress: number
  status: "active" | "completed" | "paused" | "dropped"
  last_activity?: string
  grade?: string
}

const ENROLL_PAGE_SIZE = 10

function studentInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "ST"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase()
}

function formatMoney(currency: string | undefined, amount: number | undefined) {
  if (amount == null || Number.isNaN(amount)) return "—"
  const cur = currency || "INR"
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: cur === "INR" ? "INR" : cur,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${cur} ${amount.toLocaleString()}`
  }
}

function formatDate(value?: string) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

export default function CourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const basePath = useDashboardBasePath()
  const isBranchAdminDashboard = basePath.startsWith("/branch-admin/")
  const courseId = params.id as string

  const [course, setCourse] = useState<CourseDetails | null>(null)
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([])
  const [courseStats, setCourseStats] = useState<{
    total_enrolled: number
    completed: number
    completion_rate: number
    active_enrollments?: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [enrollmentStudentFilter, setEnrollmentStudentFilter] = useState("all")
  const [enrollmentBranchFilter, setEnrollmentBranchFilter] = useState("all")
  const [enrollmentProgressFilter, setEnrollmentProgressFilter] = useState("all")
  const [enrollmentSearch, setEnrollmentSearch] = useState("")
  const [enrollmentSort, setEnrollmentSort] = useState("newest")
  const [enrollmentPage, setEnrollmentPage] = useState(1)

  const uniqueEnrollmentStudents = useMemo(() => {
    const names = new Set<string>()
    for (const row of enrolledStudents) {
      const name = (row.student_name || "").trim()
      if (name && name.toLowerCase() !== "unknown student") names.add(name)
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
  }, [enrolledStudents])

  const uniqueBranches = useMemo(() => {
    const names = new Set<string>()
    for (const row of enrolledStudents) {
      if (row.branch_name && row.branch_name !== "Unknown branch") names.add(row.branch_name)
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }, [enrolledStudents])

  const filteredEnrollments = useMemo(() => {
    let rows = [...enrolledStudents]
    if (enrollmentStudentFilter !== "all") {
      rows = rows.filter((s) => s.student_name === enrollmentStudentFilter)
    }
    if (enrollmentBranchFilter !== "all") {
      rows = rows.filter((s) => s.branch_name === enrollmentBranchFilter)
    }
    if (enrollmentProgressFilter === "complete") {
      rows = rows.filter((s) => s.progress >= 100 || s.status === "completed")
    } else if (enrollmentProgressFilter === "in_progress") {
      rows = rows.filter((s) => s.progress > 0 && s.progress < 100 && s.status !== "completed")
    } else if (enrollmentProgressFilter === "not_started") {
      rows = rows.filter((s) => s.progress <= 0 && s.status !== "completed")
    }
    const q = enrollmentSearch.trim().toLowerCase()
    if (q) {
      rows = rows.filter(
        (s) =>
          s.student_name.toLowerCase().includes(q) ||
          (s.branch_name || "").toLowerCase().includes(q)
      )
    }
    rows.sort((a, b) => {
      if (enrollmentSort === "name") return a.student_name.localeCompare(b.student_name)
      if (enrollmentSort === "progress") return b.progress - a.progress
      return (
        new Date(b.enrollment_date).getTime() - new Date(a.enrollment_date).getTime()
      )
    })
    return rows
  }, [
    enrolledStudents,
    enrollmentStudentFilter,
    enrollmentBranchFilter,
    enrollmentProgressFilter,
    enrollmentSearch,
    enrollmentSort,
  ])

  useEffect(() => {
    setEnrollmentPage(1)
  }, [
    enrollmentStudentFilter,
    enrollmentBranchFilter,
    enrollmentProgressFilter,
    enrollmentSearch,
    enrollmentSort,
  ])

  const enrollTotalPages = Math.max(1, Math.ceil(filteredEnrollments.length / ENROLL_PAGE_SIZE))
  const pagedEnrollments = filteredEnrollments.slice(
    (enrollmentPage - 1) * ENROLL_PAGE_SIZE,
    enrollmentPage * ENROLL_PAGE_SIZE
  )

  useEffect(() => {
    fetchCourseDetails()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  const fetchCourseDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      let token = TokenManager.getToken()
      if (!token) {
        setError("Authentication required. Please login again.")
        return
      }

      const courseResponse = await fetch(getBackendApiUrl(`courses/${courseId}`), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!courseResponse.ok) {
        if (courseResponse.status === 404) {
          setError("Course not found")
          return
        }
        throw new Error(`Failed to fetch course: ${courseResponse.status}`)
      }

      const courseData = await courseResponse.json()

      let categoryName =
        courseData.category_name ||
        courseData.category ||
        ""
      if (!categoryName && courseData.category_id) {
        try {
          const catRes = await fetch(getBackendApiUrl(`categories/${courseData.category_id}`), {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          })
          if (catRes.ok) {
            const cat = await catRes.json()
            categoryName = cat.name || cat.title || courseData.category_id
          } else {
            categoryName = courseData.category_id
          }
        } catch {
          categoryName = courseData.category_id
        }
      }

      const mappedCourse: CourseDetails = {
        id: courseData.id,
        name: courseData.title || courseData.name,
        description: courseData.description,
        difficulty_level: courseData.difficulty_level,
        duration: courseData.duration,
        category: categoryName,
        category_id: courseData.category_id,
        prerequisites: courseData.prerequisites || courseData.student_requirements?.prerequisites || [],
        learning_objectives: courseData.learning_objectives || [],
        instructor_id: courseData.instructor_id,
        instructor_name: courseData.instructor_name,
        branch_assignments: courseData.branch_assignments || [],
        pricing: courseData.pricing
          ? {
              amount: courseData.pricing.amount,
              currency: courseData.pricing.currency,
            }
          : undefined,
        schedule: courseData.schedule,
        is_active: courseData.settings?.active ?? courseData.is_active ?? true,
        created_at: courseData.created_at,
        updated_at: courseData.updated_at,
        total_enrolled: courseData.total_enrolled,
        completion_rate: courseData.completion_rate,
        average_rating: courseData.average_rating,
        total_revenue: courseData.total_revenue,
        created_by: courseData.created_by,
        created_by_role: courseData.created_by_role,
        branch_ids: courseData.branch_ids || [],
        icon: courseData.icon,
      }

      setCourse(mappedCourse)
      // Keep module/review parse side-effects available for future sections
      mapPageContentReviews(courseData as Record<string, unknown>)
      parseCourseModulesFromApi(courseData as Record<string, unknown>)

      await Promise.all([
        loadCourseEnrollmentsForAdmin(courseId, token).then(setEnrolledStudents),
        fetch(getBackendApiUrl(`courses/${courseId}/stats`), {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        })
          .then(async (res) => {
            if (!res.ok) return null
            return res.json()
          })
          .then((stats) => {
            if (!stats) return
            const total = Number(stats.total_enrolled ?? 0)
            const completed = Number(stats.completed ?? 0)
            const active = Number(stats.active_enrollments ?? 0)
            const rate =
              stats.completion_rate != null
                ? Number(stats.completion_rate)
                : total > 0
                  ? Math.round((completed / total) * 100)
                  : 0
            setCourseStats({
              total_enrolled: Number.isFinite(total) ? total : 0,
              completed: Number.isFinite(completed) ? completed : 0,
              completion_rate: Number.isFinite(rate) ? rate : 0,
              active_enrollments: Number.isFinite(active) ? active : undefined,
            })
          })
          .catch(() => {
            /* keep card fallback from enrollments */
          }),
      ])
    } catch (err: any) {
      console.error("Error fetching course details:", err)
      setError(err.message || "Failed to load course details")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => router.push(`${basePath}/courses/edit/${courseId}`)
  const handleBack = () => router.push(`${basePath}/courses`)

  const totalStudents =
    courseStats?.total_enrolled ?? course?.total_enrolled ?? enrolledStudents.length
  const completedCount =
    courseStats?.completed ??
    enrolledStudents.filter((s) => s.status === "completed" || s.progress >= 100).length
  const completionRate =
    courseStats?.completion_rate ??
    course?.completion_rate ??
    Math.round((completedCount / Math.max(totalStudents, 1)) * 100)
  const activeStudents =
    courseStats?.active_enrollments ??
    enrolledStudents.filter((s) => s.status === "active").length
  const branchAvailability =
    course?.branch_ids?.length ||
    (Array.isArray(course?.branch_assignments) ? course?.branch_assignments.length : 0) ||
    uniqueBranches.length

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F6FA]">
        <div className="w-full max-w-none">
          <Skeleton className="mb-4 h-8 w-64" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Skeleton className="h-64 w-full rounded-2xl" />
              <Skeleton className="h-96 w-full rounded-2xl" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-48 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F6FA]">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Error Loading Course</h2>
          <p className="mb-4 text-gray-600">{error || "Course not found"}</p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Courses
          </Button>
        </div>
      </div>
    )
  }

  const showingFrom =
    filteredEnrollments.length === 0 ? 0 : (enrollmentPage - 1) * ENROLL_PAGE_SIZE + 1
  const showingTo = Math.min(enrollmentPage * ENROLL_PAGE_SIZE, filteredEnrollments.length)

  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${isBranchAdminDashboard ? "min-w-0 py-4 sm:py-8" : "py-8"}`}>
        <div className="mb-6">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <button type="button" onClick={handleBack} className="hover:text-[#4F5077]">
              Dashboard
            </button>
            <Chevron className="h-3.5 w-3.5" />
            <button type="button" onClick={handleBack} className="hover:text-[#4F5077]">
              Courses
            </button>
            <Chevron className="h-3.5 w-3.5" />
            <span className="max-w-full truncate text-[#2F3153]">{course.name}</span>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-[#2F3153]">{course.name}</h1>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    course.is_active
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      course.is_active ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  />
                  {course.is_active ? "Active" : "Draft"}
                </span>
                <Badge variant="outline" className="rounded-full border-sky-200 bg-sky-50 text-sky-700">
                  {course.difficulty_level || "—"}
                </Badge>
                <span className="rounded-full bg-violet-50 px-2.5 py-1 font-mono text-[11px] text-violet-700">
                  {course.id}
                </span>
              </div>
            </div>
            <Button
              onClick={handleEdit}
              className="h-11 shrink-0 rounded-xl bg-[#F5C518] px-5 font-semibold text-[#2F3153] hover:bg-[#e6b800]"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Course
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Course Information */}
            <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="h-6 w-1.5 rounded-full bg-[#F5C518]" />
                <h2 className="text-lg font-semibold text-[#2F3153]">Course Information</h2>
              </div>

              <div className="mb-6 flex gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#F5C518]/20 text-2xl">
                  {course.icon || "🥋"}
                </div>
                <p className="text-sm leading-relaxed text-[#5B6475]">
                  {course.description || "No description provided for this course yet."}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    label: "Difficulty Level",
                    value: (
                      <Badge className="rounded-full bg-sky-50 text-sky-700 hover:bg-sky-50">
                        {course.difficulty_level || "—"}
                      </Badge>
                    ),
                    icon: Target,
                  },
                  {
                    label: "Duration",
                    value: <span className="font-medium text-[#2F3153]">{course.duration || "—"}</span>,
                    icon: Clock,
                  },
                  {
                    label: "Pricing",
                    value: (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-sm font-semibold text-amber-800">
                        {formatMoney(course.pricing?.currency, course.pricing?.amount)}
                      </span>
                    ),
                    icon: BookOpen,
                  },
                  {
                    label: "Created",
                    value: <span className="font-medium text-[#2F3153]">{formatDate(course.created_at)}</span>,
                    icon: Calendar,
                  },
                  {
                    label: "Last Updated",
                    value: <span className="font-medium text-[#2F3153]">{formatDate(course.updated_at)}</span>,
                    icon: Calendar,
                  },
                  {
                    label: "Category",
                    value: (
                      <Badge className="rounded-full bg-violet-50 text-violet-700 hover:bg-violet-50">
                        {course.category || "—"}
                      </Badge>
                    ),
                    icon: BookOpen,
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-gray-100 bg-[#FAFBFC] p-3">
                    <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                      <item.icon className="h-3.5 w-3.5" />
                      {item.label}
                    </div>
                    <div>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Enrollments */}
            <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
                <h2 className="text-lg font-semibold text-[#2F3153]">
                  Total Enrollments ({enrolledStudents.length})
                </h2>
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
                  <Select value={enrollmentStudentFilter} onValueChange={setEnrollmentStudentFilter}>
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue placeholder="All students" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All students</SelectItem>
                      {uniqueEnrollmentStudents.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={enrollmentBranchFilter} onValueChange={setEnrollmentBranchFilter}>
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue placeholder="All Branches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {uniqueBranches.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={enrollmentProgressFilter} onValueChange={setEnrollmentProgressFilter}>
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue placeholder="All Progress" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Progress</SelectItem>
                      <SelectItem value="not_started">Not started</SelectItem>
                      <SelectItem value="in_progress">In progress</SelectItem>
                      <SelectItem value="complete">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative xl:col-span-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      value={enrollmentSearch}
                      onChange={(e) => setEnrollmentSearch(e.target.value)}
                      placeholder="Search student name..."
                      className="h-10 rounded-xl pl-9"
                    />
                  </div>
                  <Select value={enrollmentSort} onValueChange={setEnrollmentSort}>
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="name">Name A–Z</SelectItem>
                      <SelectItem value="progress">Highest Progress</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {enrolledStudents.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-gray-500">
                  <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                  No enrollments yet
                </div>
              ) : filteredEnrollments.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-gray-500">
                  No enrollments match these filters
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px]">
                      <thead>
                        <tr className="border-b bg-[#FAFBFC] text-left text-xs uppercase tracking-wide text-gray-400">
                          <th className="px-5 py-3 font-semibold">Student</th>
                          <th className="px-5 py-3 font-semibold">Enrollment Date</th>
                          <th className="px-5 py-3 font-semibold">Branch</th>
                          <th className="px-5 py-3 font-semibold">Progress</th>
                          <th className="px-5 py-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedEnrollments.map((student) => (
                          <tr key={student.id} className="border-b last:border-0 hover:bg-[#FAFBFC]">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                                  {studentInitials(student.student_name)}
                                </div>
                                <span className="font-medium text-[#2F3153]">
                                  {student.student_name}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-sm text-gray-600">
                              {formatDate(student.enrollment_date)}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="inline-flex items-center gap-1.5 text-sm text-[#4F5077]">
                                <Building2 className="h-3.5 w-3.5 text-sky-500" />
                                {student.branch_name && student.branch_name !== "Unknown branch"
                                  ? student.branch_name
                                  : "—"}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex min-w-[120px] items-center gap-2">
                                <Progress value={student.progress} className="h-2 flex-1" />
                                <span className="w-10 text-right text-xs font-semibold text-[#2F3153]">
                                  {student.progress}%
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                                  student.status === "completed"
                                    ? "bg-amber-50 text-amber-700"
                                    : student.status === "active"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    student.status === "completed"
                                      ? "bg-amber-500"
                                      : student.status === "active"
                                        ? "bg-emerald-500"
                                        : "bg-gray-400"
                                  }`}
                                />
                                {student.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-col gap-3 border-t bg-[#FAFBFC] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-gray-500">
                      Showing {showingFrom}-{showingTo} of {filteredEnrollments.length} enrollments
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 rounded-lg p-0"
                        disabled={enrollmentPage <= 1}
                        onClick={() => setEnrollmentPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {Array.from({ length: enrollTotalPages }, (_, i) => i + 1)
                        .slice(
                          Math.max(0, enrollmentPage - 3),
                          Math.max(0, enrollmentPage - 3) + 5
                        )
                        .map((p) => (
                          <Button
                            key={p}
                            variant={p === enrollmentPage ? "default" : "outline"}
                            size="sm"
                            className={`h-8 w-8 rounded-lg p-0 ${
                              p === enrollmentPage
                                ? "bg-[#F5C518] text-[#2F3153] hover:bg-[#e6b800]"
                                : "bg-white"
                            }`}
                            onClick={() => setEnrollmentPage(p)}
                          >
                            {p}
                          </Button>
                        ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 rounded-lg p-0"
                        disabled={enrollmentPage >= enrollTotalPages}
                        onClick={() =>
                          setEnrollmentPage((p) => Math.min(enrollTotalPages, p + 1))
                        }
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-[#2F3153]">Course Statistics</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Total Students",
                    value: totalStudents,
                    icon: Users,
                    tone: "bg-orange-50 text-orange-600",
                  },
                  {
                    label: "Completed",
                    value: completedCount,
                    icon: CheckCircle2,
                    tone: "bg-emerald-50 text-emerald-600",
                  },
                  {
                    label: "Completion Rate",
                    value: `${completionRate}%`,
                    icon: Target,
                    tone: "bg-sky-50 text-sky-600",
                  },
                  {
                    label: "Active Students",
                    value: activeStudents,
                    icon: Users,
                    tone: "bg-violet-50 text-violet-600",
                  },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-gray-100 bg-[#FAFBFC] p-3">
                    <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${stat.tone}`}>
                      <stat.icon className="h-4 w-4" />
                    </div>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                    <p className="mt-1 text-xl font-bold text-[#2F3153]">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-[#2F3153]">Course Meta</h3>
              <dl className="space-y-3 text-sm">
                {[
                  [
                    "Status",
                    <span
                      key="status"
                      className={`font-semibold ${course.is_active ? "text-emerald-600" : "text-amber-600"}`}
                    >
                      {course.is_active ? "Active" : "Draft"}
                    </span>,
                  ],
                  [
                    "Course ID",
                    <span key="id" className="break-all font-mono text-xs text-violet-700">
                      {course.id}
                    </span>,
                  ],
                  [
                    "Difficulty",
                    <span key="diff" className="font-medium text-sky-700">
                      {course.difficulty_level || "—"}
                    </span>,
                  ],
                  [
                    "Category",
                    <span key="cat" className="font-medium text-violet-700">
                      {course.category || "—"}
                    </span>,
                  ],
                  [
                    "Branch Availability",
                    <span key="br" className="font-medium text-sky-700">
                      {branchAvailability} {branchAvailability === 1 ? "Branch" : "Branches"}
                    </span>,
                  ],
                  [
                    "Visibility",
                    <span key="vis" className="font-medium text-emerald-700">
                      Public
                    </span>,
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label as string}
                    className="flex items-start justify-between gap-3 border-b border-gray-100 pb-2 last:border-0 last:pb-0"
                  >
                    <dt className="text-gray-500">{label}</dt>
                    <dd className="max-w-[60%] text-right">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-base font-semibold text-[#2F3153]">Quick Actions</h3>
              <div className="space-y-1">
                {[
                  {
                    label: "Edit Course Details",
                    onClick: () => router.push(`${basePath}/courses/edit/${courseId}`),
                  },
                  {
                    label: "View Enrolled Students",
                    onClick: () => router.push(`${basePath}/students?course_id=${courseId}`),
                  },
                  {
                    label: "Manage Enrollments",
                    onClick: () => router.push(`${basePath}/enrollments?course_id=${courseId}`),
                  },
                  {
                    label: "View Analytics",
                    onClick: () => router.push(`${basePath}/reports`),
                  },
                ].map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.onClick}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-[#4F5077] transition-colors hover:bg-[#FAFBFC]"
                  >
                    <span>{action.label}</span>
                    <Chevron className="h-4 w-4 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-[#2F3153]">Performance Snapshot</h3>
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-gray-500">Course Completion</span>
                    <span className="font-semibold text-[#2F3153]">{completionRate}%</span>
                  </div>
                  <Progress value={completionRate} className="h-2.5" />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-1.5 text-gray-500">
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                      Enrollment Growth (This Month)
                    </span>
                    <span className="font-semibold text-emerald-600">
                      {Math.min(100, Math.round((activeStudents / Math.max(totalStudents, 1)) * 100))}%
                    </span>
                  </div>
                  <Progress
                    value={Math.min(
                      100,
                      Math.round((activeStudents / Math.max(totalStudents, 1)) * 100)
                    )}
                    className="h-2"
                  />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
