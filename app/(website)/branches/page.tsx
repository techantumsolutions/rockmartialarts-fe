"use client"

import Link from "next/link"
import { useEffect, useLayoutEffect, useState } from "react"
import { Building2, Loader2, Mail, MapPin, Phone, Search } from "lucide-react"
import { branchNameToSlug } from "@/lib/branch-slug"
import { useGeographyDropdowns } from "@/hooks/use-geography-dropdowns"
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
}

function getBranchName(b: Branch): string {
  return b.branch?.name || b.name || b.code || "Branch"
}

function getBranchEmail(b: Branch): string | undefined {
  return b.branch?.email || b.email
}

function getBranchPhone(b: Branch): string | undefined {
  return b.branch?.phone || b.phone
}

function getBranchAddress(b: Branch) {
  return b.branch?.address || b.address
}

function formatAddress(addr: Branch["address"]): string {
  if (!addr) return ""
  return [addr.line1, addr.area, addr.city, addr.state, addr.pincode, addr.country].filter(Boolean).join(", ")
}

function formatLocation(addr: Branch["address"]): string {
  if (!addr) return ""
  return [addr.city, addr.state].filter(Boolean).join(", ")
}

function branchHref(b: Branch): string {
  const slug = (b.slug || branchNameToSlug(getBranchName(b))).trim()
  return `/branches/${encodeURIComponent(slug || b.id)}`
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

export default function BranchesDiscoveryPage() {
  const geography = useGeographyDropdowns()
  const [searchInput, setSearchInput] = useState("")
  const [q, setQ] = useState("")
  const [branches, setBranches] = useState<Branch[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // Immediately restore cached branches before paint
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

  const clearFilters = () => {
    geography.setSelectedStateId("")
    geography.setSelectedCityId("")
    setSearchInput("")
    setQ("")
  }

  return (
    <main className="min-h-screen bg-[#171A26]">
      <section
        className="relative py-20 md:py-28 bg-cover bg-center"
        style={{ backgroundImage: "url(/assets/img/banner.jpg)" }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="site-content relative z-10 px-0 sm:px-1">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold text-white uppercase mb-4">Our Branches</h1>
            <p className="text-gray-200 text-lg">
              Find a Rock Martial Arts academy by state, city, or name. Open a branch for courses and contact details.
            </p>
          </div>
        </div>
      </section>

      <section className="py-10 md:py-12 bg-[#171A26] border-b border-gray-800">
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
                  placeholder="Branch name, area, or city"
                  className={`${selectClass} pl-10`}
                  aria-label="Search branches"
                />
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-400">
            <p>
              {loading ? "Searching…" : `${total} ${total === 1 ? "branch" : "branches"} found`}
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

      <section className="py-16 md:py-20 bg-[#171A26]">
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
                  ? "No branches match these filters. Try another state, city, or search."
                  : "No branches available yet. Check back soon."}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {branches.map((b) => {
                const addr = getBranchAddress(b)
                const location = formatLocation(addr)
                const fullAddress = formatAddress(addr)
                const phone = getBranchPhone(b)
                const email = getBranchEmail(b)
                const branchName = getBranchName(b)
                return (
                  <div
                    key={b.id}
                    className="flex flex-col justify-between rounded-xl border border-gray-800 bg-gray-900/50 p-6 hover:border-[#FFB70F] transition-colors h-full min-h-[310px]"
                  >
                    <div>
                      {/* Header */}
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-12 h-12 rounded-lg bg-[#FFB70F]/10 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-6 h-6 text-[#FFB70F]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h2 className="text-xl font-bold text-[#FFB70F] truncate" title={branchName}>
                            {branchName}
                          </h2>
                          <p className="text-gray-400 text-sm flex items-center gap-1 mt-1 truncate min-h-[1.25rem]">
                            {location ? (
                              <>
                                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="truncate" title={location}>
                                  {location}
                                </span>
                              </>
                            ) : (
                              <span className="invisible select-none">&nbsp;</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="space-y-3">
                        {/* Address: fixed height container with line clamp */}
                        <div className="flex items-start gap-2 text-gray-300 text-sm h-[4.5rem]">
                          <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                          <span
                            className="line-clamp-3 leading-relaxed flex-1"
                            style={{
                              display: '-webkit-box',
                              WebkitBoxOrient: 'vertical',
                              WebkitLineClamp: 3,
                              overflow: 'hidden',
                            }}
                            title={fullAddress || undefined}
                          >
                            {fullAddress ? fullAddress : <span className="text-gray-500 italic">Address not available</span>}
                          </span>
                        </div>

                        {/* Phone */}
                        <div className="flex items-center gap-2 text-gray-300 text-sm h-5 overflow-hidden">
                          <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          {phone ? (
                            <a href={`tel:${phone}`} className="hover:text-[#FFB70F] transition-colors truncate">
                              {phone}
                            </a>
                          ) : (
                            <span className="text-gray-500 italic">Not available</span>
                          )}
                        </div>

                        {/* Email */}
                        <div className="flex items-center gap-2 text-gray-300 text-sm h-5 overflow-hidden">
                          <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          {email ? (
                            <a
                              href={`mailto:${email}`}
                              className="hover:text-[#FFB70F] transition-colors truncate"
                              title={email}
                            >
                              {email}
                            </a>
                          ) : (
                            <span className="text-gray-500 italic">Not available</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Button pinned at fixed bottom position */}
                    <div className="mt-auto pt-4 border-t border-gray-800/60">
                      <Link
                        href={branchHref(b)}
                        className="inline-flex items-center text-sm font-medium text-[#FFB70F] hover:text-white transition-colors"
                      >
                        View branch details →
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
