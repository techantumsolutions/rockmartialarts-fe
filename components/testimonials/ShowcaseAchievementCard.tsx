"use client"

import { SafeImage, DEFAULT_IMAGE_PLACEHOLDER } from "@/components/ui/safe-image"

export type ShowcaseAchievementItem = {
  id?: string
  student_name?: string
  student_photo?: string | null
  achievement_title?: string
  description?: string | null
  image?: string | null
}

/** Compact card sized for a 3-column achievements grid (no internal scroll). */
export function ShowcaseAchievementCard({ item }: { item: ShowcaseAchievementItem }) {
  const title = item.achievement_title || "Achievement"
  const desc = item.description?.trim() || ""

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden h-full flex flex-col transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:border-[#FFB70F]/40">
      <div className="relative w-full aspect-[3/4] max-h-[280px] shrink-0 overflow-hidden bg-gray-950">
        <SafeImage
          src={item.image || DEFAULT_IMAGE_PLACEHOLDER}
          alt={title}
          resolveUrl={Boolean(item.image)}
          className="absolute inset-0 w-full h-full object-cover object-center"
          wrapperClassName="absolute inset-0"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="p-3 sm:p-4 flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-2.5 mb-2 min-w-0">
          <SafeImage
            src={item.student_photo || DEFAULT_IMAGE_PLACEHOLDER}
            alt={item.student_name || ""}
            resolveUrl={Boolean(item.student_photo)}
            className="w-9 h-9 shrink-0 rounded-full object-cover border border-[#FFB70F]/30"
            loading="lazy"
          />
          <span className="font-medium text-white truncate text-sm">
            {item.student_name || "Student"}
          </span>
        </div>
        <h3 className="text-[#FFB70F] font-bold text-sm sm:text-base mb-1.5 line-clamp-2 leading-snug">
          {title}
        </h3>
        {desc ? (
          <p className="text-gray-400 text-xs sm:text-sm leading-relaxed line-clamp-2">{desc}</p>
        ) : null}
      </div>
    </div>
  )
}
