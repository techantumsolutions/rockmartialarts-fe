import type { Metadata } from "next"
import StudentRouteGuard from "@/components/student-route-guard"
import { StudentDashboardSonner } from "@/components/student-dashboard-sonner"
import DashboardLayout from "@/components/layout/DashboardLayout"
import { portalMetadata } from "@/lib/portalIdentity"

export const metadata: Metadata = portalMetadata("student")

export default function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <StudentRouteGuard>
      <div data-app-shell="student" className="min-h-screen font-[family-name:var(--font-poppins)]">
        <StudentDashboardSonner />
        <DashboardLayout role="student">{children}</DashboardLayout>
      </div>
    </StudentRouteGuard>
  )
}
