import { redirect } from "next/navigation"

type PageProps = { params: { slug: string } }

export default function PartnerOrgBranchesRedirect({ params }: PageProps) {
  redirect(`/partner-orgs/${encodeURIComponent(params.slug || "")}`)
}
