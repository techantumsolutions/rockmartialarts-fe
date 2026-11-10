"use client"

import { useEffect, useState } from "react"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import { cn } from "@/lib/utils"

/** Neutral brand placeholder — never shows a broken image icon */
export const DEFAULT_IMAGE_PLACEHOLDER = "/placeholder.jpg"

export type SafeImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  /** Shown when src is missing or fails to load */
  fallbackSrc?: string
  /** Run stored upload paths through resolvePublicAssetUrl (default true) */
  resolveUrl?: boolean
  /** Show shimmer while the image loads (default true) */
  showLoader?: boolean
  /** Wrapper class for loader box */
  wrapperClassName?: string
}

/**
 * Image with load shimmer + placeholder fallback (no broken icons).
 */
export function SafeImage({
  src,
  fallbackSrc = DEFAULT_IMAGE_PLACEHOLDER,
  resolveUrl = true,
  showLoader = true,
  wrapperClassName,
  onError,
  onLoad,
  className,
  alt = "",
  ...props
}: SafeImageProps) {
  const raw = src == null || src === "" ? "" : String(src).trim()
  const resolved = raw ? (resolveUrl ? resolvePublicAssetUrl(raw) : raw) : ""
  const initial = resolved || fallbackSrc

  const [displaySrc, setDisplaySrc] = useState(initial)
  const [useFallback, setUseFallback] = useState(!resolved)
  const [loading, setLoading] = useState(Boolean(resolved))

  useEffect(() => {
    const next = resolved || fallbackSrc
    setDisplaySrc(next)
    setUseFallback(!resolved)
    setLoading(Boolean(resolved))
  }, [resolved, fallbackSrc, raw])

  const img = (
    <img
      {...props}
      src={displaySrc}
      alt={alt}
      data-placeholder={fallbackSrc}
      className={cn(
        className,
        useFallback && "object-contain bg-neutral-100",
        showLoader && loading && "opacity-0",
        showLoader && !loading && "opacity-100 transition-opacity duration-300"
      )}
      onLoad={(e) => {
        setLoading(false)
        onLoad?.(e)
      }}
      onError={(e) => {
        if (!useFallback && fallbackSrc) {
          setUseFallback(true)
          setDisplaySrc(fallbackSrc)
          setLoading(false)
        }
        onError?.(e)
      }}
    />
  )

  if (!showLoader) return img

  const fill =
    /\bw-full\b/.test(className || "") ||
    /\bh-full\b/.test(className || "") ||
    /\binset-0\b/.test(className || "")

  return (
    <span
      className={cn(
        "relative overflow-hidden",
        fill ? "block h-full w-full" : "inline-block",
        wrapperClassName
      )}
    >
      {loading ? (
        <span
          className="pointer-events-none absolute inset-0 z-[1] img-shimmer"
          aria-hidden
        />
      ) : null}
      {img}
    </span>
  )
}
