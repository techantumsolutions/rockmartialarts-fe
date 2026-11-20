"use client"

import { useEffect } from "react"
import { usePlatformBranding } from "@/contexts/PlatformBrandingContext"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"

function guessType(href: string): string | undefined {
  const path = href.split("?")[0].toLowerCase()
  if (path.endsWith(".svg")) return "image/svg+xml"
  if (path.endsWith(".png")) return "image/png"
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg"
  if (path.endsWith(".webp")) return "image/webp"
  if (path.endsWith(".ico")) return "image/x-icon"
  return undefined
}

function applyFavicon(href: string, type?: string) {
  // Remove Next/default favicon links so only Platform Branding wins
  document.head
    .querySelectorAll<HTMLLinkElement>(
      'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
    )
    .forEach((el) => el.remove())

  const rels = ["icon", "shortcut icon", "apple-touch-icon"] as const
  for (const rel of rels) {
    const link = document.createElement("link")
    link.rel = rel
    link.href = href
    if (type) link.type = type
    link.setAttribute("data-platform-favicon", "1")
    document.head.appendChild(link)
  }
}

/**
 * Applies Super Admin Platform Branding favicon (falls back to navbar logo).
 */
export function PlatformFavicon() {
  const { branding, logoUrl } = usePlatformBranding()

  useEffect(() => {
    const raw = branding.favicon || branding.navbar_logo || ""
    const resolved =
      resolvePublicAssetUrl(raw || undefined) ||
      (logoUrl && logoUrl !== "/logo.png" ? logoUrl : "") ||
      "/favicon.svg"
    if (typeof document === "undefined") return

    const bust = encodeURIComponent(String(raw || resolved || "1").slice(-24))
    const href = `${resolved}${resolved.includes("?") ? "&" : "?"}v=${bust}`
    applyFavicon(href, guessType(resolved))
  }, [branding.favicon, branding.navbar_logo, logoUrl])

  return null
}
