/** Who may use the public enrollment cart (students only). */

import { TokenManager } from "@/lib/tokenManager"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { SuperAdminAuth } from "@/lib/auth"
import { isTokenExpired } from "@/lib/sessionAuth"

export type EnrollmentCartAccess =
  | { allowed: true }
  | { allowed: false; kind: "guest" }
  | { allowed: false; kind: "staff"; roleLabel: string }

const STAFF_ROLE_LABELS: Record<string, string> = {
  superadmin: "super admin",
  super_admin: "super admin",
  branch_manager: "branch manager",
  branch_admin: "branch manager",
  coach: "coach",
  coach_admin: "coach",
}

function normalizeRole(role: unknown): string {
  return String(role || "")
    .toLowerCase()
    .replace(/-/g, "_")
}

function staffLabelForRole(role: string): string {
  if (STAFF_ROLE_LABELS[role]) return STAFF_ROLE_LABELS[role]
  if (role.includes("super")) return "super admin"
  if (role.includes("branch") || role.includes("manager")) return "branch manager"
  if (role.includes("coach")) return "coach"
  return "staff"
}

/**
 * Resolve whether the current browser session may add courses to the enrollment cart.
 * Mirrors FixedTopNav staff detection so dedicated admin/coach sessions are not treated as guests.
 */
export function getEnrollmentCartAccess(): EnrollmentCartAccess {
  if (typeof window === "undefined") {
    return { allowed: false, kind: "guest" }
  }

  // Prefer JWT role when present — survives mismatched localStorage blobs across login types.
  let jwtRole = ""
  try {
    const token = localStorage.getItem("access_token") || localStorage.getItem("token")
    if (token && token.includes(".")) {
      const parts = token.split(".")
      const padded = parts[1] + "=".repeat((4 - (parts[1].length % 4)) % 4)
      const payload = JSON.parse(atob(padded)) as { role?: string; exp?: number }
      if (!payload.exp || payload.exp * 1000 > Date.now()) {
        jwtRole = normalizeRole(payload.role)
      }
    }
  } catch {
    /* ignore */
  }

  try {
    if (BranchManagerAuth.isAuthenticated() || jwtRole === "branch_manager" || jwtRole === "branch_admin") {
      return { allowed: false, kind: "staff", roleLabel: "branch manager" }
    }
  } catch {
    /* ignore */
  }

  try {
    if (
      SuperAdminAuth.isAuthenticated() ||
      jwtRole === "superadmin" ||
      jwtRole === "super_admin"
    ) {
      return { allowed: false, kind: "staff", roleLabel: "super admin" }
    }
  } catch {
    /* ignore */
  }

  try {
    const coachRaw = localStorage.getItem("coach")
    const token = localStorage.getItem("access_token") || localStorage.getItem("token")
    const exp = localStorage.getItem("token_expiration")
    if (
      (coachRaw && token && !isTokenExpired(token, exp)) ||
      jwtRole === "coach" ||
      jwtRole === "coach_admin"
    ) {
      const coach = coachRaw ? (JSON.parse(coachRaw) as { role?: string }) : null
      const role = normalizeRole(coach?.role || jwtRole || "coach")
      if (!role || role === "coach" || role === "coach_admin" || jwtRole === "coach" || jwtRole === "coach_admin") {
        return { allowed: false, kind: "staff", roleLabel: staffLabelForRole(role || "coach") }
      }
    }
  } catch {
    /* ignore */
  }

  if (!TokenManager.isAuthenticated() && !jwtRole) {
    return { allowed: false, kind: "guest" }
  }

  const role = normalizeRole(TokenManager.getUser()?.role || jwtRole)
  if (role === "student") {
    return { allowed: true }
  }

  if (
    role in STAFF_ROLE_LABELS ||
    role.includes("admin") ||
    role.includes("manager") ||
    role.includes("coach")
  ) {
    return { allowed: false, kind: "staff", roleLabel: staffLabelForRole(role) }
  }

  // Authenticated but not a student — block cart use
  if (role || TokenManager.isAuthenticated()) {
    return { allowed: false, kind: "staff", roleLabel: staffLabelForRole(role || "staff") }
  }

  return { allowed: false, kind: "guest" }
}

export function enrollmentCartStaffBlockedMessage(roleLabel: string): string {
  return `The enrollment cart is only for student accounts. You're signed in as ${roleLabel}. Please sign in with a student account to add courses.`
}
