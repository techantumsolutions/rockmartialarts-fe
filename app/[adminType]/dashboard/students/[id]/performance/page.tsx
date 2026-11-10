"use client"

import { useMemo } from "react"
import { useParams } from "next/navigation"
import { StudentPerformanceDashboardClient } from "@/components/student-dashboard/StudentPerformanceDashboardClient"
import { TokenManager } from "@/lib/tokenManager"
import { canEditStudentPerformance } from "@/lib/student-performance-access"

export default function AdminStudentPerformancePage() {
  const params = useParams()
  const adminType = String(params.adminType || "")
  const studentId = String(params.id || "")
  const backHref = `/${adminType}/dashboard/students/${studentId}`

  const canEdit = useMemo(() => {
    const u = TokenManager.getUser()
    return canEditStudentPerformance(u?.role)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-none">
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
