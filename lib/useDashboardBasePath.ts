"use client"

import { usePathname } from "next/navigation"
import type { DashboardRole } from "@/lib/dashboard-config"

/**
 * Returns the current dashboard base path from the URL (e.g. /super-admin/dashboard or /branch-admin/dashboard).
 * Use for router.push and links so they stay in the same admin area.
 */
export function useDashboardBasePath(): string {
  const pathname = usePathname() ?? ""
  const partnerMatch = pathname.match(/^\/partners\/([^/]+)\/dashboard/)
  if (partnerMatch) return `/partners/${partnerMatch[1]}/dashboard`
  const match = pathname.match(/^\/(super-admin|branch-admin|partner-admin)\/dashboard/)
  return match ? match[0] : "/super-admin/dashboard"
}

/**
 * Returns the dashboard role from the current URL (super_admin for /super-admin/dashboard, branch_admin for /branch-admin/dashboard).
 * Use so Header and other components show the correct actions for the current admin type.
 */
export function useDashboardRole(): DashboardRole {
  const pathname = usePathname() ?? ""
  if (pathname.startsWith("/branch-admin/dashboard")) return "branch_admin"
  if (
    pathname.startsWith("/partner-admin/dashboard") ||
    /^\/partners\/[^/]+\/dashboard/.test(pathname)
  ) {
    return "partner_super_admin"
  }
  return "super_admin"
}
