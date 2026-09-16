"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Building2, Loader2, Mail, MapPin, Phone, Search } from "lucide-react"
import { branchNameToSlug } from "@/lib/branch-slug"
import { useGeographyDropdowns } from "@/hooks/use-geography-dropdowns"

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

export default function BranchesDiscoveryPage() {
  const geography = useGeographyDropdowns()
  const [searchInput, setSearchInput] = useState("")
  const [q, setQ] = useState("")
  const [branches, setBranches] = useState<Branch[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

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
        setBranches(Array.isArray(list) ? list : [])
        setTotal(typeof data.total === "number" ? data.total : list.length)
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
        <div className="container relative z-10 mx-auto px-4 max-w-7xl">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold text-white uppercase mb-4">Our Branches</h1>
            <p className="text-gray-200 text-lg">
              Find a Rock Martial Arts academy by state, city, or name. Open a branch for courses and contact details.
            </p>
          </div>
        </div>
      </section>

      <section className="py-10 md:py-12 bg-[#171A26] border-b border-gray-800">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">State</label>
              <select
                className={selectClass}
                value={geography.selectedStateId}
                onChange={(e) => geography.setSelectedStateId(e.target.value)}
                disabled={geography.isLoadingStates}
                aria-label="Filter by state"
              >
                <option value="">All states</option>
                {geography.states.map((state) => (
                  <option key={state.id} value={state.id}>
                    {state.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">City</label>
              <select
                className={selectClass}
                value={geography.selectedCityId}
                onChange={(e) => geography.setSelectedCityId(e.target.value)}
                disabled={geography.isLoadingCities || cityDisabled}
                aria-label="Filter by city"
              >
                <option value="">{cityDisabled ? "Select a state first" : "All cities"}</option>
                {geography.cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                    {typeof city.branch_count === "number" ? ` (${city.branch_count})` : ""}
                  </option>
                ))}
              </select>
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
        <div className="container mx-auto px-4 max-w-7xl">
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
                return (
                  <div
                    key={b.id}
                    className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 hover:border-[#FFB70F] transition-colors"
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-12 h-12 rounded-lg bg-[#FFB70F]/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6 text-[#FFB70F]" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-[#FFB70F]">{getBranchName(b)}</h2>
                        {location ? (
                          <p className="text-gray-400 text-sm flex items-center gap-1 mt-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {location}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {fullAddress ? (
                      <div className="flex items-start gap-2 mb-3 text-gray-300 text-sm">
                        <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                        <span>{fullAddress}</span>
                      </div>
                    ) : null}
                    {phone ? (
                      <div className="flex items-center gap-2 mb-3 text-gray-300 text-sm">
                        <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <a href={`tel:${phone}`} className="hover:text-[#FFB70F] transition-colors">
                          {phone}
                        </a>
                      </div>
                    ) : null}
                    {email ? (
                      <div className="flex items-center gap-2 mb-3 text-gray-300 text-sm">
                        <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <a href={`mailto:${email}`} className="hover:text-[#FFB70F] transition-colors">
                          {email}
                        </a>
                      </div>
                    ) : null}
                    <Link
                      href={branchHref(b)}
                      className="inline-block mt-4 text-sm font-medium text-[#FFB70F] hover:text-white transition-colors"
                    >
                      View branch details →
                    </Link>
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
