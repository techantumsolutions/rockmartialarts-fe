import type { Metadata } from "next"
import PathBasedDashboardResolver from "@/components/layout/PathBasedDashboardResolver"
import { portalMetadata, portalShellFromAdminType } from "@/lib/portalIdentity"

type LayoutParams = { adminType: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<LayoutParams> | LayoutParams
}): Promise<Metadata> {
  const resolved = await Promise.resolve(params)
  const shell = portalShellFromAdminType(resolved.adminType)
  return portalMetadata(shell === "unknown" ? "super_admin" : shell)
}

/** Role-specific dashboard shell for /super-admin, /branch-admin, /partner-admin. */
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<LayoutParams> | LayoutParams
}) {
  const resolved = await Promise.resolve(params)
  const adminType = resolved.adminType
  return <PathBasedDashboardResolver adminType={adminType}>{children}</PathBasedDashboardResolver>
}
