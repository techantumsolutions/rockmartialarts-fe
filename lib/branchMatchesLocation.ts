/** Match a branch to a city UUID or legacy city-name location_id. */

export function branchMatchesLocation(
  branch: {
    location_id?: string
    name?: string
    address?: { city?: string; state?: string }
  },
  city?: { id?: string; name?: string } | null,
  locationRef?: string
): boolean {
  const ref = (locationRef || "").trim().toLowerCase()
  const locId = (branch.location_id || "").trim().toLowerCase()
  const cityId = (city?.id || "").trim().toLowerCase()
  const cityName = (city?.name || "").trim().toLowerCase()
  const addrCity = (branch.address?.city || "").trim().toLowerCase()

  if (cityId && (locId === cityId || locId === cityName)) return true
  if (cityName && (addrCity === cityName || locId === cityName)) return true
  if (ref && (locId === ref || addrCity === ref)) return true
  return false
}
