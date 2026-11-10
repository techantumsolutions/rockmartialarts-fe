import StudentRouteGuard from "@/components/student-route-guard"
import { StudentDashboardSonner } from "@/components/student-dashboard-sonner"
import StudentPromotionPopup from "@/components/promotions/StudentPromotionPopup"

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
        {children}
      </div>
    </StudentRouteGuard>
  )
}
