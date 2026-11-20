"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  distanceMapFromResponse,
  fetchBranchDistances,
  getCurrentPosition,
  isGeolocationSupported,
  type BranchDistanceResult,
  type GeoPermissionState,
  type VisitorCoords,
} from "@/lib/branchDistance"

type Options = {
  branchIds: string[]
  /** Auto-request location when branches are ready (default true) */
  autoRequest?: boolean
}

/**
 * Auto-fetches the visitor's latest location and branch distances.
 * Re-reads location on mount and whenever the tab becomes visible again.
 */
export function useVisitorBranchDistances({ branchIds, autoRequest = true }: Options) {
  const [status, setStatus] = useState<GeoPermissionState>("idle")
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [coords, setCoords] = useState<VisitorCoords | null>(null)
  const [byId, setById] = useState<Record<string, BranchDistanceResult>>({})
  const [nearestBranchId, setNearestBranchId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const abortRef = useRef(0)
  const inFlightRef = useRef(false)

  const ids = useMemo(
    () => Array.from(new Set(branchIds.filter(Boolean))),
    [branchIds]
  )
  const idsKey = ids.slice().sort().join(",")

  // Fetch distances whenever we have coords + branch ids (client-only)
  useEffect(() => {
    if (!coords || !idsKey) return
    const token = ++abortRef.current
    const list = idsKey.split(",").filter(Boolean)
    setLoading(true)
    ;(async () => {
      try {
        const data = await fetchBranchDistances(coords, list)
        if (token !== abortRef.current) return
        setById(distanceMapFromResponse(data))
        setNearestBranchId(data.nearest_branch_id || null)
        setErrorMessage(null)
      } catch {
        if (token !== abortRef.current) return
        setErrorMessage("Could not calculate distances right now.")
      } finally {
        if (token === abortRef.current) setLoading(false)
      }
    })()
    return () => {
      abortRef.current += 1
    }
  }, [coords, idsKey])

  const requestLocation = useCallback(async () => {
    if (!isGeolocationSupported()) {
      setStatus("unsupported")
      setErrorMessage("Location is not supported in this browser.")
      return
    }
    if (inFlightRef.current) return
    inFlightRef.current = true
    setLocating(true)
    setErrorMessage(null)
    setStatus("prompting")
    try {
      const next = await getCurrentPosition()
      setCoords(next)
      setStatus("granted")
    } catch (err) {
      const code = err instanceof Error ? err.message : "error"
      if (code === "denied") {
        setStatus("denied")
        setErrorMessage("Location permission denied. You can still browse academies.")
      } else if (code === "timeout") {
        setStatus("timeout")
        setErrorMessage("Location request timed out.")
      } else if (code === "unsupported") {
        setStatus("unsupported")
        setErrorMessage("Location is not supported in this browser.")
      } else if (code === "unavailable") {
        setStatus("unavailable")
        setErrorMessage("Location unavailable right now.")
      } else {
        setStatus("error")
        setErrorMessage("Could not get your location.")
      }
    } finally {
      inFlightRef.current = false
      setLocating(false)
    }
  }, [])

  // Auto-fetch latest location when branches are ready + whenever tab is focused again
  useEffect(() => {
    if (!autoRequest) return
    if (!idsKey) return

    void requestLocation()

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void requestLocation()
      }
    }
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("focus", onVisible)

    return () => {
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("focus", onVisible)
    }
  }, [autoRequest, idsKey, requestLocation])

  return {
    status,
    loading: locating || loading,
    coords,
    byId,
    nearestBranchId,
    errorMessage,
    supported: typeof window === "undefined" ? true : isGeolocationSupported(),
    requestLocation,
    refreshLocation: requestLocation,
  }
}
