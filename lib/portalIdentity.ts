/**
 * Role / shell identity for browser titles and UI badges.
 * Website default name comes from Super Admin Platform Branding when available.
 */

import { DEFAULT_PLATFORM_BRANDING } from "@/lib/platformBranding"

export type PortalShell =
  | "website"
  | "super_admin"
  | "branch_admin"
  | "partner_super_admin"
  | "student"
  | "coach"
  | "training"
  | "unknown"

let cachedPlatformName = DEFAULT_PLATFORM_BRANDING.platform_name
let cachedPlatformShortName = DEFAULT_PLATFORM_BRANDING.platform_short_name
let cachedShowAcademyPoweredBy = false
let cachedLoaderUrl = ""

/** Called by PlatformBrandingProvider so SSR-free title helpers stay current. */
export function setPortalPlatformName(name: string) {
  const next = String(name || "").trim()
  if (next) cachedPlatformName = next
}

export function setPortalPlatformShortName(name: string) {
  const next = String(name || "").trim()
  if (next) cachedPlatformShortName = next
}

export function setPortalShowAcademyPoweredBy(enabled: boolean) {
  cachedShowAcademyPoweredBy = Boolean(enabled)
}

export function setPortalLoaderUrl(url: string) {
  cachedLoaderUrl = String(url || "").trim()
}

export function getPortalPlatformName(): string {
  return cachedPlatformName || DEFAULT_PLATFORM_BRANDING.platform_name
}

export function getPortalPlatformShortName(): string {
  return (
    cachedPlatformShortName ||
    cachedPlatformName ||
    DEFAULT_PLATFORM_BRANDING.platform_short_name
  )
}

export function getPortalShowAcademyPoweredBy(): boolean {
  return cachedShowAcademyPoweredBy
}

export function getPortalLoaderUrl(): string {
  return cachedLoaderUrl
}

/** Small secondary line: "powered by {Platform}" (empty when toggle is off). */
export function getAcademyPoweredByLine(platformName?: string | null): string {
  if (!cachedShowAcademyPoweredBy) return ""
  const platform = String(
    platformName || cachedPlatformShortName || cachedPlatformName || ""
  ).trim()
  if (!platform) return ""
  return `powered by ${platform}`
}

/**
 * "{Academy} powered by {Platform}" when Super Admin enables the global toggle.
 * Skips when disabled, blank, already tagged, or names match.
 * Prefer split UI (academy name + getAcademyPoweredByLine) in nav/menus.
 */
export function formatAcademyPoweredBy(
  academyName: string | null | undefined,
  platformName?: string | null
): string {
  const academy = String(academyName || "").trim()
  if (!academy) return ""
  const line = getAcademyPoweredByLine(platformName)
  if (!line) return academy
  if (/powered by/i.test(academy)) return academy
  const platform = line.replace(/^powered by\s+/i, "").trim()
  if (platform && academy.toLowerCase() === platform.toLowerCase()) return academy
  return `${academy} ${line}`
}

export function portalLabel(shell: PortalShell): string {
  switch (shell) {
    case "super_admin":
      return "Super Admin Portal"
    case "branch_admin":
      return "Academy Admin Portal"
    case "partner_super_admin":
      return "Partner Admin Portal"
    case "student":
      return "Student Portal"
    case "coach":
      return "Coach Portal"
    case "training":
      return "Training Portal"
    case "website":
      return getPortalPlatformName()
    default:
      return getPortalPlatformName()
  }
}

export function portalShortLabel(shell: PortalShell): string {
  switch (shell) {
    case "super_admin":
      return "Super Admin"
    case "branch_admin":
      return "Academy Admin"
    case "partner_super_admin":
      return "Partner Admin"
    case "student":
      return "Student"
    case "coach":
      return "Coach"
    case "training":
      return "Training"
    case "website":
      return "Website"
    default:
      return "Portal"
  }
}

/** Map URL adminType segment → portal shell. */
export function portalShellFromAdminType(adminType: string | undefined | null): PortalShell {
  const t = String(adminType || "")
    .toLowerCase()
    .replace(/_/g, "-")
  if (t === "super-admin") return "super_admin"
  if (t === "branch-admin") return "branch_admin"
  if (t === "partner-admin") return "partner_super_admin"
  return "unknown"
}

export function portalMetadata(shell: PortalShell) {
  const label = portalLabel(shell)
  // Website pages often set their own full titles; avoid stacking templates.
  if (shell === "website") {
    return {
      title: {
        default: label,
        template: `%s | ${label}`,
      },
      description: `${label} — training, academies, courses, and events.`,
    }
  }
  return {
    // `absolute` prevents root template from wrapping role titles.
    title: {
      absolute: label,
      default: label,
      template: `%s | ${label}`,
    },
    description: `${label} for ${getPortalPlatformName()}.`,
  }
}
