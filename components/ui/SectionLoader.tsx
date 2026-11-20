"use client"

import { cn } from "@/lib/utils"
import { SiteLoader } from "@/components/ui/SiteLoader"

interface SectionLoaderProps {
  className?: string
  label?: string
  minHeight?: number | string
}

/** Inline section loader — transparent site image only. */
export function SectionLoader({
  className,
  label = "Loading",
  minHeight = 240,
}: SectionLoaderProps) {
  return (
    <div
      className={cn(
        "flex w-full items-center justify-center bg-transparent px-6 py-10",
        className
      )}
      style={{ minHeight }}
      role="status"
      aria-busy="true"
      aria-label={label}
    >
      <SiteLoader mode="full" label={label} />
    </div>
  )
}
