import { redirect } from "next/navigation"

/**
 * Partner organization directory is an internal/onboarding concept.
 * Public visitors see partner branches as normal branches on /branches.
 */
export default function PartnerOrgsDirectoryPage() {
  redirect("/branches")
}
