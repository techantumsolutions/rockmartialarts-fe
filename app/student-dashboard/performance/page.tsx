"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import StudentDashboardLayout from "@/components/student-dashboard-layout"
import { StudentPerformanceDashboardClient } from "@/components/student-dashboard/StudentPerformanceDashboardClient"

export default function StudentPerformancePage() {
  const router = useRouter()
  const [name, setName] = useState<string>("")

  useEffect(() => {
    const token = localStorage.getItem("token")
    const raw = localStorage.getItem("user")
    if (!token) {
      router.push("/login")
      return
    }
    if (raw) {
      try {
        const u = JSON.parse(raw) as { role?: string; full_name?: string }
        if (u.role && u.role !== "student") {
          router.push("/dashboard")
          return
        }
        setName(u.full_name || "Student")
      } catch {
        setName("Student")
      }
    }
  }, [router])

  return (
    <StudentDashboardLayout
      studentName={name}
      pageTitle="Performance"
      pageDescription="Your training snapshot, achievements, and coach notes."
      showBreadcrumb={false}
    >
      <StudentPerformanceDashboardClient canEdit={false} title="My performance" />
    </StudentDashboardLayout>
  )
}
