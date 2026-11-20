"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import {
  BarChart3,
  BookOpen,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  LayoutGrid,
  ShoppingCart,
  Star,
  Trophy,
  Dumbbell,
  Users,
} from "lucide-react"
import useEmblaCarousel from "embla-carousel-react"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import {
  HERO_OVERLAY_COURSE_BOTTOM,
  HERO_OVERLAY_COURSE_SIDE,
} from "@/lib/heroOverlay"
import { useEmblaAutoplay } from "@/lib/emblaAutoplay"
import type {
  FinalCtaContent,
  HeroFeatureIcon,
  HeroCta,
  LearnCard,
  LineageContent,
  PhilosophyPillar,
  QualityItem,
  SportSpotlightContent,
  StyleCard,
  TrainingProgramCard,
  WhoCanJoinContent,
  WhyRmaaContent,
} from "@/lib/coursePageContent"
import { cn } from "@/lib/utils"

const Y = "#FFB70F"
const INK = "#171A26"

function resolveUrl(url?: string) {
  return resolvePublicAssetUrl(url)
}

/** Shared section vertical rhythm — wide, breathable gaps matching Kickboxing mock */
export const sectionPad = "py-14 md:py-20 lg:py-24"

/** Fade/slide-in when section enters viewport */
export function SectionReveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  )
}

function SlashTitle({
  title,
  className,
  light,
  compact,
  subtitle,
  subtitleAside,
}: {
  title: string
  className?: string
  light?: boolean
  compact?: boolean
  subtitle?: string
  /** When true, subtitle sits to the right of the title on large screens */
  subtitleAside?: boolean
}) {
  return (
    <div
      className={cn(
        compact ? "mb-6 md:mb-8" : "mb-8 md:mb-10",
        subtitleAside && "md:mb-10 md:flex md:items-end md:justify-between md:gap-6",
        className
      )}
    >
      <div>
        <div className="mb-3 flex items-center gap-1.5" aria-hidden>
          <span className="inline-block h-[1.15rem] w-1.5 -skew-x-12 bg-[#FFB70F] transition group-hover:brightness-110 md:h-5" />
          <span className="inline-block h-[1.15rem] w-1.5 -skew-x-12 bg-[#FFB70F]/65 md:h-5" />
        </div>
        <h2
          className={cn(
            "font-extrabold uppercase italic tracking-tight",
            compact ? "text-2xl md:text-3xl" : "text-2xl md:text-3xl lg:text-[2.35rem]",
            light ? "text-white" : "text-[#171A26]"
          )}
          style={{ fontFamily: "'Oswald', sans-serif" }}
        >
          {title}
        </h2>
      </div>
      {subtitle?.trim() ? (
        <p
          className={cn(
            "mt-2 max-w-xl text-sm text-gray-600 md:text-[15px]",
            subtitleAside && "md:mt-0 md:mb-1 md:text-right",
            light && "text-white/70"
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  )
}

export function CourseHeroFeatures({ items }: { items: HeroFeatureIcon[] }) {
  if (!items?.length) return null
  return (
    <ul className="mt-5 grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-5 sm:gap-x-5">
      {items
        .filter((i) => i.label?.trim())
        .slice(0, 5)
        .map((item, idx) => (
          <li
            key={`${item.label}-${idx}`}
            className="flex flex-col items-center gap-2.5 text-center"
          >
            <div className="flex h-11 w-11 items-center justify-center text-[#FFB70F] sm:h-12 sm:w-12">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveUrl(item.image)}
                  alt=""
                  className="h-8 w-8 object-contain sm:h-9 sm:w-9"
                />
              ) : (
                <span className="text-2xl leading-none sm:text-[1.65rem]" aria-hidden>
                  {item.icon?.trim() || "★"}
                </span>
              )}
            </div>
            <span className="max-w-[7rem] text-[10px] font-semibold uppercase leading-snug tracking-wide text-white sm:text-[11px]">
              {item.label}
            </span>
          </li>
        ))}
    </ul>
  )
}

const btnPrimary =
  "inline-flex w-full items-center justify-center rounded-md bg-[#FFB70F] px-6 py-3.5 text-sm font-bold text-[#171A26] transition duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_10px_28px_rgba(255,183,15,0.4)] active:translate-y-0 sm:w-auto"
const btnGhost =
  "inline-flex w-full items-center justify-center gap-2 rounded-md border-2 border-white/85 px-6 py-3.5 text-sm font-bold text-white transition duration-200 hover:-translate-y-0.5 hover:border-white hover:bg-white hover:text-[#171A26] active:translate-y-0 sm:w-auto"

export function CourseHeroCtas({
  primaryLabel,
  primaryHref,
  secondary,
  onAddToCart,
  showAddToCart,
  viewAllHref = "/courses",
}: {
  primaryLabel?: string
  primaryHref: string
  secondary?: HeroCta[]
  onAddToCart?: () => void
  showAddToCart?: boolean
  viewAllHref?: string
}) {
  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      {primaryLabel?.trim() ? (
        <Link href={primaryHref} className={btnPrimary}>
          {primaryLabel}
          <span className="ml-1" aria-hidden>
            ›
          </span>
        </Link>
      ) : null}
      {showAddToCart && onAddToCart ? (
        <button type="button" onClick={onAddToCart} className={btnGhost}>
          <ShoppingCart className="h-4 w-4" />
          Add to Cart
        </button>
      ) : null}
      {(secondary || []).map((cta, i) => {
        const label = (cta.label || "").trim()
        if (!label) return null
        const href = (cta.link || "").trim() || viewAllHref
        return (
          <Link key={`${label}-${i}`} href={href} className={btnGhost}>
            {label.toLowerCase().includes("view") ? (
              <LayoutGrid className="h-4 w-4" />
            ) : null}
            {label}
          </Link>
        )
      })}
      {!secondary?.some((c) => (c.label || "").toLowerCase().includes("view")) ? (
        <Link href={viewAllHref} className={btnGhost}>
          <LayoutGrid className="h-4 w-4" />
          View All Courses
        </Link>
      ) : null}
    </div>
  )
}

