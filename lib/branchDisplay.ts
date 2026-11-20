/**
 * Public branch display helpers.
 *
 * Partner-assigned → brand = partner org name, location = branch/area name.
 * Platform-owned → brand = academy place name, location under it.
 * When Super Admin enables "academy powered by", UI shows a small line under the name.
 */

import {
  formatAcademyPoweredBy,
  getAcademyPoweredByLine,
  getPortalPlatformShortName,
} from "@/lib/portalIdentity"

export const ROCK_BRAND_NAME = "Rock Martial Arts"

export type BranchDisplaySource = {
  id?: string
  name?: string | null
  code?: string | null
  slug?: string | null
  partner_org_id?: string | null
  partner_org_name?: string | null
  brand_name?: string | null
  logo_url?: string | null
  logoUrl?: string | null
  site_branding?: {
    org_name?: string | null
    logo_url?: string | null
  } | null
  branch?: {
    name?: string | null
    code?: string | null
    address?: {
      line1?: string | null
      area?: string | null
      city?: string | null
      state?: string | null
    } | null
  } | null
  address?: {
    line1?: string | null
    area?: string | null
    city?: string | null
    state?: string | null
  } | null
}

function trim(v: unknown): string {
  return v == null ? "" : String(v).trim()
}

/** Physical branch / academy place name (e.g. Kakatiya Nagar). */
export function getBranchPlaceName(b: BranchDisplaySource | null | undefined): string {
  if (!b) return "Academy"
  return (
    trim(b.branch?.name) ||
    trim(b.name) ||
    trim(b.branch?.code) ||
    trim(b.code) ||
    "Academy"
  )
}

/** Location line under the brand (prefer area, else city/state). */
export function getBranchLocationLine(b: BranchDisplaySource | null | undefined): string {
  if (!b) return ""
  const addr = b.branch?.address || b.address || null
  if (!addr) return ""
  const area = trim(addr.area)
  if (area) return area
  return [trim(addr.city), trim(addr.state)].filter(Boolean).join(", ")
}

/** Partner org name when assigned; otherwise platform short name. */
export function getBranchBrandName(b: BranchDisplaySource | null | undefined): string {
  const platform = getPortalPlatformShortName() || ROCK_BRAND_NAME
  if (!b) return platform
  const orgId = trim(b.partner_org_id)
  if (orgId) {
    return (
      trim(b.brand_name) ||
      trim(b.partner_org_name) ||
      trim(b.site_branding?.org_name) ||
      "Partner"
    )
  }
  return trim(b.brand_name) || platform
}

/** Academy / partner logo URL when present on the public payload. */
export function getBranchLogoUrl(b: BranchDisplaySource | null | undefined): string {
  if (!b) return ""
  return (
    trim(b.logo_url) ||
    trim(b.logoUrl) ||
    trim(b.site_branding?.logo_url) ||
    ""
  )
}

export type BranchDisplayLabels = {
  /** Primary academy/partner name — no "powered by" suffix */
  brandName: string
  /** Secondary location line */
  locationName: string
  /** Physical academy place name */
  placeName: string
  /** Combined identity for titles/tooltips (may include powered-by for a11y) */
  title: string
  /** Small UI line: "powered by {Platform}" or "" */
  poweredByLine: string
  /** Optional academy/partner logo */
  logoUrl: string
  isPartner: boolean
}

export function getBranchDisplayLabels(
  b: BranchDisplaySource | null | undefined
): BranchDisplayLabels {
  const brandNameRaw = getBranchBrandName(b)
  const placeName = getBranchPlaceName(b)
  const locationName = getBranchLocationLine(b) || placeName
  const isPartner = !!trim(b?.partner_org_id)
  const primaryName = isPartner ? brandNameRaw : placeName || brandNameRaw
  const identityBase = isPartner
    ? placeName && brandNameRaw.toLowerCase() !== placeName.toLowerCase()
      ? `${brandNameRaw} ${placeName}`
      : brandNameRaw
    : placeName || brandNameRaw
  const poweredByLine = getAcademyPoweredByLine()
  // Avoid "Rock … powered by Rock …" when names match
  const platform = getPortalPlatformShortName()
  const showPowered =
    Boolean(poweredByLine) &&
    primaryName.toLowerCase() !== String(platform || "").toLowerCase()

  return {
    brandName: primaryName,
    locationName,
    placeName,
    title: showPowered ? formatAcademyPoweredBy(identityBase) : identityBase,
    poweredByLine: showPowered ? poweredByLine : "",
    logoUrl: getBranchLogoUrl(b),
    isPartner,
  }
}
