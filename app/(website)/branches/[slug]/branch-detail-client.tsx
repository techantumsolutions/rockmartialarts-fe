"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, ArrowLeft } from "lucide-react"
import AOS from "aos"
import {
  BranchHero,
  BranchInfoCards,
  BranchMap,
  BranchContact,
  BranchFacilities,
  BranchCourses,
  BranchAchievements,
} from "@/components/branch"
import type { BranchData } from "@/components/branch"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"

type BranchTestimonial = {
  student_name?: string
  name?: string
  role?: string
  quote?: string
  content?: string
  testimonial_text?: string
  image?: string
  student_photo?: string
  achievement?: string
  rating?: number
}

export default function BranchDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const [branch, setBranch] = useState<BranchData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [branchTestimonials, setBranchTestimonials] = useState<BranchTestimonial[]>([])
  const [testimonialsTitle, setTestimonialsTitle] = useState<string>("Rock Warriors")
  const [testimonialsSubtitle, setTestimonialsSubtitle] = useState<string>("Success stories")

  useEffect(() => {
    AOS.init({
      duration: 600,
      easing: "ease-out-cubic",
      once: true,
      offset: 120,
    })
  }, [])

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/backend/branches/public/by-slug/${encodeURIComponent(slug)}`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })
      .then((res) => {
        if (res.status === 404) return null
        if (!res.ok) throw new Error("Failed to load branch")
        return res.json()
      })
      .then((data) => {
        if (!cancelled) {
          setBranch(data ?? null)
          if (!data) setError("Branch not found")
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to load branch")
          setBranch(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  useEffect(() => {
    if (!branch?.slug || !slug) return
    const canonical = String(branch.slug).trim()
    if (!canonical) return
    if (decodeURIComponent(slug).toLowerCase() === canonical.toLowerCase()) return
    router.replace(`/branches/${encodeURIComponent(canonical)}`, { scroll: false })
  }, [branch?.slug, slug, router])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/backend/cms/public`, { cache: "no-store", headers: { "Content-Type": "application/json" } })
      .then(async (cmsRes) => {
        const cmsPayload = cmsRes.ok ? await cmsRes.json().catch(() => ({})) : {}
        if (cancelled) return
        const hp = cmsPayload?.homepage || {}
        if (typeof hp.testimonials_title === "string" && hp.testimonials_title.trim()) {
          setTestimonialsTitle(hp.testimonials_title.trim())
        }
        if (typeof hp.testimonials_subtitle === "string" && hp.testimonials_subtitle.trim()) {
          setTestimonialsSubtitle(hp.testimonials_subtitle.trim())
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!branch?.id) {
      setBranchTestimonials([])
      return
    }
    let cancelled = false
    fetch(`/api/backend/testimonials?branch_id=${encodeURIComponent(branch.id)}&limit=12`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    })
      .then(async (mRes) => {
        const mongo = mRes.ok ? await mRes.json().catch(() => ({})) : {}
        if (cancelled) return
        const mongoList = Array.isArray(mongo.testimonials) ? mongo.testimonials : []
        setBranchTestimonials(mongoList)
      })
      .catch(() => {
        if (!cancelled) setBranchTestimonials([])
      })
    return () => {
      cancelled = true
    }
  }, [branch?.id])

  useEffect(() => {
    AOS.refresh()
  }, [branch])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#171A26] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-gray-400">
          <Loader2 className="w-12 h-12 animate-spin text-[#FFB70F]" />
          <p>Loading branch...</p>
        </div>
      </main>
    )
  }

  if (error || !branch) {
    return (
      <main className="min-h-screen bg-[#171A26] flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Branch not found</h1>
          <p className="text-gray-400 mb-6">{error || "This branch may no longer exist."}</p>
          <Link
            href="/branches"
            className="inline-flex items-center gap-2 text-[#FFB70F] hover:text-white font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to branches page
          </Link>
        </div>
      </main>
    )
  }

  const coverImage =
    (branch as BranchData & { gallery_images?: string[] }).gallery_images?.[0] ?? null

  return (
    <main className="min-h-screen bg-[#171A26]">
      <BranchHero branch={branch} coverImageUrl={coverImage} />
      <BranchCourses branch={branch} />
      <section className="py-16 md:py-20 bg-[#171A26] relative z-10">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-12" data-aos="fade-up">
            <div className="w-16 h-1 bg-[#FFB70F] mx-auto mb-4" />
            <p className="text-[#FFB70F] uppercase tracking-widest text-sm mb-2">{testimonialsSubtitle}</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#FFB70F]">{testimonialsTitle}</h2>
          </div>
          {branchTestimonials.length === 0 ? (
            <p className="text-center text-gray-500 py-8 text-sm">No testimonials available</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {branchTestimonials.map((t, i) => (
                <div
                  key={`${t.student_name || t.name}-${i}`}
                  className="bg-gray-900/50 rounded-xl p-6 border border-gray-800 h-full flex flex-col items-center text-center"
                  data-aos="fade-up"
                  data-aos-delay={i * 80}
                >
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#FFB70F]/50 mb-4 flex-shrink-0">
                    {t.image || t.student_photo ? (
                      <img
                        src={resolvePublicAssetUrl(t.image || t.student_photo || "")}
                        alt={t.student_name || t.name || "Student"}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-700 flex items-center justify-center text-2xl text-gray-400">
                        👤
                      </div>
                    )}
                  </div>
                  <img
                    src="/assets/img/courses/quote.png"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-8 h-8 mb-2 opacity-80"
                  />
                  <p className="text-gray-300 text-sm leading-relaxed mb-4 flex-1">
                    {(t.testimonial_text || t.quote || t.content)?.trim() ||
                      "We're proud of every student who trains with us — discipline, confidence, and growth show in every class."}
                  </p>
                  <h3 className="text-[#FFB70F] font-semibold">{t.student_name || t.name}</h3>
                  {t.achievement?.trim() ? (
                    <p className="text-[#FFB70F]/90 text-xs font-medium uppercase tracking-wide mt-1">
                      {t.achievement}
                    </p>
                  ) : null}
                  {t.rating != null && t.rating > 0 ? (
                    <p className="text-[#FFB70F] text-xs mt-1">★ {Number(t.rating).toFixed(1)}</p>
                  ) : null}
                  {t.role?.trim() ? <p className="text-white/80 text-sm mt-1">{t.role}</p> : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      <BranchAchievements branchId={branch.id} />
      <BranchFacilities branch={branch} />
      <BranchInfoCards branch={branch} />
      <BranchMap branch={branch} />
      <BranchContact branch={branch} />
    </main>
  )
}
