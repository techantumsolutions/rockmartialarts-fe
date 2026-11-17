"use client"

import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
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
  ChevronDown,
  Check,
  Quote,
  X,
} from "lucide-react"
import { stripUuidFromPriceDisplay } from "@/lib/priceDisplay"
import { formatTimingString } from "@/lib/formatWeekdayRanges"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ShowcaseAchievementCard, type ShowcaseAchievementItem } from "@/components/testimonials"
import { SafeImage, DEFAULT_IMAGE_PLACEHOLDER } from "@/components/ui/safe-image"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import { AddToCartModal } from "@/components/cart/AddToCartModal"
import { toast } from "@/components/ui/use-toast"
import {
  enrollmentCartStaffBlockedMessage,
  getEnrollmentCartAccess,
} from "@/lib/enrollmentCartAccess"
import {
  isSectionEnabled,
  type CourseInfoSection,
  type PageContent,
} from "@/lib/coursePageContent"
import {
  CourseAboutSection,
  CourseFactGrid,
  CourseFinalCta,
  CourseHeroBlock,
  CourseLearnCards,
  CourseLineage,
  CoursePhilosophyPillars,
  CourseQualities,
  CourseSportAndAudience,
  CourseStyleCards,
  CourseTrainingPrograms,
  CourseWhoCanJoin,
} from "@/components/course-detail/CourseDetailSections"
import { applyCourseDetailDefaults } from "@/lib/courseDetailDefaults"

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
  media_resources?: { course_image_url?: string; promo_video_url?: string; video_poster_url?: string }
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
        <p className="text-[#FFB70F] uppercase tracking-[0.25em] text-sm font-semibold mb-2">{sub}</p>
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

