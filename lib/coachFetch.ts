import { getBackendApiUrl } from "@/lib/config"

export type CoachRegistrationSource = "admin" | "self"

export function isOnlineEnrolledCoach(coach: { registration_source?: string | null }): boolean {
  return String(coach?.registration_source || "").toLowerCase() === "self"
}

export function isInHouseCoach(coach: { registration_source?: string | null }): boolean {
  return !isOnlineEnrolledCoach(coach)
}

/** Fetch all coaches with pagination (includes inactive by default). */
export async function fetchAllCoaches(
  token: string,
  options?: {
    activeOnly?: boolean
    branchId?: string
    /** admin = in-house coaches; self = online enrolled coaches */
    registrationSource?: CoachRegistrationSource
  }
): Promise<any[]> {
  const activeOnly = options?.activeOnly ?? false
  const branchId = (options?.branchId || "").trim()
  const registrationSource = options?.registrationSource
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }

  const all: any[] = []
  for (let skip = 0; skip < 1000; skip += 100) {
    const params = new URLSearchParams({
      active_only: String(activeOnly),
      limit: "100",
      skip: String(skip),
    })
    if (branchId) params.set("branch_id", branchId)
    if (registrationSource) params.set("registration_source", registrationSource)

    const res = await fetch(getBackendApiUrl(`coaches?${params.toString()}`), { headers })
    if (!res.ok) break
    const data = await res.json()
    const batch = data.coaches || []
    all.push(...batch)
    if (batch.length < 100) break
  }

  // Client-side safety net if an older API ignores registration_source
  if (registrationSource === "self") {
    return all.filter(isOnlineEnrolledCoach)
  }
  if (registrationSource === "admin") {
    return all.filter(isInHouseCoach)
  }
  return all
}

/** Fetch all branch managers with pagination (includes inactive by default). */
export async function fetchAllBranchManagers(
  token: string,
  options?: { activeOnly?: boolean }
): Promise<any[]> {
  const activeOnly = options?.activeOnly ?? false
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }

  const all: any[] = []
  for (let skip = 0; skip < 1000; skip += 100) {
    const res = await fetch(
      getBackendApiUrl(`branch-managers?active_only=${activeOnly}&limit=100&skip=${skip}`),
      { headers }
    )
    if (!res.ok) break
    const data = await res.json()
    const batch = data.branch_managers || []
    all.push(...batch)
    if (batch.length < 100) break
  }
  return all
}

export function branchManagerDisplayInfo(bm: any): { full_name: string; phone: string } {
  const phone = bm?.contact_info?.phone ?? bm?.phone ?? ""
  const fn = (bm?.full_name as string) || ""
  return {
    full_name: fn,
    phone: typeof phone === "string" ? phone : String(phone || ""),
  }
}

export function coachDisplayInfo(coach: any): { full_name: string; phone: string } {
  const phone = coach?.contact_info?.phone ?? coach?.phone ?? ""
  const fn =
    coach?.full_name ||
    `${coach?.personal_info?.first_name || ""} ${coach?.personal_info?.last_name || ""}`.trim()
  return {
    full_name: typeof fn === "string" ? fn : "",
    phone: typeof phone === "string" ? phone : String(phone || ""),
  }
}
