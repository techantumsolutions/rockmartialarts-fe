"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  BookOpen,
  TrendingUp,
  Users,
  Clock,
  Edit,
  Building2,
  Star,
  Target,
  ChevronRight,
  Plus,
  Eye,
  Activity,
} from "lucide-react"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import { TokenManager } from "@/lib/tokenManager"
import { coachAvailabilityAPI, type WeeklySlot } from "@/lib/coachAvailabilityAPI"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import {
  AdminPageShell,
  AdminKpiGrid,
  AdminKpiCard,
  AdminCard,
  AdminDetailLayout,
  AdminStatusPill,
  adminPrimaryBtnClass,
  adminOutlineBtnClass,
} from "@/components/dashboard/AdminPageShell"

interface CoachDetails {
  id: string
  full_name: string
  contact_info: {
    email: string
    phone: string
    address?: {
      street?: string
      city?: string
      state?: string
      postal_code?: string
      country?: string
    }
  }
  areas_of_expertise: string[]
  qualifications?: string[]
  certifications?: string[]
  hire_date?: string
  is_active: boolean
  branch_assignments?: string[]
  bio?: string
  experience_years?: number
  created_at: string
  updated_at: string
  profile_image_url?: string
  professional_info?: {
    designation_id?: string
    designation?: string
  }
  approval_status?: string | null
  registration_source?: string | null
  // Performance metrics
  total_students?: number
  active_courses?: number
  student_satisfaction?: number
  average_rating?: number
  retention_rate?: number
  total_sessions?: number
}

interface CoachBatch {
  batch_name: string
  days: string[]
  start_time: string
  end_time: string
  branch_name?: string
}

interface CourseAssignment {
  id: string
  course_name: string
  difficulty_level: string
  enrolled_students: number
  schedule?: string
  branch_name?: string
  batches: CoachBatch[]
  status: 'active' | 'completed' | 'upcoming'
}

const WEEKDAY_SHORT: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
}

function formatBatchDays(days: string[]) {
  if (!days.length) return "Not set"
  return days.map((day) => WEEKDAY_SHORT[day.toLowerCase()] || day).join(", ")
}

function formatClock(value: string) {
  const match = /^(\d{1,2}):(\d{2})/.exec((value || "").trim())
  if (!match) return value
  let hour = Number(match[1])
  const suffix = hour >= 12 ? "PM" : "AM"
  hour = hour % 12 || 12
  return `${hour}:${match[2]} ${suffix}`
}

function formatBatchTiming(start: string, end: string) {
  const startLabel = start ? formatClock(start) : ""
  const endLabel = end ? formatClock(end) : ""
  if (startLabel && endLabel) return `${startLabel} – ${endLabel}`
  return startLabel || endLabel || "Not set"
}

const DAY_CHIP_STYLES: Record<string, string> = {
  monday: "bg-sky-100 text-sky-800 border-sky-200",
  tuesday: "bg-violet-100 text-violet-800 border-violet-200",
  wednesday: "bg-emerald-100 text-emerald-800 border-emerald-200",
  thursday: "bg-amber-100 text-amber-800 border-amber-200",
  friday: "bg-rose-100 text-rose-800 border-rose-200",
  saturday: "bg-indigo-100 text-indigo-800 border-indigo-200",
  sunday: "bg-orange-100 text-orange-800 border-orange-200",
}

const EXPERTISE_TAG_LIMIT = 4

function coachInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "CO"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase()
}

function formatDetailDate(value?: string) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

function formatCourseScheduleColumn(course: CourseAssignment) {
  if (course.batches.length > 0) {
    const first = course.batches[0]
    const days = formatBatchDays(first.days)
    const timing = formatBatchTiming(first.start_time, first.end_time)
    const extra = course.batches.length > 1 ? ` (+${course.batches.length - 1})` : ""
    return `${days} · ${timing}${extra}`
  }
  return course.schedule || "—"
}

function coachLocationLabel(coach: CoachDetails) {
  if (coach.branch_assignments?.length) {
    return coach.branch_assignments.join(", ")
  }
  const addr = coach.contact_info.address
  if (!addr) return "—"
  const line = [addr.city, addr.state].filter(Boolean).join(", ")
  return line || addr.street || "—"
}

