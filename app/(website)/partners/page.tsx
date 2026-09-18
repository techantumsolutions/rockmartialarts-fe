"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Building2, Loader2, MapPin, Search } from "lucide-react"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"

type PartnerCard = {
  branch_id: string
  name?: string
  code?: string
  slug?: string
  partner_url?: string
  logo_url?: string | null
  cover_banner_url?: string | null
  short_description?: string | null
  city?: string | null
  state?: string | null
}

export default function PartnersDirectoryPage() {
  const [searchInput, setSearchInput] = useState("")
  const [q, setQ] = useState("")
  const [partners, setPartners] = useState<PartnerCard[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setQ(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    params.set("limit", "50")
    setLoading(true)
    fetch(
      `/api/backend/collaboration-partners/public/partners?${params.toString()}`,
      { cache: "no-store", headers: { Accept: "application/json" } }
    )
      .then((res) =>
        res.ok ? res.json() : Promise.resolve({ partners: [], total: 0 })
      )
      .then((data) => {
        if (cancelled) return
        setPartners(Array.isArray(data.partners) ? data.partners : [])
        setTotal(typeof data.total === "number" ? data.total : 0)
      })
      .catch(() => {
        if (!cancelled) {
          setPartners([])
          setTotal(0)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [q])

  return (
    <main className="min-h-screen bg-[#171A26] text-white">
      <section className="relative pt-28 pb-12 px-4">
        <div className="container mx-auto max-w-7xl">
          <p className="text-[#FFB70F] uppercase tracking-[0.2em] text-xs mb-3">
            Collaboration
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            Partner Academies
          </h1>
          <p className="text-gray-300 max-w-2xl mb-8">
            Explore Rock Martial Arts collaboration partners — dedicated pages
            with training story, masters, gallery, and contact details.
          </p>
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search partners by name or city…"
              className="w-full h-12 pl-11 pr-4 rounded-xl bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB70F]"
            />
          </div>
        </div>
      </section>

      <section className="pb-20 px-4">
        <div className="container mx-auto max-w-7xl">
          {loading ? (
            <div className="flex justify-center py-20 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-[#FFB70F]" />
            </div>
          ) : partners.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Building2 className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>No collaboration partners found.</p>
              <Link
                href="/branches"
                className="inline-block mt-4 text-[#FFB70F] hover:underline"
              >
                Browse all branches
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-400 mb-6">
                Showing {partners.length}
                {total > partners.length ? ` of ${total}` : ""} partner
                {partners.length === 1 ? "" : "s"}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {partners.map((p) => {
                  const href =
                    p.partner_url ||
                    `/partners/${encodeURIComponent(p.slug || p.branch_id)}`
                  const cover = resolvePublicAssetUrl(
                    p.cover_banner_url || p.logo_url || ""
                  )
                  const loc = [p.city, p.state].filter(Boolean).join(", ")
                  return (
                    <Link
                      key={p.branch_id}
                      href={href}
                      className="group rounded-xl overflow-hidden border border-gray-800 bg-gray-900/40 hover:border-[#FFB70F]/50 transition-colors"
                    >
                      <div className="aspect-[16/9] bg-gray-800 overflow-hidden">
                        {cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={cover}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600">
                            <Building2 className="w-10 h-10" />
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <h2 className="text-lg font-semibold text-[#FFB70F] group-hover:text-[#ffc53d]">
                          {p.name || "Partner"}
                        </h2>
                        {loc ? (
                          <p className="text-sm text-gray-400 mt-1 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" />
                            {loc}
                          </p>
                        ) : null}
                        {p.short_description ? (
                          <p className="text-sm text-gray-300 mt-3 line-clamp-2">
                            {p.short_description}
                          </p>
                        ) : null}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
