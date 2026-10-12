import { getBackendApiUrl } from "@/lib/config"

/** Fetch all coaches with pagination (includes inactive by default). */
export async function fetchAllCoaches(
  token: string,
  options?: { activeOnly?: boolean; branchId?: string }
): Promise<any[]> {
  const activeOnly = options?.activeOnly ?? false
  const branchId = (options?.branchId || "").trim()
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }

  const all: any[] = []
  for (let skip = 0; skip < 1000; skip += 100) {
    const branchQuery = branchId
      ? `&branch_id=${encodeURIComponent(branchId)}`
      : ""
    const res = await fetch(
      getBackendApiUrl(
        `coaches?active_only=${activeOnly}&limit=100&skip=${skip}${branchQuery}`
      ),
      { headers }
    )
    if (!res.ok) break
    const data = await res.json()
    const batch = data.coaches || []
    all.push(...batch)
    if (batch.length < 100) break
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
