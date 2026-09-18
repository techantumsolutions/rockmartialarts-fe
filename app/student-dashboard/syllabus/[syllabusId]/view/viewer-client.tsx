"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import StudentDashboardLayout from "@/components/student-dashboard-layout"
import { Button } from "@/components/ui/button"
import { SyllabusPdfViewer } from "@/components/syllabus/SyllabusPdfViewer"
import { TokenManager } from "@/lib/tokenManager"
import { requireStudentSession } from "@/lib/sessionAuth"
import { studentSyllabusAPI } from "@/lib/studentSyllabusAPI"

const ACTIVE_STUDENT_KEY = "active_syllabus_student_id"

export default function SyllabusViewerClient() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const syllabusId = (params?.syllabusId as string) || ""

  const [studentName, setStudentName] = useState("Student")
  const [title, setTitle] = useState("Syllabus")
  const [ready, setReady] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const studentId = useMemo(() => {
    const q = searchParams?.get("student_id") || ""
    if (q) return q
    if (typeof window !== "undefined") {
      return localStorage.getItem(ACTIVE_STUDENT_KEY) || TokenManager.getUser()?.id || ""
    }
    return TokenManager.getUser()?.id || ""
  }, [searchParams])

  const fileUrl = useMemo(() => {
    if (!studentId || !syllabusId) return ""
    return studentSyllabusAPI.fileUrl(studentId, syllabusId)
  }, [studentId, syllabusId])

  useEffect(() => {
    const token = requireStudentSession(
      router,
      `/student-dashboard/syllabus/${encodeURIComponent(syllabusId)}/view`
    )
    if (!token) return

    const user = TokenManager.getUser()
    if (user) {
      setStudentName(
        user.full_name ||
          `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
          "Student"
      )
    }

    if (!studentId || !syllabusId) {
      setAuthError("Missing student or syllabus.")
      setReady(true)
      return
    }

    // Prefetch list metadata for title (enrollment gate happens on file stream)
    ;(async () => {
      try {
        const data = await studentSyllabusAPI.listForStudent(studentId)
        const match = (data.items || []).find((i) => i.syllabus?.id === syllabusId)
        if (match) {
          setTitle(
            match.syllabus?.title ||
              match.course_name ||
              match.syllabus?.original_filename ||
              "Syllabus"
          )
        } else {
          setAuthError(
            "This syllabus is not available for the selected student (check enrollment)."
          )
        }
      } catch (e: unknown) {
        setAuthError(e instanceof Error ? e.message : "Access check failed")
      } finally {
        setReady(true)
      }
    })()
  }, [router, syllabusId, studentId])

  const backHref = studentId
    ? `/student-dashboard/syllabus?student_id=${encodeURIComponent(studentId)}`
    : "/student-dashboard/syllabus"

  return (
    <StudentDashboardLayout
      studentName={studentName}
      pageTitle="Syllabus viewer"
      pageDescription="Read-only authenticated PDF"
      showBreadcrumb
      breadcrumbItems={[
        { label: "Dashboard", href: "/student-dashboard" },
        { label: "Syllabus", href: backHref },
        { label: "View" },
      ]}
      onLogout={() => {
        TokenManager.clearAuthData()
        router.push("/login")
      }}
    >
      <div className="space-y-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(backHref)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to list
          </Button>
        </div>

        {!ready ? (
          <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Preparing viewer…
          </div>
        ) : authError ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 space-y-3">
            <p>{authError}</p>
            <Button variant="outline" size="sm" onClick={() => router.push(backHref)}>
              Return to syllabus list
            </Button>
          </div>
        ) : fileUrl ? (
          <SyllabusPdfViewer fileUrl={fileUrl} title={title} />
        ) : null}
      </div>
    </StudentDashboardLayout>
  )
}
