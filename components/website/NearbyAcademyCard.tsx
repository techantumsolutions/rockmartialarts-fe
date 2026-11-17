"use client"

import Link from "next/link"
import { Heart, MapPin, Star } from "lucide-react"
import { SafeImage } from "@/components/ui/safe-image"
import { realisticPlaceholder } from "@/lib/imagePlaceholders"
import type { BranchDistanceResult } from "@/lib/branchDistance"

export type NearbyAcademyCardData = {
  id: string
  name: string
  location: string
  address?: string
  phone?: string
  href: string
  img?: string | null
  tags?: string[]
  rating?: number | null
  reviewCount?: number | null
  area?: string
}

function displayRating(id: string, rating?: number | null): number {
  if (typeof rating === "number" && rating > 0) return Math.round(rating * 10) / 10
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return Math.round((4.5 + (hash % 40) / 100) * 10) / 10
}

function displayReviews(id: string, count?: number | null): number {
  if (typeof count === "number" && count >= 0) return count
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 17 + id.charCodeAt(i)) >>> 0
  return 80 + (hash % 280)
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
  const cover = branch.img || realisticPlaceholder(branch.id || branch.name)
  const rating = displayRating(branch.id, branch.rating)
  const reviews = displayReviews(branch.id, branch.reviewCount)
  const badge = distanceBadgeText(distance, distanceLoading)
  const tags = (branch.tags || []).filter(Boolean).slice(0, 3)
  const place = branch.area || branch.location || ""

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
        <h3 className="text-base sm:text-lg font-bold text-white leading-snug line-clamp-2 mb-2">
          {branch.name}
        </h3>
        <p className="flex items-center gap-1.5 text-sm text-[#FFB70F] mb-2">
          <Star className="h-3.5 w-3.5 fill-[#FFB70F] text-[#FFB70F] shrink-0" />
          <span className="font-semibold">{rating.toFixed(1)}</span>
          <span className="text-[#AEB4C2] font-normal">({reviews} reviews)</span>
        </p>
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
  viewAllHref?: string
  children: React.ReactNode
  controls?: React.ReactNode
}

export function NearbyAcademiesSection({
  title = "Nearby Academies",
  subtitle = "Explore the best training centres in your area.",
  viewAllHref = "/branches",
  children,
  controls,
}: SectionProps) {
  const parts = title.trim().split(/\s+/)
  const last = parts.pop() || ""
  const head = parts.join(" ")

  return (
    <section
      id="branches"
      className="py-14 md:py-20 scroll-mt-24 relative z-10 border-t border-[#383D4D] bg-[#171A26]"
    >
      <div className="site-content px-0 sm:px-1">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 md:mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white uppercase">
              {head ? (
                <>
                  {head} <span className="text-[#FFB70F]">{last}</span>
                </>
              ) : (
                <span className="text-[#FFB70F]">{last}</span>
              )}
            </h2>
            {subtitle ? <p className="mt-2 text-[#AEB4C2] text-sm sm:text-base max-w-xl">{subtitle}</p> : null}
          </div>
          {viewAllHref ? (
            <Link
              href={viewAllHref}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#FFB70F] hover:text-white transition-colors shrink-0"
            >
              View All Academies
              <span aria-hidden>→</span>
            </Link>
          ) : null}
        </div>
        {controls}
        {children}
      </div>
    </section>
  )
}
