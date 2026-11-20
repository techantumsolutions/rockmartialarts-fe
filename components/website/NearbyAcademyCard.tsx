"use client"

import Link from "next/link"
import { Heart, MapPin, Star } from "lucide-react"
import { SafeImage } from "@/components/ui/safe-image"
import { realisticPlaceholder } from "@/lib/imagePlaceholders"
import type { BranchDistanceResult } from "@/lib/branchDistance"

export type NearbyAcademyCardData = {
  id: string
  /** Combined / legacy card title (e.g. "SJML Kakatiya Nagar") */
  name: string
  /** Brand line: partner name or academy place name */
  brandName?: string
  /** Small line: "powered by {Platform}" */
  poweredByLine?: string
  /** Place / locality under the brand */
  locationName?: string
  location: string
  address?: string
  phone?: string
  href: string
  img?: string | null
  logoUrl?: string | null
  tags?: string[]
  rating?: number | null
  reviewCount?: number | null
  area?: string
}

function realRating(rating?: number | null): number | null {
  if (typeof rating !== "number" || Number.isNaN(rating) || rating <= 0) return null
  return Math.round(rating * 10) / 10
}

function realReviewCount(count?: number | null): number | null {
  if (typeof count !== "number" || Number.isNaN(count) || count < 0) return null
  return Math.floor(count)
}

function distanceBadgeText(result?: BranchDistanceResult | null, loading?: boolean): string | null {
  if (loading && !result?.distance_label) return "…"
  const km = result?.distance_km
  if (km == null || Number.isNaN(Number(km))) return null
  const rounded = Math.round(Number(km) * 10) / 10
  return `${rounded} km`
}

type Props = {
  branch: NearbyAcademyCardData
  distance?: BranchDistanceResult | null
  distanceLoading?: boolean
  isNearest?: boolean
}

export function NearbyAcademyCard({ branch, distance, distanceLoading, isNearest }: Props) {
  const title = branch.brandName || branch.name
  const place =
    branch.locationName || branch.area || branch.location || ""
  const cover = branch.img || realisticPlaceholder(branch.id || branch.name)
  const rating = realRating(branch.rating)
  const reviews = realReviewCount(branch.reviewCount)
  const badge = distanceBadgeText(distance, distanceLoading)
  const tags = (branch.tags || []).filter(Boolean).slice(0, 3)

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#383D4D] bg-[#1B1E2B] shadow-[0_8px_24px_rgba(0,0,0,0.28)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[#FFB70F]/45 hover:shadow-[0_18px_40px_rgba(255,183,15,0.16)]">
      <div className="relative aspect-[16/11] overflow-hidden bg-[#222635]">
        <SafeImage
          src={cover}
          alt={branch.name}
          resolveUrl={Boolean(branch.img)}
          fallbackSrc={realisticPlaceholder(branch.id)}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          wrapperClassName="absolute inset-0"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#171A26]/55 via-transparent to-transparent" />
        {badge ? (
          <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-[#171A26]/85 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm border border-white/10">
            {badge}
          </span>
        ) : isNearest ? (
          <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-emerald-500/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            Nearest
          </span>
        ) : null}
        <button
          type="button"
          aria-label="Save academy"
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#171A26]/75 text-white border border-white/15 backdrop-blur-sm transition-colors hover:text-[#FFB70F]"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          <Heart className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="text-base sm:text-lg font-bold text-white leading-snug line-clamp-2 mb-0.5">
          {title}
        </h3>
        {branch.poweredByLine ? (
          <p className="text-[11px] text-[#AEB4C2] normal-case tracking-normal mb-1.5 truncate">
            {branch.poweredByLine}
          </p>
        ) : null}
        {rating != null ? (
          <p className="flex items-center gap-1.5 text-sm text-[#FFB70F] mb-2">
            <Star className="h-3.5 w-3.5 fill-[#FFB70F] text-[#FFB70F] shrink-0" />
            <span className="font-semibold">{rating.toFixed(1)}</span>
            {reviews != null ? (
              <span className="text-[#AEB4C2] font-normal">
                ({reviews} {reviews === 1 ? "review" : "reviews"})
              </span>
            ) : null}
          </p>
        ) : null}
        {place ? (
          <p className="flex items-start gap-1.5 text-sm text-[#AEB4C2] mb-3 min-w-0">
            <MapPin className="h-3.5 w-3.5 text-[#FFB70F] shrink-0 mt-0.5" />
            <span className="line-clamp-1" title={place}>
              {place}
            </span>
          </p>
        ) : null}

        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[#292E40] border border-[#383D4D] px-2.5 py-1 text-[11px] font-medium text-[#D8DCE6]"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <div className="mb-4" />
        )}

        <Link
          href={branch.href}
          className="mt-auto inline-flex w-full items-center justify-center rounded-xl bg-[#FFB70F] px-4 py-2.5 text-sm font-bold text-[#171A26] transition-all duration-300 hover:brightness-110 hover:shadow-[0_10px_24px_rgba(255,183,15,0.3)]"
        >
          View Classes
        </Link>
      </div>
    </article>
  )
}

type SectionProps = {
  title?: string
  subtitle?: string
  children: React.ReactNode
  controls?: React.ReactNode
}

export function NearbyAcademiesSection({
  title = "Nearby Academies",
  subtitle = "Explore the best training centres in your area.",
  children,
  controls,
}: SectionProps) {
  const parts = title.trim().split(/\s+/)
  const last = parts.pop() || ""
  const head = parts.join(" ")
  const sectionId =
    title.toLowerCase().includes("nearby") ? "branches" : "our-academies"

  return (
    <section
      id={sectionId}
      className="py-14 md:py-20 scroll-mt-24 relative z-10 border-t border-[#383D4D] bg-[#171A26]"
    >
      <div className="site-content px-0 sm:px-1">
        <div className="mb-8 md:mb-10">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white uppercase">
            {head ? (
              <>
                {head} <span className="text-[#FFB70F]">{last}</span>
              </>
            ) : (
              <span className="text-[#FFB70F]">{last}</span>
            )}
          </h2>
          {subtitle ? (
            <p className="mt-2 max-w-xl text-sm text-[#AEB4C2] sm:text-base">{subtitle}</p>
          ) : null}
        </div>
        {controls}
        {children}
      </div>
    </section>
  )
}
