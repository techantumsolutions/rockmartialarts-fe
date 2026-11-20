"use client"

import Link from "next/link"
import { useEffect, useLayoutEffect, useMemo, useState } from "react"
import { Building2, Loader2, Search } from "lucide-react"
import { branchNameToSlug } from "@/lib/branch-slug"
import { useGeographyDropdowns } from "@/hooks/use-geography-dropdowns"
import { BranchDistanceControls } from "@/components/website/BranchDistanceLabel"
import { NearbyAcademyCard, type NearbyAcademyCardData } from "@/components/website/NearbyAcademyCard"
import { useVisitorBranchDistances } from "@/hooks/useVisitorBranchDistances"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import { getBranchDisplayLabels } from "@/lib/branchDisplay"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Branch = {
  id: string
  name?: string
  code?: string
  slug?: string
  email?: string
  phone?: string
  partner_org_id?: string | null
  partner_org_name?: string | null
  brand_name?: string | null
  cover_image_url?: string | null
  rating?: number | null
  review_count?: number | null
  address?: {
    line1?: string
    area?: string
    city?: string
    state?: string
    pincode?: string
    country?: string
  }
  branch?: {
    name?: string
    code?: string
    email?: string
    phone?: string
    address?: Branch["address"]
  }
  operational_details?: {
    courses_offered?: string[]
  }
}

function getBranchName(b: Branch): string {
  return b.branch?.name || b.name || b.code || "Academy"
}

function getBranchAddress(b: Branch) {
  return b.branch?.address || b.address
}

function formatLocation(addr: Branch["address"]): string {
  if (!addr) return ""
  return [addr.city, addr.state].filter(Boolean).join(", ")
}

function branchHref(b: Branch): string {
  const slug = (b.slug || branchNameToSlug(getBranchName(b))).trim()
  return `/branches/${encodeURIComponent(slug || b.id)}`
}

function toAcademyCard(b: Branch, idx: number): NearbyAcademyCardData {
  const addr = getBranchAddress(b)
  const location = formatLocation(addr)
  const labels = getBranchDisplayLabels(b)
  const area = labels.locationName || [addr?.area, addr?.city].filter(Boolean).join(", ") || location
  const coverRaw = b.cover_image_url || ""
  const cover =
    (coverRaw && (resolvePublicAssetUrl(coverRaw) || coverRaw)) ||
    `/assets/img/glry_img${(idx % 9) + 1}.jpg`
  const tags = Array.isArray(b.operational_details?.courses_offered)
    ? b.operational_details!.courses_offered!.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 3)
    : []
  return {
    id: b.id,
    name: labels.brandName,
    brandName: labels.brandName,
    poweredByLine: labels.poweredByLine,
    locationName: labels.locationName,
    logoUrl: labels.logoUrl || null,
    location,
    area,
    href: branchHref(b),
    img: cover,
    tags,
    rating: typeof b.rating === "number" ? b.rating : null,
    reviewCount: typeof b.review_count === "number" ? b.review_count : null,
  }
}

const selectClass =
  "w-full h-12 rounded-xl bg-gray-900 border border-gray-700 text-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB70F] focus:border-transparent disabled:opacity-50"

let memoryBranchesCache: Branch[] | null = null
let memoryBranchesTotal = 0

function getInitialBranches(): { branches: Branch[]; total: number } {
  if (memoryBranchesCache && memoryBranchesCache.length > 0) {
    return { branches: memoryBranchesCache, total: memoryBranchesTotal }
  }
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem("rma_branches_list_cache")
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed.branches)) {
          memoryBranchesCache = parsed.branches
          memoryBranchesTotal = parsed.total || parsed.branches.length
          return { branches: parsed.branches, total: memoryBranchesTotal }
        }
      }
    } catch {
      /* ignore */
    }
  }
  return { branches: [], total: 0 }
}

