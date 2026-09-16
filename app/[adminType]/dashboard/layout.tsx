import PathBasedDashboardResolver from "@/components/layout/PathBasedDashboardResolver"

/** Role-specific dashboard shell for /super-admin and /branch-admin routes. Includes settings/geography. */
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ adminType: string }> | { adminType: string }
}) {
  const resolved = await Promise.resolve(params)
  const adminType = resolved.adminType
  return <PathBasedDashboardResolver adminType={adminType}>{children}</PathBasedDashboardResolver>
}
