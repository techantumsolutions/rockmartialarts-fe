"use client"

import { SiteLoader } from "@/components/ui/SiteLoader"

type Props = {
  mode?: "full" | "short"
  label?: string
  className?: string
}

/** Legacy alias → transparent site loader image only. */
export function MartialArtsFightLoader({ mode = "full", label, className }: Props) {
  return <SiteLoader mode={mode} label={label || "Loading"} className={className} />
}
