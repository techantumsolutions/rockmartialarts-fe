import { redirect } from "next/navigation"

type PageProps = { params: { slug: string; branchSlug: string; courseSlug: string } }

export default function PartnerOrgCourseRedirect({ params }: PageProps) {
  const branchSlug = String(params?.branchSlug || "").trim()
  if (branchSlug) redirect(`/branches/${encodeURIComponent(branchSlug)}`)
  redirect(`/partner-orgs/${encodeURIComponent(params.slug || "")}`)
}