interface StudentAssignment {
  id: string
  student_name: string
  course_name: string
  enrollment_date: string
  progress: number
  status: 'active' | 'completed' | 'paused'
}

export default function CoachDetailPage() {
  const params = useParams()
  const router = useRouter()
  const basePath = useDashboardBasePath()
  const coachId = params.id as string
  const searchParams = useSearchParams()
  const fromCoachReports = searchParams?.get("from") === "coach-reports"
  const backLabel = fromCoachReports ? "Back to Coach Reports" : "Back to Coaches"

  const [coach, setCoach] = useState<CoachDetails | null>(null)
  const [courseAssignments, setCourseAssignments] = useState<CourseAssignment[]>([])
  const [availabilitySlots, setAvailabilitySlots] = useState<WeeklySlot[]>([])
  const [availabilityLoading, setAvailabilityLoading] = useState(true)
  const [studentAssignments, setStudentAssignments] = useState<StudentAssignment[]>([])
  const [studentsVisibleCount, setStudentsVisibleCount] = useState(10)
  const [loading, setLoading] = useState(true)
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [studentsLoading, setStudentsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("courses")
  const [courseNameById, setCourseNameById] = useState<Record<string, string>>({})
  const lookedUpCourseIds = useRef<Set<string>>(new Set())
  const uniqueStudentCount = new Set(studentAssignments.map((s) => s.id)).size

  useEffect(() => {
    fetchCoachDetails()
  }, [coachId])

  // areas_of_expertise stores course IDs; resolve any not covered by the coach's active courses.
  useEffect(() => {
    if (!coach || coursesLoading) return
    const token = TokenManager.getToken()
    if (!token) return
    const missing = Array.from(new Set(coach.areas_of_expertise || [])).filter(
      (value) => value && !courseNameById[value] && !lookedUpCourseIds.current.has(value)
    )
    if (missing.length === 0) return
    missing.forEach((id) => lookedUpCourseIds.current.add(id))

    Promise.all(
      missing.map(async (id) => {
        try {
          const res = await fetch(`/api/backend/courses/${encodeURIComponent(id)}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
          if (!res.ok) return null
          const data = await res.json()
          const name = data?.title || data?.name
          return name ? ([id, String(name)] as const) : null
        } catch {
          return null
        }
      })
    ).then((results) => {
      const found = results.filter((r): r is readonly [string, string] => r !== null)
      if (found.length === 0) return
      setCourseNameById((prev) => ({ ...prev, ...Object.fromEntries(found) }))
    })
  }, [coach, coursesLoading, courseNameById])

  const fetchCoachDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = TokenManager.getToken()
      if (!token) {
        setError("Authentication required. Please login again.")
        setAvailabilityLoading(false)
        return
      }

      // Fetch coach details
      const coachResponse = await fetch(`/api/backend/coaches/${coachId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!coachResponse.ok) {
        if (coachResponse.status === 404) {
          setError("Coach not found")
          setAvailabilityLoading(false)
          return
        }
        throw new Error(`Failed to fetch coach: ${coachResponse.status}`)
      }

      const coachData = await coachResponse.json()
      setCoach(coachData)

      // Fetch related data in parallel
      await Promise.all([
        fetchCourseAssignments(token),
        fetchStudentAssignments(token),
        fetchAvailability()
      ])

    } catch (err: any) {
      console.error('Error fetching coach details:', err)
      setError(err.message || 'Failed to load coach details')
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailability = async () => {
    try {
      setAvailabilityLoading(true)
      const availability = await coachAvailabilityAPI.getForCoach(coachId)
      setAvailabilitySlots(availability.weekly_slots || [])
    } catch {
      setAvailabilitySlots([])
    } finally {
      setAvailabilityLoading(false)
    }
  }

  const fetchCourseAssignments = async (token: string) => {
    try {
      setCoursesLoading(true)
      const response = await fetch(`/api/backend/coaches/${coachId}/courses`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        const courses = data.courses || []

        const names: Record<string, string> = {}
        courses.forEach((course: any) => {
          const name = course?.name || course?.title
          if (course?.id && name) names[course.id] = name
        })
        setCourseNameById((prev) => ({ ...prev, ...names }))

        // Transform API response to match frontend interface
        const transformedCourses: CourseAssignment[] = courses.map((course: any) => {
          const batches: CoachBatch[] = Array.isArray(course.batches)
            ? course.batches.map((batch: any, index: number) => ({
                batch_name: batch.batch_name || `Batch ${index + 1}`,
                days: Array.isArray(batch.days) ? batch.days.filter(Boolean).map(String) : [],
                start_time: batch.start_time || "",
                end_time: batch.end_time || "",
                branch_name: batch.branch_name || "",
              }))
            : []
          return {
            id: course.id,
            course_name: course.name || course.title || 'Unknown Course',
            difficulty_level: course.difficulty_level || 'Beginner',
            enrolled_students: course.enrolled_students || 0,
            schedule: batches.length > 0 ? undefined : (course.schedule || 'Schedule TBD'),
            branch_name: course.branch_assignments?.[0]?.branch_name || batches[0]?.branch_name || 'Unknown Branch',
            batches,
            status: 'active' as const
          }
        })

        setCourseAssignments(transformedCourses)
      } else {
        console.error('Failed to fetch course assignments:', response.status, response.statusText)
        setError('Failed to load course assignments')
      }
    } catch (err) {
      console.error('Error fetching course assignments:', err)
      setError('Error loading course assignments')
    } finally {
      setCoursesLoading(false)
    }
  }

  const fetchStudentAssignments = async (token: string) => {
    try {
      setStudentsLoading(true)
      const response = await fetch(`/api/backend/coaches/${coachId}/students`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        const students = data.students || []

        // Transform API response to match frontend interface
        const transformedStudents: StudentAssignment[] = students.map((student: any) => ({
          id: student.id,
          student_name: student.student_name || 'Unknown Student',
          course_name: student.course_name || 'Unknown Course',
          enrollment_date: student.enrollment_date || new Date().toISOString(),
          progress: student.progress || 0,
          status: student.status === 'active' ? 'active' as const : 'paused' as const
        }))

        setStudentAssignments(transformedStudents)
        setStudentsVisibleCount(10)
      } else {
        console.error('Failed to fetch student assignments:', response.status, response.statusText)
        setError('Failed to load student assignments')
      }
    } catch (err) {
      console.error('Error fetching student assignments:', err)
      setError('Error loading student assignments')
    } finally {
      setStudentsLoading(false)
    }
  }

  const handleEdit = () => {
    router.push(`${basePath}/coaches/edit/${coachId}`)
  }

  const handleBack = () => {
    router.push(fromCoachReports ? `${basePath}/reports/coach` : `${basePath}/coaches`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'upcoming':
        return 'bg-yellow-100 text-yellow-800'
      case 'paused':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <AdminPageShell>
        <Skeleton className="mb-4 h-4 w-64" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <AdminKpiGrid>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </AdminKpiGrid>
        <AdminDetailLayout
          main={<Skeleton className="h-96 rounded-2xl" />}
          side={<Skeleton className="h-96 rounded-2xl" />}
        />
      </AdminPageShell>
    )
  }

  if (error) {
    return (
      <AdminPageShell>
        <div className="py-12 text-center">
          <User className="mx-auto mb-4 h-16 w-16 text-[#6B7A99]" />
          <h2 className="mb-2 text-2xl font-semibold text-[#4F5077]">Coach Not Found</h2>
          <p className="mb-6 text-[#6B7A99]">{error}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button type="button" onClick={handleBack} variant="outline" className={adminOutlineBtnClass}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {backLabel}
            </Button>
            <Button type="button" onClick={() => window.location.reload()} className={adminPrimaryBtnClass}>
              Try Again
            </Button>
          </div>
        </div>
      </AdminPageShell>
    )
  }

  if (!coach) {
    return null
  }

  const listCrumbLabel = fromCoachReports ? "Coach Reports" : "Coaches"
  const designation =
    coach.professional_info?.designation_id || coach.professional_info?.designation || "Coach"
  const profileSrc = coach.profile_image_url
    ? resolvePublicAssetUrl(coach.profile_image_url)
    : ""
  const expertiseLabels = (coach.areas_of_expertise || []).map(
    (id) => courseNameById[id] || id
  )
  const visibleExpertise = expertiseLabels.slice(0, EXPERTISE_TAG_LIMIT)
  const expertiseOverflow = Math.max(0, expertiseLabels.length - EXPERTISE_TAG_LIMIT)
  const coursesAssignedCount = coursesLoading
    ? "—"
    : courseAssignments.length
  const studentsStat = studentsLoading
    ? "—"
    : coach.total_students ?? uniqueStudentCount
  const sessionsStat =
    coach.total_sessions != null && coach.total_sessions !== undefined
      ? coach.total_sessions
      : "—"
  const avgRating =
    coach.student_satisfaction ?? coach.average_rating
  const avgRatingDisplay =
    avgRating != null && !Number.isNaN(Number(avgRating)) ? Number(avgRating).toFixed(1) : "—"
  const weekdayOrder = Object.keys(WEEKDAY_SHORT)
  const sortedAvailability = [...availabilitySlots].sort((a, b) => {
    const ai = weekdayOrder.indexOf((a.weekday || "").toLowerCase())
    const bi = weekdayOrder.indexOf((b.weekday || "").toLowerCase())
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  const coachCode = `CCH-${coach.id.replace(/-/g, "").slice(-4).toUpperCase()}`

  return (
    <AdminPageShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-[#6B7A99]">
          <button type="button" onClick={handleBack} className="hover:text-[#4F5077]">
            Home
          </button>
          <ChevronRight className="h-3.5 w-3.5" />
          <button type="button" onClick={handleBack} className="hover:text-[#4F5077]">
            {listCrumbLabel}
          </button>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="max-w-full truncate font-medium text-[#4F5077]">{coach.full_name}</span>
        </div>
        <Button type="button" onClick={handleEdit} className={adminPrimaryBtnClass}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Coach
        </Button>
      </div>

      <AdminCard className="!p-0">
          <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-start">
            <Avatar className="h-24 w-24 shrink-0 border-4 border-[#F5F6FA] shadow-sm">
              {profileSrc ? <AvatarImage src={profileSrc} alt={coach.full_name} /> : null}
              <AvatarFallback className="bg-violet-100 text-xl font-semibold text-violet-700">
                {coachInitials(coach.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-[#2F3153] sm:text-3xl">
                  {coach.full_name}
                </h1>
                <AdminStatusPill status={coach.is_active ? "active" : "inactive"}>
                  {coach.is_active ? "Active" : "Inactive"}
                </AdminStatusPill>
              </div>
              <p className="mt-1 text-sm font-medium text-[#6B7A99]">{designation}</p>
              {coach.bio ? (
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#5B6475]">{coach.bio}</p>
              ) : null}
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Phone", value: coach.contact_info.phone || "—", icon: Phone },
                  { label: "Email", value: coach.contact_info.email || "—", icon: Mail },
                  { label: "Branch / Location", value: coachLocationLabel(coach), icon: Building2 },
                  {
                    label: "Join Date",
                    value: formatDetailDate(coach.hire_date || coach.created_at),
                    icon: Calendar,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-gray-100 bg-[#FAFBFC] p-3"
                  >
                    <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                      <item.icon className="h-3.5 w-3.5 text-violet-500" />
                      {item.label}
                    </div>
                    <p className="break-all text-sm font-medium text-[#2F3153]">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                  Specialties
                </p>
                <div className="flex flex-wrap gap-2">
                  {expertiseLabels.length === 0 ? (
                    <span className="text-sm text-gray-400">No specialties listed</span>
                  ) : (
                    <>
                      {visibleExpertise.map((label, index) => (
                        <Badge
                          key={`${label}-${index}`}
                          className="rounded-full border-amber-200 bg-[#FFF8E1] text-[#8B6914] hover:bg-[#FFF8E1]"
                        >
                          {label}
                        </Badge>
                      ))}
                      {expertiseOverflow > 0 ? (
                        <Badge variant="outline" className="rounded-full text-gray-600">
                          +{expertiseOverflow}
                        </Badge>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </AdminCard>

      <AdminKpiGrid>
        <AdminKpiCard icon={BookOpen} label="Courses Assigned" value={coursesAssignedCount} tone="blue" />
        <AdminKpiCard icon={Users} label="Students" value={studentsStat} tone="purple" />
        <AdminKpiCard icon={Clock} label="Total Sessions" value={sessionsStat} tone="green" />
        <AdminKpiCard icon={Star} label="Avg. Rating" value={avgRatingDisplay} tone="amber" />
      </AdminKpiGrid>

      <AdminDetailLayout
        wideSide
        main={
          <Tabs value={activeTab} onValueChange={setActiveTab} className="admin-tabs gap-4">
              <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl border border-gray-200/80 bg-white p-1 shadow-sm">
                <TabsTrigger
                  value="courses"
                >
                  <BookOpen className="mr-1.5 h-4 w-4" />
                  Course Assignments ({coursesLoading ? "…" : courseAssignments.length})
                </TabsTrigger>
                <TabsTrigger value="availability">
                  <Clock className="mr-1.5 h-4 w-4" />
                  Availability
                </TabsTrigger>
                <TabsTrigger value="students">
                  <Users className="mr-1.5 h-4 w-4" />
                  Student Assignments ({studentsLoading ? "…" : uniqueStudentCount})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="courses" className="mt-0">
                <AdminCard padding={false}>
                  <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <h2 className="text-lg font-semibold text-[#4F5077]">
                      Course Assignments ({coursesLoading ? "…" : courseAssignments.length})
                    </h2>
                    <Button
                      type="button"
                      className={adminPrimaryBtnClass}
                      onClick={() => router.push(`${basePath}/courses?coach_id=${coachId}`)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Assign Course
                    </Button>
                  </div>
                  {coursesLoading ? (
                    <div className="space-y-3 p-5">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : courseAssignments.length === 0 ? (
                    <div className="px-5 py-12 text-center text-sm text-gray-500">
                      <BookOpen className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                      No courses assigned to this coach
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[720px]">
                        <thead>
                          <tr className="border-b border-gray-100 bg-[#FAFBFC] text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            <th className="px-5 py-3">Course</th>
                            <th className="px-5 py-3">Students</th>
                            <th className="px-5 py-3">Schedule</th>
                            <th className="px-5 py-3">Branch</th>
                            <th className="px-5 py-3">Status</th>
                            <th className="px-5 py-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {courseAssignments.map((course) => (
                            <tr
                              key={course.id}
                              className="border-b border-gray-50 text-sm text-[#5B6475] last:border-0"
                            >
                              <td className="px-5 py-4 font-medium text-[#2F3153]">
                                {course.course_name}
                              </td>
                              <td className="px-5 py-4">{course.enrolled_students}</td>
                              <td className="max-w-xs px-5 py-4 text-gray-600">
                                {formatCourseScheduleColumn(course)}
                              </td>
                              <td className="px-5 py-4">{course.branch_name || "—"}</td>
                              <td className="px-5 py-4">
                                <Badge
                                  className={`rounded-full text-xs capitalize ${getStatusColor(course.status)}`}
                                >
                                  {course.status}
                                </Badge>
                              </td>
                              <td className="px-5 py-4">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 rounded-lg text-violet-700 hover:bg-violet-50"
                                  onClick={() => router.push(`${basePath}/courses/${course.id}`)}
                                >
                                  <Eye className="mr-1 h-4 w-4" />
                                  View
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </AdminCard>
              </TabsContent>

              <TabsContent value="availability" className="mt-0">
                <AdminCard padding={false}>
                  <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <h2 className="text-lg font-semibold text-[#4F5077]">Availability</h2>
                    {String(coach.registration_source || "admin").toLowerCase() === "self" ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        onClick={() =>
                          router.push(`${basePath}/coach-availability?coachId=${coach.id}`)
                        }
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Manage Online Availability
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        className={adminPrimaryBtnClass}
                        onClick={() => router.push(`${basePath}/coaches/edit/${coach.id}`)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Availability
                      </Button>
                    )}
                  </div>
                  {availabilityLoading ? (
                    <div className="space-y-3 p-5">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : sortedAvailability.length === 0 ? (
                    <div className="px-5 py-12 text-center text-sm text-gray-500">
                      <Clock className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                      Availability is not set.
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {sortedAvailability.map((slot, index) => {
                        const dayKey = (slot.weekday || "").toLowerCase()
                        const dayShort = WEEKDAY_SHORT[dayKey] || slot.weekday || "Day"
                        const chipClass =
                          DAY_CHIP_STYLES[dayKey] || "bg-gray-100 text-gray-800 border-gray-200"
                        return (
                          <li
                            key={`${slot.weekday}-${slot.start_time}-${index}`}
                            className="flex flex-wrap items-center gap-3 px-5 py-4 sm:px-6"
                          >
                            <span
                              className={`inline-flex min-w-[3.25rem] items-center justify-center rounded-lg border px-2.5 py-1 text-xs font-semibold ${chipClass}`}
                            >
                              {dayShort}
                            </span>
                            <span className="text-sm font-medium text-[#2F3153]">
                              {formatBatchTiming(slot.start_time, slot.end_time)}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </AdminCard>
              </TabsContent>

              <TabsContent value="students" className="mt-0">
                <AdminCard padding={false}>
                  <div className="flex flex-col gap-2 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <h2 className="text-lg font-semibold text-[#4F5077]">
                      Student Assignments ({studentsLoading ? "…" : uniqueStudentCount})
                    </h2>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-[#6B7A99] hover:text-[#4F5077]"
                      onClick={() => router.push(`${basePath}/coaches/${coachId}/students`)}
                    >
                      View All
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                  {studentsLoading ? (
                    <div className="space-y-3 p-5">
                      <Skeleton className="h-14 w-full" />
                      <Skeleton className="h-14 w-full" />
                    </div>
                  ) : studentAssignments.length === 0 ? (
                    <div className="px-5 py-12 text-center text-sm text-gray-500">
                      <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                      No students enrolled in this coach&apos;s courses
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px]">
                          <thead>
                            <tr className="border-b border-gray-100 bg-[#FAFBFC] text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                              <th className="px-5 py-3">Student</th>
                              <th className="px-5 py-3">Course</th>
                              <th className="px-5 py-3">Enrolled</th>
                              <th className="px-5 py-3">Progress</th>
                            </tr>
                          </thead>
                          <tbody>
                            {studentAssignments.slice(0, studentsVisibleCount).map((student) => (
                              <tr
                                key={`${student.id}-${student.course_name}-${student.enrollment_date}`}
                                className="border-b border-gray-50 text-sm last:border-0"
                              >
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9">
                                      <AvatarFallback className="bg-sky-100 text-xs font-semibold text-sky-800">
                                        {coachInitials(student.student_name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium text-[#2F3153]">
                                      {student.student_name}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-[#5B6475]">{student.course_name}</td>
                                <td className="px-5 py-4 text-[#5B6475]">
                                  {formatDetailDate(student.enrollment_date)}
                                </td>
                                <td className="min-w-[140px] px-5 py-4">
                                  {student.progress > 0 ? (
                                    <div className="space-y-1">
                                      <div className="flex justify-between text-xs text-gray-500">
                                        <span>Progress</span>
                                        <span className="font-medium text-[#2F3153]">
                                          {student.progress}%
                                        </span>
                                      </div>
                                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                                        <div
                                          className="h-full rounded-full bg-violet-600 transition-all"
                                          style={{ width: `${Math.min(100, student.progress)}%` }}
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {studentAssignments.length > studentsVisibleCount ? (
                        <div className="flex justify-center border-t border-gray-100 px-5 py-4">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-xl"
                            onClick={() =>
                              setStudentsVisibleCount((prev) =>
                                Math.min(prev + 10, studentAssignments.length)
                              )
                            }
                          >
                            Load more ({studentAssignments.length - studentsVisibleCount}{" "}
                            remaining)
                          </Button>
                        </div>
                      ) : null}
                    </>
                  )}
                </AdminCard>
              </TabsContent>
            </Tabs>
        }
        side={
          <>
            <AdminCard>
              <div className="mb-4 flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-[#4F5077]">Coach Status</h3>
                <AdminStatusPill status={coach.is_active ? "active" : "inactive"}>
                  {coach.is_active ? "Active" : "Inactive"}
                </AdminStatusPill>
              </div>
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-2">
                  <dt className="text-[#6B7A99]">Coach ID</dt>
                  <dd className="font-mono text-xs font-medium text-[#4F5077]">{coachCode}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-2">
                  <dt className="text-[#6B7A99]">Type</dt>
                  <dd className="font-medium text-[#4F5077]">In-house coach</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-[#6B7A99]">Last updated</dt>
                  <dd className="text-right font-medium text-[#4F5077]">
                    {formatDetailDate(coach.updated_at)}
                  </dd>
                </div>
              </dl>
            </AdminCard>

            <AdminCard>
              <h3 className="mb-4 text-base font-semibold text-[#4F5077]">Coach Statistics</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Students",
                    value: uniqueStudentCount,
                    icon: Users,
                    tone: "bg-sky-50 text-sky-600",
                  },
                  {
                    label: "Courses",
                    value: coach.active_courses || courseAssignments.filter((c) => c.status === "active").length,
                    icon: BookOpen,
                    tone: "bg-violet-50 text-violet-600",
                  },
                  {
                    label: "Retention",
                    value: coach.retention_rate != null ? `${coach.retention_rate}%` : "—",
                    icon: Target,
                    tone: "bg-emerald-50 text-emerald-600",
                  },
                  {
                    label: "Rating",
                    value: avgRatingDisplay,
                    icon: Star,
                    tone: "bg-amber-50 text-amber-600",
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-gray-100 bg-[#FAFBFC] p-3"
                  >
                    <div
                      className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${stat.tone}`}
                    >
                      <stat.icon className="h-4 w-4" />
                    </div>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                    <p className="mt-1 text-lg font-bold text-[#2F3153]">{stat.value}</p>
                  </div>
                ))}
              </div>
            </AdminCard>

            <AdminCard>
              <h3 className="mb-4 text-base font-semibold text-[#4F5077]">Quick Actions</h3>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className={`${adminOutlineBtnClass} w-full justify-start`}
                  onClick={() => router.push(`${basePath}/coaches/edit/${coachId}`)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Coach Details
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={`${adminOutlineBtnClass} w-full justify-start`}
                  onClick={() => router.push(`${basePath}/courses?coach_id=${coachId}`)}
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  Manage Course Assignments
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={`${adminOutlineBtnClass} w-full justify-start`}
                  onClick={() => router.push(`${basePath}/coaches/edit/${coachId}`)}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Manage Availability
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={`${adminOutlineBtnClass} w-full justify-start`}
                  onClick={() => router.push(`${basePath}/coaches/${coachId}/students`)}
                >
                  <Users className="mr-2 h-4 w-4" />
                  View Assigned Students
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={`${adminOutlineBtnClass} w-full justify-start`}
                  onClick={() => router.push(`${basePath}/schedule?coach_id=${coachId}`)}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  View Schedule
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={`${adminOutlineBtnClass} w-full justify-start`}
                  onClick={() => router.push(`${basePath}/performance?coach_id=${coachId}`)}
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Performance Reports
                </Button>
              </div>
            </AdminCard>

            <AdminCard>
              <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-[#4F5077]">
                <Activity className="h-4 w-4 text-[#6B7A99]" />
                Recent Activity
              </h3>
              <p className="text-sm text-[#6B7A99]">No recent activity</p>
            </AdminCard>
          </>
        }
      />
    </AdminPageShell>
  )
}
