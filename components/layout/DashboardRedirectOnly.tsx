"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { SuperAdminAuth } from "@/lib/auth"

/**
 * Used for /dashboard and /dashboard/* only.
 * Never renders dashboard content. Always redirects to role-specific path:
 * - Branch manager -> /branch-admin/dashboard (and same subpath)
 * - Super admin -> /super-admin/dashboard (and same subpath)
 * - Not logged in -> /superadmin/login (or /branch-manager/login for academy)
 * Ensures Super Admin and Academy Admin never share /dashboard and never switch.
 */
export default function DashboardRedirectOnly({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname() ?? ""

  useEffect(() => {
    if (typeof window === "undefined") return
    const rest = pathname.replace(/^\/dashboard\/?/, "") || ""
    const suffix = rest ? `/${rest}` : ""
    if (BranchManagerAuth.isAuthenticated() && BranchManagerAuth.getCurrentUser()) {
      router.replace(`/branch-admin/dashboard${suffix}`)
      return
    }
    if (SuperAdminAuth.isAuthenticated()) {
      router.replace(`/super-admin/dashboard${suffix}`)
      return
    }
    router.replace("/superadmin/login")
  }, [pathname, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E1BB33]" />
    </div>
  )
}
