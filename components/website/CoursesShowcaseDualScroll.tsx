"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { SafeImage } from "@/components/ui/safe-image"
import { toCourseSlug } from "@/lib/course-slug"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"

export interface CourseShowcaseItem {
  id: string
  title: string
  category?: string
  img: string
  href: string
}

export interface CoursesShowcaseDualScrollProps {
  tag?: string
  title?: string
  description?: string
  courses: CourseShowcaseItem[]
}

const DEFAULT_COURSES: CourseShowcaseItem[] = [
  {
    id: "shaolin-kung-fu",
    title: "Shaolin Kung Fu",
    category: "Martial Arts",
    img: "/assets/img/courses/kung-fu-trainer.png",
    href: "/courses/shaolin-kung-fu",
  },
  {
    id: "kuchipudi-dance",
    title: "Kuchipudi Dance",
    category: "Dance",
    img: "/assets/img/courses/choose_img2.png",
    href: "/courses/kuchipudi-dance",
  },
  {
    id: "taekwondo",
    title: "Taekwondo",
    category: "Martial Arts",
    img: "/assets/img/courses/takewondo_trainer.png",
    href: "/courses/taekwondo",
  },
  {
    id: "weapons-training",
    title: "Weapons Training",
    category: "Martial Arts",
    img: "/assets/img/courses/weapons_trainers.png",
    href: "/courses/weapons-training",
  },
  {
    id: "kick-boxing",
    title: "Kick Boxing & Fitness",
    category: "Fitness & Combat",
    img: "/assets/img/courses/choose_img3.png",
    href: "/courses/kick-boxing",
  },
  {
    id: "tai-chi",
    title: "Tai Chi & Internal Power",
    category: "Martial Arts",
    img: "/assets/img/courses/choose_img4.png",
    href: "/courses/tai-chi",
  },
  {
    id: "yoga-wellness",
    title: "Yoga & Flexibility",
    category: "Wellness",
    img: "/assets/img/courses/yoga_trainers.png",
    href: "/courses/yoga",
  },
  {
    id: "self-defense",
    title: "Self Defense Tactics",
    category: "Martial Arts",
    img: "/assets/img/courses/choose_img1.png",
    href: "/courses/self-defense",
  },
]

function ensureMinimumItems(items: CourseShowcaseItem[], min = 4): CourseShowcaseItem[] {
  if (items.length === 0) return []
  let res = [...items]
  while (res.length < min) {
    res = [...res, ...items]
  }
  return res
}

