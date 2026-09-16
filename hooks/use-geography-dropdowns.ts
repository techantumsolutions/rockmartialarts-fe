"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { getBackendApiUrl } from "@/lib/config"
import { dropdownAPI } from "@/lib/dropdownAPI"
import type { GeoCity, GeoState } from "@/lib/geographyAPI"

export type { GeoCity, GeoState }

interface UseGeographyDropdownsOptions {
  initialCityId?: string
}

function matchesCity(city: GeoCity, value?: string) {
  if (!value) return false
  const v = value.trim().toLowerCase()
  return city.id === value || (city.name || "").trim().toLowerCase() === v
}

export function useGeographyDropdowns(options: UseGeographyDropdownsOptions = {}) {
  const { initialCityId } = options
  const [states, setStates] = useState<GeoState[]>([])
  const [allCities, setAllCities] = useState<GeoCity[]>([])
  const [selectedStateId, setSelectedStateId] = useState("")
  const [selectedCityId, setSelectedCityId] = useState("")
  const [isLoadingStates, setIsLoadingStates] = useState(true)
  const [isLoadingCities, setIsLoadingCities] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setIsLoadingStates(true)
      setIsLoadingCities(true)
      setError(null)
      try {
        const [statesRes, citiesRes] = await Promise.all([
          fetch(getBackendApiUrl("states/public?active_only=true")),
          fetch(getBackendApiUrl("cities/public?active_only=true")),
        ])
        const statesJson = statesRes.ok ? await statesRes.json() : { states: [] }
        const citiesJson = citiesRes.ok ? await citiesRes.json() : { cities: [] }
        let nextStates: GeoState[] = (statesJson.states || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          code: s.code || "",
          slug: s.slug,
          is_active: s.is_active !== false,
          display_order: s.display_order || 0,
        }))
        let nextCities: GeoCity[] = (citiesJson.cities || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          code: c.code || "",
          slug: c.slug,
          state_id: c.state_id || "",
          state: c.state || c.state_name || "",
          state_name: c.state_name || c.state || "",
          is_active: c.is_active !== false,
          display_order: c.display_order || 0,
          branch_count: typeof c.branch_count === "number" ? c.branch_count : undefined,
        }))

        if (nextCities.length === 0) {
          try {
            const options = await dropdownAPI.getCategoryOptions("locations")
            nextCities = (options || [])
              .filter((opt) => opt.is_active !== false)
              .map((opt) => {
                const parts = (opt.label || opt.value || "").split(",").map((p) => p.trim())
                return {
                  id: opt.value,
                  name: parts[0] || opt.label || opt.value,
                  code: opt.value,
                  state: parts[1] || "",
                  state_name: parts[1] || "",
                  state_id: "",
                  is_active: true,
                  display_order: opt.order || 0,
                }
              })
          } catch {
            // keep empty
          }
        }

        if (!cancelled) {
          setStates(nextStates.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })))
          setAllCities(nextCities.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })))
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load locations.")
          setStates([])
          setAllCities([])
        }
      } finally {
        if (!cancelled) {
          setIsLoadingStates(false)
          setIsLoadingCities(false)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!initialCityId || allCities.length === 0) return
    const match = allCities.find((city) => matchesCity(city, initialCityId))
    if (!match) return
    setSelectedCityId(match.id)
    if (match.state_id) setSelectedStateId(match.state_id)
  }, [initialCityId, allCities])

  const cities = useMemo(() => {
    const list = !selectedStateId || states.length === 0
      ? allCities
      : allCities.filter((city) => city.state_id === selectedStateId)
    return [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
  }, [allCities, selectedStateId, states.length])

  const selectedCity = useMemo(
    () => allCities.find((city) => city.id === selectedCityId),
    [allCities, selectedCityId]
  )

  const selectState = useCallback((stateId: string) => {
    setSelectedStateId(stateId)
    setSelectedCityId((prev) => {
      if (!prev) return ""
      const city = allCities.find((item) => item.id === prev)
      if (city && city.state_id === stateId) return prev
      return ""
    })
  }, [allCities])

  const selectCity = useCallback((cityId: string) => {
    setSelectedCityId(cityId)
    const city = allCities.find((item) => item.id === cityId)
    if (city?.state_id) setSelectedStateId(city.state_id)
  }, [allCities])

  return {
    states,
    cities,
    allCities,
    selectedStateId,
    selectedCityId,
    selectedCity,
    setSelectedStateId: selectState,
    setSelectedCityId: selectCity,
    isLoadingStates,
    isLoadingCities,
    isLoading: isLoadingStates || isLoadingCities,
    error,
    hasStates: states.length > 0,
  }
}
