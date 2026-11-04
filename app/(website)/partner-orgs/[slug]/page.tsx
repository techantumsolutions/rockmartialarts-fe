import type { Metadata } from "next"
import PartnerOrgLandingClient from "./partner-org-landing-client"

export const dynamic = "force-dynamic"

type PageProps = {
  params: { slug: string }
}

type LandingPayload = {
  slug?: string
  hero?: {
    name?: string
    tagline?: string | null
    cover_banner_url?: string | null
  }
  about?: {
    short_description?: string | null
    about_content?: string | null
  }
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

async function fetchLanding(slug: string): Promise<LandingPayload | null> {
  try {
    const base =
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.API_BASE_URL ||
      ""
    const url = base
      ? `${base.replace(/\/$/, "")}/api/partner-organizations/public/${encodeURIComponent(slug)}/landing`
      : `/api/backend/partner-organizations/public/${encodeURIComponent(slug)}/landing`
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
    if (!res.ok) return null
    return (await res.json()) as LandingPayload
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const slug = params.slug
  const payload = await fetchLanding(slug)
  if (!payload) {
    return { title: "Partner not found | Rock Martial Arts Academy" }
  }
  const name = payload.hero?.name || "Partner"
  const title = `${name} | Partner Organization | Rock Martial Arts Academy`
  const description =
    payload.hero?.tagline?.trim() ||
    payload.about?.short_description?.trim() ||
    `Visit ${name}, a Rock Martial Arts partner organization.`
  const ogImage = resolveAbsoluteAssetUrl(payload.hero?.cover_banner_url || undefined)
  const canonicalSlug = String(payload.slug || slug).trim()

  return {
    title,
    description,
    alternates: { canonical: `/partner-orgs/${encodeURIComponent(canonicalSlug)}` },
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
}

export default function PartnerOrgLandingRoute() {
  return <PartnerOrgLandingClient />
}
