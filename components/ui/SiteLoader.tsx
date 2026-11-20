"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { usePlatformBranding } from "@/contexts/PlatformBrandingContext"
import { getPortalLoaderUrl } from "@/lib/portalIdentity"

type SiteLoaderProps = {
  /** full = large; short = compact */
  mode?: "full" | "short"
  className?: string
  /** When true, fill the viewport (route loading screens) — transparent */
  fillScreen?: boolean
  /** Optional accessible label (not rendered visually) */
  label?: string
}

/**
 * The only app loader: Super Admin Platform Branding → Site loader image.
 * Page stays clear; loader sits on a circular transparent-black disc.
 */
export function SiteLoader({
  mode = "full",
  className,
  fillScreen = false,
  label = "Loading",
}: SiteLoaderProps) {
  const { loaderUrl, branding } = usePlatformBranding()
  const [src, setSrc] = useState(() => getPortalLoaderUrl() || "")
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const next = getPortalLoaderUrl() || loaderUrl || ""
    setSrc(next)
    setFailed(false)
  }, [loaderUrl, branding.site_loader_image])

  const short = mode === "short"
  const showImg = Boolean(src) && !failed

  return (
    <div
      className={cn(
        "flex items-center justify-center bg-transparent",
        fillScreen && "fixed inset-0 z-[99980] min-h-screen w-full bg-transparent",
        className
      )}
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={label}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-black/55 shadow-[0_8px_32px_rgba(0,0,0,0.35)] ring-1 ring-white/10 backdrop-blur-[2px]",
          short ? "h-24 w-24 p-3 sm:h-28 sm:w-28" : "h-36 w-36 p-4 sm:h-44 sm:w-44 sm:p-5"
        )}
      >
        {showImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            className={cn(
              "bg-transparent object-contain",
              short ? "h-14 w-14 sm:h-16 sm:w-16" : "h-24 w-24 sm:h-28 sm:w-28"
            )}
            onError={() => setFailed(true)}
          />
        ) : (
          <div
            className={cn(
              "animate-spin rounded-full border-2 border-transparent border-t-[var(--brand-primary,#E1BB33)] bg-transparent",
              short ? "h-10 w-10" : "h-14 w-14"
            )}
            aria-hidden
          />
        )}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  )
}

/** Full-page route / Suspense loader — transparent site image only. */
export default function SiteRouteLoader({
  className,
}: {
  title?: string
  description?: string
  variant?: "light" | "dark" | "compact"
  className?: string
}) {
  return (
    <SiteLoader
      mode="full"
      fillScreen
      className={cn("bg-transparent", className)}
      label="Loading"
    />
  )
}
