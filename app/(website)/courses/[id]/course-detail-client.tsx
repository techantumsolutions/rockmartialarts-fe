"use client"

import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import {
  ArrowLeft,
  Loader2,
  Play,
  MapPin,
  Clock,
  IndianRupee,
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
  Quote,
} from "lucide-react"
import { stripUuidFromPriceDisplay } from "@/lib/priceDisplay"
import { ShowcaseAchievementCard, type ShowcaseAchievementItem } from "@/components/testimonials"
import { SafeImage, DEFAULT_IMAGE_PLACEHOLDER } from "@/components/ui/safe-image"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import { AddToCartModal } from "@/components/cart/AddToCartModal"

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type CourseInfoSection = { title?: string; content?: string; bullet_points?: string[]; image?: string; layout?: "image_left" | "image_right" }
type SectionHeading = { sub?: string; title?: string }

type PageContent = {
  section_visibility?: Partial<Record<string, boolean>>
  hero_section?: { title?: string; subtitle?: string; description?: string; hero_image?: string; cta_text?: string; cta_link?: string }
  course_info?: { location?: string; duration?: string; price?: string; training_time?: string }
  course_info_sections?: CourseInfoSection[]
  about_section?: {
    title?: string
    aboutTitle?: string
    description?: string
    aboutDescription?: string
    secondary_description?: string
    image1?: string
    image2?: string
    /** Legacy seeded data — not editable in admin; ignored on public page. */
    content_blocks?: unknown[]
  }
  benefits?: { title: string; description: string; icon?: string }[]
  learning_section?: { title?: string; description?: string; video_url?: string; thumbnail?: string }
  gallery_images?: string[]
  instructors?: { name: string; designation: string; bio?: string; photo?: string }[]
  testimonials?: { name: string; designation: string; text: string; photo?: string }[]
  pdf_attachments?: { title: string; file_url: string }[]
  /** Optional headings for public page sections (set from admin / CMS JSON) */
  section_headings?: Partial<{
    benefits: SectionHeading
    learning: SectionHeading
    gallery: SectionHeading
    instructors: SectionHeading
    testimonials: SectionHeading
    attachments: SectionHeading
    course_content: SectionHeading
  }>
  cta_section?: { headline?: string }
}

type CourseData = {
  id: string
  slug?: string
  showcase_achievements?: ShowcaseAchievementItem[]
  title?: string
  course_name?: string
  code?: string
  /** Explicit About section copy from public API (mirrors page_content.about_section) */
  aboutTitle?: string
  aboutDescription?: string
  difficulty_level?: string
  page_content?: PageContent
  course_content?: { syllabus?: string; equipment_required?: string[] }
  media_resources?: { course_image_url?: string; promo_video_url?: string }
  fee_per_duration?: Record<string, number>
  available_durations?: { id: string; name?: string; duration_months?: number; code?: string }[]
  branch_assignments?: { branch_id: string; branch_name: string; location: string }[]
  [key: string]: any
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function SectionLabel({ sub, title }: { sub?: string; title?: string }) {
  if (!sub?.trim() && !title?.trim()) return null
  return (
    <div className="text-center mb-10">
      <div className="w-16 h-1 bg-[#FFB70F] mx-auto mb-4" />
      {sub?.trim() ? (
        <p className="text-[#F73322] uppercase tracking-[0.25em] text-sm font-semibold mb-2">{sub}</p>
      ) : null}
      {title?.trim() ? (
        <h2 className="text-3xl md:text-4xl font-extrabold text-white uppercase" style={{ fontFamily: "'Oswald', sans-serif" }}>{title}</h2>
      ) : null}
    </div>
  )
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?#]+)/)
  return m ? m[1] : null
}

function resolveUploadUrl(url?: string): string {
  return resolvePublicAssetUrl(url)
}

type CourseInstructor = { name: string; designation: string; bio?: string; photo?: string }

function mapAssignedCoachesToInstructors(course: CourseData): CourseInstructor[] {
  const raw =
    (course.assigned_coaches as Array<Record<string, unknown>> | undefined) ||
    (course.instructor_assignments as Array<Record<string, unknown>> | undefined) ||
    []
  return raw
    .map((c) => ({
      name: String(c.name ?? c.instructor_name ?? c.full_name ?? "").trim(),
      designation: String(c.designation ?? c.role ?? "Coach").trim(),
      bio: String(c.bio ?? c.about_short ?? "").trim() || undefined,
      photo: String(c.photo ?? c.profile_image_url ?? "").trim() || undefined,
    }))
    .filter((c) => c.name)
}

function flattenPublicCoursePayload(data: Record<string, unknown>): CourseData {
  const nested = data.course
  const base = (
    nested && typeof nested === "object" && !Array.isArray(nested)
      ? nested
      : data
  ) as CourseData
  const offering = (data.branches_offering || base.branches_offering || []) as Array<{
    id?: string
    branch_id?: string
    name?: string
    branch_name?: string
    location?: string
  }>
  const fromOffering = offering
    .map((b) => ({
      branch_id: String(b.branch_id || b.id || ""),
      branch_name: String(b.branch_name || b.name || ""),
      location: String(b.location || ""),
    }))
    .filter((b) => b.branch_id)
  const existing = Array.isArray(base.branch_assignments) ? base.branch_assignments : []
  return {
    ...base,
    assigned_coaches: (data.assigned_coaches as CourseData["assigned_coaches"]) || base.assigned_coaches,
    instructor_assignments:
      (data.instructor_assignments as CourseData["assigned_coaches"]) || base.instructor_assignments,
    showcase_achievements:
      (data.showcase_achievements as CourseData["showcase_achievements"]) || base.showcase_achievements,
    branch_assignments: existing.length > 0 ? existing : fromOffering,
  }
}

const LAST_BRANCH_STORAGE_KEY = "rock_course_detail_branch_id"

type BranchPricingInfo = {
  branch_id: string
  branch_name?: string
  duration?: string
  price_display?: string
  timings?: string
  fee_per_duration?: Record<string, number | string> | null
  pricing_type_per_duration?: Record<string, string> | null
}

function normalizeFeeMap(raw: Record<string, number | string> | null | undefined): Record<string, number> | null {
  if (!raw || typeof raw !== "object") return null
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "number" && !Number.isNaN(v)) out[k] = v
    else if (typeof v === "string") {
      const n = parseFloat(v.replace(/[^\d.-]/g, ""))
      if (!Number.isNaN(n)) out[k] = n
    }
  }
  return Object.keys(out).length ? out : null
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

