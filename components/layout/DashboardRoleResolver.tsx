"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { type DashboardRole } from "@/lib/dashboard-config"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { SuperAdminAuth } from "@/lib/auth"
import DashboardLayoutClient from "./DashboardLayoutClient"

/**
 * Resolves dashboard role from auth and renders the shared dashboard layout.
 * Branch manager -> branch_admin only. Super admin -> super_admin only.
 * Never use token presence alone (academy manager also has a token).
 */
export default function DashboardRoleResolver({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [role, setRole] = useState<DashboardRole | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    if (BranchManagerAuth.isAuthenticated() && BranchManagerAuth.getCurrentUser()) {
      setRole("branch_admin")
      return
    }

    if (SuperAdminAuth.isAuthenticated()) {
      setRole("super_admin")
      return
    }

    router.replace("/superadmin/login")
  }, [router])

  if (role === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E1BB33]" />
      </div>
    )
  }

  return <DashboardLayoutClient role={role}>{children}</DashboardLayoutClient>
}
