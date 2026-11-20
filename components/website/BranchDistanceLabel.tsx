"use client"

import { Loader2, Navigation } from "lucide-react"
import type { BranchDistanceResult } from "@/lib/branchDistance"

type Props = {
  result?: BranchDistanceResult | null
  loading?: boolean
  isNearest?: boolean
  className?: string
}

/**
 * Compact distance line for branch cards.
 * Never renders 0 / NaN / undefined placeholders.
 */
export function BranchDistanceLabel({ result, loading, isNearest, className = "" }: Props) {
  if (loading && !result?.distance_label) {
    return (
      <p
        className={`text-xs sm:text-sm text-[#AEB4C2] flex items-center gap-1.5 mt-1 min-h-[1.25rem] ${className}`}
        aria-live="polite"
      >
        <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin text-[#FFB70F]" />
        <span className="truncate">Calculating distance…</span>
      </p>
    )
  }

  const label = result?.distance_label?.trim()
  const km = result?.distance_km
  if (!label || km == null || Number.isNaN(Number(km))) {
    return null
  }

  return (
    <p
      className={`text-xs sm:text-sm text-emerald-400/95 flex items-center gap-1.5 mt-1 min-h-[1.25rem] ${className}`}
      title={label}
    >
      <Navigation className="w-3.5 h-3.5 shrink-0 text-emerald-400" aria-hidden />
      <span className="truncate">{label}</span>
      {isNearest || result?.nearest ? (
        <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
          Nearest
        </span>
      ) : null}
    </p>
  )
}

type ControlsProps = {
  supported: boolean
  status: string
  loading: boolean
  hasCoords?: boolean
  errorMessage?: string | null
  className?: string
}

/**
 * Quiet location status only — location is auto-fetched; no manual refresh button.
 */
export function BranchDistanceControls({
  supported,
  status,
  loading,
  errorMessage,
  className = "",
}: ControlsProps) {
  if (!supported) {
    return (
      <p className={`mb-6 text-center text-xs text-[#AEB4C2] ${className}`}>
        Distance from your location is not available in this browser.
      </p>
    )
  }

  const busy = loading || status === "prompting" || status === "idle"
  const denied =
    status === "denied" ||
    status === "timeout" ||
    status === "unavailable" ||
    status === "error"

  if (busy) {
    return (
      <p className={`mb-6 text-center text-xs text-[#AEB4C2] ${className}`} aria-live="polite">
        Finding distances from your location…
      </p>
    )
  }

  if (denied && errorMessage) {
    return (
      <p className={`mb-6 text-center text-xs text-[#AEB4C2] ${className}`}>{errorMessage}</p>
    )
  }

  return null
}
