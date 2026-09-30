import { getBackendApiUrl } from "@/lib/config"
import { TokenManager, type LinkedStudentProfile } from "@/lib/tokenManager"

export const STUDENT_DEACTIVATED_EVENT = "rma:student-deactivated"

export const STUDENT_DEACTIVATED_MESSAGE =
  "Your details have been deactivated by the admin. Please contact your branch for assistance."

export type StudentSessionStatus = {
  student_id: string
  full_name: string
  is_active: boolean
  status: "active" | "deactivated"
  account_id?: string
  profiles: LinkedStudentProfile[]
}

/** Deactivated profiles have is_active === false; missing means active. */
export function isProfileDeactivated(profile?: { is_active?: boolean } | null): boolean {
  return profile?.is_active === false
}

/** Returns null when the status cannot be determined (network / older backend). */
export async function fetchStudentSessionStatus(): Promise<StudentSessionStatus | null> {
  const token = TokenManager.getToken()
  if (!token) return null
  try {
    const res = await fetch(getBackendApiUrl("auth/session-status"), {
      headers: TokenManager.getAuthHeaders(),
      cache: "no-store",
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data || typeof data.is_active !== "boolean") return null
    const profiles = Array.isArray(data.profiles) ? data.profiles : []
    TokenManager.setProfiles(profiles)
    return { ...data, profiles }
  } catch {
    return null
  }
}

export function notifyStudentDeactivated(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(STUDENT_DEACTIVATED_EVENT))
}

export function isInactiveUserDetail(detail: unknown): boolean {
  return typeof detail === "string" && detail.trim().toLowerCase() === "inactive user"
}

/** Switch the selected student on the family account and persist the new session. */
export async function switchStudentProfile(studentId: string): Promise<void> {
  const res = await fetch(getBackendApiUrl("auth/switch-student"), {
    method: "POST",
    headers: TokenManager.getAuthHeaders(),
    body: JSON.stringify({ student_id: studentId }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.access_token || !data.user) {
    const detail = typeof data.detail === "string" ? data.detail : "Could not switch student"
    throw new Error(detail)
  }
  TokenManager.storeAuthData({
    access_token: data.access_token,
    token_type: data.token_type,
    expires_in: data.expires_in,
    user: data.user,
    profiles: data.profiles,
    account_id: data.account_id,
    active_student_id: data.active_student_id || data.user?.id,
  })
}
