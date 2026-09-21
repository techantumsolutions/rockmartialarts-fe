"use client"

import { usePathname } from "next/navigation"
import { FixedTopNav } from "./FixedTopNav"

const DASHBOARD_PREFIXES = [
  "/student-dashboard",
  "/coach-dashboard",
  "/branch-manager-dashboard",
  "/super-admin",
  "/branch-admin",
]

export function FixedTopNavWrapper() {
  const pathname = usePathname()
  const isDashboard = pathname != null && DASHBOARD_PREFIXES.some((p) => pathname.startsWith(p))
  if (isDashboard) return null
  if (pathname != null && pathname.startsWith("/residential-camp")) return null
  return <FixedTopNav />
}
