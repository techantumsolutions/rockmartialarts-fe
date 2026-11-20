import { redirect } from "next/navigation"
import { getBackendProxyBaseUrl } from "@/lib/serverBackendUrl"

type PageProps = {
  params: { slug: string }
}

async function firstBranchSlugForOrg(orgSlug: string): Promise<string | null> {
  const base = getBackendProxyBaseUrl().replace(/\/$/, "")
  try {
    const res = await fetch(
      `${base}/api/partner-organizations/public/${encodeURIComponent(orgSlug)}/landing`,
      { cache: "no-store", headers: { Accept: "application/json" } }
    )
    if (!res.ok) return null
    const data = (await res.json()) as {
      branches?: Array<{ slug?: string; id?: string; branch?: { name?: string } }>
    }
    const first = (data.branches || [])[0]
    if (!first) return null
    return String(first.slug || first.id || "").trim() || null
  } catch {
    return null
  }
}

/**
 * Partner organization mini-sites are not a public directory surface.
 * Send visitors to the partner's assigned physical branch (or /branches).
 */
export default async function PartnerOrgLandingRedirect({ params }: PageProps) {
  const orgSlug = String(params?.slug || "").trim()
  if (orgSlug) {
    const branchSlug = await firstBranchSlugForOrg(orgSlug)
    if (branchSlug) {
      redirect(`/branches/${encodeURIComponent(branchSlug)}`)
    }
  }
  redirect("/branches")
}
