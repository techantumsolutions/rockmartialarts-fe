"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft, ExternalLink, Loader2, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SafeImage } from "@/components/ui/safe-image"
import {
  championAPI,
  recognitionLevelLabel,
  type Champion,
  type ChampionAchievement,
} from "@/lib/championAPI"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"

export default function ChampionDetailClient() {
  const params = useParams()
  const slug = String(params?.slug || "")
  const [champion, setChampion] = useState<
    (Champion & { achievement_count?: number }) | null
  >(null)
  const [achievements, setAchievements] = useState<ChampionAchievement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setError(null)
    championAPI
      .getPublic(slug)
      .then((data) => {
        setChampion(data.champion || null)
        setAchievements(Array.isArray(data.achievements) ? data.achievements : [])
      })
      .catch((e) => {
        setChampion(null)
        setAchievements([])
        setError(e instanceof Error ? e.message : "Champion not found")
      })
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#171A26] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </main>
    )
  }

  if (error || !champion) {
    return (
      <main className="min-h-screen bg-[#171A26] flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-gray-300">{error || "Champion not found"}</p>
        <Button asChild variant="outline" className="border-gray-600 text-white">
          <Link href="/champions">Back to champions</Link>
        </Button>
      </main>
    )
  }

  const photo = resolvePublicAssetUrl(champion.photo_url)

  return (
    <main className="min-h-screen bg-[#171A26]">
      <section className="relative py-16 md:py-24 bg-cover bg-center"
        style={{ backgroundImage: "url(/assets/img/banner.jpg)" }}
      >
        <div className="absolute inset-0 bg-black/70" />
        <div className="container relative z-10 mx-auto px-4 max-w-7xl">
          <Link
            href="/champions"
            className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-[#FFB70F] mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            All champions
          </Link>
          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8 items-start">
            <div className="w-40 h-40 md:w-52 md:h-52 rounded-full overflow-hidden border-2 border-[#FFB70F]/40 bg-gray-900 mx-auto md:mx-0 shrink-0">
              {photo ? (
                <SafeImage
                  src={photo}
                  alt={champion.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600">
                  <Trophy className="w-16 h-16" />
                </div>
              )}
            </div>
            <div className="text-center md:text-left space-y-3">
              <h1 className="text-3xl md:text-5xl font-bold text-white uppercase">
                {champion.name}
              </h1>
              {champion.headline ? (
                <p className="text-lg md:text-xl text-[#FFB70F]">
                  {champion.headline}
                </p>
              ) : null}
              {champion.short_bio ? (
                <p className="text-gray-300 max-w-2xl">{champion.short_bio}</p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-7xl space-y-12">
          {champion.success_story ? (
            <div className="max-w-3xl space-y-3">
              <h2 className="text-xl font-semibold text-white uppercase tracking-wide">
                Success story
              </h2>
              <div className="text-gray-300 whitespace-pre-line leading-relaxed">
                {champion.success_story}
              </div>
            </div>
          ) : null}

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white uppercase tracking-wide">
              Achievements
              {achievements.length > 0 ? (
                <span className="text-gray-500 font-normal text-base ml-2">
                  ({achievements.length})
                </span>
              ) : null}
            </h2>
            {achievements.length === 0 ? (
              <p className="text-gray-500 text-sm">
                Achievements for this champion will appear here when published.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements.map((a) => (
                  <article
                    key={a.id}
                    className="rounded-lg border border-gray-800 bg-gray-950/60 p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-white">
                        {a.title}
                      </h3>
                      <Badge
                        variant="outline"
                        className="border-[#FFB70F]/40 text-[#FFB70F] text-[10px]"
                      >
                        {recognitionLevelLabel(a.recognition_level)}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400">
                      {[
                        a.competition_name,
                        a.award_title,
                        a.place,
                        a.event_year ? String(a.event_year) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {a.description ? (
                      <p className="text-sm text-gray-300 whitespace-pre-line">
                        {a.description}
                      </p>
                    ) : null}
                    {(a.images?.length || 0) > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {a.images!.map((url) => {
                          const src = resolvePublicAssetUrl(url)
                          return (
                            <a
                              key={url}
                              href={src}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block w-20 h-20 rounded overflow-hidden bg-gray-900 border border-gray-800"
                            >
                              <SafeImage
                                src={src}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </a>
                          )
                        })}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-3 text-xs">
                      {(a.videos || []).map((url) => (
                        <a
                          key={url}
                          href={resolvePublicAssetUrl(url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#FFB70F] hover:underline"
                        >
                          Video <ExternalLink className="w-3 h-3" />
                        </a>
                      ))}
                      {(a.documents || []).map((url) => (
                        <a
                          key={url}
                          href={resolvePublicAssetUrl(url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#FFB70F] hover:underline"
                        >
                          Document <ExternalLink className="w-3 h-3" />
                        </a>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
