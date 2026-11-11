import StudentRouteGuard from "@/components/student-route-guard"
import { StudentDashboardSonner } from "@/components/student-dashboard-sonner"
import StudentPromotionPopup from "@/components/promotions/StudentPromotionPopup"
import DashboardLayout from "@/components/layout/DashboardLayout"

export default function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <StudentRouteGuard>
      <div data-app-shell="student" className="min-h-screen font-[family-name:var(--font-poppins)]">
        <StudentDashboardSonner />
        <StudentPromotionPopup />
        <DashboardLayout role="student">
          {children}
        </DashboardLayout>
      </div>
    </StudentRouteGuard>
  )
}
