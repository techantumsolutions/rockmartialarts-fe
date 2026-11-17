"use client"

import { Loader2, MapPin, Navigation } from "lucide-react"
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
  hasCoords: boolean
  errorMessage?: string | null
  onRequest: () => void
  onRefresh: () => void
  className?: string
}

/** Location controls — distances auto-fetch by default; this is for retry/refresh only. */
export function BranchDistanceControls({
  supported,
  status,
  loading,
  hasCoords,
  errorMessage,
  onRequest,
  onRefresh,
  className = "",
}: ControlsProps) {
  if (!supported) {
    return (
      <p className={`text-center text-xs text-[#AEB4C2] mb-6 ${className}`}>
        Distance from your location is not available in this browser.
      </p>
    )
  }

  const busy = loading || status === "prompting" || status === "idle"
  const showRefresh = hasCoords && status === "granted"
  const needsRetry =
    status === "denied" ||
    status === "timeout" ||
    status === "unavailable" ||
    status === "error"

  // While auto-fetching, keep the toolbar quiet — cards show their own loading state.
  if (busy && !showRefresh && !needsRetry) {
    return (
      <p className={`text-center text-xs text-[#AEB4C2] mb-6 ${className}`} aria-live="polite">
        Finding distances from your location…
      </p>
    )
  }

  if (showRefresh && !needsRetry) {
    return (
      <div className={`flex flex-col items-center gap-2 mb-6 ${className}`}>
        <button
          type="button"
          onClick={onRefresh}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#383D4D] bg-[#292E40] px-4 py-2 text-xs sm:text-sm font-semibold text-white transition-all duration-300 hover:border-[#FFB70F] hover:text-[#FFB70F] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {busy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FFB70F]" />
          ) : (
            <MapPin className="w-3.5 h-3.5 text-[#FFB70F]" />
          )}
          {busy ? "Updating…" : "Refresh My Location"}
        </button>
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center gap-2 mb-6 ${className}`}>
      <button
        type="button"
        onClick={onRequest}
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#383D4D] bg-[#292E40] px-4 py-2 text-xs sm:text-sm font-semibold text-white transition-all duration-300 hover:border-[#FFB70F] hover:text-[#FFB70F] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {busy ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FFB70F]" />
        ) : (
          <MapPin className="w-3.5 h-3.5 text-[#FFB70F]" />
        )}
        {busy ? "Getting location…" : "Use My Location"}
      </button>
      {errorMessage ? (
        <p className="text-xs text-[#AEB4C2] text-center max-w-md">{errorMessage}</p>
      ) : null}
    </div>
  )
}
