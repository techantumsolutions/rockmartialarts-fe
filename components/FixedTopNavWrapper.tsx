"use client"

import { usePathname } from "next/navigation"
import { FixedTopNav } from "./FixedTopNav"
import { isPartnerOrgSitePath } from "@/lib/partnerOrgSitePath"

const DASHBOARD_PREFIXES = [
  "/student-dashboard",
  "/coach-dashboard",
  "/branch-manager-dashboard",
  "/training-dashboard",
  "/super-admin",
  "/branch-admin",
  "/partner-admin",
  "/dashboard",
]

export function isDashboardPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  const p = pathname.split("?")[0] || ""
  if (p.includes("-dashboard") || p.includes("/dashboard") || p.endsWith("/dashboard")) return true
  if (DASHBOARD_PREFIXES.some((prefix) => p.startsWith(prefix))) return true
  // /partners/:slug/... (partner dashboards and white-label auth), but /partners is public
  if (/^\/partners\/[^/]+/.test(p)) return true
  return false
}

export function FixedTopNavWrapper() {
  const pathname = usePathname()
  if (isDashboardPath(pathname)) return null
  if (pathname != null && pathname.startsWith("/residential-camp")) return null
  // Partner org site uses its own isolated navbar
  if (isPartnerOrgSitePath(pathname)) return null
  return <FixedTopNav />
}
