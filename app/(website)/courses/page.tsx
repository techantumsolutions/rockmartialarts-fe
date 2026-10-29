"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Loader2, ArrowRight } from "lucide-react"
import { toCourseSlug } from "@/lib/course-slug"
import { SafeImage } from "@/components/ui/safe-image"

type CourseItem = {
  id: string
  title?: string
  name?: string
  code?: string
  description?: string
  difficulty_level?: string
  pricing?: { amount?: number; currency?: string }
  media_resources?: { course_image_url?: string; promo_video_url?: string }
  page_content?: { hero_section?: { hero_image?: string } }
}

function getCourseImage(c: CourseItem): string | null {
  return c.media_resources?.course_image_url || c.page_content?.hero_section?.hero_image || null
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/backend/courses/public/all", { headers: { "Content-Type": "application/json" } })
      .then((res) => (res.ok ? res.json() : Promise.resolve({ courses: [] })))
      .then((data) => {
        const list = data.courses ?? data ?? []
        setCourses(Array.isArray(list) ? list : [])
      })
      .catch(() => setCourses([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="min-h-screen bg-[#171A26]">
      {/* Hero */}
      <section
        className="relative py-20 md:py-28 bg-cover bg-center"
        style={{ backgroundImage: "url(/assets/img/banner.jpg)" }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="container relative z-10 mx-auto px-4 max-w-7xl">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold text-white uppercase mb-4">Our Classes</h1>
            <p className="text-gray-200 text-lg">
              Choose a course below to see full details, duration, fees, and curriculum. Register when you&apos;re ready.
            </p>
          </div>
        </div>
      </section>

      {/* Courses grid from API */}
      <section className="py-16 md:py-20 bg-[#171A26]">
        <div className="container mx-auto px-4 max-w-7xl">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-[#FFB70F]" />
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="mb-4">No courses available yet. Check back soon.</p>
              <Link href="/" className="text-[#FFB70F] hover:text-white font-medium">
                Back to home
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {courses.map((c) => (
                  <Link
                    key={c.id}
                    href={`/courses/${toCourseSlug(c)}`}
                    className="group flex h-full flex-col rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden hover:border-[#FFB70F] transition-colors"
                  >
                    <div className="aspect-[4/3] bg-gray-800 overflow-hidden">
                      <SafeImage
                        src={getCourseImage(c) || undefined}
                        alt={c.title || c.name || ""}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h2 className="text-xl font-bold text-[#FFB70F] group-hover:text-white transition-colors mb-1">
                        {c.title || c.name || c.code || "Course"}
                      </h2>
                      {c.difficulty_level && (
                        <p className="text-gray-500 text-sm mb-2">{c.difficulty_level}</p>
                      )}
                      {c.description && (
                        <p className="text-gray-400 text-sm line-clamp-2">{c.description}</p>
                      )}
                      <span className="mt-auto inline-flex items-center gap-1 pt-3 text-[#FFB70F] font-medium text-sm group-hover:gap-2 transition-all">
                        View details <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="text-center mt-12">
                <Link
                  href="/register"
                  className="inline-block rounded-lg bg-[#FFB70F] px-8 py-3.5 text-base font-semibold text-black hover:bg-[#F73322] hover:text-white transition-colors"
                >
                  Register now
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
