"use client"

import { useMemo } from "react"
import Autoplay from "embla-carousel-autoplay"

/** Shared Embla Autoplay plugin — used by all public site carousels. */
export function useEmblaAutoplay(options?: {
  delay?: number
  stopOnInteraction?: boolean
  stopOnMouseEnter?: boolean
}) {
  const delay = options?.delay ?? 4200
  const stopOnInteraction = options?.stopOnInteraction ?? false
  const stopOnMouseEnter = options?.stopOnMouseEnter ?? true

  return useMemo(
    () =>
      Autoplay({
        delay,
        stopOnInteraction,
        stopOnMouseEnter,
      }),
    [delay, stopOnInteraction, stopOnMouseEnter]
  )
}