/**
 * Cinematic hero (Kickboxing reference): full-bleed action image,
 * left-aligned title / features / CTAs over dark gradient.
 */
export function CourseHeroBlock({
  title,
  subtitle,
  description,
  imageUrl,
  featureIcons,
  primaryLabel,
  primaryHref,
  secondaryCtas,
  showAddToCart,
  onAddToCart,
}: {
  title: string
  subtitle?: string
  description?: string
  imageUrl?: string
  featureIcons?: HeroFeatureIcon[]
  primaryLabel?: string
  primaryHref: string
  secondaryCtas?: HeroCta[]
  showAddToCart?: boolean
  onAddToCart?: () => void
}) {
  const img = (imageUrl || "").trim()
  return (
    <section
      className="relative flex min-h-[60vh] items-end overflow-hidden bg-[#0B0C10]"
      style={
        img
          ? {
              backgroundImage: `url(${resolveUrl(img)})`,
              backgroundSize: "cover",
              backgroundPosition: "center right",
            }
          : undefined
      }
    >
      <div className={HERO_OVERLAY_COURSE_SIDE} />
      <div className={HERO_OVERLAY_COURSE_BOTTOM} />
      <div className="site-content relative z-10 w-full px-0 pb-10 pt-24 sm:px-1 md:pb-12 md:pt-28">
        <motion.div
          className="max-w-3xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1
            className="mb-2 text-3xl font-extrabold uppercase italic leading-[0.92] tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            {title}
          </h1>
          <div
            className="mb-4 h-1.5 w-36 -skew-x-12 bg-[#FFB70F] md:w-48"
            aria-hidden
          />
          {subtitle?.trim() ? (
            <div className="mb-3 flex max-w-2xl items-stretch gap-3">
              <span className="w-1 shrink-0 bg-[#FFB70F]" aria-hidden />
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/95 sm:text-sm">
                {subtitle}
              </p>
            </div>
          ) : null}
          {description?.trim() ? (
            <p className="mb-1 max-w-xl text-sm leading-relaxed text-white/70">
              {description}
            </p>
          ) : null}
          <CourseHeroFeatures items={featureIcons || []} />
          <CourseHeroCtas
            primaryLabel={primaryLabel || "Join Now"}
            primaryHref={primaryHref}
            secondary={secondaryCtas}
            showAddToCart={showAddToCart}
            onAddToCart={onAddToCart}
          />
        </motion.div>
      </div>
    </section>
  )
}

export function CourseAboutSection({
  title,
  description,
  secondary,
}: {
  title: string
  description?: string
  secondary?: string
}) {
  if (!title?.trim() && !description?.trim() && !secondary?.trim()) return null
  return (
    <section className={cn("bg-[#F3F3F5] text-[#171A26]", sectionPad)}>
      <div className="site-content px-0 sm:px-1">
        <SectionReveal>
          <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[minmax(12rem,18rem)_auto_minmax(0,1fr)] md:gap-10 lg:gap-14">
            <h2
              className="text-3xl font-extrabold uppercase italic leading-[1.05] tracking-tight text-[#171A26] md:text-4xl lg:text-[2.75rem]"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              {title}
            </h2>
            <div
              className="hidden w-px self-stretch bg-[#FFB70F] md:block md:min-h-[5.5rem]"
              aria-hidden
            />
            <div className="border-t border-[#FFB70F]/45 pt-5 md:border-0 md:pt-0">
              <div className="max-w-3xl space-y-4 text-[15px] leading-relaxed text-gray-700 md:text-base">
                {description?.trim() ? <p>{description}</p> : null}
                {secondary?.trim() ? <p>{secondary}</p> : null}
              </div>
            </div>
          </div>
        </SectionReveal>
      </div>
    </section>
  )
}

