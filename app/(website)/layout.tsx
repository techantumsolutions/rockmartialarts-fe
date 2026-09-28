import { WebsiteFooter } from "@/components/website/WebsiteFooter"
import { LeadCaptureModal } from "@/components/website/LeadCaptureModal"
import { CampaignPopupModal } from "@/components/website/CampaignPopupModal"
import { WebsitePageLoader } from "@/components/website/WebsitePageLoader"

export default function WebsiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <WebsitePageLoader />
      {children}
      <LeadCaptureModal />
      <CampaignPopupModal />
      <WebsiteFooter />
    </>
  )
}