function CourseDetailPageInner() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = params.id as string
  const [course, setCourse] = useState<CourseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [testimonialIdx, setTestimonialIdx] = useState(0)
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [cartModalOpen, setCartModalOpen] = useState(false)
  const [selectedDurationKey, setSelectedDurationKey] = useState<string | null>(null)
  const [branchPricingInfo, setBranchPricingInfo] = useState<BranchPricingInfo | null>(null)
  const [branchPricingLoading, setBranchPricingLoading] = useState(false)
  const branchInitDoneRef = useRef(false)
  const [showcaseAchievements, setShowcaseAchievements] = useState<ShowcaseAchievementItem[]>([])
  const [showcaseLoading, setShowcaseLoading] = useState(false)

  useEffect(() => {
    branchInitDoneRef.current = false
  }, [slug])

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    fetch(`/api/backend/courses/public/by-slug/${encodeURIComponent(slug)}`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Course not found" : "Failed to load")
        return res.json()
      })
      .then((data) => setCourse(flattenPublicCoursePayload(data)))
      .catch((e) => { setError(e.message); setCourse(null) })
      .finally(() => setLoading(false))
  }, [slug])

  /* After course loads: pick branch from ?branchId, localStorage, or first assignment */
  useEffect(() => {
    if (loading || !course) return
    const branches = (course.branch_assignments || []) as { branch_id: string }[]
    const canonical = (course.slug || slug).toString().trim()
    const shouldCanonicalize = decodeURIComponent(slug).toLowerCase() !== canonical.toLowerCase()

    if (branches.length === 0) {
      if (shouldCanonicalize && canonical) {
        const qs = searchParams.toString()
        router.replace(`/courses/${encodeURIComponent(canonical)}${qs ? `?${qs}` : ""}`, { scroll: false })
      }
      branchInitDoneRef.current = true
      return
    }
    if (branchInitDoneRef.current) return

    const q = searchParams.get("branchId")
    let pick: string | null = null
    if (q && branches.some((b) => b.branch_id === q)) pick = q
    else {
      try {
        const last = typeof window !== "undefined" ? localStorage.getItem(LAST_BRANCH_STORAGE_KEY) : null
        if (last && branches.some((b) => b.branch_id === last)) pick = last
      } catch {
        /* ignore */
      }
    }
    if (!pick) pick = branches[0].branch_id
    setSelectedLocationId(pick)

    const currentQ = searchParams.get("branchId")
    const pathSlug = canonical || slug
    if (pick && (pick !== currentQ || decodeURIComponent(slug).toLowerCase() !== pathSlug.toLowerCase())) {
      router.replace(`/courses/${encodeURIComponent(pathSlug)}?branchId=${encodeURIComponent(pick)}`, { scroll: false })
    }
    branchInitDoneRef.current = true
  }, [loading, course, slug, searchParams, router])

  const persistBranchAndUrl = useCallback(
    (branchId: string | null) => {
      setSelectedLocationId(branchId)
      if (!branchId) return
      try {
        localStorage.setItem(LAST_BRANCH_STORAGE_KEY, branchId)
      } catch {
        /* ignore */
      }
      router.replace(`/courses/${encodeURIComponent(course?.slug || slug)}?branchId=${encodeURIComponent(branchId)}`, { scroll: false })
    },
    [router, slug, course?.slug]
  )

  const branchesForFetch = (course?.branch_assignments || []) as { branch_id: string }[]
  const effectiveLocationForFetch =
    selectedLocationId ?? (branchesForFetch[0]?.branch_id ?? null)

  useEffect(() => {
    if (loading || !course?.id || !effectiveLocationForFetch) {
      if (!loading && (!course?.id || !effectiveLocationForFetch)) {
        setBranchPricingInfo(null)
      }
      if (loading) setBranchPricingLoading(false)
      return
    }
    let cancelled = false
    setBranchPricingLoading(true)
    fetch(
      `/api/backend/courses/public/detail/${encodeURIComponent(course.id)}/branch-info?branch_id=${encodeURIComponent(effectiveLocationForFetch)}`,
      { headers: { "Content-Type": "application/json" }, cache: "no-store" }
    )
      .then(async (res) => ({ ok: res.ok, data: await res.json().catch(() => ({})) }))
      .then(({ ok, data }) => {
        if (cancelled) return
        if (!ok) {
          setBranchPricingInfo(null)
          return
        }
        setBranchPricingInfo(data as BranchPricingInfo)
      })
      .catch(() => {
        if (!cancelled) setBranchPricingInfo(null)
      })
      .finally(() => {
        if (!cancelled) setBranchPricingLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [loading, course?.id, effectiveLocationForFetch])

  useEffect(() => {
    if (!course?.id || !effectiveLocationForFetch) {
      setShowcaseAchievements([])
      return
    }
    let cancelled = false
    setShowcaseLoading(true)
    const load = async () => {
      try {
        const r1 = await fetch(
          `/api/backend/showcase-achievements?course_id=${encodeURIComponent(course.id)}&limit=30`,
          { cache: "no-store", headers: { "Content-Type": "application/json" } }
        )
        const d1 = await r1.json().catch(() => ({}))
        let list: ShowcaseAchievementItem[] = Array.isArray(d1.achievements) ? d1.achievements : []
        if (list.length === 0) {
          const r2 = await fetch(
            `/api/backend/showcase-achievements?branch_id=${encodeURIComponent(effectiveLocationForFetch)}&limit=30`,
            { cache: "no-store", headers: { "Content-Type": "application/json" } }
          )
          const d2 = await r2.json().catch(() => ({}))
          list = Array.isArray(d2.achievements) ? d2.achievements : []
        }
        if (!cancelled) setShowcaseAchievements(list)
      } catch {
        if (!cancelled) setShowcaseAchievements([])
      } finally {
        if (!cancelled) setShowcaseLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [course?.id, effectiveLocationForFetch])

  /* Loading / Error */
  if (loading) return <main className="min-h-screen bg-[#171A26] flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-[#FFB70F]" /></main>
  if (error || !course) return (
    <main className="min-h-screen bg-[#171A26] flex items-center justify-center px-4">
      <div className="text-center text-white"><p className="text-red-300 mb-6 text-lg">{error || "Course not found."}</p>
        <Link href="/courses" className="inline-flex items-center gap-2 rounded-lg bg-[#FFB70F] px-6 py-3 text-black font-semibold hover:bg-[#F73322] hover:text-white transition-colors"><ArrowLeft className="w-4 h-4" /> Back to Courses</Link>
      </div>
    </main>
  )

  const pc = course.page_content || {}
  const hero = pc.hero_section || {}
  const info = pc.course_info || {}
  const about = pc.about_section || {}
  const aboutTitle = String(course.aboutTitle ?? about.aboutTitle ?? about.title ?? "").trim()
  const aboutDescription = String(
    course.aboutDescription ?? about.aboutDescription ?? about.description ?? ""
  ).trim()
  const benefits = pc.benefits || []
  const learning = pc.learning_section || {}
  const gallery = pc.gallery_images || []
  const cmsInstructors = (pc.instructors || []) as CourseInstructor[]
  const assignedInstructors = mapAssignedCoachesToInstructors(course)
  const instructors: CourseInstructor[] =
    assignedInstructors.length > 0 ? assignedInstructors : cmsInstructors
  const testimonials = pc.testimonials || []
  const attachments = pc.pdf_attachments || []
  const courseInfoSections = (pc.course_info_sections || []) as CourseInfoSection[]
  const visibility = (pc.section_visibility || {}) as Partial<Record<string, boolean>>
  const enabled = (key: string) => visibility[key] !== false
  const courseContent = (course.course_content || {}) as { syllabus?: string; equipment_required?: string[] }
  const media = (course.media_resources || {}) as { course_image_url?: string; promo_video_url?: string }
  const headings = (pc.section_headings || {}) as PageContent["section_headings"]

  const displayTitle =
    (hero.title || course.title || course.course_name || "").trim() ||
    (typeof course.code === "string" ? course.code : "Course")
  const rawHeroImg = (hero.hero_image || media.course_image_url || "").trim()
  const heroImg = rawHeroImg ? resolveUploadUrl(rawHeroImg) : ""
  const aboutImage = resolveUploadUrl(about.image1 || about.image2 || "")

  const branches = (course.branch_assignments || []) as { branch_id: string; branch_name: string; location: string }[]
  const durations = (course.available_durations || []) as { id: string; name?: string; duration_months?: number; code?: string }[]
  const feePerDuration = (course.fee_per_duration || {}) as Record<string, number>

  const effectiveLocationId = selectedLocationId ?? (branches[0]?.branch_id ?? null)
  const effectiveDurationKey = selectedDurationKey ?? (durations[0]?.id ?? durations[0]?.code ?? null)

  const selectedBranch = branches.find((b) => b.branch_id === effectiveLocationId) || branches[0]

  const branchApplies =
    !!branchPricingInfo && branchPricingInfo.branch_id === effectiveLocationId

  const branchFeeMap = normalizeFeeMap(branchPricingInfo?.fee_per_duration || undefined)
  const mergedFeePerDuration =
    branchApplies && branchFeeMap && Object.keys(branchFeeMap).length > 0
      ? branchFeeMap
      : feePerDuration

  /* Merge pricing type maps: branch-specific overrides course-level */
  const coursePricingType = (course.pricing_type_per_duration || {}) as Record<string, string>
  const branchPricingType = (branchPricingInfo?.pricing_type_per_duration || {}) as Record<string, string>
  const mergedPricingType =
    branchApplies && Object.keys(branchPricingType).length > 0
      ? branchPricingType
      : coursePricingType

  let priceDisplay = ""
  if (effectiveDurationKey && mergedFeePerDuration && Object.keys(mergedFeePerDuration).length > 0) {
    const direct = mergedFeePerDuration[effectiveDurationKey]
    const dur = durations.find((d) => d.id === effectiveDurationKey || d.code === effectiveDurationKey)
    const byId = dur?.id ? mergedFeePerDuration[dur.id] : undefined
    let amount = direct ?? byId
    if (typeof amount === "number" && !Number.isNaN(amount)) {
      /* When pricing type is "monthly", multiply by duration months to get the total */
      const durKey = dur?.id ?? effectiveDurationKey
      const pType = mergedPricingType[durKey] || mergedPricingType[effectiveDurationKey] || ""
      const months = dur?.duration_months ?? 1
      if (pType === "monthly" && months > 1) {
        amount = amount * months
      }
      priceDisplay = `₹ ${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
    }
  }
  if (
    !priceDisplay &&
    branchApplies &&
    branchPricingInfo?.price_display &&
    branchPricingInfo.price_display !== "—"
  ) {
    priceDisplay = stripUuidFromPriceDisplay(branchPricingInfo.price_display)
  }
  /* Avoid global CMS / default fees when branch-specific pricing is active */
  if (!priceDisplay && !branchApplies && info.price) {
    priceDisplay = stripUuidFromPriceDisplay(info.price)
  }
  if (!priceDisplay && !branchApplies && effectiveDurationKey && feePerDuration) {
    const direct = feePerDuration[effectiveDurationKey]
    const dur = durations.find((d) => d.id === effectiveDurationKey || d.code === effectiveDurationKey)
    const byId = dur?.id ? feePerDuration[dur.id] : undefined
    let amount = direct ?? byId
    if (typeof amount === "number" && !Number.isNaN(amount)) {
      const durKey = dur?.id ?? effectiveDurationKey
      const pType = coursePricingType[durKey] || coursePricingType[effectiveDurationKey] || ""
      const months = dur?.duration_months ?? 1
      if (pType === "monthly" && months > 1) {
        amount = amount * months
      }
      priceDisplay = `₹ ${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
    }
  }

  const timingLine = (info.training_time || "").split(/\r?\n|[;,]/)[0]?.trim() || ""
  const timingDisplay =
    branchApplies && branchPricingInfo?.timings && branchPricingInfo.timings !== "—"
      ? branchPricingInfo.timings
      : timingLine
  const promoVideoUrl = media.promo_video_url || ""
  const effectiveLearningVideo = learning.video_url || promoVideoUrl

  return (
    <main className="min-h-screen bg-[#171A26] text-gray-300">
      {/* ============ 1. HERO ============ */}
      {enabled("hero") && (
        <section
          className={`relative min-h-[70vh] flex items-end overflow-hidden ${heroImg ? "" : "bg-gradient-to-br from-[#171A26] via-[#252a3d] to-black"}`}
          style={
            heroImg
              ? { backgroundImage: `url(${heroImg})`, backgroundSize: "cover", backgroundPosition: "center" }
              : undefined
          }
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" />
          <div className="container relative z-10 mx-auto px-4 max-w-7xl pb-16 pt-32">
            <h1 className="text-4xl md:text-6xl font-extrabold text-white uppercase leading-tight mb-4" style={{ fontFamily: "'Oswald', sans-serif" }}>
              {displayTitle}
            </h1>
            {hero.subtitle && <p className="text-lg md:text-xl text-gray-200 max-w-2xl mb-3">{hero.subtitle}</p>}
            {hero.description && <p className="text-gray-300 max-w-2xl mb-6">{hero.description}</p>}
            {hero.cta_text && (
              <Link href={hero.cta_link || "/register"} className="inline-block rounded-lg bg-[#F73322] px-8 py-3.5 text-base font-bold text-white hover:bg-[#FFB70F] hover:text-black transition-colors">
                {hero.cta_text}
              </Link>
            )}
          </div>
        </section>
      )}

      {/* ============ 2. INFO BAR (location / duration / price / timings) ============ */}
      {enabled("info_bar") && (info.location || durations.length > 0 || info.price || info.training_time) && (
        <section
          className={`bg-[#F73322] transition-opacity duration-300 ${
            branchPricingLoading && branches.length > 0 ? "opacity-[0.88]" : "opacity-100"
          }`}
        >
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/20">
              {/* Location selector */}
              {(branches.length > 0 || info.location) && (
                <div className="flex items-center gap-3 py-5 px-4 text-white">
                  <MapPin className="w-7 h-7 flex-shrink-0 opacity-90" />
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-white/80">Select Location</p>
                    {branches.length > 1 ? (
                      <select
                        className="mt-0.5 w-full bg-transparent text-[12px] font-semibold outline-none border-none focus:ring-0"
                        value={effectiveLocationId ?? ""}
                        onChange={(e) => persistBranchAndUrl(e.target.value || null)}
                      >
                        {branches.map((b) => (
                          <option key={b.branch_id} value={b.branch_id} className="text-black">
                            {b.branch_name || b.location}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-[12px] font-semibold truncate">
                        {selectedBranch?.branch_name || info.location}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Duration selector */}
              {(durations.length > 0 || info.duration) && (
                <div className="flex items-center gap-3 py-5 px-4 text-white">
                  <Calendar className="w-7 h-7 flex-shrink-0 opacity-90" />
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-white/80">Course Duration</p>
                    {durations.length > 0 ? (
                      <select
                        className="mt-0.5 w-full bg-transparent text-[12px] font-semibold outline-none border-none focus:ring-0"
                        value={effectiveDurationKey ?? ""}
                        onChange={(e) => setSelectedDurationKey(e.target.value || null)}
                      >
                        {durations.map((d) => (
                          <option key={d.id} value={d.id} className="text-black">
                            {d.name || d.code || `${d.duration_months ?? ""} month(s)`}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-[12px] font-semibold truncate">{info.duration}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Price details for selected duration */}
              {(priceDisplay || info.price || branchApplies) && (
                <div className="flex items-center gap-3 py-5 px-4 text-white">
                  <IndianRupee className="w-7 h-7 flex-shrink-0 opacity-90" />
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-white/80">Price Details</p>
                    <p className="text-[12px] font-semibold truncate flex items-center gap-1">
                      {branchPricingLoading && branches.length > 0 ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                          <span>Updating…</span>
                        </>
                      ) : (
                        priceDisplay ||
                        (info.price ? stripUuidFromPriceDisplay(info.price) : "") ||
                        (branchApplies ? "Contact branch for fees" : "")
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Timings - always single line */}
              {(timingDisplay || timingLine) && (
                <div className="flex items-center gap-3 py-5 px-4 text-white">
                  <Clock className="w-7 h-7 flex-shrink-0 opacity-90" />
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-white/80">Timings</p>
                    <p className="text-[12px] font-semibold truncate">{timingDisplay || timingLine}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ============ 3. ABOUT COURSE ============ */}
      {enabled("about") &&
        (aboutTitle ||
          aboutDescription ||
          about.secondary_description ||
          about.image1 ||
          about.image2) && (
        <section className="py-16 md:py-20 bg-white text-[#171A26]">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="flex flex-col lg:flex-row lg:items-center gap-8">
              {/* LEFT: text content (60%) */}
              <div className="w-full lg:w-[60%]">
                <p className="text-[#F73322] uppercase tracking-[0.2em] text-sm font-semibold mb-2">About {displayTitle}</p>
                <h2 className="text-3xl md:text-4xl font-extrabold text-[#171A26] uppercase mb-6" style={{ fontFamily: "'Oswald', sans-serif" }}>
                  {aboutTitle || "Start Today and Change Your Life"}
                </h2>
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  {aboutDescription && <p>{aboutDescription}</p>}
                  {about.secondary_description && <p>{about.secondary_description}</p>}
                </div>
              </div>
              {/* RIGHT: image (40%) */}
              {aboutImage && (
                <div className="w-full lg:w-[40%]">
                  <img
                    src={aboutImage}
                    alt="About Course"
                    className="rounded-xl w-full h-auto object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ============ CTA (Ready to Start Your Journey?) ============ */}
      {enabled("cta") && (
        <section className="py-12 bg-[#F73322]">
          <div className="container mx-auto px-4 max-w-7xl text-center">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white uppercase mb-4" style={{ fontFamily: "'Oswald', sans-serif" }}>
              {pc.cta_section?.headline?.trim() || "Ready to Start Your Journey?"}
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href={(hero.cta_link && hero.cta_link.trim()) || "/register"}
                className="inline-flex items-center justify-center rounded-lg bg-[#FFB70F] px-10 py-4 text-base font-bold text-black hover:bg-white transition-colors shadow-lg"
              >
                {hero.cta_text?.trim() || "Join Now"}
              </Link>
              {course?.id && effectiveLocationId && durations.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setCartModalOpen(true)}
                  className="inline-flex items-center justify-center rounded-lg border-2 border-white px-8 py-4 text-base font-bold text-white hover:bg-white hover:text-[#F73322] transition-colors"
                >
                  Add to cart
                </button>
              ) : null}
              <Link href="/courses" className="inline-flex items-center gap-2 text-white font-semibold hover:text-[#FFB70F] transition-colors">
                <ArrowLeft className="w-4 h-4" /> View All Courses
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ============ 3a. COURSE INFO SECTIONS (60-40 / 40-60 alternating) ============ */}
      {enabled("course_info_sections") && courseInfoSections.length > 0 && (
        <section className="py-16 md:py-20 bg-white text-[#171A26]">
          <div className="container mx-auto px-4 max-w-7xl space-y-16">
            {courseInfoSections.map((sec, idx) => {
              const textLeft = sec.layout !== "image_left"
              const hasImage = Boolean(sec.image)
              return (
                <div
                  key={idx}
                  className={
                    hasImage
                      ? "grid grid-cols-1 gap-8 md:gap-12 items-center md:grid-cols-5"
                      : "grid grid-cols-1 gap-6"
                  }
                >
                  <div className={hasImage ? (textLeft ? "md:col-span-3" : "md:col-span-3 md:order-2") : ""}>
                    {sec.title && <h2 className="text-2xl md:text-3xl font-extrabold text-[#171A26] uppercase mb-4" style={{ fontFamily: "'Oswald', sans-serif" }}>{sec.title}</h2>}
                    {sec.content && <div className="text-gray-700 leading-relaxed whitespace-pre-line mb-4">{sec.content}</div>}
                    {sec.bullet_points && sec.bullet_points.length > 0 && (
                      <ul className="list-none space-y-2">
                        {sec.bullet_points.filter(Boolean).map((bp, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-[#FFB70F] font-bold shrink-0">&gt;&gt;</span>
                            <span className="text-gray-700">{bp}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {hasImage && (
                    <div className={textLeft ? "md:col-span-2" : "md:col-span-2 md:order-1"}>
                      <img
                        src={resolveUploadUrl(sec.image)}
                        alt={sec.title || ""}
                        className="rounded-lg w-full object-cover"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ============ COURSE CONTENT (syllabus / equipment) ============ */}
      {enabled("course_content") && (courseContent.syllabus || (courseContent.equipment_required && courseContent.equipment_required.length > 0)) && (
        <section className="py-16 md:py-20 bg-[#1E2130]">
          <div className="container mx-auto px-4 max-w-7xl">
            {headings?.course_content?.sub?.trim() || headings?.course_content?.title?.trim() ? (
              <SectionLabel sub={headings?.course_content?.sub} title={headings?.course_content?.title} />
            ) : (
              <h2 className="sr-only">Syllabus and equipment — {displayTitle}</h2>
            )}
            <div className="max-w-4xl mx-auto bg-[#171A26] border border-gray-800 rounded-xl p-6 md:p-8 space-y-6">
              {courseContent.syllabus && (
                <div>
                  <h3 className="text-xl font-bold text-[#FFB70F] uppercase mb-3" style={{ fontFamily: "'Oswald', sans-serif" }}>
                    Syllabus
                  </h3>
                  <div className="text-gray-300 leading-relaxed whitespace-pre-line">
                    {courseContent.syllabus}
                  </div>
                </div>
              )}
              {courseContent.equipment_required && courseContent.equipment_required.filter(Boolean).length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-[#FFB70F] uppercase mb-3" style={{ fontFamily: "'Oswald', sans-serif" }}>
                    Equipment Required
                  </h3>
                  <ul className="list-none space-y-2">
                    {courseContent.equipment_required.filter(Boolean).map((eq, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#FFB70F] font-bold shrink-0">&gt;&gt;</span>
                        <span className="text-gray-300">{eq}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ============ 4. BENEFITS ============ */}
      {enabled("benefits") && benefits.length > 0 && (
        <section className="py-16 md:py-20 bg-[#1E2130]">
          <div className="container mx-auto px-4 max-w-7xl">
            {headings?.benefits?.sub?.trim() || headings?.benefits?.title?.trim() ? (
              <SectionLabel sub={headings?.benefits?.sub} title={headings?.benefits?.title} />
            ) : (
              <h2 className="sr-only">Benefits — {displayTitle}</h2>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {benefits.map((b, i) => (
                <div key={i} className="bg-[#171A26] border border-gray-800 rounded-xl p-6 hover:border-[#FFB70F] transition-colors text-center">
                  {b.icon && <span className="text-3xl block mb-3">{b.icon}</span>}
                  <h3 className="text-xl font-bold text-[#FFB70F] uppercase mb-2" style={{ fontFamily: "'Oswald', sans-serif" }}>{b.title}</h3>
                  <p className="text-gray-400 text-sm">{b.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ 5. LEARNING / VIDEO ============ */}
      {enabled("learning") && (learning.title || effectiveLearningVideo || learning.description) && (
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4 max-w-7xl">
            {headings?.learning?.sub?.trim() || headings?.learning?.title?.trim() || learning.title?.trim() ? (
              <SectionLabel
                sub={headings?.learning?.sub}
                title={headings?.learning?.title?.trim() ? headings.learning.title : learning.title}
              />
            ) : (
              <h2 className="sr-only">Classes and learning — {displayTitle}</h2>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="text-gray-400 leading-relaxed space-y-4">
                {learning.description && learning.description.split("\n").map((p, i) => <p key={i}>{p}</p>)}
              </div>
              {effectiveLearningVideo && (
                <div className="relative rounded-xl overflow-hidden aspect-video bg-black">
                  {getYouTubeId(effectiveLearningVideo) ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${getYouTubeId(effectiveLearningVideo)}`}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video controls className="w-full h-full object-cover" poster={learning.thumbnail || undefined}>
                      <source src={effectiveLearningVideo} type="video/mp4" />
                    </video>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ============ 6. GALLERY ============ */}
      {enabled("gallery") && gallery.length > 0 && (
        <section className="py-16 md:py-20 bg-[#1E2130]">
          <div className="container mx-auto px-4 max-w-7xl">
            {headings?.gallery?.sub?.trim() || headings?.gallery?.title?.trim() ? (
              <SectionLabel sub={headings?.gallery?.sub} title={headings?.gallery?.title} />
            ) : (
              <h2 className="sr-only">Gallery — {displayTitle}</h2>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {gallery.map((url, i) => (
                <div key={i} className="overflow-hidden rounded-lg group">
                  <img src={url} alt="" className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ 7. INSTRUCTORS ============ */}
      {enabled("instructors") && instructors.length > 0 && (
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4 max-w-7xl">
            {headings?.instructors?.sub?.trim() || headings?.instructors?.title?.trim() ? (
              <SectionLabel sub={headings?.instructors?.sub} title={headings?.instructors?.title} />
            ) : (
              <SectionLabel sub="Expert" title="Our Coaches" />
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {instructors.map((inst, i) => (
                <div key={i} className="text-center group">
                  <div className="relative w-48 h-48 mx-auto mb-4 rounded-full overflow-hidden border-4 border-[#F73322] group-hover:border-[#FFB70F] transition-colors bg-gray-800">
                    <SafeImage
                      src={inst.photo}
                      alt={inst.name}
                      className="w-full h-full object-cover"
                      fallbackSrc={DEFAULT_IMAGE_PLACEHOLDER}
                    />
                  </div>
                  <h3 className="text-lg font-bold text-[#F73322] uppercase" style={{ fontFamily: "'Oswald', sans-serif" }}>{inst.name}</h3>
                  <p className="text-gray-400 text-sm">{inst.designation}</p>
                  {inst.bio ? <p className="text-gray-500 text-xs mt-2 px-2">{inst.bio}</p> : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Student achievements (marketing showcase — MongoDB) */}
      <section className="py-16 md:py-20 bg-[#1E2130]">
        <div className="container mx-auto px-4 max-w-7xl">
          <SectionLabel sub="Celebrate" title="Student Achievements" />
          {showcaseLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-10 h-10 animate-spin text-[#FFB70F]" />
            </div>
          ) : showcaseAchievements.length === 0 ? (
            <p className="text-center text-gray-500 py-8 text-sm">No achievements yet</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {showcaseAchievements.map((a, i) => (
                <ShowcaseAchievementCard key={a.id || i} item={a} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ============ 8. TESTIMONIALS ============ */}
      {enabled("testimonials") && testimonials.length > 0 && (
        <section className="py-16 md:py-20 bg-[#1E2130]">
          <div className="container mx-auto px-4 max-w-7xl">
            {headings?.testimonials?.sub?.trim() || headings?.testimonials?.title?.trim() ? (
              <SectionLabel sub={headings?.testimonials?.sub} title={headings?.testimonials?.title} />
            ) : (
              <h2 className="sr-only">Testimonials — {displayTitle}</h2>
            )}
            <div className="max-w-4xl mx-auto">
              {/* Active testimonial */}
              <div className="bg-[#171A26] border border-gray-800 rounded-xl p-8 md:p-10 text-center relative">
                <Quote className="w-10 h-10 text-[#FFB70F] mx-auto mb-4 opacity-50" />
                <p className="text-gray-300 text-lg leading-relaxed mb-6 italic">&ldquo;{testimonials[testimonialIdx]?.text}&rdquo;</p>
                <p className="text-[#FFB70F] font-bold uppercase">{testimonials[testimonialIdx]?.name}</p>
                <p className="text-gray-500 text-sm">{testimonials[testimonialIdx]?.designation}</p>
              </div>
              {/* Carousel nav */}
              {testimonials.length > 1 && (
                <div className="flex items-center justify-center gap-6 mt-6">
                  <button onClick={() => setTestimonialIdx((p) => (p - 1 + testimonials.length) % testimonials.length)} className="w-10 h-10 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:border-[#FFB70F] hover:text-[#FFB70F] transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex gap-2">
                    {testimonials.map((_, i) => (
                      <button key={i} onClick={() => setTestimonialIdx(i)} className={`w-3 h-3 rounded-full transition-colors ${i === testimonialIdx ? "bg-[#FFB70F]" : "bg-gray-700"}`} />
                    ))}
                  </div>
                  <button onClick={() => setTestimonialIdx((p) => (p + 1) % testimonials.length)} className="w-10 h-10 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:border-[#FFB70F] hover:text-[#FFB70F] transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
              {/* Thumbnail row */}
              {testimonials.length > 1 && (
                <div className="flex justify-center gap-4 mt-6">
                  {testimonials.map((t, i) => (
                    <button key={i} onClick={() => setTestimonialIdx(i)} className={`flex flex-col items-center transition-opacity ${i === testimonialIdx ? "opacity-100" : "opacity-50 hover:opacity-80"}`}>
                      <div className={`w-14 h-14 rounded-full overflow-hidden border-2 ${i === testimonialIdx ? "border-[#FFB70F]" : "border-gray-700"}`}>
                        <SafeImage src={t.photo} alt={t.name} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[10px] text-gray-400 mt-1 max-w-[70px] truncate">{t.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ============ 9. PDF ATTACHMENTS ============ */}
      {enabled("attachments") && attachments.length > 0 && (
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4 max-w-7xl">
            {headings?.attachments?.sub?.trim() || headings?.attachments?.title?.trim() ? (
              <SectionLabel sub={headings?.attachments?.sub} title={headings?.attachments?.title} />
            ) : (
              <h2 className="sr-only">Downloads — {displayTitle}</h2>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
              {attachments.map((a, i) => (
                <a key={i} href={a.file_url} target="_blank" rel="noopener noreferrer" download className="flex items-center gap-3 bg-[#1E2130] border border-gray-800 rounded-lg px-5 py-4 hover:border-[#FFB70F] transition-colors group">
                  <Download className="w-6 h-6 text-[#FFB70F] group-hover:scale-110 transition-transform" />
                  <span className="text-gray-300 font-medium">{a.title || "Download"}</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {course?.id && effectiveLocationId ? (
        <AddToCartModal
          open={cartModalOpen}
          onOpenChange={setCartModalOpen}
          courseId={course.id}
          courseName={displayTitle}
          branchId={effectiveLocationId}
          branchName={selectedBranch?.branch_name || "Branch"}
          durations={durations
            .map((d) => ({
              id: (d.id || d.code || "").trim(),
              name: (d.name || d.code || "Duration").trim(),
            }))
            .filter((d) => d.id)}
        />
      ) : null}
    </main>
  )
}

export default function CourseDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#171A26] flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#FFB70F]" />
        </main>
      }
    >
      <CourseDetailPageInner />
    </Suspense>
  )
}
