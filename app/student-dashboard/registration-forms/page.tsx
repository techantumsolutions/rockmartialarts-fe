"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Download, FileText, Loader2 } from "lucide-react"
import StudentDashboardLayout from "@/components/student-dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getBackendApiUrl } from "@/lib/config"
import { TokenManager } from "@/lib/tokenManager"
import { requireStudentSession } from "@/lib/sessionAuth"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"

type RegistrationForm = {
  id: string
  name: string
  description?: string | null
  file_url: string
  display_order: number
}

export default function StudentRegistrationFormsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [forms, setForms] = useState<RegistrationForm[]>([])
  const [studentName, setStudentName] = useState("Student")

  const loadForms = useCallback(async () => {
    const token = requireStudentSession(router, "/student-dashboard/registration-forms")
    if (!token) return

    const user = TokenManager.getUser()
    if (user) {
      setStudentName(user.full_name || `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Student")
    }

    setLoading(true)
    try {
      const res = await fetch(getBackendApiUrl("registration-forms/student"), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      if (res.status === 401) {
        TokenManager.clearAuthData()
        router.push("/login?session=expired&returnUrl=/student-dashboard/registration-forms")
        return
      }
      if (!res.ok) throw new Error("Failed to load forms")
      const data = await res.json()
      setForms(Array.isArray(data.registration_forms) ? data.registration_forms : [])
    } catch {
      setForms([])
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadForms()
  }, [loadForms])

  const handleLogout = () => {
    TokenManager.clearAuthData()
    router.push("/login")
  }

  const handleDownload = (form: RegistrationForm) => {
    const url = resolvePublicAssetUrl(form.file_url)
    const link = document.createElement("a")
    link.href = url
    link.download = `${form.name.replace(/[^\w\s-]/g, "").trim() || "registration-form"}.pdf`
    link.target = "_blank"
    link.rel = "noopener noreferrer"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <StudentDashboardLayout studentName={studentName} onLogout={handleLogout} isLoading>
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-10 h-10 animate-spin text-[#E1BB33]" />
        </div>
      </StudentDashboardLayout>
    )
  }

  return (
    <StudentDashboardLayout
      studentName={studentName}
      onLogout={handleLogout}
      pageTitle="Registration Forms"
    >
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Download registration form</h1>
          <p className="text-gray-600 mt-1">
            Download the registration forms assigned to your branch and enrolled courses.
          </p>
        </div>

        {forms.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              No registration forms are available for your account at this time.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {forms.map((form) => (
              <Card key={form.id} className="border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="w-5 h-5 text-[#E1BB33]" />
                    {form.name}
                  </CardTitle>
                  {form.description ? (
                    <CardDescription>{form.description}</CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleDownload(form)}
                    className="gap-2 bg-[#E1BB33] hover:bg-[#c9a82e] text-gray-900"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </StudentDashboardLayout>
  )
}
