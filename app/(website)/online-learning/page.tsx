"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, Loader2, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SafeImage } from "@/components/ui/safe-image"
import { learningCourseAPI, type LearningCourse } from "@/lib/learningCourseAPI"

export default function OnlineLearningCataloguePage() {
  const [courses, setCourses] = useState<LearningCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput.trim())
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [searchInput])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    learningCourseAPI
      .listPublic({ search: search || undefined })
      .then((data) => {
        if (!cancelled) setCourses(Array.isArray(data.courses) ? data.courses : [])
      })
      .catch(() => {
        if (!cancelled) setCourses([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [search])

  return (
    <main className="min-h-screen bg-[#171A26]">
      <section
        className="relative py-20 md:py-28 bg-cover bg-center"
        style={{ backgroundImage: "url(/assets/img/banner.jpg)" }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="container relative z-10 mx-auto px-4 max-w-7xl">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold text-white uppercase mb-4">
              Online Learning
            </h1>
            <p className="text-gray-200 text-lg">
              Learn martial arts online at your pace. Browse published courses and start when you&apos;re ready.
            </p>
          </div>
        </div>
      </section>

      <section className="pt-6 pb-12 sm:pt-10 sm:pb-16 bg-[#171A26]">
        <div className="container mx-auto px-4 max-w-7xl space-y-6 sm:space-y-8">
          <form
            className="flex flex-col sm:flex-row gap-3 sm:gap-2.5 max-w-xl"
            onSubmit={(e) => {
              e.preventDefault()
              setSearch(searchInput.trim())
            }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search courses…"
                className="h-10 sm:h-11 pl-10 rounded-lg bg-gray-950/80 border-gray-700 text-white placeholder:text-gray-500 focus-visible:ring-1 focus-visible:ring-[#FFB70F] focus-visible:border-[#FFB70F] text-sm"
              />
            </div>
            <Button
              type="submit"
              className="h-10 sm:h-11 px-6 rounded-lg bg-[#FFB70F] hover:bg-[#e0a00d] text-black font-semibold text-sm transition-colors shadow-sm active:scale-95 shrink-0"
            >
              Search
            </Button>
          </form>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-[#FFB70F]" />
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="mb-4">No online courses published yet. Check back soon.</p>
              <Link href="/" className="text-[#FFB70F] hover:text-white font-medium">
                Back to home
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
              {courses.map((c) => (
                <Link
                  key={c.id}
                  href={`/online-learning/${c.slug || c.id}`}
                  className="group block rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden hover:border-[#FFB70F] transition-colors"
                >
                  <div className="aspect-[4/3] bg-gray-800 overflow-hidden">
                    <SafeImage
                      src={c.thumbnail_url || undefined}
                      alt={c.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-5">
                    <h2 className="text-xl font-bold text-[#FFB70F] group-hover:text-white transition-colors mb-1">
                      {c.title}
                    </h2>
                    {c.difficulty ? (
                      <p className="text-gray-500 text-sm mb-2">{c.difficulty}</p>
                    ) : null}
                    {c.short_description ? (
                      <p className="text-gray-400 text-sm line-clamp-2">
                        {c.short_description}
                      </p>
                    ) : null}
                    <span className="inline-flex items-center gap-1 text-[#FFB70F] font-medium text-sm mt-3 group-hover:gap-2 transition-all">
                      View details <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
