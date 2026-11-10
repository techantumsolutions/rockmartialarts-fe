"use client"

import { useEffect } from "react"
import { DEFAULT_IMAGE_PLACEHOLDER } from "@/components/ui/safe-image"

/**
 * Catch-all for raw <img> tags (website + admin) that aren't SafeImage:
 * on load error, swap to the brand placeholder so nothing shows broken.
 */
export function GlobalImageFallback() {
  useEffect(() => {
    const onError = (event: Event) => {
      const el = event.target
      if (!(el instanceof HTMLImageElement)) return
      if (el.dataset.fallbackApplied === "1") return
      const preferred =
        el.getAttribute("data-placeholder") ||
        el.dataset.placeholder ||
        DEFAULT_IMAGE_PLACEHOLDER
      const current = el.currentSrc || el.src || ""
      if (
        current.includes("placeholder") ||
        current.endsWith(preferred) ||
        current.includes("/placeholder")
      ) {
        return
      }
      el.dataset.fallbackApplied = "1"
      el.src = preferred
      el.classList.add("img-fallback-applied")
    }

    document.addEventListener("error", onError, true)
    return () => document.removeEventListener("error", onError, true)
  }, [])

  return null
}
