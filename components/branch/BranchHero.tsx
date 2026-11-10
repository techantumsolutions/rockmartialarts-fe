"use client"

import { BranchData, formatLocation } from "./types"

interface BranchHeroProps {
  branch: BranchData
  coverImageUrl?: string | null
}

/**
 * Hero section: branch name, location, cover image with subtle scroll zoom.
 */
export function BranchHero({ branch, coverImageUrl }: BranchHeroProps) {
  const rawName =
    branch.branch?.name ||
    branch.branch?.code ||
    // Fallbacks for APIs that return top-level fields
    (branch as any).name ||
    (branch as any).code

  const name = rawName || "Branch"

  const location = formatLocation(
    branch.branch?.address || (branch as any).address
  )

  const mediaUrl = coverImageUrl || "/assets/img/banner.jpg"
  const isVideo = typeof mediaUrl === "string" && /\.(mp4|webm)$/i.test(mediaUrl)

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
        <div className="absolute inset-0 bg-gradient-to-t from-[#171A26] via-[#171A26]/80 to-transparent" />
      </div>

      <div className="relative z-10 container mx-auto px-4 max-w-7xl pb-12 md:pb-16">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white uppercase tracking-wide mb-2">
          {name}
        </h1>
        {location && (
          <p className="text-[#FFB70F] text-lg md:text-xl flex items-center gap-2">
            <span className="inline-block w-1 h-6 bg-[#FFB70F]" />
            {location}
          </p>
        )}
      </div>
    </section>
  )
}
