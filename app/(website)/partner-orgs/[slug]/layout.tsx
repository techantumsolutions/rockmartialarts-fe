import { PartnerOrgSiteChrome } from "@/components/partner-org/PartnerOrgSiteChrome"

export default function PartnerOrgSiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <PartnerOrgSiteChrome>{children}</PartnerOrgSiteChrome>
}
