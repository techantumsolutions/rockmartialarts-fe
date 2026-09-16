"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react"
import { SafeImage } from "@/components/ui/safe-image"
import { toCategoryHref, toCourseDetailHref } from "@/lib/category-slug"

type CategoryNavItem = {
  id: string
  name?: string
  slug?: string
  description?: string
}

type CourseCard = {
  id: string
  title?: string
  name?: string
  code?: string
  slug?: string
  description?: string
  difficulty_level?: string
  media_resources?: { course_image_url?: string }
  page_content?: { hero_section?: { hero_image?: string } }
}

function getCourseImage(c: CourseCard): string | null {
  return c.media_resources?.course_image_url || c.page_content?.hero_section?.hero_image || null
}

export default function CategoryLandingPage() {
  const params = useParams()
  const slug = typeof params.slug === "string" ? params.slug : ""
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [category, setCategory] = useState<CategoryNavItem | null>(null)
  const [parent, setParent] = useState<CategoryNavItem | null>(null)
  const [subcategories, setSubcategories] = useState<CategoryNavItem[]>([])
  const [courses, setCourses] = useState<CourseCard[]>([])

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    setNotFound(false)

    fetch(`/api/backend/categories/public/by-slug/${encodeURIComponent(slug)}`, {
      headers: { "Content-Type": "application/json" },
    })
      .then(async (res) => {
        if (res.status === 404) return null
        if (!res.ok) throw new Error("Failed to load category")
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        if (!data?.category) {
          setNotFound(true)
          setCategory(null)
          setParent(null)
          setSubcategories([])
          setCourses([])
          return
        }
        setCategory(data.category)
        setParent(data.parent || null)
        setSubcategories(Array.isArray(data.subcategories) ? data.subcategories : [])
        setCourses(Array.isArray(data.courses) ? data.courses : [])
      })
      .catch(() => {
        if (!cancelled) {
          setNotFound(true)
          setCategory(null)
          setParent(null)
          setSubcategories([])
          setCourses([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#171A26] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-gray-400">
          <Loader2 className="w-12 h-12 animate-spin text-[#FFB70F]" />
          <p>Loading category...</p>
        </div>
      </main>
    )
  }

  if (notFound || !category) {
    return (
      <main className="min-h-screen bg-[#171A26] flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Category not found</h1>
          <p className="text-gray-400 mb-6">This category may be inactive or no longer available.</p>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 text-[#FFB70F] hover:text-white font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            View all courses
          </Link>
        </div>
      </main>
    )
  }

  const hasSubcategories = subcategories.length > 0
  const hasCourses = courses.length > 0

  return (
    <main className="min-h-screen bg-[#171A26]">
      <section
        className="relative py-20 md:py-28 bg-cover bg-center"
        style={{ backgroundImage: "url(/assets/img/banner.jpg)" }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="container relative z-10 mx-auto px-4 max-w-7xl">
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-300 mb-4">
            <Link href="/courses" className="hover:text-[#FFB70F]">
              Courses
            </Link>
            {parent ? (
              <>
                <span>/</span>
                <Link href={toCategoryHref(parent)} className="hover:text-[#FFB70F]">
                  {parent.name}
                </Link>
              </>
            ) : null}
            <span>/</span>
            <span className="text-white">{category.name}</span>
          </div>
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold text-white uppercase mb-4">
              {category.name}
            </h1>
            {category.description ? (
              <p className="text-gray-200 text-lg">{category.description}</p>
            ) : (
              <p className="text-gray-200 text-lg">
                Explore courses in this category. Open a course for details, duration, and fees.
              </p>
            )}
          </div>
        </div>
      </section>

      {hasSubcategories ? (
        <section className="py-10 md:py-12 bg-[#171A26] border-b border-gray-800">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-xl font-semibold text-white mb-4">Subcategories</h2>
            <div className="flex flex-wrap gap-3">
              {subcategories.map((sub) => (
                <Link
                  key={sub.id}
                  href={toCategoryHref(sub)}
                  className="rounded-full border border-gray-700 bg-gray-900/60 px-4 py-2 text-sm text-white hover:border-[#FFB70F] hover:text-[#FFB70F] transition-colors min-h-11 inline-flex items-center"
                >
                  {sub.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="py-16 md:py-20 bg-[#171A26]">
        <div className="container mx-auto px-4 max-w-7xl">
          {!hasCourses ? (
            <div className="text-center py-16 text-gray-400">
              <p className="mb-4">
                {hasSubcategories
                  ? "No courses in this category yet. Try a subcategory above."
                  : "No courses available in this category yet. Check back soon."}
              </p>
              <Link href="/courses" className="text-[#FFB70F] hover:text-white font-medium">
                View all courses
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {courses.map((c) => (
                  <Link
                    key={c.id}
                    href={toCourseDetailHref(c)}
                    className="group block rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden hover:border-[#FFB70F] transition-colors"
                  >
                    <div className="aspect-[4/3] bg-gray-800 overflow-hidden">
                      <SafeImage
                        src={getCourseImage(c) || undefined}
                        alt={c.title || c.name || ""}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-5">
                      <h2 className="text-xl font-bold text-[#FFB70F] group-hover:text-white transition-colors mb-1">
                        {c.title || c.name || c.code || "Course"}
                      </h2>
                      {c.difficulty_level && (
                        <p className="text-gray-500 text-sm mb-2">{c.difficulty_level}</p>
                      )}
                      {c.description && (
                        <p className="text-gray-400 text-sm line-clamp-2">{c.description}</p>
                      )}
                      <span className="inline-flex items-center gap-1 text-[#FFB70F] font-medium text-sm mt-3 group-hover:gap-2 transition-all">
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
