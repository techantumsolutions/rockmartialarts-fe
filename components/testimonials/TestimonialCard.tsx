"use client"

import { SafeImage } from "@/components/ui/safe-image"
import { realisticPlaceholder } from "@/lib/imagePlaceholders"

export type TestimonialCardItem = {
  id?: string
  student_name?: string
  student_photo?: string | null
  testimonial_text?: string
  rating?: number | null
  academy_name?: string | null
  branch_name?: string | null
  /** When true, hide academy label (academy detail pages). */
  hideAcademyName?: boolean
  /** Legacy / CMS shape */
  name?: string
  role?: string
  quote?: string
  image?: string
  achievement?: string
  content?: string
}

export function TestimonialCard({ item }: { item: TestimonialCardItem }) {
  const name = item.student_name || item.name || "Student"
  const text = item.testimonial_text || item.quote || item.content || ""
  const photo = item.student_photo || item.image || realisticPlaceholder(item.id || name)
  const rating = typeof item.rating === "number" ? item.rating : null
  const academy =
    !item.hideAcademyName
      ? (item.academy_name || item.branch_name || item.role || "").trim()
      : ""

  return (
    <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800 h-full flex flex-col items-center text-center min-h-[280px]">
      <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#FFB70F]/50 mb-4 flex-shrink-0">
        <SafeImage
          src={photo}
          alt={name}
          loading="lazy"
          decoding="async"
          resolveUrl={Boolean(item.student_photo || item.image)}
          fallbackSrc={realisticPlaceholder(item.id || name)}
          className="w-full h-full object-cover"
        />
      </div>
      <img
        src="/assets/img/courses/quote.png"
        alt=""
        loading="lazy"
        decoding="async"
        className="w-8 h-8 mb-2 opacity-80"
      />
      <p className="text-gray-300 text-sm leading-relaxed mb-4 flex-1 line-clamp-6">{text}</p>
      <h3 className="text-[#FFB70F] font-semibold">{name}</h3>
      {item.achievement?.trim() ? (
        <p className="text-[#FFB70F]/90 text-xs font-medium uppercase tracking-wide mt-1">{item.achievement}</p>
      ) : null}
      {academy ? <p className="text-white/80 text-sm mt-1">{academy}</p> : null}
      {!academy && item.role?.trim() ? <p className="text-white/80 text-sm mt-1">{item.role}</p> : null}
      {rating !== null && rating > 0 ? (
        <p className="mt-2 text-[#FFB70F] text-sm" aria-label={`Rating ${rating} out of 5`}>
          {"★".repeat(Math.min(5, Math.round(rating)))}
          <span className="text-gray-500 ml-1">{rating.toFixed(1)}</span>
        </p>
      ) : null}
    </div>
  )
}
