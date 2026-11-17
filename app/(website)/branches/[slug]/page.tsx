import type { Metadata } from "next"
import { getBackendProxyBaseUrl } from "@/lib/serverBackendUrl"
import BranchDetailPage from "./branch-detail-client"

export const dynamic = "force-dynamic"

type PageProps = {
  params: { slug: string }
}

type PartnerSeoPayload = {
  has_seo?: boolean
  is_collaboration_partner?: boolean
  meta_title?: string | null
  meta_description?: string | null
  keywords?: string | null
  og_image?: string | null
}

function branchDisplayName(payload: Record<string, unknown> | null): string {
  if (!payload) return "Branch"
  const nested =
    payload.branch && typeof payload.branch === "object"
      ? (payload.branch as Record<string, unknown>)
      : {}
  return String(nested.name || payload.name || "Branch").trim() || "Branch"
}

function branchDescription(payload: Record<string, unknown> | null, name: string): string {
  if (!payload) return `Visit ${name}.`
  const nested =
    payload.branch && typeof payload.branch === "object"
      ? (payload.branch as Record<string, unknown>)
      : {}
  const addr =
    (nested.address && typeof nested.address === "object"
      ? (nested.address as Record<string, unknown>)
      : payload.address && typeof payload.address === "object"
        ? (payload.address as Record<string, unknown>)
        : {}) || {}
  const fromAddress = [addr.line1, addr.area, addr.city, addr.state]
    .filter((part) => typeof part === "string" && part.trim())
    .join(", ")
  const siteBranding =
    payload.site_branding && typeof payload.site_branding === "object"
      ? (payload.site_branding as Record<string, unknown>)
      : null
  const branded = String(
    siteBranding?.short_description || siteBranding?.tagline || ""
  )
    .replace(/\s+/g, " ")
    .trim()
  const raw = String(payload.description || branded || fromAddress || "")
    .replace(/\s+/g, " ")
    .trim()
  return (raw || `Visit ${name}.`).slice(0, 160)
}

function resolveAbsoluteAssetUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined
  const trimmed = String(path).trim()
  if (!trimmed) return undefined
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed
  const site =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL ||
    ""
  const origin = site
    ? site.startsWith("http")
      ? site.replace(/\/$/, "")
      : `https://${site.replace(/\/$/, "")}`
    : ""
  const pathOnly = trimmed.startsWith("/") ? trimmed : `/${trimmed}`
  return origin ? `${origin}${pathOnly}` : pathOnly
}

async function fetchPublicBranch(slug: string): Promise<Record<string, unknown> | null> {
  const base = getBackendProxyBaseUrl().replace(/\/$/, "")
  try {
    const res = await fetch(`${base}/api/branches/public/by-slug/${encodeURIComponent(slug)}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
    if (!res.ok) return null
    return (await res.json()) as Record<string, unknown>
  } catch {
    return null
  }
}

async function fetchPartnerSeo(branchId: string): Promise<PartnerSeoPayload | null> {
  if (!branchId) return null
  const base = getBackendProxyBaseUrl().replace(/\/$/, "")
  try {
    const res = await fetch(
      `${base}/api/collaboration-partners/public/branches/${encodeURIComponent(branchId)}/seo`,
      { cache: "no-store", headers: { Accept: "application/json" } }
    )
    if (!res.ok) return null
    return (await res.json()) as PartnerSeoPayload
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const slug = params.slug
  const payload = await fetchPublicBranch(slug)
  if (!payload) {
    return { title: "Branch not found | Rock Martial Arts Academy" }
  }
  const name = branchDisplayName(payload)
  const fallbackDescription = branchDescription(payload, name)
  const canonicalSlug = String(payload.slug || slug).trim()
  const branchId = String(payload.id || "").trim()
  const isCollabPartner = Boolean(
    payload.is_collaboration_partner || payload.allows_collaboration
  )
  const siteBranding =
    payload.site_branding && typeof payload.site_branding === "object"
      ? (payload.site_branding as Record<string, unknown>)
      : null
  const orgName = String(
    siteBranding?.org_name || payload.partner_org_name || ""
  ).trim()
  const hasOwnBranding = Boolean(payload.has_own_branding || siteBranding)

  // Partner-org branches use their own branding identity; Rock platform name is not forced.
  let title = hasOwnBranding && orgName ? `${name} | ${orgName}` : `${name} | Rock Martial Arts Academy`
  let description = fallbackDescription
  if (hasOwnBranding) {
    const brandedDesc = String(
      siteBranding?.short_description || siteBranding?.tagline || ""
    )
      .replace(/\s+/g, " ")
      .trim()
    if (brandedDesc) description = brandedDesc.slice(0, 160)
  }
  let keywords: string | undefined
  let ogImage = resolveAbsoluteAssetUrl(
    typeof siteBranding?.cover_banner_url === "string"
      ? siteBranding.cover_banner_url
      : null
  )

  if (isCollabPartner && branchId) {
    const seo = await fetchPartnerSeo(branchId)
    if (seo?.has_seo) {
      if (seo.meta_title?.trim()) title = seo.meta_title.trim()
      if (seo.meta_description?.trim()) description = seo.meta_description.trim()
      if (seo.keywords?.trim()) keywords = seo.keywords.trim()
      ogImage = resolveAbsoluteAssetUrl(seo.og_image) || ogImage
    }
  }

  const metadata: Metadata = {
    title,
    description,
    alternates: { canonical: `/branches/${encodeURIComponent(canonicalSlug)}` },
    openGraph: {
      title,
      description,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  }
  if (keywords) {
    metadata.keywords = keywords.split(",").map((k) => k.trim()).filter(Boolean)
  }
  return metadata
}

export default function BranchDetailRoute() {
  return <BranchDetailPage />
}
