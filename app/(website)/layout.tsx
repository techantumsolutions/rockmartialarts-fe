import type { Metadata } from "next"
import { WebsiteFooter } from "@/components/website/WebsiteFooter"
import { LeadCaptureModal } from "@/components/website/LeadCaptureModal"
import { CampaignPopupModal } from "@/components/website/CampaignPopupModal"
import { portalMetadata } from "@/lib/portalIdentity"

export const metadata: Metadata = portalMetadata("website")

export default function WebsiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="site-shell w-full min-h-screen">
      {children}
      <LeadCaptureModal />
      <CampaignPopupModal />
      <WebsiteFooter />
    </div>
  )
}
