"use client"

import {
  AnimatedSection,
  AnimatedStaggerGrid,
} from "@/components/animations"
import { SafeImage, DEFAULT_IMAGE_PLACEHOLDER } from "@/components/ui/safe-image"
import { LazySection } from "@/components/ui/LazySection"
import { resolveCmsText } from "@/lib/cmsContentFallback"

export type MemberCardData = {
  name: string
  role: string
  img: string
  about?: string
  rating?: number | null
}

export type OurMembersSectionProps = {
  members: MemberCardData[]
  eyebrow?: string
  title?: string
  emptyMessage?: string
  /** When false, render without LazySection (e.g. already below fold on branch pages) */
  lazy?: boolean
  className?: string
}

/**
 * Shared Expert Masters / Our Members grid — Home + Branch Detail.
 */
export function OurMembersSection({
  members,
  eyebrow,
  title,
  emptyMessage,
  lazy = true,
  className = "",
}: OurMembersSectionProps) {
  const resolvedEyebrow = resolveCmsText(eyebrow, "Our Members")
  const resolvedTitle = resolveCmsText(title, "Our Expert Masters")
  const empty = resolveCmsText(
    emptyMessage,
    "Coach profiles will appear here when published."
  )

  const inner = (
    <section className={className}>
      <div className="site-content px-0 sm:px-1">
        <AnimatedSection className="text-center mb-12" variant="fadeSlideUp">
          <div className="w-16 h-1 rounded-full bg-[#FFB70F] mx-auto mb-4" />
          <p className="text-[#FFB70F] font-semibold uppercase tracking-[0.2em] text-xs mb-2">
            {resolvedEyebrow}
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            {resolvedTitle}
          </h2>
        </AnimatedSection>
        <AnimatedStaggerGrid
          className={
            members.length
              ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-8 w-full justify-items-stretch"
              : "grid grid-cols-1 gap-6 w-full"
          }
          staggerDelay={0.12}
          childClassName="h-full w-full max-w-md mx-auto xl:max-w-none"
        >
          {members.length === 0 ? (
            <p className="text-center text-[#AEB4C2] text-sm col-span-full py-8">{empty}</p>
          ) : null}
          {members.map((t, idx) => (
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
              <h3 className="text-lg sm:text-xl font-bold text-white transition-colors duration-300 group-hover:text-[#FFB70F] mb-1 line-clamp-2">
                {t.name}
              </h3>
              <p className="text-[#FFB70F] font-semibold text-sm mb-3 line-clamp-2">
                {t.role || "Instructor"}
              </p>
              <p className="text-[#AEB4C2] text-sm leading-relaxed line-clamp-4 flex-1 w-full">
                {t.about?.trim()
                  ? t.about
                  : "Profile details will appear here when published."}
              </p>
            </div>
          ))}
        </AnimatedStaggerGrid>
      </div>
    </section>
  )

  if (!lazy) {
    return <div className="py-16 md:py-20 relative z-10 bg-[#171A26]">{inner}</div>
  }

  return (
    <LazySection
      className="py-16 md:py-20 relative z-10 bg-[#171A26]"
      minHeight={420}
      rootMargin="280px"
    >
      {inner}
    </LazySection>
  )
}
