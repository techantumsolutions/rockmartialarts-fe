"use client"

import { cn } from "@/lib/utils"

interface MartialArtsRouteLoaderProps {
  title?: string
  description?: string
  /** full = dark marketing-style; light = dashboard gray */
  variant?: "light" | "dark" | "compact"
  className?: string
}

/**
 * Shared martial-arts themed route / Suspense loader.
 * Gold dual-ring spinner + subtle kick pulse — fast, no artificial delay.
 */
export default function MartialArtsRouteLoader({
  title = "Loading…",
  description = "Preparing your training space",
  variant = "light",
  className,
}: MartialArtsRouteLoaderProps) {
  const dark = variant === "dark"
  const compact = variant === "compact"

  return (
    <div
      className={cn(
        "flex items-center justify-center",
        compact ? "min-h-[40vh] py-12" : "min-h-screen",
        dark ? "bg-[#0b0d14] text-white" : "bg-gray-50 text-gray-900",
        "page-enter",
        className
      )}
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={title}
    >
      <div className="text-center space-y-5 px-6">
        <div className="relative mx-auto w-20 h-20">
          <div
            className={cn(
              "absolute inset-0 rounded-full border-[3px] animate-spin",
              dark ? "border-yellow-500/20 border-t-[#E1BB33]" : "border-yellow-200 border-t-yellow-500"
            )}
          />
          <div
            className={cn(
              "absolute inset-2 rounded-full border-[3px] animate-spin",
              dark ? "border-transparent border-b-[#E1BB33]/60" : "border-transparent border-b-yellow-400/70"
            )}
            style={{ animationDirection: "reverse", animationDuration: "1.1s" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className={cn(
                "text-2xl select-none martial-loader-kick",
                dark ? "text-[#E1BB33]" : "text-yellow-600"
              )}
              aria-hidden
            >
              🥋
            </span>
          </div>
        </div>
        <div className="space-y-1.5">
          <h3 className={cn("text-base font-semibold tracking-wide", dark ? "text-white" : "text-gray-900")}>
            {title}
          </h3>
          {description ? (
            <p className={cn("text-sm", dark ? "text-white/60" : "text-gray-500")}>{description}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export { MartialArtsRouteLoader }
