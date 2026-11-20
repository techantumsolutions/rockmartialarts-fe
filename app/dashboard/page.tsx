"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { SuperAdminAuth } from "@/lib/auth"

/**
 * /dashboard redirects to role-based dashboard.
 * Branch admin -> /branch-admin/dashboard only. Super admin -> /super-admin/dashboard only.
 * Never use token presence alone: academy manager also has a token; use role-specific auth.
 */
export default function DashboardRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === "undefined") return
    if (BranchManagerAuth.isAuthenticated() && BranchManagerAuth.getCurrentUser()) {
      router.replace("/branch-admin/dashboard")
      return
    }
    if (SuperAdminAuth.isAuthenticated()) {
      router.replace("/super-admin/dashboard")
      return
    }
    router.replace("/superadmin/login")
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E1BB33]" />
    </div>
  )
}
