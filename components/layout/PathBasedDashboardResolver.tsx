"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { type DashboardRole } from "@/lib/dashboard-config"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { SuperAdminAuth } from "@/lib/auth"
import { TokenManager } from "@/lib/tokenManager"
import {
  ActiveBranchProvider,
  fetchAssignedBranches,
  getActiveBranch,
  setActiveBranch,
  type ActiveBranch,
} from "@/lib/activeBranch"
import DashboardLayoutClient from "./DashboardLayoutClient"
import {
  partnerDashboardPathFeatureKey,
  PARTNER_FEATURE_STORAGE_KEY,
  isPartnerFeatureEnabled,
} from "@/lib/partnerFeaturePermissions"

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

/** Rock-only biometric surfaces — not for white-label partner admins */
const PARTNER_ADMIN_BLOCKED_SUFFIXES = [
  "/attendance/devices",
  "/attendance/biometric-mapping",
]

function isBlockedBranchAdminPath(pathname: string) {
  return BRANCH_ADMIN_BLOCKED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

function isBlockedPartnerAdminPath(
  pathname: string,
  permissions?: Record<string, boolean> | null
) {
  const normalized = pathname || ""
  const onPartnerDashboard =
    normalized.startsWith("/partner-admin/dashboard") ||
    /^\/partners\/[^/]+\/dashboard/.test(normalized)
  if (!onPartnerDashboard) return false
  if (
    PARTNER_ADMIN_BLOCKED_SUFFIXES.some(
      (suffix) => normalized.endsWith(suffix) || normalized.includes(`${suffix}/`)
    )
  ) {
    return true
  }
  try {
    let perms = permissions || null
    if (!perms) {
      const raw = localStorage.getItem(PARTNER_FEATURE_STORAGE_KEY)
      perms = raw ? (JSON.parse(raw) as Record<string, boolean>) : null
    }
    const featureKey = partnerDashboardPathFeatureKey(normalized)
    // Only block when we have real DB-backed permissions and the feature is off.
    if (perms && featureKey && !isPartnerFeatureEnabled(perms, featureKey)) return true
  } catch {
    /* ignore */
  }
  return false
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

  // Resolve auth once per adminType — do NOT re-run on every pathname change
  // (that flashed MartialArtsRouteLoader / spinner and interrupted soft navigations).
  useEffect(() => {
    let cancelled = false
    const resolve = async () => {
    if (typeof window === "undefined") return

    const normalized = adminType?.toLowerCase().replace(/_/g, "-")
    const isSuperAdminPath = normalized === "super-admin"
    const isBranchAdminPath = normalized === "branch-admin"
    const isPartnerAdminPath = normalized === "partner-admin"

    if (!isSuperAdminPath && !isBranchAdminPath && !isPartnerAdminPath) {
      router.replace("/superadmin/login")
      return
    }

    const isBranchManager = BranchManagerAuth.isAuthenticated() && BranchManagerAuth.getCurrentUser()
    const isSuperAdmin = SuperAdminAuth.isAuthenticated()
    const partnerUser = TokenManager.getUser()
    const isPartnerAdmin =
      TokenManager.isAuthenticated() &&
      String(partnerUser?.role || "").toLowerCase() === "partner_super_admin"

    if (isPartnerAdminPath) {
      if (isPartnerAdmin) {
        let apiPerms: Record<string, boolean> | null = null
        try {
          const { partnerOrgAPI } = await import("@/lib/partnerOrgAPI")
          const data = await partnerOrgAPI.getMyFeaturePermissions()
          apiPerms = data.feature_permissions || {}
          localStorage.setItem(PARTNER_FEATURE_STORAGE_KEY, JSON.stringify(apiPerms))
        } catch {
          /* fall back to cached permissions */
        }
        setRole("partner_super_admin")
        return
      }
      const slug =
        (typeof window !== "undefined" && localStorage.getItem("partner_slug")) || ""
      router.replace(slug ? `/partners/${slug}/login` : "/superadmin/login")
      return
    }

    if (isBranchAdminPath) {
      if (isBranchManager) {
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
  }, [adminType, router])

  // Redirect blocked routes without tearing down the whole shell on every click
  useEffect(() => {
    if (!pathname || role === null) return
    if (role === "branch_admin" && isBlockedBranchAdminPath(pathname)) {
      router.replace("/branch-admin/dashboard")
      return
    }
    if (role === "partner_super_admin" && isBlockedPartnerAdminPath(pathname)) {
      const slug =
        (typeof window !== "undefined" && localStorage.getItem("partner_slug")) || ""
      router.replace(slug ? `/partners/${slug}/dashboard` : "/partner-admin/dashboard")
    }
  }, [pathname, role, router])

  // Only block the first paint before role resolves. Never replace the shell with a
  // full-page loader on later navigations — that caused "click → loader → same page".
  if (role === null) {
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
