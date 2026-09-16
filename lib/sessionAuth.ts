import { TokenManager } from "@/lib/tokenManager"
import { SuperAdminAuth } from "@/lib/auth"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { clearCoachSession } from "@/lib/coachAuth"

export const SESSION_EXPIRED_MESSAGE =
  "Your session has expired. Please log in again to continue."
export const SESSION_EXPIRED_PAYMENT_MESSAGE =
  "Your session has expired. Please log in again to complete payment."

export function decodeJwtExpirationMs(token: string): number | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4)
    const payload = JSON.parse(atob(padded))
    if (typeof payload.exp === "number") return payload.exp * 1000
  } catch {
    // ignore malformed tokens
  }
  return null
}

export function isTokenExpired(
  token: string | null,
  expirationStr?: string | null
): boolean {
  if (!token) return true

  if (expirationStr) {
    const expirationTime = parseInt(expirationStr, 10)
    if (!Number.isNaN(expirationTime) && Date.now() >= expirationTime) {
      return true
    }
  }

  const jwtExp = decodeJwtExpirationMs(token)
  if (jwtExp !== null && Date.now() >= jwtExp) {
    return true
  }

  return false
}

export function isSessionExpiredError(detail: unknown): boolean {
  if (typeof detail !== "string") return false
  const lower = detail.toLowerCase()
  return (
    lower.includes("invalid authentication credentials") ||
    lower.includes("token expired") ||
    lower.includes("not authenticated")
  )
}

export function getLoginPathForRole(role?: string | null): string {
  const normalized = (role || "").toLowerCase().replace(/-/g, "_")
  switch (normalized) {
    case "coach":
      return "/coach/login"
    case "branch_manager":
      return "/branch-manager/login"
    case "superadmin":
    case "super_admin":
      return "/superadmin/login"
    default:
      return "/login"
  }
}

export function detectStoredRole(): string | null {
  const branchManager = BranchManagerAuth.getCurrentUser()
  if (branchManager) return "branch_manager"

  const superAdmin = SuperAdminAuth.getCurrentUser()
  if (superAdmin) return "superadmin"

  const user = TokenManager.getUser()
  return user?.role ?? null
}

export function clearAuthForRole(role?: string | null): void {
  const normalized = (role || "").toLowerCase().replace(/-/g, "_")
  switch (normalized) {
    case "coach":
      clearCoachSession()
      break
    case "branch_manager":
      BranchManagerAuth.clearAuthData()
      break
    case "superadmin":
    case "super_admin":
      SuperAdminAuth.clearAuthData()
      break
    default:
      TokenManager.clearAuthData()
      break
  }
}

export const DEFAULT_STUDENT_DASHBOARD = "/student-dashboard"

/** Allow only in-app student-dashboard paths as post-login redirects. */
export function safeStudentReturnUrl(raw?: string | null): string {
  if (!raw) return DEFAULT_STUDENT_DASHBOARD
  let path = raw.trim()
  try {
    path = decodeURIComponent(path)
  } catch {
    return DEFAULT_STUDENT_DASHBOARD
  }
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://") || path.includes("\\")) {
    return DEFAULT_STUDENT_DASHBOARD
  }
  const pathnameOnly = path.split("?")[0].split("#")[0]
  if (pathnameOnly === DEFAULT_STUDENT_DASHBOARD || pathnameOnly.startsWith(`${DEFAULT_STUDENT_DASHBOARD}/`)) {
    return pathnameOnly
  }
  return DEFAULT_STUDENT_DASHBOARD
}

export function buildLoginUrl(options?: {
  role?: string | null
  session?: "expired"
  returnUrl?: string
}): string {
  const loginPath = getLoginPathForRole(options?.role)
  const params = new URLSearchParams()
  if (options?.session === "expired") params.set("session", "expired")
  if (options?.returnUrl) params.set("returnUrl", safeStudentReturnUrl(options.returnUrl))
  const qs = params.toString()
  return qs ? `${loginPath}?${qs}` : loginPath
}

export function redirectToLogin(options?: {
  role?: string | null
  returnUrl?: string
}): void {
  if (typeof window === "undefined") return
  const role = options?.role ?? detectStoredRole() ?? TokenManager.getUser()?.role
  window.location.href = buildLoginUrl({
    role,
    session: "expired",
    returnUrl: options?.returnUrl,
  })
}

export function requireStudentSession(
  router?: { push: (path: string) => void; replace?: (path: string) => void },
  returnUrl?: string
): string | null {
  if (!TokenManager.isAuthenticated()) {
    TokenManager.clearAuthData()
    const loginUrl = buildLoginUrl({
      session: "expired",
      returnUrl,
    })
    if (router?.replace) router.replace(loginUrl)
    else if (router) router.push(loginUrl)
    else redirectToLogin({ returnUrl })
    return null
  }
  return TokenManager.getToken()
}

export function handleSessionExpiredFromDetail(
  detail: unknown,
  options?: { role?: string | null; returnUrl?: string }
): boolean {
  if (!isSessionExpiredError(detail)) return false
  const role = options?.role ?? detectStoredRole() ?? TokenManager.getUser()?.role
  clearAuthForRole(role)
  redirectToLogin({
    role,
    returnUrl: options?.returnUrl,
  })
  return true
}

export function getSessionErrorMessage(
  error: unknown,
  paymentContext = false
): string {
  const fallback = paymentContext
    ? SESSION_EXPIRED_PAYMENT_MESSAGE
    : SESSION_EXPIRED_MESSAGE

  if (error instanceof Error) {
    if (isSessionExpiredError(error.message)) {
      return fallback
    }
    return error.message || fallback
  }

  if (typeof error === "string" && isSessionExpiredError(error)) {
    return fallback
  }

  return paymentContext ? SESSION_EXPIRED_PAYMENT_MESSAGE : "Something went wrong"
}
