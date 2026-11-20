"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Play } from "lucide-react"
import {
  AnimatedSection,
  AnimatedStaggerGrid,
  FloatingShapes,
  HeroAnimation,
} from "@/components/animations"
import { Carousel } from "@/components/common/Carousel"
import {
  TestimonialCard,
  type TestimonialCardItem,
  ShowcaseAchievementCard,
  type ShowcaseAchievementItem,
} from "@/components/testimonials"
import { SafeImage, DEFAULT_IMAGE_PLACEHOLDER } from "@/components/ui/safe-image"
import { LazySection } from "@/components/ui/LazySection"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import CoursesShowcaseDualScroll, { type CourseShowcaseItem } from "@/components/website/CoursesShowcaseDualScroll"
import { BranchDistanceControls } from "@/components/website/BranchDistanceLabel"
import {
  NearbyAcademiesSection,
  type NearbyAcademyCardData,
} from "@/components/website/NearbyAcademyCard"
import { AcademyCardsCarousel } from "@/components/website/AcademyCardsCarousel"
import { ClassCardsCarousel } from "@/components/website/ClassCardsCarousel"
import { OurMembersSection } from "@/components/website/OurMembersSection"
import { useVisitorBranchDistances } from "@/hooks/useVisitorBranchDistances"
import { PUBLIC_SECTION_FALLBACKS } from "@/lib/cmsContentFallback"
/* ---------- Types (mirror server data shape; no API change) ---------- */

export interface HomePageViewProps {
  heroTitle: string
  heroSubtitle: string
  heroDescription: string
  heroVideo: string
  heroImage: string
  /** Primary hero CTA — only rendered when text is set in admin CMS */
  heroPrimaryCtaText?: string
  heroPrimaryCtaLink?: string
  /** Secondary hero CTA — only rendered when text is set in admin CMS */
  heroSecondaryCtaText?: string
  heroSecondaryCtaLink?: string
  ctaTitle: string
  ctaSubtitle: string
  bottomCtaTitle: string
  bottomCtaSubtitle: string
  aboutTitle: string
  aboutSubtitle: string
  /** Rich HTML for homepage about (from homepage_content collection). */
  aboutContentHtml?: string
  /** Right-column image for about section. */
  aboutImage?: string
  coursesTitle: string
  coursesSubtitle: string
  /** M22-S02: video section below Courses */
  mediaSectionTitle?: string
  mediaSectionSubtitle?: string
  mediaSectionItems?: {
    id?: string
    title?: string
    subtitle?: string
    video_url: string
    poster_url?: string
  }[]
  testimonialsTitle: string
  testimonialsSubtitle: string
  testimonialsEnabled: boolean
  classCards: { id?: string; name: string; img: string; href: string }[]
  branches?: NearbyAcademyCardData[]
  physicalBenefits: string[]
  mentalBenefits: string[]
  trainers: { name: string; role: string; img: string; about?: string; rating?: number | null }[]
  testimonials: { name: string; role: string; quote?: string; image?: string; achievement?: string }[]
  defaultTestimonialQuote: string
  /** Marketing testimonials from MongoDB (`student_testimonials`) */
  showcaseTestimonials?: TestimonialCardItem[]
  /** Marketing achievements from MongoDB (`student_showcase_achievements`) */
  showcaseAchievements?: ShowcaseAchievementItem[]
  /** Dual auto-scrolling courses showcase section below Training Program */
  courseShowcaseTag?: string
  courseShowcaseTitle?: string
  courseShowcaseDescription?: string
  showcaseCourses?: CourseShowcaseItem[]
}

/* ---------- Homepage with Cult.fit-style animations ---------- */

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?#]+)/)
  return m ? m[1] : null
}

