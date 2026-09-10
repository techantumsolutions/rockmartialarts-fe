"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import type { PopupFormSettings } from "@/lib/popupForm"

interface SEOSettings {
  meta_title?: string
  meta_description?: string
  meta_keywords?: string
  og_image?: string
}

interface HomepageSection {
  hero_title?: string
  hero_subtitle?: string
  hero_description?: string
  hero_image?: string
  hero_video?: string
  about_title?: string
  about_subtitle?: string
  courses_title?: string
  courses_subtitle?: string
  testimonials_title?: string
  testimonials_subtitle?: string
  cta_title?: string
  cta_subtitle?: string
  registration_media_url?: string
  registration_media_type?: string
  popup_form?: PopupFormSettings
}

interface FooterContent {
  footer_text?: string
  copyright_text?: string
  address?: string
  phone?: string
  email?: string
  /** E.164 or local digits; shown as site-wide WhatsApp chat button when set */
  whatsapp_number?: string
  social_facebook?: string
  social_instagram?: string
  social_twitter?: string
  social_youtube?: string
}

interface BrandingSettings {
  navbar_logo?: string
  footer_logo?: string
  favicon?: string
  /** Public full-page loader image/GIF (max 140px wide on site) */
  site_loader_image?: string
}

export interface CMSData {
  homepage: HomepageSection
  footer: FooterContent
  branding: BrandingSettings
  page_seo: Record<string, SEOSettings>
}

interface CMSContextType {
  cms: CMSData | null
  loading: boolean
}

const CMSContext = createContext<CMSContextType>({ cms: null, loading: true })

export function useCMS() {
  return useContext(CMSContext)
}

export function CMSProvider({ children }: { children: ReactNode }) {
  const [cms, setCms] = useState<CMSData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    // Ensure public CMS is always fresh (avoid browser/CDN caches).
    fetch(`/api/backend/cms/public?t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then(async (data) => {
        if (cancelled || !data) return
        try {
          const popupRes = await fetch(`/api/cms/popup-form?t=${Date.now()}`, { cache: "no-store" })
          if (popupRes.ok) {
            const pj = await popupRes.json().catch(() => ({}))
            if (pj?.popup_form) {
              data.homepage = { ...(data.homepage || {}), popup_form: pj.popup_form }
            }
          }
        } catch {
          // keep CMS without popup_form (defaults apply)
        }
        if (cancelled) return
        setCms(data)

        // Dynamic favicon
        const favicon = resolvePublicAssetUrl(data.branding?.favicon)
        if (favicon) {
          let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null
          if (!link) {
            link = document.createElement("link")
            link.rel = "icon"
            document.head.appendChild(link)
          }
          link.href = favicon
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  return <CMSContext.Provider value={{ cms, loading }}>{children}</CMSContext.Provider>
}
