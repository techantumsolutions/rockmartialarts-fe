"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { ShowcaseAchievementCard, type ShowcaseAchievementItem } from "@/components/testimonials"
import { getBackendApiUrl } from "@/lib/config"

const LIMIT = 12

interface BranchAchievementsProps {
  branchId: string
}

function enrollmentAchievementToShowcase(
  a: Record<string, unknown>
): ShowcaseAchievementItem {
  const images = a.images as string[] | undefined
  const firstImg = Array.isArray(images) && images.length > 0 ? images[0] : undefined
  return {
    id: a.id as string | undefined,
    student_name: (a.student_name as string) || "Student",
    student_photo: null,
    achievement_title: (a.title as string) || "Achievement",
    description: (a.description as string) || null,
    image: (firstImg as string) || null,
  }
}

export function BranchAchievements({ branchId }: BranchAchievementsProps) {
  const [showcaseItems, setShowcaseItems] = useState<ShowcaseAchievementItem[]>([])
  const [fromStudentRecords, setFromStudentRecords] = useState<ShowcaseAchievementItem[]>([])
  const [loading, setLoading] = useState(true)
  const [skip, setSkip] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    if (!branchId) return
    let cancelled = false
    setLoading(true)
    setSkip(0)
    const showcaseUrl = getBackendApiUrl(
      `showcase-achievements?branch_id=${encodeURIComponent(branchId)}&skip=0&limit=${LIMIT}`
    )
    const recordsUrl = getBackendApiUrl(
      `achievements/public/branch/${encodeURIComponent(branchId)}?skip=0&limit=50`
    )
    Promise.all([
      fetch(showcaseUrl).then((res) => (res.ok ? res.json() : { achievements: [] })),
      fetch(recordsUrl).then((res) => (res.ok ? res.json() : { achievements: [] })),
    ])
      .then(([showcaseData, recordsData]) => {
        if (cancelled) return
        const list = showcaseData.achievements || []
        setShowcaseItems(list)
        setHasMore(list.length >= LIMIT)
        setSkip(list.length)
        const raw = recordsData.achievements || []
        setFromStudentRecords(
          Array.isArray(raw) ? raw.map((a: Record<string, unknown>) => enrollmentAchievementToShowcase(a)) : []
        )
      })
      .catch(() => {
        if (!cancelled) {
          setShowcaseItems([])
          setFromStudentRecords([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [branchId])

  const achievements = [...showcaseItems, ...fromStudentRecords]

  const loadMore = () => {
    fetch(
      getBackendApiUrl(
        `showcase-achievements?branch_id=${encodeURIComponent(branchId)}&skip=${skip}&limit=${LIMIT}`
      )
    )
      .then((res) => (res.ok ? res.json() : { achievements: [] }))
      .then((data) => {
        const list = data.achievements || []
        if (list.length === 0) {
          setHasMore(false)
          return
        }
        setShowcaseItems((prev) => [...prev, ...list])
        setSkip((s) => s + list.length)
        if (list.length < LIMIT) setHasMore(false)
      })
  }

  return (
    <section className="py-8 md:py-10 bg-[#171A26] relative z-10">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="w-16 h-1 bg-[#FFB70F] mx-auto mb-4" />
        <p className="text-[#FFB70F] uppercase tracking-widest text-sm mb-2 text-center">Accomplishments</p>
        <h2 className="text-3xl md:text-4xl font-bold text-[#FFB70F] mb-10 text-center">Student Achievements</h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-[#FFB70F]" />
          </div>
        ) : achievements.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No achievements yet</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {achievements.map((a, idx) => (
                <ShowcaseAchievementCard
                  key={a.id ? `${a.id}-${idx}` : `ach-${idx}-${a.achievement_title ?? ""}`}
                  item={a}
                />
              ))}
            </div>
            {hasMore && (
              <div className="text-center mt-10">
                <button
                  type="button"
                  onClick={loadMore}
                  className="inline-block rounded-lg bg-[#FFB70F] px-6 py-3 text-base font-semibold text-black hover:bg-[#F73322] hover:text-white transition-colors"
                >
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
