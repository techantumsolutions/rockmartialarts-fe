"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import CoachDashboardHeader from "@/components/coach-dashboard-header"
import CoachAvailabilityEditor from "@/components/coaches/CoachAvailabilityEditor"
import { checkCoachAuth } from "@/lib/coachAuth"

export default function CoachAvailabilityPage() {
  const router = useRouter()
  const [coachName, setCoachName] = useState("Coach")
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const auth = checkCoachAuth()
    if (!auth.isAuthenticated) {
      router.push("/coach/login")
      return
    }
    setCoachName(auth.coach?.full_name || "Coach")
    setReady(true)
  }, [router])

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CoachDashboardHeader currentPage="Availability" coachName={coachName} />
        <main className="pt-20 px-4 lg:px-8 py-6 text-center text-gray-500">Loading…</main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CoachDashboardHeader currentPage="Availability" coachName={coachName} />
      <main className="pt-20 px-4 lg:px-8 py-6 max-w-5xl mx-auto">
        <CoachAvailabilityEditor
          title="My availability"
          subtitle="Set your weekly hours and the branches where you can serve."
        />
      </main>
    </div>
  )
}
