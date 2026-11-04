"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Building2, Loader2, MapPin } from "lucide-react"
import type { PartnerOrgLanding } from "@/lib/partnerOrgAPI"

export default function PartnerOrgBranchesPage() {
  const params = useParams()
  const slug = String(params?.slug || "")
  const [data, setData] = useState<PartnerOrgLanding | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    fetch(
      `/api/backend/partner-organizations/public/${encodeURIComponent(slug)}/landing`,
      { cache: "no-store", headers: { Accept: "application/json" } }
    )
      .then(async (res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!cancelled) setData(payload)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  if (loading) {
    return (
      <main className="flex justify-center py-24 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#FFB70F]" />
      </main>
    )
  }

  const orgSlug = data?.slug || slug
  const branches = data?.branches || []

  return (
    <main className="text-white pb-16">
      <section className="pt-10 pb-8 px-4 border-b border-gray-800">
        <div className="container mx-auto max-w-7xl">
          <p className="text-[#FFB70F] uppercase tracking-[0.2em] text-xs mb-2">
            {data?.hero?.name || "Partner"}
          </p>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Our Branches</h1>
          <p className="text-gray-300 max-w-2xl">
            Open a branch to view courses available there.
          </p>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="container mx-auto max-w-7xl">
          {branches.length === 0 ? (
            <p className="text-center text-gray-400 py-16">No branches published yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {branches.map((b) => {
                const key = String(b.slug || b.id)
                const addr = b.address
                const location = addr
                  ? [addr.city, addr.state].filter(Boolean).join(", ")
                  : ""
                const courseCount = Array.isArray(b.courses) ? b.courses.length : 0
                return (
                  <Link
                    key={String(b.id)}
                    href={`/partner-orgs/${encodeURIComponent(orgSlug)}/branches/${encodeURIComponent(key)}`}
                    className="rounded-xl border border-gray-800 bg-gray-900/40 p-5 hover:border-[#FFB70F]/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="w-5 h-5 text-[#FFB70F]" />
                      <h2 className="font-semibold text-[#FFB70F]">
                        {b.name || b.code || "Branch"}
                      </h2>
                    </div>
                    {location ? (
                      <p className="text-sm text-gray-400 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {location}
                      </p>
                    ) : null}
                    <p className="mt-3 text-xs font-medium text-[#FFB70F]">
                      {courseCount} course{courseCount === 1 ? "" : "s"}
                    </p>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