export default function AcademiesDiscoveryPage() {
  const geography = useGeographyDropdowns()
  const [searchInput, setSearchInput] = useState("")
  const [q, setQ] = useState("")
  const [branches, setBranches] = useState<Branch[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // Immediately restore cached academies before paint
  useLayoutEffect(() => {
    if (branches.length === 0 && !geography.selectedStateId && !geography.selectedCityId && !q) {
      const cached = getInitialBranches()
      if (cached.branches && cached.branches.length > 0) {
        setBranches(cached.branches)
        setTotal(cached.total)
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setQ(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    if (geography.selectedStateId && geography.selectedCityId) {
      const stillValid = geography.cities.some((c) => c.id === geography.selectedCityId)
      if (!stillValid) geography.setSelectedCityId("")
    }
  }, [geography.selectedStateId, geography.cities, geography.selectedCityId, geography.setSelectedCityId])

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams()
    if (geography.selectedStateId) params.set("state_id", geography.selectedStateId)
    if (geography.selectedCityId) params.set("city_id", geography.selectedCityId)
    if (q) params.set("q", q)
    params.set("active_only", "true")

    setLoading(true)
    fetch(`/api/backend/branches/public/search?${params.toString()}`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : Promise.resolve({ branches: [], total: 0 })))
      .then((data) => {
        if (cancelled) return
        const list = data.branches ?? []
        const count = typeof data.total === "number" ? data.total : list.length
        setBranches(Array.isArray(list) ? list : [])
        setTotal(count)
        if (!geography.selectedStateId && !geography.selectedCityId && !q && Array.isArray(list) && list.length > 0) {
          memoryBranchesCache = list
          memoryBranchesTotal = count
          try {
            sessionStorage.setItem("rma_branches_list_cache", JSON.stringify({ branches: list, total: count }))
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBranches([])
          setTotal(0)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [geography.selectedStateId, geography.selectedCityId, q])

  const hasFilters = Boolean(geography.selectedStateId || geography.selectedCityId || q)
  const cityDisabled = geography.hasStates && !geography.selectedStateId
  const branchIds = useMemo(() => branches.map((b) => b.id).filter(Boolean), [branches])
  const branchDistances = useVisitorBranchDistances({ branchIds, autoRequest: true })
  const orderedBranches = useMemo(() => {
    const cards = branches.map((b, i) => toAcademyCard(b, i))
    const byId = branchDistances.byId
    cards.sort((a, b) => {
      const da = byId[a.id]?.distance_km
      const db = byId[b.id]?.distance_km
      const aOk = typeof da === "number" && !Number.isNaN(da)
      const bOk = typeof db === "number" && !Number.isNaN(db)
      if (aOk && bOk) return (da as number) - (db as number)
      if (aOk) return -1
      if (bOk) return 1
      return 0
    })
    return cards
  }, [branches, branchDistances.byId])

  const clearFilters = () => {
    geography.setSelectedStateId("")
    geography.setSelectedCityId("")
    setSearchInput("")
    setQ("")
  }

  return (
    <main className="min-h-screen">
      <section
        className="relative py-20 md:py-28 bg-cover bg-center"
        style={{ backgroundImage: "url(/assets/img/banner.jpg)" }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#171A26]/50 via-[#171A26]/15 to-black/10" />
        <div className="site-content relative z-10 px-0 sm:px-1">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold text-white uppercase mb-4">Our Academies</h1>
            <p className="text-gray-200 text-lg">
              Find a Rock Martial Arts branch by state, city, or name. Open an branch for courses and contact details.
            </p>
          </div>
        </div>
      </section>

      <section className="py-10 md:py-12 border-b border-gray-800">
        <div className="site-content px-0 sm:px-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">State</label>
              <Select
                value={geography.selectedStateId || "all"}
                onValueChange={(val) => geography.setSelectedStateId(val === "all" ? "" : val)}
                disabled={geography.isLoadingStates}
              >
                <SelectTrigger className="w-full h-12 rounded-xl bg-gray-900 border border-gray-700 text-white px-4 text-sm focus:ring-2 focus:ring-[#FFB70F] focus:border-transparent disabled:opacity-50">
                  <SelectValue placeholder="All states" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700 text-white max-h-64">
                  <SelectItem value="all" className="focus:bg-gray-800 focus:text-[#FFB70F] cursor-pointer">
                    All states
                  </SelectItem>
                  {geography.states
                    .filter((state) => Boolean(state.id))
                    .map((state) => (
                      <SelectItem
                        key={state.id}
                        value={state.id}
                        className="focus:bg-gray-800 focus:text-[#FFB70F] cursor-pointer"
                      >
                        {state.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">City</label>
              <Select
                value={geography.selectedCityId || "all"}
                onValueChange={(val) => geography.setSelectedCityId(val === "all" ? "" : val)}
                disabled={geography.isLoadingCities || cityDisabled}
              >
                <SelectTrigger className="w-full h-12 rounded-xl bg-gray-900 border border-gray-700 text-white px-4 text-sm focus:ring-2 focus:ring-[#FFB70F] focus:border-transparent disabled:opacity-50">
                  <SelectValue placeholder={cityDisabled ? "Select a state first" : "All cities"} />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700 text-white max-h-64">
                  <SelectItem value="all" className="focus:bg-gray-800 focus:text-[#FFB70F] cursor-pointer">
                    {cityDisabled ? "Select a state first" : "All cities"}
                  </SelectItem>
                  {geography.cities
                    .filter((city) => Boolean(city.id))
                    .map((city) => (
                      <SelectItem
                        key={city.id}
                        value={city.id}
                        className="focus:bg-gray-800 focus:text-[#FFB70F] cursor-pointer"
                      >
                        {city.name}
                        {typeof city.branch_count === "number" ? ` (${city.branch_count})` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Academy name, area, or city"
                  className={`${selectClass} pl-10`}
                  aria-label="Search academies"
                />
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-400">
            <p>
              {loading ? "Searching…" : `${total} ${total === 1 ? "academy" : "academies"} found`}
            </p>
            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="text-[#FFB70F] hover:text-white font-medium"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="site-content px-0 sm:px-1">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-[#FFB70F]" />
            </div>
          ) : branches.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <p className="mb-4 text-lg">
                {hasFilters
                  ? "No academies match these filters. Try another state, city, or search."
                  : "No academies available yet. Check back soon."}
              </p>
              {hasFilters ? (
                <button type="button" onClick={clearFilters} className="text-[#FFB70F] hover:text-white font-medium">
                  Clear filters
                </button>
              ) : (
                <Link href="/" className="text-[#FFB70F] hover:text-white font-medium">
                  Back to home
                </Link>
              )}
            </div>
          ) : (
            <>
            <BranchDistanceControls
              supported={branchDistances.supported}
              status={branchDistances.status}
              loading={branchDistances.loading}
              errorMessage={branchDistances.errorMessage}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
              {orderedBranches.map((card) => (
                <NearbyAcademyCard
                  key={card.id}
                  branch={card}
                  distance={branchDistances.byId[card.id]}
                  distanceLoading={
                    !branchDistances.byId[card.id]?.distance_label &&
                    (branchDistances.loading ||
                      branchDistances.status === "prompting" ||
                      branchDistances.status === "idle")
                  }
                  isNearest={branchDistances.nearestBranchId === card.id}
                />
              ))}
            </div>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
