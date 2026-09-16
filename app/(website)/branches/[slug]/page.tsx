import type { Metadata } from "next"
import { getBackendProxyBaseUrl } from "@/lib/serverBackendUrl"
import BranchDetailPage from "./branch-detail-client"

export const dynamic = "force-dynamic"

type PageProps = {
  params: { slug: string }
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
  if (!payload) return `Visit ${name} at Rock Martial Arts Academy.`
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
  const raw = String(payload.description || fromAddress || "").replace(/\s+/g, " ").trim()
  return (raw || `Visit ${name} at Rock Martial Arts Academy.`).slice(0, 160)
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const slug = params.slug
  const payload = await fetchPublicBranch(slug)
  if (!payload) {
    return { title: "Branch not found | Rock Martial Arts Academy" }
  }
  const name = branchDisplayName(payload)
  const description = branchDescription(payload, name)
  const canonicalSlug = String(payload.slug || slug).trim()
  return {
    title: `${name} | Rock Martial Arts Academy`,
    description,
    alternates: { canonical: `/branches/${encodeURIComponent(canonicalSlug)}` },
    openGraph: {
      title: name,
      description,
    },
  }
}

export default function BranchDetailRoute() {
  return <BranchDetailPage />
}