function HomepageMediaPlayer({
  videoUrl,
  posterUrl,
}: {
  videoUrl: string
  posterUrl?: string
}) {
  const [showPosterOverlay, setShowPosterOverlay] = useState(Boolean(posterUrl))
  const [mediaFailed, setMediaFailed] = useState(false)
  const ytId = getYouTubeId(videoUrl)
  const resolvedPoster = posterUrl ? resolvePublicAssetUrl(posterUrl) : ""
  const resolvedVideo = resolvePublicAssetUrl(videoUrl)

  if (mediaFailed && resolvedPoster) {
    return (
      <div className="relative rounded-xl overflow-hidden aspect-video bg-[#171A26] border border-[#383D4D]">
        <img src={resolvedPoster} alt="" className="absolute inset-0 w-full h-full object-cover" />
      </div>
    )
  }

  if (ytId) {
    return (
      <div className="relative rounded-xl overflow-hidden aspect-video bg-[#171A26] border border-[#383D4D]">
        {showPosterOverlay && resolvedPoster ? (
          <button
            type="button"
            className="absolute inset-0 z-10 group"
            onClick={() => setShowPosterOverlay(false)}
            aria-label="Play video"
          >
            <img src={resolvedPoster} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <span className="absolute inset-0 flex items-center justify-center bg-[#171A26]/40 group-hover:bg-[#171A26]/55 transition-colors">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFB70F] text-[#171A26] shadow-[0_8px_24px_rgba(255,183,15,0.4)] transition-transform duration-300 group-hover:scale-110">
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
            title="Homepage media video"
          />
        )}
      </div>
    )
  }

  return (
    <div className="relative rounded-xl overflow-hidden aspect-video bg-[#171A26] border border-[#383D4D]">
      <video
        controls
        playsInline
        preload="metadata"
        poster={resolvedPoster || undefined}
        className="w-full h-full object-cover"
        onError={() => setMediaFailed(true)}
      >
        <source src={resolvedVideo} type="video/mp4" />
      </video>
    </div>
  )
}

