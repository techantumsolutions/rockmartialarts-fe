"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, Loader2, Search, Trophy } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SafeImage } from "@/components/ui/safe-image"
import { championAPI, type Champion } from "@/lib/championAPI"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"

type PublicChampion = Champion & { achievement_count?: number }

export default function ChampionsListingClient() {
  const [champions, setChampions] = useState<PublicChampion[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")

  useEffect(() => {
    setLoading(true)
    championAPI
      .listPublic({ search: search || undefined, limit: 48 })
      .then((data) =>
        setChampions(Array.isArray(data.champions) ? data.champions : [])
      )
      .catch(() => setChampions([]))
      .finally(() => setLoading(false))
  }, [search])

  return (
    <main className="min-h-screen bg-[#171A26]">
      <section
        className="relative py-20 md:py-28 bg-cover bg-center"
        style={{ backgroundImage: "url(/assets/img/banner.jpg)" }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="container relative z-10 mx-auto px-4 max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-[#FFB70F] text-sm font-semibold uppercase tracking-wider mb-2">
              Champions
            </p>
            <h1 className="text-4xl md:text-5xl font-bold text-white uppercase mb-4">
              Our Champions
            </h1>
            <p className="text-gray-200 text-lg">
              Meet athletes who trained with Rock Martial Arts and earned
              recognition on the mats and beyond.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-[#171A26]">
        <div className="container mx-auto px-4 max-w-7xl space-y-8">
          <form
            className="flex flex-col sm:flex-row gap-2 max-w-xl"
            onSubmit={(e) => {
              e.preventDefault()
              setSearch(searchInput.trim())
            }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search champions…"
                className="pl-9 bg-gray-950 border-gray-700 text-white"
              />
            </div>
            <Button
              type="submit"
              className="bg-[#FFB70F] hover:bg-[#e0a00d] text-black"
            >
              Search
            </Button>
          </form>

          {loading ? (
            <div className="flex justify-center py-20 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : champions.length === 0 ? (
            <div className="text-center py-16 text-gray-400 space-y-2">
              <Trophy className="w-10 h-10 mx-auto opacity-40" />
              <p>No champions published yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {champions.map((c) => {
                const href = `/champions/${encodeURIComponent(c.slug || c.id)}`
                const photo = resolvePublicAssetUrl(c.photo_url)
                return (
                  <Link
                    key={c.id}
                    href={href}
                    className="group rounded-lg overflow-hidden border border-gray-800 bg-gray-950/80 hover:border-[#FFB70F]/50 transition-colors"
                  >
                    <div className="aspect-[4/3] relative bg-gray-900 overflow-hidden">
                      {photo ? (
                        <SafeImage
                          src={photo}
                          alt={c.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                          <Trophy className="w-12 h-12" />
                        </div>
                      )}
                    </div>
                    <div className="p-4 space-y-2">
                      <h2 className="text-lg font-semibold text-white group-hover:text-[#FFB70F] transition-colors">
                        {c.name}
                      </h2>
                      {c.headline ? (
                        <p className="text-sm text-[#FFB70F]/90 line-clamp-2">
                          {c.headline}
                        </p>
                      ) : null}
                      {c.short_bio ? (
                        <p className="text-sm text-gray-400 line-clamp-3">
                          {c.short_bio}
                        </p>
                      ) : null}
                      <div className="flex items-center justify-between pt-1 text-xs text-gray-500">
                        <span>
                          {(c.achievement_count ?? 0) > 0
                            ? `${c.achievement_count} achievement${(c.achievement_count ?? 0) === 1 ? "" : "s"}`
                            : "View profile"}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[#FFB70F]">
                          Details
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
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
