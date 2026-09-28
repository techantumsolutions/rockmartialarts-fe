/** Shared helpers for family-account linked student profiles. */

import { TokenManager, type LinkedStudentProfile } from "@/lib/tokenManager"
import { getBackendApiUrl } from "@/lib/config"

export function profileDisplayName(p: LinkedStudentProfile): string {
  const name = (p.full_name || `${p.first_name || ""} ${p.last_name || ""}`).trim()
  return name || "Student"
}

export function relationshipLabel(value?: string): string {
  if (!value) return ""
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ")
}

export const STUDENT_RELATIONSHIPS = [
  { value: "child", label: "Child" },
  { value: "spouse", label: "Spouse" },
  { value: "ward", label: "Ward" },
  { value: "sibling", label: "Sibling" },
  { value: "parent", label: "Parent" },
  { value: "guardian", label: "Guardian" },
  { value: "self", label: "Self" },
  { value: "other", label: "Other" },
] as const

/** Always prefer API list; fall back to local cache on failure. */
export async function loadAccountProfiles(): Promise<LinkedStudentProfile[]> {
  const local = TokenManager.getProfiles()
  const token = TokenManager.getToken()
  if (!token) return local

  try {
    const res = await fetch(getBackendApiUrl("auth/profiles"), {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })
    if (!res.ok) return local
    const data = await res.json()
    if (!Array.isArray(data.profiles)) return local
    const list = data.profiles as LinkedStudentProfile[]
    TokenManager.setProfiles(list)
    return list
  } catch {
    return local
  }
}

export function isStudentAuthenticated(): boolean {
  if (!TokenManager.isAuthenticated()) return false
  const user = TokenManager.getUser() as { role?: string } | null
  return user?.role === "student"
}
