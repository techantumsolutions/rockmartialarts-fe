import { Suspense } from "react"
import AdminCoachAvailabilityPage from "@/components/coaches/AdminCoachAvailabilityPage"

export default function CoachAvailabilityAdminRoute() {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-10 text-sm text-gray-500">Loading coach availability…</div>
      }
    >
      <AdminCoachAvailabilityPage />
    </Suspense>
  )
}
