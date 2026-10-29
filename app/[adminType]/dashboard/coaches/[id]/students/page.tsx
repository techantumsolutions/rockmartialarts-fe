"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Users, Eye, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import { TokenManager } from "@/lib/tokenManager"

interface AssignedStudent {
  id: string
  student_name: string
  email?: string
  phone?: string
  course_id: string
  course_name: string
  batch_ref?: string | null
  batch_name?: string
  enrollment_date?: string
  status?: string
  progress?: number
  branch_id?: string
  enrollment_id?: string
}

interface FilterCourse {
  id: string
  name: string
}

interface FilterBatch {
  batch_ref: string
  batch_name: string
  course_id: string
  course_name?: string
  branch_name?: string
}

export default function CoachAssignedStudentsPage() {
  const params = useParams()
  const router = useRouter()
  const basePath = useDashboardBasePath()
  const coachId = params.id as string

  const [coachName, setCoachName] = useState("")
  const [students, setStudents] = useState<AssignedStudent[]>([])
  const [courses, setCourses] = useState<FilterCourse[]>([])
  const [batches, setBatches] = useState<FilterBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [courseFilter, setCourseFilter] = useState("all")
  const [batchFilter, setBatchFilter] = useState("all")
  const [search, setSearch] = useState("")

  useEffect(() => {
    const token = TokenManager.getToken()
    if (!token || !coachId) {
      setError("Authentication required")
      setLoading(false)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/backend/coaches/${coachId}/students`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
        if (!response.ok) {
          throw new Error(`Failed to load assigned students (${response.status})`)
        }
        const data = await response.json()
        if (cancelled) return
        setCoachName(data.coach_name || "")
        setStudents(Array.isArray(data.students) ? data.students : [])
        setCourses(Array.isArray(data.filters?.courses) ? data.filters.courses : [])
        setBatches(Array.isArray(data.filters?.batches) ? data.filters.batches : [])
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to load assigned students")
          setStudents([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [coachId])

  const courseOptions = useMemo(() => {
    if (courses.length > 0) return courses
    const map = new Map<string, string>()
    students.forEach((s) => {
      if (s.course_id) map.set(s.course_id, s.course_name || "Unknown Course")
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [courses, students])

  const batchOptions = useMemo(() => {
    const map = new Map<string, FilterBatch>()

    batches
      .filter((b) => {
        if (!b.batch_ref) return false
        if (b.batch_ref === "__unassigned__") return true
        return courseFilter === "all" || !b.course_id || b.course_id === courseFilter
      })
      .forEach((b) => {
        if (!map.has(b.batch_ref)) {
          map.set(b.batch_ref, b)
        }
      })

    students
      .filter((s) => courseFilter === "all" || s.course_id === courseFilter)
      .forEach((s) => {
        const ref = (s.batch_ref || "").trim() || "__unassigned__"
        if (!map.has(ref)) {
          map.set(ref, {
            batch_ref: ref,
            batch_name: s.batch_name || (ref === "__unassigned__" ? "Unassigned" : ref),
            course_id: s.course_id,
            course_name: s.course_name,
          })
        }
      })

    return Array.from(map.values())
  }, [batches, students, courseFilter])

  // Reset batch when course changes if the selected batch no longer applies
  useEffect(() => {
    if (batchFilter === "all") return
    const stillValid = batchOptions.some((b) => b.batch_ref === batchFilter)
    if (!stillValid) setBatchFilter("all")
  }, [courseFilter, batchFilter, batchOptions])

  const showCourseFilter = courseOptions.length > 1
  const showBatchFilter = batchOptions.length > 1

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase()
    return students.filter((s) => {
      if (courseFilter !== "all" && s.course_id !== courseFilter) return false
      if (batchFilter !== "all") {
        const ref = (s.batch_ref || "").trim() || "__unassigned__"
        if (ref !== batchFilter) return false
      }
      if (!q) return true
      return (
        (s.student_name || "").toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q) ||
        (s.phone || "").toLowerCase().includes(q) ||
        (s.course_name || "").toLowerCase().includes(q) ||
        (s.batch_name || "").toLowerCase().includes(q)
      )
    })
  }, [students, courseFilter, batchFilter, search])

  const formatDate = (value?: string) => {
    if (!value) return "—"
    try {
      return new Date(value).toLocaleDateString()
    } catch {
      return "—"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#4F5077]">Assigned Students</h1>
            <p className="text-[#7D8592] mt-1">
              {coachName
                ? `Students assigned to ${coachName}`
                : "Students assigned to this coach"}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push(`${basePath}/coaches/${coachId}`)}
            className="flex items-center gap-2 self-start"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Coach
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[#4F5077]">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Name, email, phone..."
                    className="pl-9"
                  />
                </div>
              </div>

              {showCourseFilter && (
                <div className="space-y-2">
                  <Label>Course</Label>
                  <Select
                    value={courseFilter}
                    onValueChange={(value) => {
                      setCourseFilter(value)
                      setBatchFilter("all")
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All courses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All courses</SelectItem>
                      {courseOptions.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {showBatchFilter && (
                <div className="space-y-2">
                  <Label>Batch</Label>
                  <Select value={batchFilter} onValueChange={setBatchFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All batches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All batches</SelectItem>
                      {batchOptions.map((batch) => (
                        <SelectItem
                          key={`${batch.course_id}-${batch.batch_ref}`}
                          value={batch.batch_ref}
                        >
                          {batch.batch_name}
                          {courseFilter === "all" && batch.course_name
                            ? ` · ${batch.course_name}`
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bold text-[#4F5077]">
              <Users className="w-5 h-5" />
              Students ({loading ? "…" : filteredStudents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-lg">
                    <Skeleton className="h-5 w-1/3 mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-10 text-red-600">{error}</div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No assigned students found</p>
                <p className="text-sm mt-1">
                  {students.length > 0
                    ? "Try changing the course or batch filter."
                    : "Students enrolled in this coach’s courses will appear here."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredStudents.map((student) => (
                  <div
                    key={`${student.id}-${student.enrollment_id || student.course_id}-${student.batch_ref || "none"}`}
                    className="p-4 bg-gray-50 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="font-medium text-[#4F5077]">{student.student_name}</h4>
                        <Badge
                          variant="secondary"
                          className={
                            student.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-700"
                          }
                        >
                          {student.status || "active"}
                        </Badge>
                      </div>
                      <div className="text-sm text-[#7D8592] space-y-0.5">
                        <div>
                          <span className="font-medium text-gray-600">Course:</span>{" "}
                          {student.course_name}
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Batch:</span>{" "}
                          {student.batch_name || "Unassigned"}
                        </div>
                        {(student.email || student.phone) && (
                          <div>
                            {[student.email, student.phone].filter(Boolean).join(" · ")}
                          </div>
                        )}
                        <div>
                          <span className="font-medium text-gray-600">Enrolled:</span>{" "}
                          {formatDate(student.enrollment_date)}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="self-start"
                      onClick={() => router.push(`${basePath}/students/${student.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
