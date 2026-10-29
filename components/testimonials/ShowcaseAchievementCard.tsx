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

export function ShowcaseAchievementCard({ item }: { item: ShowcaseAchievementItem }) {
  const title = item.achievement_title || "Achievement"
  const desc = item.description?.trim() || ""

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden h-full flex flex-col transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:border-[#FFB70F]/40">
      {/* Fixed media frame — card height does not follow image aspect ratio */}
      <div className="relative w-full aspect-[4/3] shrink-0 overflow-hidden bg-gray-800">
        <SafeImage
          src={item.image || DEFAULT_IMAGE_PLACEHOLDER}
          alt=""
          resolveUrl={Boolean(item.image)}
          className="absolute inset-0 w-full h-full object-cover object-center"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="p-4 flex flex-col flex-1 min-h-[9.5rem]">
        <div className="flex items-center gap-3 mb-2">
          <SafeImage
            src={item.student_photo || DEFAULT_IMAGE_PLACEHOLDER}
            alt={item.student_name || ""}
            resolveUrl={Boolean(item.student_photo)}
            className="w-10 h-10 shrink-0 rounded-full object-cover border border-[#FFB70F]/30"
            loading="lazy"
          />
          <span className="font-medium text-white truncate text-sm">{item.student_name || "Student"}</span>
        </div>
        <h3 className="text-[#FFB70F] font-bold text-base mb-2 line-clamp-2 min-h-[2.75rem]">{title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed line-clamp-3 flex-1">
          {desc || "\u00A0"}
        </p>
      </div>
    </div>
  )
}
