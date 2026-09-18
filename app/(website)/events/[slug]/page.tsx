import type { Metadata } from "next"
import { getBackendProxyBaseUrl } from "@/lib/serverBackendUrl"
import EventDetailClient from "./event-detail-client"

export const dynamic = "force-dynamic"

type PageProps = {
  params: { slug: string }
}

async function fetchPublicEvent(
  slug: string
): Promise<Record<string, unknown> | null> {
  const base = getBackendProxyBaseUrl().replace(/\/$/, "")
  try {
    const res = await fetch(
      `${base}/api/academy-events/public/${encodeURIComponent(slug)}`,
      {
        cache: "no-store",
        headers: { Accept: "application/json" },
      }
    )
    if (!res.ok) return null
    const data = (await res.json()) as { event?: Record<string, unknown> }
    return data.event || null
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const slug = params.slug
  const event = await fetchPublicEvent(slug)
  if (!event) {
    return { title: "Event not found | Rock Martial Arts Academy" }
  }
  const title =
    String(event.seo_title || event.title || "Event").trim() || "Event"
  const description = String(
    event.seo_description ||
      event.short_description ||
      event.description ||
      `Join ${title} at Rock Martial Arts Academy.`
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160)
  const canonicalSlug = String(event.slug || slug).trim()
  const thumb =
    typeof event.thumbnail_url === "string" && event.thumbnail_url
      ? event.thumbnail_url
      : undefined
  return {
    title: `${title} | Rock Martial Arts Academy`,
    description,
    alternates: {
      canonical: `/events/${encodeURIComponent(canonicalSlug)}`,
    },
    openGraph: {
      title,
      description,
      ...(thumb ? { images: [{ url: thumb }] } : {}),
    },
  }
}

export default function EventDetailRoute() {
  return <EventDetailClient />
}