function AchievementsInfiniteMarquee({
  items,
  reducedMotion,
}: {
  items: ShowcaseAchievementItem[]
  reducedMotion: boolean
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [isPaused, setIsPaused] = useState(false)
  const offsetRef = useRef(0)
  const lastTimeRef = useRef<number | null>(null)
  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)
  const dragStartOffsetRef = useRef(0)

  // Deduplicate so the same student/achievement is not padded into a fake loop
  const uniqueItems = useMemo(() => {
    const seen = new Set<string>()
    const out: ShowcaseAchievementItem[] = []
    for (const item of items) {
      const key = String(
        item.id ||
          `${(item.student_name || "").trim().toLowerCase()}|${(item.achievement_title || "").trim().toLowerCase()}`
      )
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push(item)
    }
    return out
  }, [items])

  // One seamless copy of the unique set (never repeat a single card N times)
  const loopItems = useMemo(() => {
    if (uniqueItems.length === 0) return []
    if (uniqueItems.length === 1) return uniqueItems
    return [...uniqueItems, ...uniqueItems]
  }, [uniqueItems])

  const canAnimate = !reducedMotion && uniqueItems.length > 1

  useEffect(() => {
    if (!canAnimate) return

    let rafId: number
    const speedPxPerSec = 42
    offsetRef.current = 0
    lastTimeRef.current = null

    const step = (now: number) => {
      if (lastTimeRef.current == null) {
        lastTimeRef.current = now
      }
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05)
      lastTimeRef.current = now

      const el = trackRef.current
      if (el && !isPaused && !isDraggingRef.current) {
        offsetRef.current += speedPxPerSec * dt
        const halfWidth = el.scrollWidth / 2
        if (halfWidth > 0 && offsetRef.current >= halfWidth) {
          offsetRef.current -= halfWidth
        }
        el.style.transform = `translate3d(-${offsetRef.current}px, 0, 0)`
      }

      rafId = requestAnimationFrame(step)
    }

    rafId = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(rafId)
      lastTimeRef.current = null
    }
  }, [canAnimate, uniqueItems.length, isPaused])

  if (uniqueItems.length === 0) return null

  const cardClass =
    "w-[260px] sm:w-[290px] shrink-0 min-w-0 [&>div]:p-3.5 sm:[&>div]:p-4 [&>div]:bg-[#292E40] [&>div]:border-[#383D4D] [&>div]:rounded-2xl [&>div]:shadow-[0_8px_24px_rgba(0,0,0,0.25)] [&>div]:transition-all [&>div]:duration-300 [&>div]:ease-out [&>div:hover]:-translate-y-2 [&>div:hover]:scale-100 [&>div:hover]:border-[#FFB70F]/50 [&>div:hover]:shadow-[0_18px_40px_rgba(255,183,15,0.18)] [&>div>div:first-child]:!aspect-auto [&>div>div:first-child]:!h-[150px] [&>div>div:first-child]:!max-h-[150px] [&>div>div:first-child]:rounded-xl [&>div>div:first-child]:border [&>div>div:first-child]:border-[#383D4D]/70 [&>div>div:first-child]:mb-3 [&>div>div:first-child]:overflow-hidden [&>div>div:first-child_.object-cover]:object-top [&>div>div:nth-child(2)]:!p-0 [&>div>div:nth-child(2)>div:first-child>span:first-child]:rounded-full [&>div>div:nth-child(2)>div:first-child>span:first-child]:overflow-hidden [&_.relative>span]:transition-transform [&_.relative>span]:duration-700 [&_.relative>span]:ease-out [&>div:hover_.relative>span]:scale-110 [&_.bg-gray-950]:bg-[#222635] [&_.text-gray-400]:text-[#AEB4C2]"

  if (!canAnimate) {
    return (
      <div className="flex flex-wrap justify-center gap-5 md:gap-6 pt-3 pb-6">
        {uniqueItems.map((a, i) => (
          <div key={`${a.id || "ach"}-${i}`} className={cardClass}>
            <ShowcaseAchievementCard item={a} />
          </div>
        ))}
      </div>
    )
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true
    startXRef.current = e.clientX
    dragStartOffsetRef.current = offsetRef.current
    setIsPaused(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    const el = trackRef.current
    if (!el) return
    const deltaX = e.clientX - startXRef.current
    let nextOffset = dragStartOffsetRef.current - deltaX
    const halfWidth = el.scrollWidth / 2
    if (halfWidth > 0) {
      while (nextOffset < 0) nextOffset += halfWidth
      while (nextOffset >= halfWidth) nextOffset -= halfWidth
    }
    offsetRef.current = nextOffset
    el.style.transform = `translate3d(-${nextOffset}px, 0, 0)`
  }

  const handlePointerUp = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false
      setIsPaused(false)
    }
  }

  return (
    <div
      className="relative overflow-hidden w-full pt-3 pb-6 select-none cursor-grab active:cursor-grabbing"
      style={{ touchAction: "pan-y" }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => {
        if (!isDraggingRef.current) setIsPaused(false)
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        ref={trackRef}
        className="flex flex-nowrap gap-5 md:gap-6 w-max will-change-transform"
      >
        {loopItems.map((a, i) => (
          <div key={`${a.id || "ach"}-${i}`} className={cardClass}>
            <ShowcaseAchievementCard item={a} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function HomePageView({
  heroTitle,
  heroSubtitle,
  heroDescription,
  heroVideo,
  heroImage,
  heroPrimaryCtaText = "",
  heroPrimaryCtaLink = "",
  heroSecondaryCtaText = "",
  heroSecondaryCtaLink = "",
  ctaTitle,
  ctaSubtitle,
  bottomCtaTitle,
  bottomCtaSubtitle,
  aboutTitle: _aboutTitle,
  aboutSubtitle: _aboutSubtitle,
  aboutContentHtml: _aboutContentHtml = "",
  aboutImage: _aboutImage = "",
  coursesTitle,
  coursesSubtitle,
  mediaSectionTitle = "",
  mediaSectionSubtitle = "",
  mediaSectionItems = [],
  testimonialsTitle,
  testimonialsSubtitle,
  testimonialsEnabled,
  classCards,
  branches = [],
  physicalBenefits: _physicalBenefits,
  mentalBenefits: _mentalBenefits,
  trainers,
  testimonials,
  defaultTestimonialQuote,
  showcaseTestimonials = [],
  showcaseAchievements = [],
  courseShowcaseTag,
  courseShowcaseTitle,
  courseShowcaseDescription,
  showcaseCourses = [],
}: HomePageViewProps) {
  const shouldReduceMotion = useReducedMotion()
  const branchIds = useMemo(() => branches.map((b) => b.id).filter(Boolean), [branches])
  const branchDistances = useVisitorBranchDistances({ branchIds, autoRequest: true })
  const orderedBranches = useMemo(() => {
    const list = [...branches]
    const byId = branchDistances.byId
    list.sort((a, b) => {
      const da = byId[a.id]?.distance_km
      const db = byId[b.id]?.distance_km
      const aOk = typeof da === "number" && !Number.isNaN(da)
      const bOk = typeof db === "number" && !Number.isNaN(db)
      if (aOk && bOk) return (da as number) - (db as number)
      if (aOk) return -1
      if (bOk) return 1
      return 0
    })
    return list
  }, [branches, branchDistances.byId])

  const resolveUploadUrl = (url?: string): string => resolvePublicAssetUrl(url)

  const resolvedHeroImage = resolveUploadUrl(heroImage)
  const resolvedHeroVideo = resolveUploadUrl(heroVideo)

  const primaryCtaText = heroPrimaryCtaText.trim()
  const secondaryCtaText = heroSecondaryCtaText.trim()
  const primaryHref = heroPrimaryCtaLink.trim() || "#"
  const secondaryHref = heroSecondaryCtaLink.trim() || "#"

  // Hero CTAs: only when created in admin CMS (no hardcoded fallback buttons)
  const heroActions =
    primaryCtaText || secondaryCtaText ? (
      !shouldReduceMotion ? (
        <div className="flex flex-wrap items-center justify-center gap-4">
          {primaryCtaText ? (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.3, ease: "easeOut" }}>
              <Link
                href={primaryHref}
                className="inline-flex items-center justify-center rounded-lg bg-[#FFB70F] px-6 py-3.5 text-sm sm:text-base font-semibold text-[#171A26] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_10px_30px_rgba(255,183,15,0.35)]"
              >
                {primaryCtaText}
              </Link>
            </motion.div>
          ) : null}
          {secondaryCtaText ? (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.3, ease: "easeOut" }}>
              <Link
                href={secondaryHref}
                className="inline-flex items-center justify-center rounded-lg border border-[#383D4D] bg-[#171A26]/45 backdrop-blur-sm px-6 py-3.5 text-sm sm:text-base font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-[#FFB70F] hover:text-[#FFB70F] hover:shadow-[0_8px_24px_rgba(255,183,15,0.15)]"
              >
                {secondaryCtaText}
              </Link>
            </motion.div>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
          {primaryCtaText ? (
            <Link href={primaryHref} className="inline-flex items-center justify-center rounded-lg bg-[#FFB70F] px-6 py-3.5 text-sm sm:text-base font-semibold text-[#171A26]">
              {primaryCtaText}
            </Link>
          ) : null}
          {secondaryCtaText ? (
            <Link href={secondaryHref} className="inline-flex items-center justify-center rounded-lg border border-[#383D4D] bg-[#171A26]/45 px-6 py-3.5 text-sm sm:text-base font-semibold text-white">
              {secondaryCtaText}
            </Link>
          ) : null}
        </div>
      )
    ) : undefined

  return (
    <main className="min-h-screen relative bg-[#171A26] text-white">
      {/* Floating background shapes — slow floating motion */}
      <FloatingShapes className="z-0" />

      {/* Hero: staggered text, media slide-in, CTAs with hover scale */}
      <HeroAnimation
        title={heroTitle.trim() || undefined}
        subtitle={heroSubtitle || undefined}
        description={heroDescription || undefined}
        actions={heroActions}
        media={
          resolvedHeroImage && !heroVideo ? (
            <SafeImage
              src={resolvedHeroImage}
              alt="Hero"
              resolveUrl={false}
              className="absolute inset-0 w-full h-full object-cover"
              wrapperClassName="absolute inset-0"
            />
          ) : (
            <video
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              poster={resolvedHeroImage || undefined}
            >
              <source src={resolvedHeroVideo} type="video/mp4" />
            </video>
          )
        }
      />

      {/* Tagline - scroll reveal */}
      <AnimatedSection variant="fadeSlideUp" className="py-10 md:py-14 relative z-10 border-y border-[#383D4D] bg-[#222635]/60">
        <div className="site-content px-0 sm:px-1">
          <h1 className="text-center text-white text-xl md:text-2xl lg:text-3xl font-semibold tracking-tight">
            {ctaTitle}
          </h1>
          {ctaSubtitle && (
            <p className="text-center text-[#AEB4C2] text-base md:text-lg mt-4">{ctaSubtitle}</p>
          )}
        </div>
      </AnimatedSection>

      {/* Our Training Program / Our Classes — 4 visible; carousel + arrows + autoscroll when more */}
      <section
        id="courses"
        className="py-14 md:py-20 scroll-mt-24 relative z-10 bg-[#171A26]"
      >
        <div className="site-content px-0 sm:px-1">
          <AnimatedSection className="text-center mb-12" variant="fadeSlideUp">
            <div className="w-16 h-1 rounded-full bg-[#FFB70F] mx-auto mb-4" />
            <p className="text-[#FFB70F] font-semibold uppercase tracking-[0.2em] text-xs mb-2">
              {coursesSubtitle}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">{coursesTitle}</h2>
          </AnimatedSection>
          <ClassCardsCarousel cards={classCards} />
        </div>
      </section>

      {/* Courses Showcase - Dual parallel auto-scrolling columns (below Training Program / Courses) */}
      <CoursesShowcaseDualScroll
        tag={courseShowcaseTag}
        title={courseShowcaseTitle}
        description={courseShowcaseDescription}
        courses={showcaseCourses}
      />

      {/* Nearby Academies — 4 visible; carousel + autoscroll; Show All Academies */}
      {branches.length > 0 ? (
        <NearbyAcademiesSection
          title="Nearby Academies"
          subtitle="Explore the best training centres near you."
          controls={
            <BranchDistanceControls
              supported={branchDistances.supported}
              status={branchDistances.status}
              loading={branchDistances.loading}
              errorMessage={branchDistances.errorMessage}
            />
          }
        >
          <AcademyCardsCarousel
            academies={orderedBranches}
            distances={branchDistances.byId}
            distanceLoading={
              branchDistances.loading ||
              branchDistances.status === "prompting" ||
              branchDistances.status === "idle"
            }
            nearestBranchId={branchDistances.nearestBranchId}
            viewAllHref="/branches"
            viewAllLabel="Show All Academies"
          />
        </NearbyAcademiesSection>
      ) : null}

      {/* Our Academies — 4-up autoscroll carousel + All Academies CTA */}
      {branches.length > 0 ? (
        <NearbyAcademiesSection
          title="Our Academies"
          subtitle="Train at Rock Martial Arts academies across the city."
        >
          <AcademyCardsCarousel
            academies={branches}
            viewAllHref="/branches"
            viewAllLabel="Show All Academies"
          />
        </NearbyAcademiesSection>
      ) : null}

      {/* M22-S02: Video section below Courses, above About */}
      {mediaSectionItems.length > 0 ? (
        <section
          id="media"
          className="py-14 md:py-20 scroll-mt-24 relative z-10 border-t border-[#383D4D] bg-[#222635]/40"
        >
          <div className="site-content px-0 sm:px-1">
            <AnimatedSection className="text-center mb-12" variant="fadeSlideUp">
              <div className="w-16 h-1 rounded-full bg-[#FFB70F] mx-auto mb-4" />
              {(mediaSectionSubtitle || "").trim() ? (
                <p className="text-[#FFB70F] font-semibold uppercase tracking-[0.2em] text-xs mb-2">
                  {mediaSectionSubtitle}
                </p>
              ) : null}
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                {(mediaSectionTitle || "").trim() || "Videos"}
              </h2>
            </AnimatedSection>
            <div
              className={
                mediaSectionItems.length === 1
                  ? "max-w-4xl mx-auto"
                  : "grid grid-cols-1 md:grid-cols-2 gap-8"
              }
            >
              {mediaSectionItems.map((item, i) => (
                <AnimatedSection
                  key={item.id || `media-${i}`}
                  variant="fadeSlideUp"
                  className="rounded-2xl border border-[#383D4D] bg-[#292E40] p-4 sm:p-5 shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-all duration-300 ease-out hover:-translate-y-2 hover:border-[#FFB70F]/50 hover:shadow-[0_18px_40px_rgba(255,183,15,0.18)]"
                >
                  {(item.title || item.subtitle) && (
                    <div className="mb-3 text-center md:text-left">
                      {item.title ? (
                        <h3 className="text-lg sm:text-xl font-bold text-white">{item.title}</h3>
                      ) : null}
                      {item.subtitle ? (
                        <p className="text-[#AEB4C2] text-sm mt-1">{item.subtitle}</p>
                      ) : null}
                    </div>
                  )}
                  <HomepageMediaPlayer
                    videoUrl={item.video_url}
                    posterUrl={item.poster_url}
                  />
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Discover / About section removed from Home — reused as About Founder on Branch Detail */}

      <OurMembersSection
        members={trainers}
        eyebrow={PUBLIC_SECTION_FALLBACKS.membersEyebrow}
        title={PUBLIC_SECTION_FALLBACKS.membersTitle}
        emptyMessage="Coach profiles from admin will appear here. Set display order and photos in Coaches Management."
      />

      {/* Student testimonials (MongoDB marketing) — carousel, max 6 */}
      {testimonialsEnabled && (
      <LazySection className="py-16 md:py-20 relative z-10 border-t border-[#383D4D] bg-[#222635]/50" minHeight={480} rootMargin="280px">
      <section>
        <div className="site-content px-0 sm:px-1">
          <AnimatedSection className="text-center mb-12" variant="fadeSlideUp">
            <div className="w-16 h-1 rounded-full bg-[#FFB70F] mx-auto mb-4" />
            <p className="text-[#FFB70F] font-semibold uppercase tracking-[0.2em] text-xs mb-2">{testimonialsSubtitle}</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">{testimonialsTitle}</h2>
          </AnimatedSection>
          {showcaseTestimonials.length === 0 && testimonials.length === 0 ? (
            <p className="text-center text-[#AEB4C2] py-12 text-sm">No testimonials available</p>
          ) : showcaseTestimonials.length > 0 ? (
            <>
              <div className="[&_.bg-gray-900\/50]:bg-[#292E40] [&_.border-gray-800]:border-[#383D4D] [&_.rounded-xl]:rounded-2xl [&_.text-gray-300]:text-[#AEB4C2] [&_.bg-gray-900\/50]:shadow-[0_8px_24px_rgba(0,0,0,0.25)] [&_.bg-gray-900\/50]:transition-all [&_.bg-gray-900\/50]:duration-300 [&_.bg-gray-900\/50]:ease-out [&_.bg-gray-900\/50:hover]:-translate-y-2 [&_.bg-gray-900\/50:hover]:border-[#FFB70F]/50 [&_.bg-gray-900\/50:hover]:shadow-[0_18px_40px_rgba(255,183,15,0.18)] [&_.rounded-full>span]:transition-transform [&_.rounded-full>span]:duration-700 [&_.rounded-full>span]:ease-out [&_.bg-gray-900\/50:hover_.rounded-full>span]:scale-110">
                <Carousel className="px-2 md:px-8">
                  {showcaseTestimonials.slice(0, 6).map((t, i) => (
                    <TestimonialCard key={t.id || i} item={t} />
                  ))}
                </Carousel>
              </div>
              <AnimatedSection className="text-center mt-10" variant="fadeSlideUp">
                <Link
                  href="/testimonials"
                  className="inline-flex items-center justify-center rounded-lg bg-[#FFB70F] px-6 py-3 text-sm sm:text-base font-semibold text-[#171A26] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_10px_30px_rgba(255,183,15,0.35)]"
                >
                  More testimonials
                </Link>
              </AnimatedSection>
            </>
          ) : (
            <>
              <AnimatedStaggerGrid
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
                staggerDelay={0.1}
              >
                {testimonials.slice(0, 4).map((t, i) => (
                  <div
                    key={i}
                    className="group bg-[#292E40] rounded-2xl p-6 border border-[#383D4D] shadow-[0_8px_24px_rgba(0,0,0,0.25)] h-full flex flex-col items-center text-center transition-all duration-300 ease-out hover:-translate-y-2 hover:border-[#FFB70F]/50 hover:shadow-[0_18px_40px_rgba(255,183,15,0.18)]"
                  >
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#FFB70F]/50 mb-4 flex-shrink-0 transition-colors duration-300 group-hover:border-[#FFB70F]">
                      <SafeImage
                        src={t.image || DEFAULT_IMAGE_PLACEHOLDER}
                        alt={t.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                        wrapperClassName="transition-transform duration-700 ease-out group-hover:scale-110"
                      />
                    </div>
                    <img
                      src="/assets/img/courses/quote.png"
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="w-8 h-8 mb-2 opacity-80"
                    />
                    <p className="text-[#AEB4C2] text-sm leading-relaxed mb-4 flex-1">
                      {t.quote || defaultTestimonialQuote || ""}
                    </p>
                    <h3 className="text-[#FFB70F] font-semibold">{t.name}</h3>
                    {t.achievement?.trim() ? (
                      <p className="text-[#FFB70F]/90 text-xs font-medium uppercase tracking-wide mt-1">
                        {t.achievement}
                      </p>
                    ) : null}
                    <p className="text-white/80 text-sm">{t.role}</p>
                  </div>
                ))}
              </AnimatedStaggerGrid>
              <AnimatedSection className="text-center mt-10" variant="fadeSlideUp">
                <Link
                  href="/testimonials"
                  className="inline-flex items-center justify-center rounded-lg bg-[#FFB70F] px-6 py-3 text-sm sm:text-base font-semibold text-[#171A26] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_10px_30px_rgba(255,183,15,0.35)]"
                >
                  More testimonials
                </Link>
              </AnimatedSection>
            </>
          )}
        </div>
      </section>
      </LazySection>
      )}

      {/* Student achievements showcase (MongoDB) */}
      <LazySection className="py-16 md:py-20 relative z-10 border-t border-[#383D4D] bg-[#171A26]" minHeight={400} rootMargin="280px">
      <section>
        <div className="site-content px-0 sm:px-1">
          <AnimatedSection className="text-center mb-12" variant="fadeSlideUp">
            <div className="w-16 h-1 rounded-full bg-[#FFB70F] mx-auto mb-4" />
            <p className="text-[#FFB70F] font-semibold uppercase tracking-[0.2em] text-xs mb-2">Celebrate</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Student Achievements</h2>
          </AnimatedSection>
          {showcaseAchievements.length === 0 ? (
            <p className="text-center text-[#AEB4C2] py-12 text-sm">No achievements yet</p>
          ) : (
            <AchievementsInfiniteMarquee
              items={showcaseAchievements}
              reducedMotion={Boolean(shouldReduceMotion)}
            />
          )}
        </div>
      </section>
      </LazySection>

      {/* CTA section — only when CMS provides bottom CTA copy */}
      {bottomCtaTitle?.trim() ? (
      <AnimatedSection variant="fadeSlideUp" className="py-16 md:py-20 relative z-10 bg-[#171A26]">
        <div className="site-content px-0 sm:px-1">
          <div className="rounded-2xl bg-[#FFB70F] px-6 py-10 sm:px-10 lg:px-14 lg:py-12 text-center shadow-[0_16px_40px_rgba(255,183,15,0.2)] transition-shadow duration-300 hover:shadow-[0_20px_48px_rgba(255,183,15,0.28)]">
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-[#171A26] mb-3">{bottomCtaTitle}</h2>
            {bottomCtaSubtitle ? <p className="text-[#171A26]/80 text-base md:text-lg max-w-2xl mx-auto mb-8">{bottomCtaSubtitle}</p> : null}
            {!shouldReduceMotion ? (
              <motion.div
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="inline-block"
              >
                <Link
                  href="/register"
                  className="inline-block rounded-lg bg-[#171A26] px-8 py-4 text-base md:text-lg font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#222635] hover:shadow-lg"
                >
                  Get Started
                </Link>
              </motion.div>
            ) : (
              <Link
                href="/register"
                className="inline-block rounded-lg bg-[#171A26] px-8 py-4 text-base md:text-lg font-semibold text-white"
              >
                Get Started
              </Link>
            )}
          </div>
        </div>
      </AnimatedSection>
      ) : null}
    </main>
  )
}
