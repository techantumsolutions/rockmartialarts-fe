import type { Metadata } from "next"
import { getBackendProxyBaseUrl } from "@/lib/serverBackendUrl"
import PartnerLandingClient from "./partner-landing-client"

export const dynamic = "force-dynamic"

type PageProps = {
  params: { slug: string }
}

type LandingPayload = {
  slug?: string
  hero?: { name?: string; tagline?: string; cover_banner_url?: string | null }
  seo?: {
    has_seo?: boolean
    meta_title?: string | null
    meta_description?: string | null
    keywords?: string | null
    og_image?: string | null
  }
  about?: { about_content?: string | null; short_description?: string | null }
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
  const base = getBackendProxyBaseUrl().replace(/\/$/, "")
  try {
    const res = await fetch(
      `${base}/api/collaboration-partners/public/by-slug/${encodeURIComponent(slug)}`,
      { cache: "no-store", headers: { Accept: "application/json" } }
    )
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
  const seo = payload.seo || {}
  const title =
    (seo.has_seo && seo.meta_title?.trim()) ||
    `${name} | Collaboration Partner | Rock Martial Arts Academy`
  const description =
    (seo.has_seo && seo.meta_description?.trim()) ||
    payload.hero?.tagline?.trim() ||
    `Visit ${name}, a Rock Martial Arts collaboration partner.`
  const keywords = seo.has_seo && seo.keywords?.trim() ? seo.keywords.trim() : undefined
  const ogImage = resolveAbsoluteAssetUrl(
    (seo.has_seo && seo.og_image) || payload.hero?.cover_banner_url || undefined
  )
  const canonicalSlug = String(payload.slug || slug).trim()

  const metadata: Metadata = {
    title,
    description,
    alternates: { canonical: `/partners/${encodeURIComponent(canonicalSlug)}` },
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
    metadata.keywords = keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean)
  }
  return metadata
}

export default function PartnerLandingRoute() {
  return <PartnerLandingClient />
}
