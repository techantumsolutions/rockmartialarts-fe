"use client"

import { cn } from "@/lib/utils"

interface SectionLoaderProps {
  className?: string
  label?: string
  minHeight?: number | string
}

/** Inline section skeleton used while LazySection / async blocks mount. */
export function SectionLoader({
  className,
  label = "Loading section…",
  minHeight = 240,
}: SectionLoaderProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center gap-4 rounded-xl bg-black/20 px-6 py-10",
        className
      )}
      style={{ minHeight }}
      role="status"
      aria-busy="true"
      aria-label={label}
    >
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full border-2 border-[#E1BB33]/25 border-t-[#E1BB33] animate-spin" />
        <span className="absolute inset-0 flex items-center justify-center text-lg martial-loader-kick" aria-hidden>
          🥋
        </span>
      </div>
      <p className="text-sm text-white/60">{label}</p>
      <div className="w-full max-w-md space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-white/10" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-white/10" />
        <div className="h-3 w-4/6 animate-pulse rounded bg-white/10" />
      </div>
    </div>
  )
}
