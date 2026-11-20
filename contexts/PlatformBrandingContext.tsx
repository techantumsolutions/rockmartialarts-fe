"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useCMS } from "@/contexts/CMSContext"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import {
  DEFAULT_PLATFORM_BRANDING,
  applyPlatformBrandCssVars,
  brandingFromCms,
  normalizePlatformBranding,
  type PlatformBranding,
} from "@/lib/platformBranding"
import { getBackendApiUrl } from "@/lib/config"
import {
  setPortalLoaderUrl,
  setPortalPlatformName,
  setPortalPlatformShortName,
  setPortalShowAcademyPoweredBy,
} from "@/lib/portalIdentity"

type PlatformBrandingContextValue = {
  branding: PlatformBranding
  loading: boolean
  platformName: string
  platformShortName: string
  logoUrl: string
  footerLogoUrl: string
  loaderUrl: string
  showAcademyPoweredBy: boolean
  refresh: () => Promise<void>
}

const PlatformBrandingContext = createContext<PlatformBrandingContextValue>({
  branding: DEFAULT_PLATFORM_BRANDING,
  loading: true,
  platformName: DEFAULT_PLATFORM_BRANDING.platform_name,
  platformShortName: DEFAULT_PLATFORM_BRANDING.platform_short_name,
  logoUrl: "/logo.png",
  footerLogoUrl: "/logo.png",
  loaderUrl: "",
  showAcademyPoweredBy: false,
  refresh: async () => {},
})

export function usePlatformBranding() {
  return useContext(PlatformBrandingContext)
}

export function PlatformBrandingProvider({ children }: { children: ReactNode }) {
  const { cms, loading: cmsLoading } = useCMS()
  const [branding, setBranding] = useState<PlatformBranding>(DEFAULT_PLATFORM_BRANDING)
  const [loading, setLoading] = useState(true)

  const apply = useCallback((next: PlatformBranding) => {
    setBranding(next)
    applyPlatformBrandCssVars(next)
    setPortalPlatformName(next.platform_name)
    setPortalPlatformShortName(next.platform_short_name)
    setPortalShowAcademyPoweredBy(Boolean(next.show_academy_powered_by))
    // Prefer Site loader image only (do not fall back to logo — that looked like a 2nd loader)
    const resolvedLoader = resolvePublicAssetUrl(next.site_loader_image || undefined) || ""
    setPortalLoaderUrl(resolvedLoader)
    if (typeof document !== "undefined") {
      const name = next.platform_name
      try {
        const metaDesc = document.querySelector('meta[name="description"]')
        if (metaDesc && /Rock Martial Arts/i.test(metaDesc.getAttribute("content") || "")) {
          metaDesc.setAttribute(
            "content",
            `${name} — training, academies, courses, and management portals.`
          )
        }
        // Soft-replace default titles that still contain the previous product name
        if (/Rock Martial Arts/i.test(document.title)) {
          document.title = document.title.replace(/Rock Martial Arts(?: Academy)?/gi, name)
        }
        const themeMeta = document.querySelector('meta[name="theme-color"]')
        if (themeMeta) {
          themeMeta.setAttribute("content", next.primary_color)
        }
      } catch {
        /* ignore */
      }
    }
  }, [])

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(
        getBackendApiUrl(`cms/public/platform-branding?t=${Date.now()}`),
        { cache: "no-store" }
      )
      if (res.ok) {
        const data = await res.json()
        apply(normalizePlatformBranding(data.branding || data))
        return
      }
    } catch {
      /* fall through */
    }
    if (cms?.branding) {
      apply(brandingFromCms(cms.branding as any))
    }
  }, [apply, cms?.branding])

  useEffect(() => {
    if (cms?.branding) {
      apply(brandingFromCms(cms.branding as any))
      setLoading(false)
    }
  }, [cms?.branding, apply])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(
          getBackendApiUrl(`cms/public/platform-branding?t=${Date.now()}`),
          { cache: "no-store" }
        )
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (!cancelled) apply(normalizePlatformBranding(data.branding || data))
      } catch {
        /* defaults already applied */
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [apply])

  const value = useMemo<PlatformBrandingContextValue>(() => {
    const logoUrl =
      resolvePublicAssetUrl(branding.navbar_logo || undefined) || "/logo.png"
    const footerLogoUrl =
      resolvePublicAssetUrl(branding.footer_logo || branding.navbar_logo || undefined) ||
      "/logo.png"
    const loaderUrl = resolvePublicAssetUrl(branding.site_loader_image || undefined) || ""
    return {
      branding,
      loading: loading || cmsLoading,
      platformName: branding.platform_name,
      platformShortName: branding.platform_short_name,
      logoUrl,
      footerLogoUrl,
      loaderUrl,
      showAcademyPoweredBy: Boolean(branding.show_academy_powered_by),
      refresh,
    }
  }, [branding, loading, cmsLoading, refresh])

  return (
    <PlatformBrandingContext.Provider value={value}>
      {children}
    </PlatformBrandingContext.Provider>
  )
}