/** M22-S01: Learning/Video player with poster chain, mobile playsInline, error fallback. */
function LearningVideoPlayer({
  videoUrl,
  posterUrl,
}: {
  videoUrl: string
  posterUrl?: string
}) {
  const [showPosterOverlay, setShowPosterOverlay] = useState(Boolean(posterUrl))
  const [mediaFailed, setMediaFailed] = useState(false)
  const ytId = getYouTubeId(videoUrl)
  const resolvedPoster = posterUrl ? resolveUploadUrl(posterUrl) : ""

  if (mediaFailed && resolvedPoster) {
    return (
      <div className="relative rounded-xl overflow-hidden aspect-video bg-black">
        <img
          src={resolvedPoster}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
    )
  }

  if (ytId) {
    return (
      <div className="relative rounded-xl overflow-hidden aspect-video bg-black">
        {showPosterOverlay && resolvedPoster ? (
          <button
            type="button"
            className="absolute inset-0 z-10 group"
            onClick={() => setShowPosterOverlay(false)}
            aria-label="Play video"
          >
            <img
              src={resolvedPoster}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/35 group-hover:bg-black/45 transition-colors">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFB70F] text-[#171A26] shadow-[0_10px_28px_rgba(255,183,15,0.35)]">
                <Play className="h-6 w-6 ml-0.5" fill="currentColor" />
              </span>
            </span>
          </button>
        ) : (
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?rel=0&playsinline=1`}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Course learning video"
          />
        )}
      </div>
    )
  }

  return (
    <div className="relative rounded-xl overflow-hidden aspect-video bg-black">
      <video
        controls
        playsInline
        preload="metadata"
        poster={resolvedPoster || undefined}
        className="w-full h-full object-cover"
        onError={() => setMediaFailed(true)}
      >
        <source src={resolveUploadUrl(videoUrl)} type="video/mp4" />
      </video>
    </div>
  )
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

const memoryCourseDetailCache: Record<string, CourseData> = {}

function getInitialCourseDetail(slug: string): CourseData | null {
  if (!slug) return null
  const decoded = decodeURIComponent(slug).toLowerCase()
  if (memoryCourseDetailCache[decoded]) return memoryCourseDetailCache[decoded]
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(`rma_course_detail_${decoded}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        memoryCourseDetailCache[decoded] = parsed
        return parsed
      }
    } catch {
      /* ignore */
    }
  }
  return null
}

function CourseDetailPageInner() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = params.id as string
  const courseRegistrationHref = (href?: string) => {
    const target = href?.trim() || "/register"
    const [pathAndQuery, hash] = target.split("#", 2)
    const [pathname, query = ""] = pathAndQuery.split("?", 2)
    if (!/^\/register(?:\/|$)/.test(pathname)) return target

    const queryParams = new URLSearchParams(query)
    queryParams.set("returnTo", `/courses/${encodeURIComponent(slug)}`)
    const search = queryParams.toString()
    return `${pathname}${search ? `?${search}` : ""}${hash ? `#${hash}` : ""}`
  }
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
  const [selectedBatchIndex, setSelectedBatchIndex] = useState(0)
  const [timingsOpen, setTimingsOpen] = useState(false)
  const [selectedGalleryImg, setSelectedGalleryImg] = useState<string | null>(null)

  const handleBackNavigation = useCallback((e: React.MouseEvent) => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      e.preventDefault()
      router.back()
    }
  }, [router])
  const [locationOpen, setLocationOpen] = useState(false)
  const [durationOpen, setDurationOpen] = useState(false)

  const handleAddToCartClick = useCallback(() => {
    if (typeof window === "undefined") return

    const access = getEnrollmentCartAccess()
    if (!access.allowed) {
      if (access.kind === "guest") {
        const returnPath = `${window.location.pathname}${window.location.search || ""}`
        window.location.href = `/login?returnUrl=${encodeURIComponent(returnPath)}`
        return
      }
      toast({
        title: "Student account required",
        description: enrollmentCartStaffBlockedMessage(access.roleLabel),
        variant: "destructive",
      })
      return
    }

    setCartModalOpen(true)
  }, [])

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
      .then((data) => {
        const flattened = flattenPublicCoursePayload(data)
        if (slug) {
          const decoded = decodeURIComponent(slug).toLowerCase()
          memoryCourseDetailCache[decoded] = flattened
          try {
            sessionStorage.setItem(`rma_course_detail_${decoded}`, JSON.stringify(flattened))
          } catch {
            /* ignore */
          }
        }
        setCourse(flattened)
      })
      .catch((e) => { setError(e.message); setCourse(null) })
      .finally(() => setLoading(false))
  }, [slug])

  /* After course loads: pick branch from ?branchId (legacy), localStorage, or first assignment.
     Keep branch selection in state/localStorage only — never expose branch UUID in the public URL. */
  useEffect(() => {
    if (loading || !course) return
    const branches = (course.branch_assignments || []) as { branch_id: string }[]
    const canonical = (course.slug || slug).toString().trim()
    const pathSlug = canonical || slug
    const slugNeedsCanonicalize =
      decodeURIComponent(slug).toLowerCase() !== pathSlug.toLowerCase()
    const hadBranchQuery = !!searchParams.get("branchId")

    const replaceCleanCourseUrl = () => {
      if (!pathSlug) return
      if (slugNeedsCanonicalize || hadBranchQuery) {
        router.replace(`/courses/${encodeURIComponent(pathSlug)}`, { scroll: false })
      }
    }

    if (branches.length === 0) {
      replaceCleanCourseUrl()
      branchInitDoneRef.current = true
      return
    }
    if (branchInitDoneRef.current) {
      // Still strip legacy ?branchId= if present on later renders
      if (hadBranchQuery) replaceCleanCourseUrl()
      return
    }

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
    try {
      if (pick) localStorage.setItem(LAST_BRANCH_STORAGE_KEY, pick)
    } catch {
      /* ignore */
    }

    replaceCleanCourseUrl()
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
      // Public URL stays course-slug only (no branch UUID query param).
      const pathSlug = course?.slug || slug
      if (pathSlug && searchParams.get("branchId")) {
        router.replace(`/courses/${encodeURIComponent(pathSlug)}`, { scroll: false })
      }
    },
    [router, slug, course?.slug, searchParams]
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
  if (loading) return <main className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-[#FFB70F]" /></main>
  if (error || !course) return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center text-white"><p className="text-red-300 mb-6 text-lg">{error || "Course not found."}</p>
        <Link href="/courses" onClick={handleBackNavigation} className="inline-flex items-center gap-2 rounded-lg bg-[#FFB70F] px-6 py-3 text-[#171A26] font-semibold hover:brightness-110 hover:shadow-[0_10px_28px_rgba(255,183,15,0.35)] transition-all"><ArrowLeft className="w-4 h-4" /> Back to Courses</Link>
      </div>
    </main>
  )

  const media = (course.media_resources || {}) as {
    course_image_url?: string
    promo_video_url?: string
    video_poster_url?: string
  }
  const courseContentRaw = (course.course_content || {}) as {
    syllabus?: string
    equipment_required?: string[]
  }
  const existingSyllabus = (courseContentRaw.syllabus || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
  const existingEquipment = (courseContentRaw.equipment_required || []).filter(Boolean)
  const provisionalTitle =
    (course.page_content?.hero_section?.title ||
      course.title ||
      course.course_name ||
      "").trim() ||
    (typeof course.code === "string" ? course.code : "Course")
  const rawExistingHero = (
    course.page_content?.hero_section?.hero_image ||
    media.course_image_url ||
    ""
  ).trim()

  const defaults = applyCourseDetailDefaults(
    provisionalTitle,
    course.page_content,
    {
      existingSyllabus,
      existingEquipment,
      existingHeroImage: rawExistingHero
        ? resolveUploadUrl(rawExistingHero)
        : undefined,
    }
  )
  const pc = defaults.page_content
  const hero = pc.hero_section || {}
  const info = pc.course_info || {}
  const about = pc.about_section || {}
  const aboutTitle = String(
    course.aboutTitle ?? about.aboutTitle ?? about.title ?? ""
  ).trim()
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
  const visibility = pc.section_visibility
  const enabled = (key: Parameters<typeof isSectionEnabled>[1]) =>
    isSectionEnabled(visibility, key)
  const layoutVariant = pc.layout_variant || "standard"
  const isHeritage = layoutVariant === "heritage"
  const isGoalBased = layoutVariant === "goal_based"
  const learnCards = pc.learn_cards || []
  const whoCanJoin = pc.who_can_join || {}
  const trainingPrograms = pc.training_programs || []
  const whyRmaa = pc.why_rmaa || {}
  const lineage = pc.lineage || {}
  const philosophyPillars = pc.philosophy_pillars || []
  const qualities = pc.qualities || []
  const sportSpotlight = pc.sport_spotlight || {}
  const styleCards = pc.style_cards || []
  const finalCta = pc.final_cta || {}
  const syllabusLines = defaults.syllabusLines
  const equipmentLines = defaults.equipment
  const learnVariant = defaults.learnVariant
  const headings = (pc.section_headings || {}) as PageContent["section_headings"]

  const displayTitle =
    (hero.title || course.title || course.course_name || "").trim() ||
    (typeof course.code === "string" ? course.code : "Course")
  const rawHeroImg = (hero.hero_image || media.course_image_url || "").trim()
  const heroImg = rawHeroImg
    ? resolveUploadUrl(rawHeroImg)
    : defaults.heroImageFallback || ""
  const branches = (course.branch_assignments || []) as { branch_id: string; branch_name: string; location: string }[]
  const durations = (course.available_durations || []) as { id: string; name?: string; duration_months?: number; code?: string }[]
  const feePerDuration = (course.fee_per_duration || {}) as Record<string, number>

  const effectiveLocationId = selectedLocationId ?? (branches[0]?.branch_id ?? null)
  const effectiveDurationKey = selectedDurationKey ?? (durations[0]?.id ?? durations[0]?.code ?? null)

  const selectedBranch = branches.find((b) => b.branch_id === effectiveLocationId) || branches[0]
  const selectedDuration =
    durations.find((duration) => duration.id === effectiveDurationKey || duration.code === effectiveDurationKey) ||
    durations[0]

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

  const timingLine = (info.training_time || "").trim()
  const rawTiming =
    branchApplies && branchPricingInfo?.timings && branchPricingInfo.timings !== "—"
      ? branchPricingInfo.timings
      : timingLine
  const timingDisplay = formatTimingString(rawTiming) || rawTiming
  const timingBatches = (timingDisplay || timingLine || "")
    .split(/\s*\|\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
  const promoVideoUrl = media.promo_video_url || ""
  const effectiveLearningVideo = learning.video_url || promoVideoUrl
  const learningPoster =
    (learning.thumbnail || "").trim() ||
    (media.video_poster_url || "").trim() ||
    (media.course_image_url || "").trim() ||
    ""

  return (
    <main className="min-h-screen text-gray-300">
      {/* ============ 1. HERO (left copy + right image) ============ */}
      {enabled("hero") && (
        <CourseHeroBlock
          title={displayTitle}
          subtitle={hero.subtitle}
          description={hero.description}
          imageUrl={heroImg}
          featureIcons={hero.feature_icons}
          primaryLabel={hero.cta_text || "Join Now"}
          primaryHref={courseRegistrationHref(hero.cta_link)}
          secondaryCtas={hero.secondary_ctas}
          showAddToCart={Boolean(course?.id && effectiveLocationId && durations.length > 0)}
          onAddToCart={handleAddToCartClick}
        />
      )}

      {/* ============ 2. INFO BAR (location / duration / price / timings) ============ */}
      {enabled("info_bar") && (info.location || durations.length > 0 || info.price || info.training_time) && (
        <section
          className={`bg-[#222635] border-y border-[#383D4D] transition-opacity duration-300 ${
            branchPricingLoading && branches.length > 0 ? "opacity-[0.88]" : "opacity-100"
          }`}
        >
          <div className="site-content px-0 sm:px-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-nowrap lg:items-stretch">
              {/* Location selector */}
              {(branches.length > 0 || info.location) && (
                <div className="flex items-center gap-2.5 py-3 px-3 sm:px-3.5 lg:py-3.5 lg:px-4 xl:px-5 lg:flex-1 lg:basis-0 lg:min-w-0 text-white border-b sm:border-r lg:border-r border-white/20 lg:border-b-0 last:border-r-0">
                  <MapPin className="w-6 h-6 sm:w-6.5 sm:h-6.5 flex-shrink-0 opacity-90" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10.5px] sm:text-[11px] uppercase tracking-wider text-white/80 font-medium leading-none">Select Location</p>
                    {branches.length > 1 ? (
                      <Popover open={locationOpen} onOpenChange={setLocationOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            aria-expanded={locationOpen}
                            aria-haspopup="listbox"
                            aria-label="Select location"
                            className="mt-1 flex w-full min-w-0 items-center justify-between gap-2 rounded text-left text-[12px] font-semibold leading-tight text-white transition hover:text-[#FFB70F]"
                          >
                            <span className="truncate">
                              {selectedBranch?.branch_name || branches.find((branch) => branch.branch_id === effectiveLocationId)?.branch_name || info.location}
                            </span>
                            <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${locationOpen ? "rotate-180" : ""}`} />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="start"
                          sideOffset={6}
                          className="z-[200] w-[var(--radix-popover-trigger-width)] min-w-[200px] border border-[#FFB70F]/40 bg-[#171A26] p-1.5 text-white shadow-2xl"
                        >
                          <div role="listbox" aria-label="Locations" className="max-h-60 overflow-y-auto">
                            {branches.map((branch) => {
                              const selected = branch.branch_id === effectiveLocationId
                              return (
                                <button
                                  key={branch.branch_id}
                                  type="button"
                                  role="option"
                                  aria-selected={selected}
                                  onClick={() => {
                                    persistBranchAndUrl(branch.branch_id || null)
                                    setLocationOpen(false)
                                  }}
                                  className={`w-full rounded-md px-3 py-2.5 text-left text-sm text-white transition hover:bg-[#FFB70F] hover:text-[#171A26] ${selected ? "bg-[#FFB70F]/20 font-semibold" : ""}`}
                                >
                                  {branch.branch_name || branch.location}
                                </button>
                              )
                            })}
                          </div>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <p className="mt-1 text-[12px] font-semibold truncate leading-tight">
                        {selectedBranch?.branch_name || info.location}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Duration selector */}
              {(durations.length > 0 || info.duration) && (
                <div className="flex items-center gap-2.5 py-3 px-3 sm:px-3.5 lg:py-3.5 lg:px-4 xl:px-5 lg:flex-1 lg:basis-0 lg:min-w-0 text-white border-b sm:border-r-0 lg:border-r border-white/20 lg:border-b-0 last:border-r-0">
                  <Calendar className="w-6 h-6 sm:w-6.5 sm:h-6.5 flex-shrink-0 opacity-90" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10.5px] sm:text-[11px] uppercase tracking-wider text-white/80 font-medium leading-none">Course Duration</p>
                    {durations.length > 0 ? (
                      <Popover open={durationOpen} onOpenChange={setDurationOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            aria-expanded={durationOpen}
                            aria-haspopup="listbox"
                            aria-label="Select course duration"
                            className="mt-1 flex w-full min-w-0 items-center justify-between gap-2 rounded text-left text-[12px] font-semibold leading-tight text-white transition hover:text-[#FFB70F]"
                          >
                            <span className="truncate">
                              {selectedDuration?.name ||
                                selectedDuration?.code ||
                                `${selectedDuration?.duration_months ?? ""} month(s)`}
                            </span>
                            <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${durationOpen ? "rotate-180" : ""}`} />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="start"
                          sideOffset={6}
                          className="z-[200] w-[var(--radix-popover-trigger-width)] min-w-[200px] border border-[#FFB70F]/40 bg-[#171A26] p-1.5 text-white shadow-2xl"
                        >
                          <div role="listbox" aria-label="Course durations" className="max-h-60 overflow-y-auto">
                            {durations.map((duration) => {
                              const selected = duration.id === effectiveDurationKey
                              return (
                                <button
                                  key={duration.id}
                                  type="button"
                                  role="option"
                                  aria-selected={selected}
                                  onClick={() => {
                                    setSelectedDurationKey(duration.id || null)
                                    setDurationOpen(false)
                                  }}
                                  className={`w-full rounded-md px-3 py-2.5 text-left text-sm text-white transition hover:bg-[#FFB70F] hover:text-[#171A26] ${selected ? "bg-[#FFB70F]/20 font-semibold" : ""}`}
                                >
                                  {duration.name || duration.code || `${duration.duration_months ?? ""} month(s)`}
                                </button>
                              )
                            })}
                          </div>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <p className="mt-1 text-[12px] font-semibold truncate leading-tight">{info.duration}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Price details for selected duration */}
              {(priceDisplay || info.price || branchApplies) && (
                <div className="flex items-center gap-2.5 py-3 px-3 sm:px-3.5 lg:py-3.5 lg:px-4 xl:px-5 lg:flex-1 lg:basis-0 lg:min-w-0 text-white border-b sm:border-b-0 sm:border-r lg:border-r border-white/20 lg:border-b-0 last:border-r-0">
                  <IndianRupee className="w-6 h-6 sm:w-6.5 sm:h-6.5 flex-shrink-0 opacity-90" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10.5px] sm:text-[11px] uppercase tracking-wider text-white/80 font-medium leading-none">Price Details</p>
                    <p className="mt-1 text-[12px] font-semibold whitespace-nowrap flex items-center gap-1 leading-tight">
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

              {/* Timings */}
              {(timingBatches.length > 0 || timingDisplay || timingLine) && (
                <div className="flex items-center gap-2.5 py-3 px-3 sm:px-3.5 lg:py-3.5 lg:px-4 xl:px-5 lg:flex-1 lg:basis-0 lg:min-w-0 text-white last:border-r-0">
                  <Clock className="w-6 h-6 sm:w-6.5 sm:h-6.5 flex-shrink-0 opacity-90" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10.5px] sm:text-[11px] uppercase tracking-wider text-white/80 font-medium leading-none">Timings</p>
                    {timingBatches.length > 1 ? (
                      <Popover open={timingsOpen} onOpenChange={setTimingsOpen}>
                        <div className="mt-1 flex items-center gap-1.5 flex-nowrap min-w-0">
                          <span className="text-[12px] font-semibold text-white whitespace-nowrap leading-tight truncate">
                            {timingBatches[selectedBatchIndex] ?? timingBatches[0]}
                          </span>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-full bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 text-[11px] font-semibold transition-colors shrink-0 cursor-pointer shadow-sm active:scale-95 whitespace-nowrap leading-tight"
                              title="Click to view more timings"
                              aria-label="View more timings"
                            >
                              +{timingBatches.length - 1} more
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${timingsOpen ? "rotate-180" : ""}`} />
                            </button>
                          </PopoverTrigger>
                        </div>
                        <PopoverContent
                          align="start"
                          sideOffset={8}
                          className="z-[200] w-auto min-w-[280px] max-w-[min(94vw,420px)] rounded-xl border border-[#FFB70F]/40 bg-[#171A26] p-3 text-white shadow-2xl sm:min-w-[340px]"
                        >
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-xs font-semibold text-gray-300">
                            <span className="flex items-center gap-1.5 text-[#FFB70F]">
                              <Clock className="w-3.5 h-3.5" /> All Available Timings ({timingBatches.length})
                            </span>
                          </div>
                          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                            {timingBatches.map((batch, idx) => {
                              const isSelected = idx === (selectedBatchIndex < timingBatches.length ? selectedBatchIndex : 0);
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setSelectedBatchIndex(idx);
                                    setTimingsOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                                    isSelected
                                      ? "bg-[#FFB70F] text-[#171A26] font-semibold shadow-sm"
                                      : "bg-white/5 hover:bg-white/10 text-gray-200"
                                  }`}
                                >
                                  <span className="leading-snug">{batch}</span>
                                  {isSelected ? (
                                    <Check className="w-4 h-4 shrink-0 text-[#171A26]" />
                                  ) : (
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wider shrink-0">Batch {idx + 1}</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <p className="mt-1 text-[12px] font-semibold text-white whitespace-nowrap leading-tight">
                        {timingBatches[0] || timingDisplay || timingLine}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ============ ABOUT ============ */}
      {enabled("about") &&
        (aboutTitle || aboutDescription || about.secondary_description) && (
        <CourseAboutSection
          title={aboutTitle || `About ${displayTitle}`}
          description={aboutDescription}
          secondary={about.secondary_description}
        />
      )}

      {/* Shaolin-only heritage blocks */}
      {isHeritage && enabled("lineage") && (lineage.title || lineage.body) ? (
        <CourseLineage content={lineage} />
      ) : null}
      {isHeritage && enabled("philosophy") && philosophyPillars.length > 0 ? (
        <CoursePhilosophyPillars items={philosophyPillars} />
      ) : null}

      {/* What You'll Learn — own section, 6 cards in 1 row */}
      {enabled("learn_cards") && learnCards.length > 0 ? (
        <CourseLearnCards
          title={
            headings?.learn_cards?.title ||
            (isGoalBased ? "What You'll Get" : "What You'll Learn")
          }
          items={learnCards}
          variant={learnVariant}
          light={isHeritage || learnVariant === "icon"}
        />
      ) : null}

      {isHeritage && enabled("qualities") && qualities.length > 0 ? (
        <CourseQualities items={qualities} />
      ) : null}

      {/* Who Can Join — own full-width row (not paired with Learn) */}
      {!isHeritage &&
      enabled("who_can_join") &&
      ((whoCanJoin.items || []).length > 0 || whoCanJoin.note) ? (
        <CourseWhoCanJoin content={whoCanJoin} />
      ) : null}

      {/* Optional sport spotlight (Kickboxing / MMA) — never pairs Who */}
      {!isHeritage &&
      enabled("sport_spotlight") &&
      (sportSpotlight.title || sportSpotlight.body) ? (
        <CourseSportAndAudience sport={sportSpotlight} />
      ) : null}

      {/* Western Dance style cards */}
      {!isHeritage && enabled("style_cards") && styleCards.length > 0 ? (
        <CourseStyleCards
          title={headings?.style_cards?.title || "Dance Styles We Teach"}
          items={styleCards}
        />
      ) : null}

      {/* Training Program */}
      {!isHeritage && enabled("training_programs") && trainingPrograms.length > 0 ? (
        <CourseTrainingPrograms
          title={headings?.training_programs?.title || "Training Program"}
          subtitle={
            headings?.training_programs?.sub ||
            (isGoalBased
              ? "Choose a goal-based training program based on your fitness needs."
              : "Choose the right training path based on your goal.")
          }
          programs={trainingPrograms}
          goalBased={isGoalBased || trainingPrograms.length > 2}
        />
      ) : null}

      {/* Fact grid: syllabus / equipment / benefits / why RMAA */}
      {!isHeritage &&
      (enabled("course_content") || enabled("benefits") || enabled("why_rmaa")) &&
      (syllabusLines.length > 0 ||
        equipmentLines.length > 0 ||
        (enabled("benefits") && benefits.length > 0) ||
        (enabled("why_rmaa") && (whyRmaa.body || (whyRmaa.items || []).length > 0))) ? (
        <CourseFactGrid
          syllabusLines={enabled("course_content") ? syllabusLines : undefined}
          equipment={enabled("course_content") ? equipmentLines : undefined}
          equipmentTitle={
            headings?.course_content?.title?.trim() || "Equipment Required"
          }
          benefits={enabled("benefits") ? benefits : undefined}
          whyRmaa={enabled("why_rmaa") ? whyRmaa : undefined}
        />
      ) : null}

      {/* Heritage gallery only */}
      {isHeritage && enabled("gallery") && gallery.length > 0 && (
        <section className="bg-[#0B0C10] py-14 md:py-20">
          <div className="site-content px-0 sm:px-1">
            <SectionLabel
              sub={headings?.gallery?.sub || "Training"}
              title={headings?.gallery?.title || "Training Gallery"}
            />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-5">
              {gallery.map((url, i) => {
                const resolvedUrl = resolveUploadUrl(url)
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedGalleryImg(resolvedUrl)}
                    className="relative h-44 overflow-hidden border border-[#FFB70F]/35 sm:h-52"
                  >
                    <img
                      src={resolvedUrl}
                      alt={`Gallery ${i + 1}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </button>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Final journey CTA */}
      {enabled("final_cta") &&
      (finalCta.headline || finalCta.tagline) ? (
        <CourseFinalCta
          content={finalCta}
          primaryHref={courseRegistrationHref(
            finalCta.primary_cta_link || hero.cta_link
          )}
          canAddToCart={Boolean(course?.id && effectiveLocationId && durations.length > 0)}
          onAddToCart={handleAddToCartClick}
          highlightWord={displayTitle}
        />
      ) : null}

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
      {/* Gallery Lightbox Modal */}
      {selectedGalleryImg && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedGalleryImg(null)}
        >
          <button
            type="button"
            onClick={() => setSelectedGalleryImg(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-50"
            aria-label="Close image preview"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={selectedGalleryImg}
            alt="Gallery preview"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </main>
  )
}

export default function CourseDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#FFB70F]" />
        </main>
      }
    >
      <CourseDetailPageInner />
    </Suspense>
  )
}
