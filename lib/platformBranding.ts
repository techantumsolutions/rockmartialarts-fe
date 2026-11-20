/** Platform branding (Super Admin) — name, logos, colors for entire product. */

export type PlatformBranding = {
  platform_name: string
  platform_short_name: string
  legal_name: string
  navbar_logo?: string | null
  footer_logo?: string | null
  favicon?: string | null
  site_loader_image?: string | null
  /** When true, academy labels render as "{Academy} powered by {Platform}". */
  show_academy_powered_by: boolean
  primary_color: string
  secondary_color: string
  accent_color: string
  dark_color: string
  support_email?: string | null
  support_phone?: string | null
  website_url?: string | null
}

export const DEFAULT_PLATFORM_BRANDING: PlatformBranding = {
  platform_name: "Rock Martial Arts Academy",
  platform_short_name: "Rock Martial Arts",
  legal_name: "Rock Martial Arts Academy",
  navbar_logo: null,
  footer_logo: null,
  favicon: null,
  site_loader_image: null,
  show_academy_powered_by: false,
  primary_color: "#E1BB33",
  secondary_color: "#4F5077",
  accent_color: "#FFB70F",
  dark_color: "#171A26",
  support_email: null,
  support_phone: null,
  website_url: "https://rockmartialartsacademy.com",
}

export function normalizePlatformBranding(raw?: Partial<PlatformBranding> | null): PlatformBranding {
  const src = raw || {}
  const hex = (v: unknown, fallback: string) => {
    const s = String(v || "").trim()
    if (!s) return fallback
    const withHash = s.startsWith("#") ? s : `#${s}`
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(withHash) ? withHash.toUpperCase() : fallback
  }
  const name =
    String(src.platform_name || "").trim() || DEFAULT_PLATFORM_BRANDING.platform_name
  const short =
    String(src.platform_short_name || "").trim() || name || DEFAULT_PLATFORM_BRANDING.platform_short_name
  const poweredRaw = (src as { show_academy_powered_by?: unknown }).show_academy_powered_by
  const showPoweredBy =
    typeof poweredRaw === "boolean"
      ? poweredRaw
      : String(poweredRaw || "").toLowerCase() === "true" ||
        String(poweredRaw || "") === "1"

  return {
    platform_name: name,
    platform_short_name: short,
    legal_name: String(src.legal_name || "").trim() || name,
    navbar_logo: src.navbar_logo || null,
    footer_logo: src.footer_logo || null,
    favicon: src.favicon || null,
    site_loader_image: src.site_loader_image || null,
    show_academy_powered_by:
      poweredRaw === undefined || poweredRaw === null
        ? DEFAULT_PLATFORM_BRANDING.show_academy_powered_by
        : showPoweredBy,
    primary_color: hex(src.primary_color, DEFAULT_PLATFORM_BRANDING.primary_color),
    secondary_color: hex(src.secondary_color, DEFAULT_PLATFORM_BRANDING.secondary_color),
    accent_color: hex(src.accent_color, DEFAULT_PLATFORM_BRANDING.accent_color),
    dark_color: hex(src.dark_color, DEFAULT_PLATFORM_BRANDING.dark_color),
    support_email: src.support_email || null,
    support_phone: src.support_phone || null,
    website_url: src.website_url || DEFAULT_PLATFORM_BRANDING.website_url,
  }
}

/** Darken a #RRGGBB color slightly for hover states. */
function darkenHex(hex: string, amount = 0.08): string {
  const raw = hex.replace("#", "")
  if (raw.length !== 6) return hex
  const n = parseInt(raw, 16)
  if (Number.isNaN(n)) return hex
  const r = Math.max(0, Math.round(((n >> 16) & 255) * (1 - amount)))
  const g = Math.max(0, Math.round(((n >> 8) & 255) * (1 - amount)))
  const b = Math.max(0, Math.round((n & 255) * (1 - amount)))
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase()}`
}

/** Apply platform colors as CSS variables on :root (covers website + all portals). */
export function applyPlatformBrandCssVars(branding: PlatformBranding) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  const primary = branding.primary_color
  const secondary = branding.secondary_color
  const accent = branding.accent_color
  const dark = branding.dark_color
  const primaryHover = darkenHex(primary)

  root.style.setProperty("--brand-primary", primary)
  root.style.setProperty("--brand-gold", primary)
  root.style.setProperty("--brand-gold-hover", primaryHover)
  root.style.setProperty("--brand-secondary", secondary)
  root.style.setProperty("--brand-dark", secondary)
  root.style.setProperty("--brand-accent", accent)
  root.style.setProperty("--brand-title", dark)
  root.style.setProperty("--brand-navy", dark)
  root.style.setProperty("--brand-canvas-dark", dark)

  // shadcn + admin shell tokens
  root.style.setProperty("--primary", primary)
  root.style.setProperty("--admin-primary", primary)
  root.style.setProperty("--admin-primary-hover", primaryHover)
  root.style.setProperty("--admin-title", secondary)
  root.style.setProperty("--admin-title-alt", secondary)
  root.style.setProperty("--admin-focus", `${primary}59`)
}

export function brandingFromCms(cmsBranding?: Record<string, any> | null): PlatformBranding {
  return normalizePlatformBranding(cmsBranding as Partial<PlatformBranding>)
}
