"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useParams } from "next/navigation"
import { BookOpen, IndianRupee, Loader2 } from "lucide-react"
import type { PartnerOrgLanding } from "@/lib/partnerOrgAPI"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import { stripUuidFromPriceDisplay } from "@/lib/priceDisplay"
import { formatCoursePriceLabel } from "@/lib/registrationPricing"

export default function PartnerOrgCoursesPage() {
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

  const rows = useMemo(() => {
    const orgSlug = data?.slug || slug
    const out: Array<{
      course: Record<string, unknown> & { id: string }
      branchName: string
      branchKey: string
      href: string
    }> = []
    for (const b of data?.branches || []) {
      const branchKey = String(b.slug || b.id)
      const branchName = String(b.name || b.code || "Branch")
      for (const c of b.courses || []) {
        const courseSlug = String(c.slug || c.id)
        out.push({
          course: c as Record<string, unknown> & { id: string },
          branchName,
          branchKey,
          href: `/partner-orgs/${encodeURIComponent(orgSlug)}/branches/${encodeURIComponent(branchKey)}/courses/${encodeURIComponent(courseSlug)}`,
        })
      }
    }
    return out
  }, [data, slug])

  if (loading) {
    return (
      <main className="flex justify-center py-24 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#FFB70F]" />
      </main>
    )
  }

  return (
    <main className="text-white pb-16">
      <section className="pt-10 pb-8 px-4 border-b border-gray-800">
        <div className="container mx-auto max-w-7xl">
          <p className="text-[#FFB70F] uppercase tracking-[0.2em] text-xs mb-2">
            {data?.hero?.name || "Partner"}
          </p>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Courses</h1>
          <p className="text-gray-300 max-w-2xl">
            All courses offered across this partner&apos;s branches.
          </p>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="container mx-auto max-w-7xl">
          {rows.length === 0 ? (
            <p className="text-center text-gray-400 py-16">No courses published yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {rows.map(({ course, branchName, href }) => {
                const media = course.media_resources as
                  | { course_image_url?: string }
                  | undefined
                const img = resolvePublicAssetUrl(media?.course_image_url || "")
                const title = String(course.title || course.name || "Course")
                const description = course.description
                  ? String(course.description)
                  : ""
                const price = stripUuidFromPriceDisplay(
                  formatCoursePriceLabel(course.pricing as never)
                )
                return (
                  <Link
                    key={`${branchName}-${course.id}`}
                    href={href}
                    className="group rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden flex flex-col hover:border-[#FFB70F]/60 transition-colors"
                  >
                    <div className="relative aspect-[16/10] bg-gray-800">
                      {img ? (
                        <Image
                          src={img}
                          alt={title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <BookOpen className="w-12 h-12 text-gray-600" />
                        </div>
                      )}
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <p className="text-xs text-[#FFB70F] mb-1">{branchName}</p>
                      <h2 className="text-lg font-bold mb-2 line-clamp-2 group-hover:text-[#FFB70F]">
                        {title}
                      </h2>
                      {description ? (
                        <p className="text-sm text-gray-400 mb-4 line-clamp-3 flex-1">
                          {description}
                        </p>
                      ) : null}
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <IndianRupee className="w-4 h-4 text-[#FFB70F]" />
                        <span>{price}</span>
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
