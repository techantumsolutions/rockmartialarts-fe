import { redirect } from "next/navigation"

type PageProps = {
  params: { slug: string }
}

/**
 * Collaboration partner landing pages are removed from the public website.
 * Visitors land on the physical branch page instead (same slug when available).
 */
export default function PartnerLandingRedirect({ params }: PageProps) {
  const slug = String(params?.slug || "").trim()
  if (slug) {
    redirect(`/branches/${encodeURIComponent(slug)}`)
  }
  redirect("/branches")
}
