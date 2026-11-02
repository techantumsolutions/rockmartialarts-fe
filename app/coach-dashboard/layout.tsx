import Footer from "@/components/layout/Footer"
import CoachSubscriptionGuard from "@/components/coach/CoachSubscriptionGuard"

export default function CoachDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <CoachSubscriptionGuard>
        <div className="flex-1">{children}</div>
      </CoachSubscriptionGuard>
      <Footer />
    </div>
  )
}
