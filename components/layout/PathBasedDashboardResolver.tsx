"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { type DashboardRole } from "@/lib/dashboard-config"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { SuperAdminAuth } from "@/lib/auth"
import { TokenManager } from "@/lib/tokenManager"
import {
  ActiveBranchProvider,
  clearActiveBranch,
  fetchAssignedBranches,
  getActiveBranch,
  setActiveBranch,
  type ActiveBranch,
} from "@/lib/activeBranch"
import DashboardLayoutClient from "./DashboardLayoutClient"
import { Button } from "@/components/ui/button"

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

function isBlockedPartnerAdminPath(pathname: string) {
  const normalized = pathname || ""
  const onPartnerDashboard =
    normalized.startsWith("/partner-admin/dashboard") ||
    /^\/partners\/[^/]+\/dashboard/.test(normalized)
  if (!onPartnerDashboard) return false
  return PARTNER_ADMIN_BLOCKED_SUFFIXES.some(
    (suffix) =>
      normalized.endsWith(suffix) || normalized.includes(`${suffix}/`)
  )
}

type BranchAccessState = "loading" | "ok" | "none" | "switch"

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
  const [branchAccess, setBranchAccess] = useState<BranchAccessState>("loading")
  const [inactiveBranchName, setInactiveBranchName] = useState<string | null>(null)

  const chooseBranch = useCallback((branch: ActiveBranch) => {
    setActiveBranch(branch)
    setActiveBranchState(branch)
    setBranchAccess("ok")
    setInactiveBranchName(null)
  }, [])

  const applyBranchRoster = useCallback(
    (branches: ActiveBranch[]) => {
      setAssignedBranches(branches)
      const saved = getActiveBranch()

      if (branches.length === 0) {
        clearActiveBranch()
        setActiveBranchState(null)
        setInactiveBranchName(saved?.name || null)
        setBranchAccess("none")
        return
      }

      const savedStillActive = saved
        ? branches.find((branch) => branch.id === saved.id) || null
        : null

      if (saved && !savedStillActive) {
        // Current selection was deactivated — require explicit switch.
        clearActiveBranch()
        setActiveBranchState(null)
        setInactiveBranchName(saved.name || null)
        setBranchAccess("switch")
        return
      }

      const picked = savedStillActive || branches[0]
      setActiveBranch(picked)
      setActiveBranchState(picked)
      setInactiveBranchName(null)
      setBranchAccess("ok")
    },
    []
  )

  const refreshBranchRoster = useCallback(async () => {
    const token = BranchManagerAuth.getToken()
    if (!token) {
      setAssignedBranches([])
      setBranchAccess("none")
      return
    }
    let branches: ActiveBranch[] = []
    try {
      branches = await fetchAssignedBranches(token)
    } catch {
      branches = []
    }
    applyBranchRoster(branches)
  }, [applyBranchRoster])

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

      const isBranchManager =
        BranchManagerAuth.isAuthenticated() && BranchManagerAuth.getCurrentUser()
      const isSuperAdmin = SuperAdminAuth.isAuthenticated()
      const partnerUser = TokenManager.getUser()
      const isPartnerAdmin =
        TokenManager.isAuthenticated() &&
        String(partnerUser?.role || "").toLowerCase() === "partner_super_admin"

      if (isPartnerAdminPath) {
        if (isPartnerAdmin) {
          if (pathname && isBlockedPartnerAdminPath(pathname)) {
            const slug =
              (typeof window !== "undefined" && localStorage.getItem("partner_slug")) ||
              ""
            router.replace(
              slug
                ? `/partners/${slug}/dashboard/attendance`
                : "/partner-admin/dashboard/attendance"
            )
            return
          }
          if (!cancelled) {
            setBranchAccess("ok")
            setRole("partner_super_admin")
          }
          return
        }
        const slug =
          (typeof window !== "undefined" && localStorage.getItem("partner_slug")) || ""
        router.replace(slug ? `/partners/${slug}/login` : "/superadmin/login")
        return
      }

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
          if (cancelled) return
          applyBranchRoster(branches)
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
        if (!cancelled) {
          setBranchAccess("ok")
          setRole("super_admin")
        }
        return
      }
      router.replace("/superadmin/login")
    }
    void resolve()
    return () => {
      cancelled = true
    }
  }, [adminType, pathname, router, applyBranchRoster])

  // Re-check live active branches when BM returns to the tab (mid-session deactivation).
  useEffect(() => {
    if (role !== "branch_admin") return
    const onFocus = () => {
      void refreshBranchRoster()
    }
    const onInactive = () => {
      void refreshBranchRoster()
    }
    window.addEventListener("focus", onFocus)
    window.addEventListener("bm-branch-inactive", onInactive as EventListener)
    const interval = window.setInterval(() => {
      void refreshBranchRoster()
    }, 60000)
    return () => {
      window.removeEventListener("focus", onFocus)
      window.removeEventListener("bm-branch-inactive", onInactive as EventListener)
      window.clearInterval(interval)
    }
  }, [role, refreshBranchRoster])

  const handleBmLogout = () => {
    clearActiveBranch()
    BranchManagerAuth.logout()
  }

  const blockedForBranchAdmin =
    role === "branch_admin" && !!pathname && isBlockedBranchAdminPath(pathname)
  const blockedForPartnerAdmin =
    role === "partner_super_admin" && !!pathname && isBlockedPartnerAdminPath(pathname)

  if (role === null || blockedForBranchAdmin || blockedForPartnerAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E1BB33]" />
      </div>
    )
  }

  if (role === "branch_admin" && branchAccess === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E1BB33]" />
      </div>
    )
  }

  if (role === "branch_admin" && branchAccess === "none") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-lg p-6 text-center space-y-4">
          <h1 className="text-xl font-semibold text-gray-900">Access Denied</h1>
          <p className="text-sm text-gray-600">
            {inactiveBranchName
              ? `Branch “${inactiveBranchName}” has been deactivated.`
              : "Your assigned branch has been deactivated."}{" "}
            You no longer have access to the branch manager dashboard. Please contact your
            administrator.
          </p>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleBmLogout}
          >
            Back to Login
          </Button>
        </div>
      </div>
    )
  }

  if (role === "branch_admin" && branchAccess === "switch") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-lg p-6 text-center space-y-4">
          <h1 className="text-xl font-semibold text-gray-900">Access Denied</h1>
          <p className="text-sm text-gray-600">
            {inactiveBranchName
              ? `Branch “${inactiveBranchName}” has been deactivated.`
              : "Your selected branch has been deactivated."}{" "}
            Switch to another active branch to continue.
          </p>
          <div className="space-y-2 text-left">
            {assignedBranches.map((branch) => (
              <Button
                key={branch.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => chooseBranch(branch)}
              >
                {branch.name}
              </Button>
            ))}
          </div>
          <Button variant="ghost" className="text-gray-600" onClick={handleBmLogout}>
            Back to Login
          </Button>
        </div>
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
