/** True for a specific partner org site and its subpages (not the /partner-orgs directory). */
export function isPartnerOrgSitePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  const p = pathname.split("?")[0] || ""
  // /partner-orgs/{slug}... but not exactly /partner-orgs
  return /^\/partner-orgs\/[^/]+/.test(p)
}

export function partnerOrgSlugFromPath(pathname: string | null | undefined): string | null {
  if (!pathname) return null
  const m = pathname.match(/^\/partner-orgs\/([^/]+)/)
  return m?.[1] ? decodeURIComponent(m[1]) : null
}
