"use client"

import SiteRouteLoader from "@/components/ui/SiteLoader"

interface MartialArtsRouteLoaderProps {
  title?: string
  description?: string
  variant?: "light" | "dark" | "compact"
  className?: string
}

/** Legacy alias → transparent site loader image only (no page background). */
export default function MartialArtsRouteLoader({
  className,
}: MartialArtsRouteLoaderProps) {
  return <SiteRouteLoader className={className} />
}

export { MartialArtsRouteLoader }
