"use client"

import { useEffect, useState, useMemo } from "react"
import { useSearchParams, usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, BookOpen, User } from "lucide-react"
import { TokenManager } from "@/lib/tokenManager"
import { getBackendApiUrl } from "@/lib/config"

function inferDashboardBasePath(pathname: string): string {
  if (pathname.startsWith("/super-admin/")) return "/super-admin/dashboard"
  if (pathname.startsWith("/branch-admin/")) return "/branch-admin/dashboard"
  if (pathname.startsWith("/branch-manager-dashboard")) return "/branch-manager-dashboard"
  if (pathname.startsWith("/dashboard")) return "/dashboard"
  return "/super-admin/dashboard"
}

interface Row {
  id: string
  student_id?: string
  student_name?: string
  course_id?: string
  branch_id?: string
  course_name?: string
  branch_name?: string
  enrollment_date?: string
  is_active?: boolean
  status?: string
}

export default function ManageEnrollmentsPage() {
  const searchParams = useSearchParams()
  const pathname = usePathname() ?? ""
  const router = useRouter()
  const basePath = useMemo(() => inferDashboardBasePath(pathname), [pathname])

  const studentId = searchParams.get("student_id") || ""
  const courseId = searchParams.get("course_id") || ""

  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [studentName, setStudentName] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setLoading(true)
      setError(null)
      const token = TokenManager.getToken()
      if (!token) {
        setError("Please sign in again.")
        setLoading(false)
        return
      }

      if (!studentId && !courseId) {
        setRows([])
        setError(null)
        setLoading(false)
        return
      }

      try {
        if (studentId) {
          const u = await fetch(getBackendApiUrl(`users/${encodeURIComponent(studentId)}`), {
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          })
          if (u.ok) {
            const uj = await u.json()
            const user = uj.user || uj
            setStudentName(user?.full_name || user?.email || null)
          }

          const res = await fetch(getBackendApiUrl(`users/${encodeURIComponent(studentId)}/enrollments`), {
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          })
          if (!res.ok) {
            const errText = await res.text()
            throw new Error(errText || `Failed to load enrollments (${res.status})`)
          }
          const data = await res.json()
          const list = data.enrollments || []
          if (!cancelled) setRows(list)
        } else {
          const q = new URLSearchParams()
          q.set("course_id", courseId)
          q.set("limit", "100")
          const res = await fetch(getBackendApiUrl(`enrollments?${q.toString()}`), {
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          })
          if (!res.ok) {
            const errText = await res.text()
            throw new Error(errText || `Failed to load enrollments (${res.status})`)
          }
          const data = await res.json()
          const list = data.enrollments || []
          if (!cancelled) setRows(list)
        }
      } catch (e) {
        if (!cancelled) {
          setRows([])
          setError(e instanceof Error ? e.message : "Failed to load enrollments")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [studentId, courseId])

  const title =
    studentId ? `Enrollments${studentName ? ` — ${studentName}` : ""}` : courseId ? "Enrollments for course" : "Manage enrollments"

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Button variant="ghost" className="mb-2 -ml-2" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-[#4D5077] flex items-center gap-2">
              <BookOpen className="w-7 h-7" />
              {title}
            </h1>
            <p className="text-sm text-[#7F8592] mt-1">
              {studentId
                ? "Active and past enrollments for this student. Update course or branch from Edit Student."
                : courseId
                  ? "Students enrolled in this course."
                  : "Open this page from a student or course (Quick Actions)."}
            </p>
          </div>
          {studentId && (
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="border-gray-300">
                <Link href={`${basePath}/students/${encodeURIComponent(studentId)}`}>
                  <User className="w-4 h-4 mr-2" />
                  View profile
                </Link>
              </Button>
              <Button asChild className="bg-yellow-400 hover:bg-yellow-500 text-white">
                <Link href={`${basePath}/students/edit/${encodeURIComponent(studentId)}`}>Edit student</Link>
              </Button>
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-[#4D5077]">Enrollment list</CardTitle>
          </CardHeader>
          <CardContent>
            {!studentId && !courseId ? (
              <p className="text-sm text-gray-600">No filter provided. Use Quick Actions from a student or course page.</p>
            ) : loading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-gray-600">No enrollments found.</p>
            ) : (
              <ul className="space-y-3">
                {rows.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 rounded-lg border bg-white"
                  >
                    <div>
                      {courseId ? (
                        <>
                          <p className="font-medium text-gray-900">
                            {r.student_name || "Unknown student"}
                          </p>
                          <p className="text-sm text-gray-600">
                            {r.course_name || "Course"}
                            {" · "}
                            {r.branch_name || "Branch"}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-medium text-gray-900">
                            {r.course_name || "Unknown course"}
                          </p>
                          <p className="text-sm text-gray-600">
                            {r.branch_name || "Unknown branch"}
                          </p>
                        </>
                      )}
                      {r.enrollment_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          Enrolled {new Date(r.enrollment_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={r.is_active ? "default" : "secondary"}>
                        {r.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {r.student_id && !studentId && (
                        <Button asChild variant="outline" size="sm">
                          <Link href={`${basePath}/students/${encodeURIComponent(r.student_id)}`}>Student</Link>
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
