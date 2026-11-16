"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight, Building2, Handshake, MapPin, Phone, Play } from "lucide-react"
import { sanitizeRichHtmlClient } from "@/lib/sanitizeClientHtml"
import { ScrollZoomContinuous } from "@/components/ScrollZoomContinuous"
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
  branches?: { id: string; name: string; location: string; address: string; phone?: string; href: string }[]
  partnerBranches?: {
    id: string
    name: string
    location?: string
    description?: string
    img?: string
    href: string
  }[]
  partnerDirectoryHref?: string
  physicalBenefits: string[]
  mentalBenefits: string[]
  trainers: { name: string; role: string; img: string; about?: string; rating?: number | null }[]
  testimonials: { name: string; role: string; quote?: string; image?: string; achievement?: string }[]
  defaultTestimonialQuote: string
  /** Marketing testimonials from MongoDB (`student_testimonials`) */
  showcaseTestimonials?: TestimonialCardItem[]
  /** Marketing achievements from MongoDB (`student_showcase_achievements`) */
  showcaseAchievements?: ShowcaseAchievementItem[]
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

  // Ensure enough cards so that one full loop comfortably spans wide viewports
  const baseItems = useMemo(() => {
    if (items.length === 0) return []
    let list = [...items]
    while (list.length < 6) {
      list = [...list, ...items]
    }
    return list
  }, [items])

  const loopItems = useMemo(() => [...baseItems, ...baseItems], [baseItems])

  useEffect(() => {
    if (reducedMotion || items.length <= 1) return

    let rafId: number
    const speedPxPerSec = 40

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
  }, [items.length, isPaused, reducedMotion])

  if (items.length === 0) return null

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (items.length <= 1) return
    isDraggingRef.current = true
    startXRef.current = e.clientX
    dragStartOffsetRef.current = offsetRef.current
    setIsPaused(true)
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
          <div
            key={`${a.id || "ach"}-${i}`}
            className="w-[260px] sm:w-[290px] shrink-0 min-w-0 [&>div]:p-3.5 sm:[&>div]:p-4 [&>div]:bg-[#292E40] [&>div]:border-[#383D4D] [&>div]:rounded-2xl [&>div]:shadow-[0_8px_24px_rgba(0,0,0,0.25)] [&>div]:transition-all [&>div]:duration-300 [&>div]:ease-out [&>div:hover]:-translate-y-2 [&>div:hover]:scale-100 [&>div:hover]:border-[#FFB70F]/50 [&>div:hover]:shadow-[0_18px_40px_rgba(255,183,15,0.18)] [&>div>div:first-child]:!aspect-auto [&>div>div:first-child]:!h-[150px] [&>div>div:first-child]:!max-h-[150px] [&>div>div:first-child]:rounded-xl [&>div>div:first-child]:border [&>div>div:first-child]:border-[#383D4D]/70 [&>div>div:first-child]:mb-3 [&>div>div:first-child]:overflow-hidden [&>div>div:first-child_.object-cover]:object-top [&>div>div:nth-child(2)]:!p-0 [&>div>div:nth-child(2)>div:first-child>span:first-child]:rounded-full [&>div>div:nth-child(2)>div:first-child>span:first-child]:overflow-hidden [&_.relative>span]:transition-transform [&_.relative>span]:duration-700 [&_.relative>span]:ease-out [&>div:hover_.relative>span]:scale-110 [&_.bg-gray-950]:bg-[#222635] [&_.text-gray-400]:text-[#AEB4C2]"
          >
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
  aboutTitle,
  aboutSubtitle,
  aboutContentHtml = "",
  aboutImage = "",
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
  partnerBranches = [],
  partnerDirectoryHref = "/partner-orgs",
  physicalBenefits,
  mentalBenefits,
  trainers,
  testimonials,
  defaultTestimonialQuote,
  showcaseTestimonials = [],
  showcaseAchievements = [],
}: HomePageViewProps) {
  const shouldReduceMotion = useReducedMotion()
  const [safeAboutHtml, setSafeAboutHtml] = useState("")

  useEffect(() => {
    setSafeAboutHtml(sanitizeRichHtmlClient(aboutContentHtml || ""))
  }, [aboutContentHtml])

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

      {/* Our Classes - Section 3: each card zooms individually (in view = scale 1, scroll past = scale 0) */}
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
          <AnimatedStaggerGrid
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8"
            staggerDelay={0.12}
            childClassName="text-center group"
            amount="some"
          >
            {classCards.map((c) => (
              <ScrollZoomContinuous key={c.id ?? c.name}>
                <Link
                  href={c.href}
                  className="group h-full flex flex-col rounded-2xl border border-[#383D4D] bg-[#292E40] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-all duration-300 ease-out hover:-translate-y-2 hover:border-[#FFB70F]/50 hover:shadow-[0_18px_40px_rgba(255,183,15,0.18)]"
                >
                  <div className="relative mb-4 overflow-hidden rounded-xl aspect-[4/3] bg-[#222635] border border-[#383D4D]/70">
                    <SafeImage
                      src={c.img}
                      alt={c.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                      wrapperClassName="transition-transform duration-700 ease-out group-hover:scale-110"
                    />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-[#FFB70F] transition-colors duration-300 mb-4">{c.name}</h3>
                  <span
                    className="mt-auto inline-flex items-center justify-center rounded-lg bg-[#FFB70F] px-5 py-2.5 text-sm font-semibold text-[#171A26] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_10px_28px_rgba(255,183,15,0.35)]"
                  >
                    Explore More
                  </span>
                </Link>
              </ScrollZoomContinuous>
            ))}
          </AnimatedStaggerGrid>
        </div>
      </section>

      {/* Branches section directly below main categories / courses */}
      {branches.length > 0 ? (
        <section
          id="branches"
          className="py-14 md:py-20 scroll-mt-24 relative z-10 border-t border-[#383D4D] bg-[#222635]/40"
        >
          <div className="site-content px-0 sm:px-1">
            <AnimatedSection className="text-center mb-12" variant="fadeSlideUp">
              <div className="w-16 h-1 rounded-full bg-[#FFB70F] mx-auto mb-4" />
              <p className="text-[#FFB70F] font-semibold uppercase tracking-[0.2em] text-xs mb-2">
                Locations
              </p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                Our Branches
              </h2>
            </AnimatedSection>
            <AnimatedStaggerGrid
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8"
              staggerDelay={0.12}
              childClassName="group"
              amount="some"
            >
              {branches.map((b) => (
                <ScrollZoomContinuous key={b.id}>
                  <Link
                    href={b.href}
                    className="group h-full flex flex-col justify-between rounded-2xl border border-[#383D4D] bg-[#292E40] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-all duration-300 ease-out hover:-translate-y-2 hover:border-[#FFB70F]/50 hover:shadow-[0_18px_40px_rgba(255,183,15,0.18)]"
                  >
                    <div>
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-11 h-11 rounded-xl bg-[#FFB70F]/15 border border-[#FFB70F]/30 flex items-center justify-center text-[#FFB70F] shrink-0 transition-transform duration-300 group-hover:scale-105">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-bold text-white group-hover:text-[#FFB70F] transition-colors duration-300 truncate" title={b.name}>
                            {b.name}
                          </h3>
                          {b.location ? (
                            <p className="text-xs sm:text-sm text-[#AEB4C2] flex items-center gap-1 mt-1 truncate" title={b.location}>
                              <MapPin className="w-3.5 h-3.5 text-[#FFB70F] shrink-0" />
                              <span className="truncate">{b.location}</span>
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="space-y-2 text-sm text-[#D8DCE6]">
                        {b.address ? (
                          <p className="line-clamp-2 text-[#AEB4C2] leading-relaxed" title={b.address}>
                            {b.address}
                          </p>
                        ) : null}
                        {b.phone ? (
                          <p className="flex items-center gap-2 text-xs sm:text-sm text-[#D8DCE6]">
                            <Phone className="w-3.5 h-3.5 text-[#FFB70F] shrink-0" />
                            <span className="truncate">{b.phone}</span>
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <span className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-[#FFB70F] px-5 py-2.5 text-sm font-semibold text-[#171A26] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_10px_28px_rgba(255,183,15,0.35)]">
                      Explore Branch
                      <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </Link>
                </ScrollZoomContinuous>
              ))}
            </AnimatedStaggerGrid>
            <div className="text-center mt-10">
              <Link
                href="/branches"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#383D4D] bg-[#292E40] px-6 py-3 text-sm font-semibold text-white transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[#FFB70F] hover:text-[#FFB70F] hover:shadow-[0_10px_28px_rgba(255,183,15,0.18)]"
              >
                View All Branches
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* Partner Branches section directly below Our Branches */}
      {partnerBranches.length > 0 ? (
        <section
          id="partner-branches"
          className="py-14 md:py-20 scroll-mt-24 relative z-10 border-t border-[#383D4D] bg-[#171A26]"
        >
          <div className="site-content px-0 sm:px-1">
            <AnimatedSection className="text-center mb-12" variant="fadeSlideUp">
              <div className="w-16 h-1 rounded-full bg-[#FFB70F] mx-auto mb-4" />
              <p className="text-[#FFB70F] font-semibold uppercase tracking-[0.2em] text-xs mb-2">
                Network
              </p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                Partner Branches
              </h2>
            </AnimatedSection>
            <AnimatedStaggerGrid
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8"
              staggerDelay={0.12}
              childClassName="group"
              amount="some"
            >
              {partnerBranches.map((pb) => (
                <ScrollZoomContinuous key={pb.id}>
                  <Link
                    href={pb.href}
                    className="group h-full flex flex-col justify-between rounded-2xl border border-[#383D4D] bg-[#292E40] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-all duration-300 ease-out hover:-translate-y-2 hover:border-[#FFB70F]/50 hover:shadow-[0_18px_40px_rgba(255,183,15,0.18)]"
                  >
                    <div>
                      <div className="relative mb-4 overflow-hidden rounded-xl aspect-[16/9] bg-[#222635] border border-[#383D4D]/70">
                        {pb.img ? (
                          <SafeImage
                            src={pb.img}
                            alt={pb.name}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                            wrapperClassName="transition-transform duration-700 ease-out group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#FFB70F]/80">
                            <Handshake className="w-9 h-9 transition-transform duration-500 ease-out group-hover:scale-110" />
                          </div>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-white group-hover:text-[#FFB70F] transition-colors duration-300 truncate" title={pb.name}>
                        {pb.name}
                      </h3>
                      {pb.location ? (
                        <p className="text-xs sm:text-sm text-[#AEB4C2] flex items-center gap-1 mt-1 truncate" title={pb.location}>
                          <MapPin className="w-3.5 h-3.5 text-[#FFB70F] shrink-0" />
                          <span className="truncate">{pb.location}</span>
                        </p>
                      ) : null}
                      {pb.description ? (
                        <p className="text-sm text-[#AEB4C2] mt-2 line-clamp-2 leading-relaxed">
                          {pb.description}
                        </p>
                      ) : null}
                    </div>
                    <span className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-[#FFB70F] px-5 py-2.5 text-sm font-semibold text-[#171A26] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_10px_28px_rgba(255,183,15,0.35)]">
                      Explore Partner
                      <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </Link>
                </ScrollZoomContinuous>
              ))}
            </AnimatedStaggerGrid>
            <div className="text-center mt-10">
              <Link
                href={partnerDirectoryHref}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#383D4D] bg-[#292E40] px-6 py-3 text-sm font-semibold text-white transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[#FFB70F] hover:text-[#FFB70F] hover:shadow-[0_10px_28px_rgba(255,183,15,0.18)]"
              >
                View All Partner Branches
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
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

      {/* About: image (left); title, subtitle, rich text (right). Mobile: image first. Fallback benefits when no HTML. */}
      <AnimatedSection
        variant="fadeSlideUp"
        className="py-14 md:py-20 relative z-10 border-y border-[#383D4D] bg-[#222635]/40"
      >
        <div className="site-content px-0 sm:px-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start lg:items-center">
            <div className="group overflow-hidden rounded-2xl border border-[#383D4D] bg-[#292E40] shadow-[0_0_24px_2px_rgba(255,183,15,0.16)] transition-all duration-500 ease-out hover:-translate-y-1.5 hover:border-[#FFB70F]/50 hover:shadow-[0_18px_40px_rgba(255,183,15,0.22)]">
              <SafeImage
                src={
                  aboutImage
                    ? resolveUploadUrl(aboutImage)
                    : "/assets/img/courses/tr_yourself.png"
                }
                alt={aboutTitle || "About"}
                resolveUrl={false}
                className="w-full h-auto object-cover"
                wrapperClassName="block w-full transition-transform duration-700 ease-out group-hover:scale-105"
              />
            </div>
            <div>
                <p className="text-[#FFB70F] font-semibold uppercase tracking-[0.2em] text-xs mb-2">Discover</p>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-4">{aboutTitle || "About us"}</h2>
                {aboutSubtitle ? <p className="text-[#AEB4C2] mb-6">{aboutSubtitle}</p> : null}
                {safeAboutHtml ? (
                  <div
                    className="max-w-none text-[#AEB4C2] space-y-4 leading-relaxed [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-[#FFB70F] [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[#FFB70F] [&_h3]:text-lg [&_h3]:text-[#FFB70F] [&_p]:text-[#AEB4C2] [&_a]:text-[#FFB70F] [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:text-white"
                    dangerouslySetInnerHTML={{ __html: safeAboutHtml }}
                  />
                ) : physicalBenefits.length || mentalBenefits.length ? (
                  <div className="space-y-6">
                    {physicalBenefits.length > 0 ? (
                      <div className="flex gap-4 rounded-xl border border-[#383D4D]/70 bg-[#292E40]/50 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#FFB70F]/40 hover:bg-[#292E40]">
                        <img
                          src="/assets/img/courses/icon1.png"
                          alt=""
                          className="w-12 h-12 flex-shrink-0"
                        />
                        <ul className="list-disc list-inside text-[#AEB4C2] space-y-2">
                          {physicalBenefits.map((b) => (
                            <li key={b}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {mentalBenefits.length > 0 ? (
                      <div className="rounded-xl border border-[#383D4D]/70 bg-[#292E40]/50 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#FFB70F]/40 hover:bg-[#292E40]">
                        <div className="flex gap-4 items-center mb-3">
                          <img
                            src="/assets/img/courses/icon2.png"
                            alt=""
                            className="w-12 h-12 flex-shrink-0"
                          />
                          <h3 className="text-xl sm:text-2xl font-bold text-[#FFB70F]">Mental Benefits</h3>
                        </div>
                        <ul className="list-disc list-inside text-[#AEB4C2] space-y-2 ml-16">
                          {mentalBenefits.map((b) => (
                            <li key={b}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Our Expert Masters — up to 8 coaches; desktop 4 / tablet 2 / mobile 1 */}
      <LazySection className="py-16 md:py-20 relative z-10 bg-[#171A26]" minHeight={420} rootMargin="280px">
      <section>
        <div className="site-content px-0 sm:px-1">
          <AnimatedSection className="text-center mb-12" variant="fadeSlideUp">
            <div className="w-16 h-1 rounded-full bg-[#FFB70F] mx-auto mb-4" />
            <p className="text-[#FFB70F] font-semibold uppercase tracking-[0.2em] text-xs mb-2">Our Members</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Our Expert Masters</h2>
          </AnimatedSection>
          <AnimatedStaggerGrid
            className={
              trainers.length
                ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-8 w-full"
                : "grid grid-cols-1 gap-6 w-full"
            }
            staggerDelay={0.12}
            childClassName="h-full w-full"
          >
            {trainers.length === 0 ? (
              <p className="text-center text-[#AEB4C2] text-sm col-span-full py-8">
                Coach profiles from admin will appear here. Set display order and photos in Coaches Management.
              </p>
            ) : null}
            {trainers.map((t, idx) => (
              <div
                key={`${t.name}-${idx}`}
                className="group bg-[#292E40] rounded-2xl p-6 border border-[#383D4D] shadow-[0_8px_24px_rgba(0,0,0,0.25)] h-full flex flex-col items-center text-center transition-all duration-300 ease-out hover:-translate-y-2 hover:border-[#FFB70F]/50 hover:shadow-[0_18px_40px_rgba(255,183,15,0.18)]"
              >
                <div className="w-[180px] h-[200px] max-w-full shrink-0 rounded-xl overflow-hidden border-2 border-[#FFB70F]/40 mb-4 bg-[#222635] transition-colors duration-300 group-hover:border-[#FFB70F]">
                  <SafeImage
                    src={t.img || DEFAULT_IMAGE_PLACEHOLDER}
                    alt={t.name}
                    loading="lazy"
                    decoding="async"
                    width={180}
                    height={200}
                    className="w-full h-full object-cover object-top"
                    wrapperClassName="transition-transform duration-700 ease-out group-hover:scale-110"
                  />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white transition-colors duration-300 group-hover:text-[#FFB70F] mb-1 line-clamp-2">{t.name}</h3>
                <p className="text-[#FFB70F] font-semibold text-sm mb-3 line-clamp-2">{t.role}</p>
                <p className="text-[#AEB4C2] text-sm leading-relaxed line-clamp-4 flex-1 w-full">
                  {t.about?.trim()
                    ? t.about
                    : "Experienced instructor dedicated to helping every student grow with discipline and skill."}
                </p>
              </div>
            ))}
          </AnimatedStaggerGrid>
        </div>
      </section>
      </LazySection>

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
