"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import type { PartnerOrgLanding } from "@/lib/partnerOrgAPI"
import { PartnerOrgHeader } from "./PartnerOrgHeader"
import { PartnerOrgFooter } from "./PartnerOrgFooter"

export function PartnerOrgSiteChrome({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const slug = String(params?.slug || "")
  const [data, setData] = useState<PartnerOrgLanding | null>(null)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    fetch(
      `/api/backend/partner-organizations/public/${encodeURIComponent(slug)}/landing`,
      { cache: "no-store", headers: { Accept: "application/json" } }
    )
      .then(async (res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!cancelled) setData(payload)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  const name = data?.hero?.name || "Partner"
  const logoUrl = data?.hero?.logo_url
  const contact = data?.contact_page || data?.contact || {}
  const footer = data?.footer || {}

  return (
    <div className="min-h-screen flex flex-col">
      <PartnerOrgHeader
        slug={data?.slug || slug}
        name={name}
        logoUrl={logoUrl}
        logoAlt={name}
      />
      <div className="flex-1 pt-16 md:pt-[4.5rem]">{children}</div>
      <PartnerOrgFooter
        slug={data?.slug || slug}
        name={name}
        footerLogoUrl={footer.logo_url || logoUrl}
        footerLogoAlt={footer.logo_alt || name}
        description={footer.description || data?.about?.short_description || data?.hero?.tagline}
        address={contact.address || data?.contact?.address}
        phone={contact.phone || data?.contact?.phone}
        email={contact.email || data?.contact?.email}
        socialLinks={data?.social_links}
      />
    </div>
  )
}
