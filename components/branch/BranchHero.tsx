"use client"

import { BranchData } from "./types"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import { getBranchDisplayLabels } from "@/lib/branchDisplay"
import { HERO_OVERLAY_BOTTOM, HERO_OVERLAY_TOP } from "@/lib/heroOverlay"

interface BranchHeroProps {
  branch: BranchData
  coverImageUrl?: string | null
  /** Partner org logo — only when branch is assigned to a partner. */
  logoUrl?: string | null
  logoAlt?: string | null
  orgName?: string | null
}

/**
 * Hero: brand name (partner or Rock Martial Arts) + location/branch below.
 */
export function BranchHero({
  branch,
  coverImageUrl,
  logoUrl,
  logoAlt,
  orgName,
}: BranchHeroProps) {
  const labels = getBranchDisplayLabels({
    ...branch,
    partner_org_name: orgName || branch.partner_org_name,
    brand_name: (branch as BranchData & { brand_name?: string }).brand_name || orgName,
  })
  const title = labels.brandName
  const poweredBy = labels.poweredByLine
  const subtitle = labels.locationName || labels.placeName

  const mediaUrl = coverImageUrl || "/assets/img/banner.jpg"
  const isVideo = typeof mediaUrl === "string" && /\.(mp4|webm)$/i.test(mediaUrl)
  const logo = resolvePublicAssetUrl(logoUrl || "") || null

  return (
    <section
      className="relative min-h-[60vh] flex items-end justify-center overflow-hidden"
      data-aos="fade-up"
      data-aos-duration="600"
      data-aos-once="true"
    >
      {/* Cover / first gallery image or placeholder */}
      <div className="absolute inset-0">
        {isVideo ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
          >
            <source src={mediaUrl} type="video/mp4" />
          </video>
        ) : (
          <img
            src={mediaUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        )}
        <div className={HERO_OVERLAY_BOTTOM} />
        <div className={HERO_OVERLAY_TOP} />
      </div>

      <div className="relative z-10 container mx-auto px-4 max-w-7xl pb-12 md:pb-16">
        {logo ? (
          <div className="mb-4 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logo}
              alt={logoAlt || title}
              className="h-14 w-auto max-w-[180px] object-contain drop-shadow-lg"
            />
          </div>
        ) : null}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white uppercase tracking-wide mb-1">
          {title}
        </h1>
        {poweredBy ? (
          <p className="text-white/70 text-sm md:text-base normal-case tracking-normal font-medium mb-2">
            {poweredBy}
          </p>
        ) : null}
        {subtitle ? (
          <p className="text-[#FFB70F] text-lg md:text-xl flex items-center gap-2">
            <span className="inline-block w-1 h-6 bg-[#FFB70F]" />
            {subtitle}
          </p>
        ) : null}
      </div>
    </section>
  )
}
