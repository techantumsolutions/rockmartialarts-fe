"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { type DashboardRole } from "@/lib/dashboard-config"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { SuperAdminAuth } from "@/lib/auth"
import {
  ActiveBranchProvider,
  fetchAssignedBranches,
  getActiveBranch,
  setActiveBranch,
  type ActiveBranch,
} from "@/lib/activeBranch"
import DashboardLayoutClient from "./DashboardLayoutClient"

const BRANCH_ADMIN_BLOCKED_PREFIXES = [
  "/branch-admin/dashboard/enrollments",
  "/branch-admin/dashboard/online-learning",
  "/branch-admin/dashboard/achievements-showcase",
  "/branch-admin/dashboard/notifications",
  "/branch-admin/dashboard/discount-rules",
  "/branch-admin/dashboard/attendance/devices",
  "/branch-admin/dashboard/categories",
  "/branch-admin/dashboard/branches",
  "/branch-admin/dashboard/create-branch",
  "/branch-admin/dashboard/payments",
]

function isBlockedBranchAdminPath(pathname: string) {
  return BRANCH_ADMIN_BLOCKED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

/**
 * Resolves dashboard role from the URL path (adminType: super-admin | branch-admin).
 * Validates that the logged-in user matches the path: branch admin must stay on branch-admin, super admin on super-admin.
 * Never treat token presence as super-admin (branch manager also has a token).
 */
export default function PathBasedDashboardResolver({
  adminType,
  children,
}: {
  adminType: string
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [role, setRole] = useState<DashboardRole | null>(null)
  const [assignedBranches, setAssignedBranches] = useState<ActiveBranch[]>([])
  const [activeBranch, setActiveBranchState] = useState<ActiveBranch | null>(null)

  const chooseBranch = (branch: ActiveBranch) => {
    setActiveBranch(branch)
    setActiveBranchState(branch)
  }

  useEffect(() => {
    let cancelled = false
    const resolve = async () => {
    if (typeof window === "undefined") return

    const normalized = adminType?.toLowerCase().replace(/_/g, "-")
    const isSuperAdminPath = normalized === "super-admin"
    const isBranchAdminPath = normalized === "branch-admin"

    if (!isSuperAdminPath && !isBranchAdminPath) {
      router.replace("/superadmin/login")
      return
    }

    const isBranchManager = BranchManagerAuth.isAuthenticated() && BranchManagerAuth.getCurrentUser()
    const isSuperAdmin = SuperAdminAuth.isAuthenticated()

    if (isBranchAdminPath) {
      if (isBranchManager) {
        if (pathname && isBlockedBranchAdminPath(pathname)) {
          router.replace("/branch-admin/dashboard")
          return
        }
        const token = BranchManagerAuth.getToken()
        let branches: ActiveBranch[] = []
        if (token) {
          try {
            branches = await fetchAssignedBranches(token)
          } catch {
            branches = []
          }
        }
        const saved = getActiveBranch()
        const picked = branches.find((branch) => branch.id === saved?.id) || branches[0] || null
        if (cancelled) return
        if (picked) setActiveBranch(picked)
        setAssignedBranches(branches)
        setActiveBranchState(picked)
        setRole("branch_admin")
        return
      }
      if (isSuperAdmin) {
        router.replace("/super-admin/dashboard")
        return
      }
      router.replace("/branch-manager/login")
      return
    }

    // super-admin path: only allow if actually superadmin; if branch manager landed here, send to branch-admin
    if (isBranchManager) {
      router.replace("/branch-admin/dashboard")
      return
    }
    if (isSuperAdmin) {
      setRole("super_admin")
      return
    }
    router.replace("/superadmin/login")
    }
    void resolve()
    return () => {
      cancelled = true
    }
  }, [adminType, pathname, router])

  const blockedForBranchAdmin =
    role === "branch_admin" && !!pathname && isBlockedBranchAdminPath(pathname)

  if (role === null || blockedForBranchAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E1BB33]" />
      </div>
    )
  }

  return (
    <ActiveBranchProvider
      value={{ branches: assignedBranches, active: activeBranch, setActive: chooseBranch }}
    >
      <DashboardLayoutClient
        role={role}
        key={role === "branch_admin" ? activeBranch?.id || "branch" : role}
      >
        {children}
      </DashboardLayoutClient>
    </ActiveBranchProvider>
  )
}