export default function CoursesShowcaseDualScroll({
  tag = "• LEARN. PRACTICE. ADVANCE.",
  title = "Skills that move with you.\nTrain. Perform. Grow.",
  description = "Discover expert-led courses designed to build real-world skills, boost confidence, and help every learner achieve their potential.",
  courses,
}: CoursesShowcaseDualScrollProps) {
  const router = useRouter()
  const [isHovered, setIsHovered] = useState(false)
  const [coursesList, setCoursesList] = useState<CourseShowcaseItem[]>(
    courses && courses.length > 0 ? courses : []
  )

  // Sync if server courses update
  useEffect(() => {
    if (courses && courses.length > 0) {
      setCoursesList(courses)
    }
  }, [courses])

  // Client-side fallback fetch to ensure real database courses and links are always active
  useEffect(() => {
    if (courses && courses.length > 0) return

    let cancelled = false
    fetch("/api/backend/courses/public/all?limit=100")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        const list = data.courses ?? data ?? []
        if (Array.isArray(list) && list.length > 0) {
          const active = list.filter(
            (c: any) => c.settings?.active !== false && c.enabled !== false
          )
          if (active.length > 0) {
            const mapped: CourseShowcaseItem[] = active.map((c: any) => {
              const rawImg =
                c.media_resources?.course_image_url ||
                c.page_content?.hero_section?.hero_image ||
                null
              const img =
                (rawImg && (resolvePublicAssetUrl(rawImg) || rawImg)) ||
                "/assets/img/courses/choose_img1.png"
              const slug = toCourseSlug(c)
              return {
                id: String(c.id || slug),
                title: String(c.title || c.name || c.code || "Course"),
                category: String(
                  c.category_name || c.category || c.difficulty_level || "Martial Arts"
                ),
                img,
                href: `/courses/${slug}`,
              }
            })
            setCoursesList(mapped)
          }
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [courses])

  const effectiveCourses = useMemo(() => {
    return coursesList.length > 0 ? coursesList : DEFAULT_COURSES
  }, [coursesList])

  // Split courses into two balanced streams for Column 1 (Up) & Column 2 (Down)
  const { col1, col2 } = useMemo(() => {
    const c1: CourseShowcaseItem[] = []
    const c2: CourseShowcaseItem[] = []

    effectiveCourses.forEach((item, index) => {
      if (index % 2 === 0) {
        c1.push(item)
      } else {
        c2.push(item)
      }
    })

    if (c1.length === 0 && c2.length > 0) c1.push(...c2)
    if (c2.length === 0 && c1.length > 0) c2.push(...c1)

    const filled1 = ensureMinimumItems(c1, 4)
    const filled2 = ensureMinimumItems(c2, 4)

    // Duplicate each stream once for seamless continuous infinite loop
    return {
      col1: [...filled1, ...filled1],
      col2: [...filled2, ...filled2],
    }
  }, [effectiveCourses])

  // Multi-line heading support with gold highlight
  const titleLines = useMemo(() => {
    const raw = (title || "Skills that move with you.\nTrain. Perform. Grow.").trim()
    const parts = raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
    if (parts.length >= 2) {
      return { line1: parts[0], line2: parts.slice(1).join(" ") }
    }
    const dotIdx = raw.indexOf(". ")
    if (dotIdx > 0 && dotIdx < raw.length - 2) {
      return {
        line1: raw.slice(0, dotIdx + 1),
        line2: raw.slice(dotIdx + 2),
      }
    }
    return { line1: raw, line2: "" }
  }, [title])

  const cleanTag = (tag || "• LEARN. PRACTICE. ADVANCE.").trim()

  const handleCardClick = (href: string) => {
    if (href) {
      router.push(href)
    }
  }

  return (
    <section className="relative py-14 sm:py-18 md:py-24 bg-[#0F1320] border-t border-[#383D4D]/60 overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#FFB70F]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#FFB70F]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="site-content relative z-10 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: Tag, Title, Description */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            {/* Tag / Pill Badge */}
            <div className="inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full border border-[#FFB70F]/40 bg-[#FFB70F]/10 text-xs sm:text-sm font-semibold tracking-wider uppercase text-[#FFB70F] mb-6 shadow-[0_0_15px_rgba(255,183,15,0.15)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFB70F] animate-pulse" />
              <span>{cleanTag.replace(/^•\s*/, "")}</span>
            </div>

            {/* Title */}
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[52px] font-black tracking-tight leading-[1.12]">
              <span className="block text-white">{titleLines.line1}</span>
              {titleLines.line2 && (
                <span className="block text-[#FFB70F] mt-1 sm:mt-2">
                  {titleLines.line2}
                </span>
              )}
            </h2>

            {/* Description */}
            {description && (
              <p className="mt-6 text-[#AEB4C2] text-base sm:text-lg leading-relaxed max-w-xl">
                {description}
              </p>
            )}
          </div>

          {/* Right Column: Framed Dual-Scrolling Courses Gallery */}
          <div className="lg:col-span-7">
            <div
              className="rma-gallery-container relative rounded-3xl border border-[#FFB70F]/35 bg-[#141828]/80 p-3 sm:p-4 md:p-5 backdrop-blur-md shadow-[0_0_40px_rgba(255,183,15,0.08)] overflow-hidden h-[460px] sm:h-[520px] md:h-[580px] lg:h-[620px]"
              tabIndex={0}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              aria-label="Courses Gallery - Hover to pause scrolling, click to view details"
            >
              {/* Gradient masks for smooth fade in/out at top and bottom */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-16 sm:h-20 bg-gradient-to-b from-[#141828] via-[#141828]/80 to-transparent z-20" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 sm:h-20 bg-gradient-to-t from-[#141828] via-[#141828]/80 to-transparent z-20" />

              {/* Two Auto-Scrolling Columns */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 h-full relative">
                {/* Column 1: Auto-scrolls UP, pauses on hover */}
                <div
                  className="rma-marquee-col overflow-hidden h-full relative"
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                >
                  <div
                    className="flex flex-col gap-3 sm:gap-4 rma-marquee-up"
                    style={{ animationPlayState: isHovered ? "paused" : "running" }}
                  >
                    {col1.map((item, idx) => (
                      <Link
                        key={`c1-${item.id}-${idx}`}
                        href={item.href}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCardClick(item.href)
                        }}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        className="rma-card-link group/card relative block rounded-2xl overflow-hidden aspect-[4/5] sm:aspect-[3/4] bg-[#1E2437] border border-[#383D4D]/80 transition-all duration-300 hover:border-[#FFB70F] hover:shadow-[0_10px_28px_rgba(255,183,15,0.25)] hover:scale-[1.02] cursor-pointer shrink-0 z-10"
                      >
                        <SafeImage
                          src={item.img}
                          alt={item.title}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover/card:scale-110 pointer-events-none"
                        />
                        {/* Dark gradient overlay for text readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19]/90 via-[#0B0F19]/35 to-transparent pointer-events-none" />

                        {/* Text and badges matching image */}
                        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 z-10 pointer-events-none">
                          {item.category && (
                            <p className="text-[#FFB70F] font-bold text-xs sm:text-sm tracking-wider uppercase drop-shadow-md">
                              {item.category}
                            </p>
                          )}
                          <p className="text-white font-semibold text-sm sm:text-base line-clamp-1 drop-shadow-md mt-0.5 group-hover/card:text-[#FFB70F] transition-colors">
                            {item.title}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Column 2: Auto-scrolls DOWN, pauses on hover */}
                <div
                  className="rma-marquee-col overflow-hidden h-full relative"
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                >
                  <div
                    className="flex flex-col gap-3 sm:gap-4 rma-marquee-down"
                    style={{ animationPlayState: isHovered ? "paused" : "running" }}
                  >
                    {col2.map((item, idx) => (
                      <Link
                        key={`c2-${item.id}-${idx}`}
                        href={item.href}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCardClick(item.href)
                        }}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        className="rma-card-link group/card relative block rounded-2xl overflow-hidden aspect-[4/5] sm:aspect-[3/4] bg-[#1E2437] border border-[#383D4D]/80 transition-all duration-300 hover:border-[#FFB70F] hover:shadow-[0_10px_28px_rgba(255,183,15,0.25)] hover:scale-[1.02] cursor-pointer shrink-0 z-10"
                      >
                        <SafeImage
                          src={item.img}
                          alt={item.title}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover/card:scale-110 pointer-events-none"
                        />
                        {/* Dark gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19]/90 via-[#0B0F19]/35 to-transparent pointer-events-none" />

                        {/* Text and badges matching image */}
                        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 z-10 pointer-events-none">
                          {item.category && (
                            <p className="text-[#FFB70F] font-bold text-xs sm:text-sm tracking-wider uppercase drop-shadow-md">
                              {item.category}
                            </p>
                          )}
                          <p className="text-white font-semibold text-sm sm:text-base line-clamp-1 drop-shadow-md mt-0.5 group-hover/card:text-[#FFB70F] transition-colors">
                            {item.title}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded keyframes & bulletproof hover-pause selectors */}
      <style jsx>{`
        @keyframes rmaScrollUp {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-50%);
          }
        }
        @keyframes rmaScrollDown {
          0% {
            transform: translateY(-50%);
          }
          100% {
            transform: translateY(0);
          }
        }
        .rma-marquee-up {
          animation: rmaScrollUp 32s linear infinite;
          will-change: transform;
        }
        .rma-marquee-down {
          animation: rmaScrollDown 32s linear infinite;
          will-change: transform;
        }
        .rma-gallery-container:hover .rma-marquee-up,
        .rma-gallery-container:hover .rma-marquee-down,
        .rma-marquee-col:hover .rma-marquee-up,
        .rma-marquee-col:hover .rma-marquee-down,
        .rma-card-link:hover,
        .rma-marquee-up:hover,
        .rma-marquee-down:hover {
          animation-play-state: paused !important;
        }
        @media (max-width: 640px) {
          .rma-marquee-up {
            animation-duration: 26s;
          }
          .rma-marquee-down {
            animation-duration: 26s;
          }
        }
      `}</style>
    </section>
  )
}
