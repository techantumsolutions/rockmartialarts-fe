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
      <StudentDashboardSonner />
      <StudentPromotionPopup />
      {children}
    </StudentRouteGuard>
  )
}
