"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import CoachDashboardHeader from "@/components/coach-dashboard-header"
import { StudentPerformanceDashboardClient } from "@/components/student-dashboard/StudentPerformanceDashboardClient"
import { checkCoachAuth } from "@/lib/coachAuth"

export default function CoachStudentPerformancePage() {
  const params = useParams()
  const router = useRouter()
  const studentId = String(params.id || "")
  const backHref = `/coach-dashboard/students/${studentId}`
  const [coachName, setCoachName] = useState("Coach")

  const canEdit = useMemo(() => true, [])

  useEffect(() => {
    const r = checkCoachAuth()
    if (!r.isAuthenticated) {
      router.push("/coach/login")
      return
    }
    setCoachName(r.coach?.full_name || "Coach")
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50">
      <CoachDashboardHeader coachName={coachName} />
      <div className="px-4 sm:px-6 lg:px-8 py-6 pb-10 max-w-7xl mx-auto">
        <StudentPerformanceDashboardClient
          studentId={studentId}
          canEdit={canEdit}
          backHref={backHref}
          title="Student performance"
        />
      </div>
    </div>
  )
}
