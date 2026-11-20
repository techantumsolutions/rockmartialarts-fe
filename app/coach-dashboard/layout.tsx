import type { Metadata } from "next"
import Footer from "@/components/layout/Footer"
import CoachSubscriptionGuard from "@/components/coach/CoachSubscriptionGuard"
import { portalMetadata } from "@/lib/portalIdentity"

export const metadata: Metadata = portalMetadata("coach")

export default function CoachDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-app-shell="coach"
      className="flex min-h-screen flex-col font-[family-name:var(--font-poppins)]"
    >
      <CoachSubscriptionGuard>
        <div className="flex-1">{children}</div>
      </CoachSubscriptionGuard>
      <Footer />
    </div>
  )
}
