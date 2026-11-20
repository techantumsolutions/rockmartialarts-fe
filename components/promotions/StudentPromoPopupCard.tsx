"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowRight, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import { cn } from "@/lib/utils"

export type StudentPromoPopupCardProps = {
  title?: string
  short_description?: string
  description?: string
  banner_url?: string
  banner_media_type?: string
  cta_type?: string
  cta_label?: string
  cta_url?: string
  /** When true, buttons are non-interactive (admin preview) */
  preview?: boolean
  onCta?: () => void
  onMaybeLater?: () => void
  className?: string
}

/** Footer (title + CTAs) reserved height when fitting image into 80vw / 80vh. */
const FOOTER_RESERVE_PX = 168
const VIEWPORT_WIDTH_RATIO = 0.8
const VIEWPORT_HEIGHT_RATIO = 0.8

type NaturalSize = { width: number; height: number }

function fitBannerSize(
  natural: NaturalSize | null,
  viewportW: number,
  viewportH: number
): { width: number; height: number } {
  const maxW = Math.max(280, Math.floor(viewportW * VIEWPORT_WIDTH_RATIO))
  const maxH = Math.max(
    200,
    Math.floor(viewportH * VIEWPORT_HEIGHT_RATIO) - FOOTER_RESERVE_PX
  )

  if (!natural?.width || !natural?.height) {
    // Fallback landscape frame until media metadata loads
    const width = Math.min(maxW, Math.round(maxH * (16 / 9)))
    const height = Math.min(maxH, Math.round(width * (9 / 16)))
    return { width, height }
  }

  const scale = Math.min(maxW / natural.width, maxH / natural.height)
  return {
    width: Math.max(1, Math.round(natural.width * scale)),
    height: Math.max(1, Math.round(natural.height * scale)),
  }
}

/**
 * Student promotion popup card — full banner visible (no crop),
 * modal scales up to 80vw / 80vh based on image aspect ratio.
 */
export function StudentPromoPopupCard({
  title,
  short_description,
  description,
  banner_url,
  banner_media_type,
  cta_type,
  cta_label,
  cta_url,
  preview,
  onCta,
  onMaybeLater,
  className,
}: StudentPromoPopupCardProps) {
  const bannerSrc = resolvePublicAssetUrl(banner_url)
  const hasCta =
    (cta_type === "url" || cta_type === "path") && !!(cta_url || "").trim()
  const desc = short_description || description
  const primaryLabel = (cta_label || "").trim() || "View Now"
  const showExternal = cta_type === "url"

  const [natural, setNatural] = useState<NaturalSize | null>(null)
  const [viewport, setViewport] = useState({ width: 1200, height: 800 })

  useEffect(() => {
    const sync = () => {
      setViewport({
        width: window.innerWidth || 1200,
        height: window.innerHeight || 800,
      })
    }
    sync()
    window.addEventListener("resize", sync)
    return () => window.removeEventListener("resize", sync)
  }, [])

  useEffect(() => {
    setNatural(null)
  }, [bannerSrc, banner_media_type])

  const bannerBox = useMemo(
    () => fitBannerSize(natural, viewport.width, viewport.height),
    [natural, viewport.width, viewport.height]
  )

  const onImageLoad = useCallback((el: HTMLImageElement | null) => {
    if (!el?.naturalWidth || !el?.naturalHeight) return
    setNatural({ width: el.naturalWidth, height: el.naturalHeight })
  }, [])

  const onVideoMeta = useCallback((el: HTMLVideoElement | null) => {
    if (!el?.videoWidth || !el?.videoHeight) return
    setNatural({ width: el.videoWidth, height: el.videoHeight })
  }, [])

  return (
    <div
      className={cn(
        "flex w-full flex-col overflow-hidden bg-white",
        className
      )}
      style={{ width: bannerBox.width }}
    >
      {/* Full image — object-contain, sized to fit 80vw / 80vh */}
      {bannerSrc ? (
        <div
          className="relative shrink-0 overflow-hidden bg-[#0f172a]"
          style={{ width: bannerBox.width, height: bannerBox.height }}
        >
          {banner_media_type === "video" ? (
            <video
              src={bannerSrc}
              className="h-full w-full object-contain"
              controls={!preview}
              playsInline
              muted={preview}
              onLoadedMetadata={(e) => onVideoMeta(e.currentTarget)}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bannerSrc}
              alt=""
              className="h-full w-full object-contain"
              onLoad={(e) => onImageLoad(e.currentTarget)}
            />
          )}
        </div>
      ) : (
        <div
          className="flex shrink-0 items-center justify-center bg-gradient-to-br from-[#1e293b] to-[#0f172a] text-sm text-white/60"
          style={{ width: bannerBox.width, height: Math.min(bannerBox.height, 220) }}
        >
          No banner
        </div>
      )}

      {/* Centered copy + CTAs */}
      <div className="relative shrink-0 overflow-hidden px-5 pb-5 pt-4 text-center sm:px-8 sm:pb-6 sm:pt-5">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-[radial-gradient(ellipse_at_bottom,_rgba(225,187,51,0.18)_0%,_transparent_70%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-6 left-1/2 h-20 w-[120%] -translate-x-1/2 rounded-[100%] bg-[#E1BB33]/10"
        />

        <h2 className="relative line-clamp-2 text-lg font-bold leading-snug tracking-tight text-[#171A26] sm:text-xl">
          {title || "Untitled"}
        </h2>
        {desc ? (
          <p className="relative mx-auto mt-1.5 max-w-xl line-clamp-3 text-sm leading-relaxed text-[#6B7280] sm:mt-2">
            {desc}
          </p>
        ) : null}

        <div className="relative mt-4 flex flex-wrap items-center justify-center gap-3 sm:mt-5">
          {hasCta ? (
            <Button
              type="button"
              disabled={preview}
              onClick={preview ? undefined : onCta}
              className="h-11 min-w-[9.5rem] gap-2 rounded-xl bg-[#E1BB33] px-6 text-sm font-semibold text-[#171A26] hover:bg-[#d4ae2a] disabled:opacity-90 sm:h-12 sm:min-w-[11rem] sm:text-base"
            >
              {primaryLabel}
              {showExternal ? (
                <ExternalLink className="h-4 w-4" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={preview}
            onClick={preview ? undefined : onMaybeLater}
            className="h-11 min-w-[9.5rem] rounded-xl border-[#D1D5DB] bg-white px-6 text-sm font-medium text-[#374151] hover:bg-gray-50 disabled:opacity-90 sm:h-12 sm:min-w-[11rem] sm:text-base"
          >
            Maybe Later
          </Button>
        </div>
      </div>
    </div>
  )
}