function LearnCardTile({
  card,
  mode,
}: {
  card: LearnCard
  mode: "image" | "icon"
  dark?: boolean
}) {
  const desc = (card.description || card.subtitle || "").trim()

  if (mode === "image") {
    return (
      <article className="group min-w-0 snap-start select-none" aria-label={card.title}>
        <div
          className="relative overflow-hidden border-2 border-[#FFB70F] bg-black/40 shadow-[0_8px_28px_rgba(0,0,0,0.12)] transition duration-300 group-hover:border-[#FFD24A] group-hover:shadow-[0_12px_32px_rgba(255,183,15,0.25)]"
          style={{ clipPath: "polygon(8% 0, 100% 0, 92% 100%, 0 100%)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolveUrl(card.image)}
            alt=""
            className="aspect-[3/4] w-full min-h-[280px] object-cover transition duration-500 group-hover:scale-[1.05] sm:min-h-[320px] md:min-h-[380px] lg:min-h-[420px]"
            loading="lazy"
            draggable={false}
          />
          {/* Default title strip */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-3 pb-3 pt-10 transition-opacity duration-300 group-hover:opacity-0 sm:px-4 sm:pb-4">
            <h3
              className="text-sm font-bold uppercase leading-tight tracking-wide text-[#FFB70F] sm:text-base md:text-lg"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              {card.title}
            </h3>
          </div>
          {/* Hover overlay — description only; not clickable */}
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-black/75 px-4 py-5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:px-5 sm:py-6">
            <h3
              className="mb-2 text-sm font-bold uppercase leading-tight tracking-wide text-[#FFB70F] sm:text-base"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              {card.title}
            </h3>
            {desc ? (
              <p className="line-clamp-7 text-xs leading-relaxed text-white/90 sm:text-sm">
                {desc}
              </p>
            ) : null}
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className="group relative flex min-h-[7.5rem] snap-start flex-col items-center justify-center gap-2 overflow-hidden rounded-md border border-[#FFB70F]/55 bg-white/5 px-3 py-4 text-center transition duration-300 hover:border-[#FFB70F] hover:bg-white/10">
      <div className="flex h-9 w-9 items-center justify-center text-[#FFB70F] transition group-hover:scale-110">
        <span className="text-xl" aria-hidden>
          {card.icon?.trim() || "★"}
        </span>
      </div>
      <h3
        className="text-[11px] font-bold uppercase text-[#FFB70F] sm:text-xs"
        style={{ fontFamily: "'Oswald', sans-serif" }}
      >
        {card.title}
      </h3>
      {desc ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-[#0B0C10]/95 px-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <p className="line-clamp-5 text-[11px] leading-relaxed text-white/85">
            {desc}
          </p>
        </div>
      ) : null}
    </article>
  )
}

export function CourseLearnCards({
  title = "What You'll Learn",
  items,
  light,
  embedded,
  variant = "auto",
}: {
  title?: string
  items: LearnCard[]
  light?: boolean
  embedded?: boolean
  variant?: "auto" | "image" | "icon"
}) {
  const cards = (items || []).filter((c) => c.title?.trim())
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)
  const [isNarrow, setIsNarrow] = useState(false)

  const hasImages = cards.some((c) => Boolean(c.image))
  const mode = variant === "auto" ? (hasImages ? "image" : "icon") : variant
  const darkBand = Boolean(light) || mode === "icon"

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setCanPrev(el.scrollLeft > 8)
    setCanNext(el.scrollLeft < max - 8)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1279px)")
    const apply = () => setIsNarrow(mq.matches)
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])

  useEffect(() => {
    updateArrows()
    const el = scrollerRef.current
    if (!el) return
    el.addEventListener("scroll", updateArrows, { passive: true })
    window.addEventListener("resize", updateArrows)
    return () => {
      el.removeEventListener("scroll", updateArrows)
      window.removeEventListener("resize", updateArrows)
    }
  }, [cards.length, updateArrows])

  if (!cards.length) return null

  // Carousel when more than 4 cards (larger tiles) or on narrower viewports
  const useCarousel = isNarrow || cards.length > 4

  const scrollByCard = (dir: -1 | 1) => {
    const el = scrollerRef.current
    if (!el) return
    const card = el.querySelector("article")
    const step = card ? (card as HTMLElement).offsetWidth + 12 : el.clientWidth * 0.7
    const max = el.scrollWidth - el.clientWidth
    const next = el.scrollLeft + dir * step
    if (dir > 0 && next >= max - 4) {
      el.scrollTo({ left: 0, behavior: "smooth" })
    } else if (dir < 0 && el.scrollLeft <= 4) {
      el.scrollTo({ left: max, behavior: "smooth" })
    } else {
      el.scrollBy({ left: dir * step, behavior: "smooth" })
    }
  }

  /* Autoscroll all learn-card carousels */
  useEffect(() => {
    if (!useCarousel) return
    const el = scrollerRef.current
    if (!el) return
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReduced) return
    const id = window.setInterval(() => {
      if (document.hidden) return
      scrollByCard(1)
    }, 4200)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useCarousel, cards.length, isNarrow])

  const body = (
    <SectionReveal>
      <div className="relative">
        <SlashTitle title={title} light={darkBand} />
        {useCarousel ? (
          <>
            <div
              ref={scrollerRef}
              className="flex gap-3 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
            >
              {cards.map((card, i) => (
                <div
                  key={`${card.title}-${i}`}
                  className="w-[85%] min-w-[85%] shrink-0 xs:w-[75%] sm:w-[55%] sm:min-w-[55%] md:w-[42%] md:min-w-[42%] lg:w-[34%] lg:min-w-[34%] xl:w-[30%] xl:min-w-[30%]"
                >
                  <LearnCardTile card={card} mode={mode} dark={darkBand} />
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                aria-label="Previous cards"
                disabled={!canPrev}
                onClick={() => scrollByCard(-1)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#FFB70F] text-[#FFB70F] transition hover:bg-[#FFB70F] hover:text-[#171A26] disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Next cards"
                disabled={!canNext}
                onClick={() => scrollByCard(1)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#FFB70F] text-[#FFB70F] transition hover:bg-[#FFB70F] hover:text-[#171A26] disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </>
        ) : (
          <div
            className={cn(
              "grid gap-4 md:gap-5",
              cards.length <= 2
                ? "grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto"
                : cards.length === 3
                  ? "grid-cols-1 sm:grid-cols-3"
                  : "grid-cols-2 lg:grid-cols-4"
            )}
          >
            {cards.map((card, i) => (
              <LearnCardTile
                key={`${card.title}-${i}`}
                card={card}
                mode={mode}
                dark={darkBand}
              />
            ))}
          </div>
        )}
      </div>
    </SectionReveal>
  )

  if (embedded) return <div className="min-w-0">{body}</div>
  return (
    <section className={cn(sectionPad, darkBand ? "bg-[#0B0C10]" : "bg-white")}>
      <div className="site-content px-0 sm:px-1">{body}</div>
    </section>
  )
}

/** Who Can Join — expressive card grid with accent rail + note banner */
export function CourseWhoCanJoin({
  content,
  embed,
}: {
  content: WhoCanJoinContent
  embed?: boolean
}) {
  const items = (content.items || []).filter((x) => x?.trim())
  if (!items.length && !content.note?.trim()) return null
  const inner = (
    <SectionReveal>
      <div className="relative overflow-hidden rounded-2xl border border-[#FFB70F]/25 bg-gradient-to-br from-[#151821] via-[#0B0C10] to-[#1a1520] p-6 sm:p-8 md:p-10">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#FFB70F]/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-[#FFB70F]/5 blur-3xl"
          aria-hidden
        />
        <div className="relative mb-8 flex flex-col gap-3 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#FFB70F]/90">
              Open to everyone ready to train
            </p>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#FFB70F]/40 bg-[#FFB70F]/10 text-[#FFB70F]">
                <Users className="h-6 w-6" strokeWidth={2} />
              </span>
              <h2
                className="text-2xl font-extrabold uppercase italic tracking-tight text-white md:text-3xl lg:text-[2.35rem]"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                {content.title?.trim() || "Who Can Join?"}
              </h2>
            </div>
          </div>
          <div className="h-1 w-24 -skew-x-12 bg-[#FFB70F] sm:mb-2" aria-hidden />
        </div>
        <ul className="relative grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {items.map((item, i) => (
            <li
              key={i}
              className="group flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition duration-300 hover:-translate-y-0.5 hover:border-[#FFB70F]/45 hover:bg-[#FFB70F]/8"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FFB70F] text-sm font-extrabold text-[#171A26] shadow-[0_6px_16px_rgba(255,183,15,0.28)] transition group-hover:scale-105">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="pt-1 text-[15px] leading-snug text-white/95 md:text-base">
                {item}
              </span>
            </li>
          ))}
        </ul>
        <div className="relative mt-8 overflow-hidden rounded-xl border border-[#FFB70F]/35 bg-[#FFB70F] px-5 py-4 text-[#171A26] shadow-[0_12px_32px_rgba(255,183,15,0.28)] sm:mt-10 sm:px-6 sm:py-5">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-[#171A26]/25" aria-hidden />
          <div className="flex items-start gap-3 sm:items-center">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#171A26] text-[#FFB70F]">
              <Check className="h-4 w-4" strokeWidth={3} />
            </span>
            <p className="text-sm font-bold leading-relaxed sm:text-base">
              {content.note?.trim() || "No previous experience required."}
            </p>
          </div>
        </div>
      </div>
    </SectionReveal>
  )
  if (embed) return inner
  return (
    <section className={cn("bg-[#0B0C10]", sectionPad)}>
      <div className="site-content px-0 sm:px-1">{inner}</div>
    </section>
  )
}

/** @deprecated Learn + Who are always separate sections now */
export function CourseLearnAndAudience({
  learnTitle,
  learnCards,
  learnVariant = "auto",
}: {
  learnTitle?: string
  learnCards: LearnCard[]
  who?: WhoCanJoinContent | null
  learnVariant?: "auto" | "image" | "icon"
  omitWho?: boolean
}) {
  const cards = (learnCards || []).filter((c) => c.title?.trim())
  if (!cards.length) return null
  return (
    <CourseLearnCards
      title={learnTitle || "What You'll Learn"}
      items={cards}
      variant={learnVariant}
    />
  )
}

/** Sport spotlight only (Who Can Join is always its own section) */
export function CourseSportAndAudience({
  sport,
}: {
  sport?: SportSpotlightContent | null
  who?: WhoCanJoinContent | null
}) {
  const hasSport = Boolean(sport && (sport.title?.trim() || sport.body?.trim()))
  if (!hasSport || !sport) return null

  return (
    <section className={cn("relative overflow-hidden bg-[#111318]", sectionPad)}>
      {sport.image ? (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage: `url(${resolveUrl(sport.image)})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          aria-hidden
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0B0C10] via-[#0B0C10]/88 to-[#0B0C10]/7" />
      <div className="site-content relative z-10 max-w-3xl px-0 sm:px-1">
        <SlashTitle title={sport.title || "Sport"} light />
        {sport.body ? (
          <p className="text-[15px] leading-relaxed text-white/80 md:text-base">
            {sport.body}
          </p>
        ) : null}
      </div>
    </section>
  )
}

function trainingHeaderIcon(title: string, index: number) {
  const t = title.toLowerCase()
  if (t.includes("pro") || t.includes("compet") || t.includes("advance")) {
    return <Trophy className="h-5 w-5 text-[#FFB70F]" />
  }
  if (t.includes("regular") || t.includes("basic") || t.includes("begin")) {
    return <Calendar className="h-5 w-5 text-[#FFB70F]" />
  }
  return index % 2 === 0 ? (
    <Calendar className="h-5 w-5 text-[#FFB70F]" />
  ) : (
    <Trophy className="h-5 w-5 text-[#FFB70F]" />
  )
}

/** Goal-based cards: image + slanted yellow label + 3 checks (Yoga/Gym mock) */
function GoalTrainingCard({ p }: { p: TrainingProgramCard }) {
  const points = (p.bullet_points || []).filter(Boolean).slice(0, 3)
  const img = (p.image || "").trim()
  return (
    <article className="group relative flex flex-col">
      <div className="relative overflow-hidden rounded-xl bg-[#171A26]">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolveUrl(img)}
            alt={p.title}
            className="aspect-[16/11] w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="aspect-[16/11] w-full bg-gradient-to-br from-[#222635] to-[#0B0C10]" />
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
      </div>
      <div className="relative z-10 mx-auto -mt-5 w-[88%]">
        <div className="-skew-x-12 rounded-sm bg-[#FFB70F] px-3 py-2.5 text-center shadow-[0_8px_20px_rgba(255,183,15,0.35)] transition group-hover:brightness-110">
          <h3
            className="skew-x-12 text-[11px] font-extrabold uppercase italic leading-tight text-[#171A26] sm:text-xs md:text-[13px]"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            {p.title}
          </h3>
        </div>
      </div>
      <ul className="mt-5 space-y-2.5 px-1">
        {points.map((bp, j) => (
          <li key={j} className="flex items-start gap-2.5 text-sm text-gray-700">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFB70F]/15">
              <Check className="h-3 w-3 text-[#FFB70F]" strokeWidth={3} />
            </span>
            <span>{bp}</span>
          </li>
        ))}
      </ul>
    </article>
  )
}

/** Regular / Professional path cards (Taekwondo-style mock) */
function PathTrainingCard({ p, index }: { p: TrainingProgramCard; index: number }) {
  const points = (p.bullet_points || []).filter(Boolean)
  const scheduleLine = [p.schedule_label, p.duration_label]
    .filter(Boolean)
    .join(" | ")
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_48px_rgba(0,0,0,0.12)]">
      <div className="relative z-10 -mb-1 w-[min(100%,18rem)] -skew-x-12 bg-[#171A26] px-5 py-3 shadow-md transition group-hover:bg-black sm:w-[min(100%,20rem)]">
        <div className="flex skew-x-12 items-center gap-2.5">
          {trainingHeaderIcon(p.title, index)}
          <div className="min-w-0">
            <h3
              className="text-sm font-extrabold uppercase italic tracking-wide text-[#FFB70F] sm:text-base"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              {p.title}
            </h3>
            {p.subtitle ? (
              <p className="text-[11px] italic text-white/80">{p.subtitle}</p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 px-5 pb-4 pt-6 sm:flex-row sm:items-stretch sm:gap-2">
        <div className="min-w-0 flex-1">
          <ul className="space-y-2.5">
            {points.map((bp, j) => (
              <li key={j} className="flex items-start gap-2.5 text-sm text-gray-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#FFB70F]" strokeWidth={3} />
                <span>{bp}</span>
              </li>
            ))}
          </ul>
        </div>
        {p.image ? (
          <div className="relative mx-auto flex w-36 shrink-0 items-end justify-center self-end sm:w-40 md:w-44">
            <div
              className="absolute inset-x-2 bottom-0 top-6 rounded-t-full bg-gradient-to-t from-[#FFB70F]/50 via-[#FFB70F]/15 to-transparent"
              aria-hidden
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveUrl(p.image)}
              alt=""
              className="relative z-[1] h-auto max-h-48 w-full object-contain object-bottom drop-shadow-lg transition duration-500 group-hover:scale-[1.03]"
              loading="lazy"
            />
          </div>
        ) : null}
      </div>
      {scheduleLine ? (
        <div className="mx-4 mb-4 flex items-center gap-2 rounded-xl bg-[#171A26] px-4 py-3 text-xs font-semibold text-white sm:text-[13px]">
          <Clock className="h-4 w-4 shrink-0 text-[#FFB70F]" />
          <span>
            {p.schedule_label && p.duration_label
              ? `Schedule: ${p.schedule_label} | Duration: ${p.duration_label}`
              : p.schedule_label
                ? `Schedule: ${p.schedule_label}`
                : `Duration: ${p.duration_label}`}
          </span>
        </div>
      ) : null}
    </article>
  )
}

function TrainingProgramsCarousel({
  cards,
  isGoal,
}: {
  cards: TrainingProgramCard[]
  isGoal: boolean
}) {
  const autoplay = useEmblaAutoplay({ delay: 4200 })
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: "start",
      loop: cards.length > 4,
      containScroll: "trimSnaps",
      slidesToScroll: 1,
    },
    cards.length > 4 ? [autoplay] : []
  )
  return (
    <div className="relative">
      <div className="mb-4 flex justify-end gap-2">
        <button
          type="button"
          aria-label="Previous programs"
          onClick={() => emblaApi?.scrollPrev()}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#FFB70F] text-[#FFB70F] transition hover:bg-[#FFB70F] hover:text-[#171A26]"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Next programs"
          onClick={() => emblaApi?.scrollNext()}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#FFB70F] text-[#FFB70F] transition hover:bg-[#FFB70F] hover:text-[#171A26]"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-5">
          {cards.map((p, i) => (
            <div
              key={`${p.title}-${i}`}
              className="min-w-0"
              style={{ flex: "0 0 calc((100% - 60px) / 4)" }}
            >
              {isGoal ? (
                <GoalTrainingCard p={p} />
              ) : (
                <PathTrainingCard p={p} index={i} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function CourseTrainingPrograms({
  title = "Training Program",
  subtitle,
  programs,
  goalBased,
}: {
  title?: string
  subtitle?: string
  programs: TrainingProgramCard[]
  goalBased?: boolean
}) {
  const cards = (programs || []).filter((p) => p.title?.trim())
  if (!cards.length) return null
  const isGoal = Boolean(goalBased || cards.length > 2)
  const useCarousel = cards.length > 4
  return (
    <section className={cn("relative bg-[#F7F7F8]", sectionPad)}>
      <div className="site-content px-0 sm:px-1">
        <SectionReveal>
          <SlashTitle
            title={title}
            subtitle={
              subtitle?.trim() ||
              (isGoal
                ? "Choose a goal-based training program based on your fitness needs."
                : "Choose the right training path based on your goal.")
            }
            subtitleAside={isGoal}
          />
          {useCarousel ? (
            <TrainingProgramsCarousel cards={cards} isGoal={isGoal} />
          ) : isGoal ? (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-4 xl:gap-0">
              {cards.map((p, i) => (
                <div
                  key={`${p.title}-${i}`}
                  className={cn(
                    "px-0 xl:px-5",
                    i > 0 && "xl:border-l xl:border-[#FFB70F]/45"
                  )}
                >
                  <GoalTrainingCard p={p} />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
              {cards.map((p, i) => (
                <PathTrainingCard key={`${p.title}-${i}`} p={p} index={i} />
              ))}
            </div>
          )}
        </SectionReveal>
      </div>
    </section>
  )
}

export function CourseWhyRmaa({ content }: { content: WhyRmaaContent }) {
  const items = (content.items || []).filter((x) => x?.trim())
  if (!content.body?.trim() && !items.length) return null
  return (
    <div>
      <div className="mb-4 flex items-center gap-2.5">
        <Star className="h-5 w-5 fill-[#FFB70F] text-[#FFB70F]" />
        <h3
          className="text-lg font-extrabold uppercase italic text-[#171A26] md:text-xl"
          style={{ fontFamily: "'Oswald', sans-serif" }}
        >
          {content.title?.trim() || "Why Learn at RMAA?"}
        </h3>
      </div>
      {content.body ? (
        <p className="mb-3 text-sm leading-relaxed text-gray-600 md:text-[15px]">
          {content.body}
        </p>
      ) : null}
      {items.length ? (
        <ul className="space-y-2.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#FFB70F]" strokeWidth={3} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

const FACT_ICONS: Record<string, ReactNode> = {
  syllabus: <BookOpen className="h-5 w-5 text-[#FFB70F]" />,
  equipment: <Dumbbell className="h-5 w-5 text-[#FFB70F]" />,
  benefits: <BarChart3 className="h-5 w-5 text-[#FFB70F]" />,
}

export function CourseFactGrid({
  syllabusLines,
  equipment,
  benefits,
  whyRmaa,
  equipmentTitle = "Required Attire",
}: {
  syllabusLines?: string[]
  equipment?: string[]
  benefits?: { title: string; description?: string }[]
  whyRmaa?: WhyRmaaContent
  equipmentTitle?: string
}) {
  const cols = [
    syllabusLines?.length
      ? { key: "syllabus", title: "Syllabus", lines: syllabusLines }
      : null,
    equipment?.length
      ? { key: "equipment", title: equipmentTitle, lines: equipment }
      : null,
    benefits?.length
      ? {
          key: "benefits",
          title: "Benefits",
          lines: benefits.map(
            (b) => b.title + (b.description ? ` — ${b.description}` : "")
          ),
        }
      : null,
  ].filter(Boolean) as { key: string; title: string; lines: string[] }[]

  const hasWhy = Boolean(whyRmaa && (whyRmaa.body || whyRmaa.items?.length))
  if (!cols.length && !hasWhy) return null

  return (
    <section className={cn("bg-white", sectionPad)}>
      <div className="site-content px-0 sm:px-1">
        <SectionReveal>
          <div
            className={cn(
              "grid gap-10 md:gap-12",
              hasWhy && cols.length >= 2
                ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
                : cols.length + (hasWhy ? 1 : 0) >= 3
                  ? "grid-cols-1 sm:grid-cols-3"
                  : "grid-cols-1 sm:grid-cols-2"
            )}
          >
            {cols.map((col) => (
              <div key={col.key}>
                <div className="mb-4 flex items-center gap-2.5">
                  <span aria-hidden>{FACT_ICONS[col.key] || null}</span>
                  <h3
                    className="text-lg font-extrabold uppercase italic text-[#171A26] md:text-xl"
                    style={{ fontFamily: "'Oswald', sans-serif" }}
                  >
                    {col.title}
                  </h3>
                </div>
                <ul className="space-y-2.5">
                  {col.lines.map((line, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 text-sm text-gray-700"
                    >
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-[#FFB70F]"
                        strokeWidth={3}
                      />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {hasWhy && whyRmaa ? <CourseWhyRmaa content={whyRmaa} /> : null}
          </div>
        </SectionReveal>
      </div>
    </section>
  )
}

export function CourseLineage({ content }: { content: LineageContent }) {
  if (!content.title?.trim() && !content.body?.trim()) return null
  return (
    <section className={cn("relative overflow-hidden bg-[#0B0C10] text-white", sectionPad)}>
      <div className="site-content relative z-10 grid grid-cols-1 items-center gap-10 px-0 sm:px-1 lg:grid-cols-2">
        {content.image ? (
          <div className="overflow-hidden rounded-md border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveUrl(content.image)}
              alt={content.founder_name || content.title || "Lineage"}
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}
        <div>
          <SlashTitle title={content.title || "Our Lineage"} light />
          {content.body ? (
            <p className="text-sm leading-relaxed text-white/80 md:text-base">
              {content.body}
            </p>
          ) : null}
          {(content.founder_name || content.founder_title) && (
            <p className="mt-4 text-sm italic text-[#FFB70F]">
              {[content.founder_name, content.founder_title]
                .filter(Boolean)
                .join(" — ")}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

export function CoursePhilosophyPillars({ items }: { items: PhilosophyPillar[] }) {
  const cards = (items || []).filter((i) => i.title?.trim())
  if (!cards.length) return null
  return (
    <section className={cn("bg-[#111318]", sectionPad)}>
      <div className="site-content px-0 sm:px-1">
        <SlashTitle title="The Shaolin Way" light />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {cards.map((c, i) => (
            <div
              key={`${c.title}-${i}`}
              className="rounded-md border border-[#FFB70F]/35 bg-black/40 p-6"
            >
              <div className="mb-2 text-2xl text-[#FFB70F]" aria-hidden>
                {c.icon || "☯"}
              </div>
              <h3 className="text-base font-bold uppercase text-[#FFB70F]">
                {c.title}
              </h3>
              {c.description ? (
                <p className="mt-2 text-sm text-white/75">{c.description}</p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function CourseQualities({
  items,
  title = "Develop The Complete Warrior",
}: {
  items: QualityItem[]
  title?: string
}) {
  const cards = (items || []).filter((i) => i.title?.trim())
  if (!cards.length) return null
  const cols =
    cards.length <= 4
      ? "grid-cols-2 sm:grid-cols-4"
      : cards.length <= 6
        ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
        : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7"

  return (
    <section className={cn("bg-[#0B0C10]", sectionPad)}>
      <div className="site-content px-0 sm:px-1">
        <SlashTitle title={title} light />
        <div className={cn("grid gap-6 md:gap-8", cols)}>
          {cards.map((c, i) => (
            <div key={`${c.title}-${i}`} className="group text-center">
              <div className="mx-auto mb-3 h-28 w-28 overflow-hidden rounded-full border-2 border-[#FFB70F]/55 bg-black/40 shadow-[0_10px_28px_rgba(0,0,0,0.35)] transition duration-300 group-hover:border-[#FFB70F] sm:h-32 sm:w-32 md:h-36 md:w-36">
                {c.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveUrl(c.image)}
                    alt=""
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl text-[#FFB70F] sm:text-4xl">
                    <span aria-hidden>{c.icon || "★"}</span>
                  </div>
                )}
              </div>
              <p className="text-sm font-bold uppercase tracking-wide text-white md:text-base">
                {c.title}
              </p>
              {c.description ? (
                <p className="mt-1.5 px-1 text-xs leading-snug text-white/65 md:text-sm">
                  {c.description}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function CourseSportSpotlight({ content }: { content: SportSpotlightContent }) {
  if (!content.title?.trim() && !content.body?.trim()) return null
  return (
    <section className={cn("bg-[#0B0C10]", sectionPad)}>
      <div className="site-content grid grid-cols-1 items-center gap-10 px-0 sm:px-1 lg:grid-cols-2">
        <div>
          <SlashTitle title={content.title || "Sport"} light />
          {content.body ? (
            <p className="text-sm leading-relaxed text-white/80 md:text-base">
              {content.body}
            </p>
          ) : null}
        </div>
        {content.image ? (
          <div className="overflow-hidden rounded-md border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveUrl(content.image)}
              alt={content.title || "Sport"}
              className="aspect-[4/3] h-full w-full object-cover"
            />
          </div>
        ) : null}
      </div>
    </section>
  )
}

export function CourseStyleCards({
  title = "Dance Styles We Teach",
  items,
}: {
  title?: string
  items: StyleCard[]
}) {
  const cards = (items || []).filter((c) => c.title?.trim())
  if (!cards.length) return null
  return (
    <section className={cn("bg-[#111318]", sectionPad)}>
      <div className="site-content px-0 sm:px-1">
        <SlashTitle title={title} light />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {cards.map((c, i) => (
            <article
              key={`${c.title}-${i}`}
              className="overflow-hidden rounded-md border border-[#FFB70F]/40 bg-black/50"
            >
              {c.image ? (
                <div className="aspect-[3/4] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveUrl(c.image)}
                    alt={c.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              ) : null}
              <div className="p-3">
                <h3 className="text-sm font-bold uppercase text-[#FFB70F]">
                  {c.title}
                </h3>
                {c.description ? (
                  <p className="mt-1 text-xs text-white/70">{c.description}</p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

/** Highlight course name inside CTA headline in brand gold */
function highlightHeadline(headline: string, highlight?: string) {
  const h = (highlight || "").trim()
  if (!h) return <>{headline}</>
  const idx = headline.toUpperCase().indexOf(h.toUpperCase())
  if (idx < 0) return <>{headline}</>
  const before = headline.slice(0, idx)
  const match = headline.slice(idx, idx + h.length)
  const after = headline.slice(idx + h.length)
  return (
    <>
      {before}
      <span className="text-[#FFB70F]">{match}</span>
      {after}
    </>
  )
}

export function CourseFinalCta({
  content,
  primaryHref,
  onAddToCart,
  canAddToCart,
  highlightWord,
}: {
  content: FinalCtaContent
  primaryHref: string
  onAddToCart?: () => void
  canAddToCart?: boolean
  /** Course name to paint gold inside the headline */
  highlightWord?: string
}) {
  const headline = content.headline?.trim()
  if (!headline && !content.tagline?.trim()) return null
  const bg = content.background_image ? resolveUrl(content.background_image) : ""
  return (
    <section
      className="relative overflow-hidden py-16 md:py-24"
      style={
        bg
          ? {
              backgroundImage: `linear-gradient(rgba(0,0,0,.78), rgba(0,0,0,.72)), url(${bg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      {!bg ? (
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B0C10] via-[#171A26] to-[#0B0C10]" />
      ) : null}
      <div className="site-content relative z-10 px-0 text-center sm:px-1">
        <h2
          className="text-2xl font-extrabold uppercase italic tracking-tight text-white md:text-4xl lg:text-[2.85rem]"
          style={{ fontFamily: "'Oswald', sans-serif" }}
        >
          {highlightHeadline(headline || "Start Your Journey Today", highlightWord)}
        </h2>
        {content.tagline ? (
          <p className="mx-auto mt-4 max-w-3xl text-xs font-semibold uppercase tracking-[0.22em] text-[#FFB70F] sm:text-sm">
            {content.tagline}
          </p>
        ) : null}
        <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link
            href={(content.primary_cta_link || "").trim() || primaryHref}
            className={btnPrimary}
          >
            {content.primary_cta_text?.trim() || "Join Now"} ›
          </Link>
          {content.show_add_to_cart !== false && canAddToCart && onAddToCart ? (
            <button type="button" onClick={onAddToCart} className={btnGhost}>
              <ShoppingCart className="h-4 w-4" />
              Add to Cart
            </button>
          ) : null}
          {content.show_view_all !== false ? (
            <Link href="/courses" className={btnGhost}>
              <LayoutGrid className="h-4 w-4" />
              View All Courses
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export { SlashTitle, Y as COURSE_BRAND_YELLOW, INK as COURSE_INK }
