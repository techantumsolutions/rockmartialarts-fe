/** Client helpers for visitor→branch distance (API + geolocation). */

export type BranchDistanceResult = {
  branch_id: string
  distance_km: number | null
  distance_label: string | null
  source?: "routing" | "haversine" | "unavailable" | string
  nearest?: boolean
  error?: string
}

export type BranchDistancesResponse = {
  distance_type?: "driving" | "straight_line" | string
  unit?: string
  nearest_branch_id?: string | null
  results?: BranchDistanceResult[]
}

export type GeoPermissionState =
  | "idle"
  | "prompting"
  | "granted"
  | "denied"
  | "unsupported"
  | "unavailable"
  | "timeout"
  | "error"

export type VisitorCoords = { latitude: number; longitude: number }

const GEO_OPTS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 12000,
  maximumAge: 120000,
}

export function isGeolocationSupported(): boolean {
  return typeof window !== "undefined" && typeof navigator !== "undefined" && "geolocation" in navigator
}

export function getCurrentPosition(): Promise<VisitorCoords> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject(new Error("unsupported"))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        })
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) reject(new Error("denied"))
        else if (err.code === err.TIMEOUT) reject(new Error("timeout"))
        else reject(new Error("unavailable"))
      },
      GEO_OPTS
    )
  })
}

export async function fetchBranchDistances(
  coords: VisitorCoords,
  branchIds: string[]
): Promise<BranchDistancesResponse> {
  const res = await fetch("/api/backend/branches/public/distances", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      latitude: coords.latitude,
      longitude: coords.longitude,
      branch_ids: branchIds.filter(Boolean),
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(text || `Distance API failed (${res.status})`)
  }
  return (await res.json()) as BranchDistancesResponse
}

export function distanceMapFromResponse(
  data: BranchDistancesResponse | null | undefined
): Record<string, BranchDistanceResult> {
  const out: Record<string, BranchDistanceResult> = {}
  for (const row of data?.results || []) {
    if (row?.branch_id) out[row.branch_id] = row
  }
  return out
}
