"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { FileText, Loader2, BookOpen, UserRound } from "lucide-react"
import StudentDashboardLayout from "@/components/student-dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { TokenManager } from "@/lib/tokenManager"
import { requireStudentSession } from "@/lib/sessionAuth"
import {
  studentSyllabusAPI,
  type SyllabusProfile,
  type StudentSyllabusItem,
} from "@/lib/studentSyllabusAPI"

const ACTIVE_STUDENT_KEY = "active_syllabus_student_id"

export default function StudentSyllabusClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [studentName, setStudentName] = useState("Student")
  const [profiles, setProfiles] = useState<SyllabusProfile[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [items, setItems] = useState<StudentSyllabusItem[]>([])
  const [summaryName, setSummaryName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [openingId, setOpeningId] = useState<string | null>(null)

  const loadSyllabi = useCallback(
    async (studentId: string) => {
      if (!studentId) return
      setLoading(true)
      setError(null)
      try {
        const data = await studentSyllabusAPI.listForStudent(studentId)
        setItems(data.items || [])
        setSummaryName(data.student_name || "")
      } catch (err) {
        setItems([])
        setError(err instanceof Error ? err.message : "Failed to load syllabi")
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const bootstrap = useCallback(async () => {
    const token = requireStudentSession(router, "/student-dashboard/syllabus")
    if (!token) return

    const user = TokenManager.getUser()
    if (user) {
      setStudentName(
        user.full_name ||
          `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
          "Student"
      )
    }

    try {
      const profileRes = await studentSyllabusAPI.listProfiles()
      const list = profileRes.profiles || []
      setProfiles(list)

      const fromQuery = searchParams?.get("student_id") || ""
      const fromStorage =
        typeof window !== "undefined"
          ? localStorage.getItem(ACTIVE_STUDENT_KEY) || ""
          : ""
      const selfId = user?.id || profileRes.selected_student_id || ""

      let nextId = fromQuery || fromStorage || selfId
      const allowed = new Set(list.map((p) => p.id))
      if (nextId && list.length > 0 && !allowed.has(nextId)) {
        nextId = selfId
      }
      if (!nextId && list.length > 0) nextId = list[0].id

      setSelectedStudentId(nextId)
      if (nextId && typeof window !== "undefined") {
        localStorage.setItem(ACTIVE_STUDENT_KEY, nextId)
      }
      if (nextId) await loadSyllabi(nextId)
      else setLoading(false)
    } catch (err) {
      // Fallback: load for logged-in student only
      const sid = user?.id || ""
      setSelectedStudentId(sid)
      if (sid) await loadSyllabi(sid)
      else {
        setError(err instanceof Error ? err.message : "Failed to load profiles")
        setLoading(false)
      }
    }
  }, [router, searchParams, loadSyllabi])

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  const onSwitchStudent = async (id: string) => {
    setSelectedStudentId(id)
    if (typeof window !== "undefined") {
      localStorage.setItem(ACTIVE_STUDENT_KEY, id)
    }
    // Keep URL in sync for shareable/deep-link switcher state
    const url = new URL(window.location.href)
    url.searchParams.set("student_id", id)
    window.history.replaceState({}, "", url.toString())
    await loadSyllabi(id)
  }

  const handleLogout = () => {
    TokenManager.clearAuthData()
    router.push("/login")
  }

  const openSyllabus = async (item: StudentSyllabusItem) => {
    if (!item.syllabus?.id || !selectedStudentId) return
    setOpeningId(item.syllabus.id)
    const qs = new URLSearchParams({ student_id: selectedStudentId })
    router.push(
      `/student-dashboard/syllabus/${encodeURIComponent(item.syllabus.id)}/view?${qs.toString()}`
    )
  }

  return (
    <StudentDashboardLayout
      studentName={studentName}
      pageTitle="Course Syllabus"
      pageDescription="PDFs for your active enrollments."
      showBreadcrumb
      breadcrumbItems={[
        { label: "Dashboard", href: "/student-dashboard" },
        { label: "Syllabus" },
      ]}
      onLogout={handleLogout}
    >
      <div className="space-y-6">
        {profiles.length > 1 ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <UserRound className="h-4 w-4 text-blue-600" />
                Viewing syllabus for
              </CardTitle>
              <CardDescription>
                Switch student to refresh allowed syllabi for that enrollment.
              </CardDescription>
            </CardHeader>
            <CardContent className="max-w-md space-y-1.5">
              <Label className="text-xs text-slate-600">Student</Label>
              <Select value={selectedStudentId} onValueChange={(v) => void onSwitchStudent(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name}
                      {p.is_self ? " (you)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        ) : null}

        {error ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-4 text-sm text-red-800">{error}</CardContent>
          </Card>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading syllabi…
          </div>
        ) : items.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-sm text-slate-500">
              No active enrollments with courses found
              {summaryName ? ` for ${summaryName}` : ""}.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((item) => (
              <Card key={item.course_id} className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-start gap-2">
                    <BookOpen className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <span className="leading-snug">{item.course_name}</span>
                  </CardTitle>
                  <CardDescription>
                    {item.has_syllabus && item.syllabus
                      ? item.syllabus.title || item.syllabus.original_filename || "Syllabus PDF"
                      : "No active syllabus uploaded yet"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    {item.has_syllabus && item.syllabus ? (
                      <>
                        <Badge variant="outline">v{item.syllabus.version}</Badge>
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          Available
                        </Badge>
                      </>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">
                        Pending
                      </Badge>
                    )}
                  </div>
                  {item.has_syllabus && item.syllabus ? (
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={openingId === item.syllabus.id}
                      onClick={() => void openSyllabus(item)}
                    >
                      {openingId === item.syllabus.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <FileText className="h-4 w-4 mr-1" />
                      )}
                      Open
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </StudentDashboardLayout>
  )
}
