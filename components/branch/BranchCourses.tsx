"use client"

import { useEffect, useState } from "react"
import { BookOpen, IndianRupee, Loader2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { toCourseSlug } from "@/lib/course-slug"
import { stripUuidFromPriceDisplay } from "@/lib/priceDisplay"
import { formatCoursePriceLabel } from "@/lib/registrationPricing"
import { BranchData, getBranchName } from "./types"
import { CourseInfoModal, type CourseInfoModalCourse } from "@/components/common/CourseInfoModal"

/** Course from GET /api/courses/by-branch/:branchId (same shape as public by-branch) */
export interface BranchCourseItem {
  id: string
  title?: string
  name?: string
  code?: string
  slug?: string
  description?: string
  difficulty_level?: string
  media_resources?: { course_image_url?: string; promo_video_url?: string }
  pricing?: {
    currency?: string
    amount?: number
    fee_1_month?: number
    fee_3_months?: number
    fee_6_months?: number
    fee_1_year?: number
    fee_per_duration?: Record<string, number | string>
  }
  branch_id?: string
  branchId?: string
  branch?: { id?: string }
  branch_assignments?: { branch_id?: string }[]
  available_durations?: Array<{
    id?: string
    code?: string
    name?: string
    duration_months?: number
  }>
}

function formatPrice(course: BranchCourseItem): string {
  const label = formatCoursePriceLabel(course.pricing)
  return stripUuidFromPriceDisplay(label)
}

function getCourseName(course: BranchCourseItem): string {
  return course.title ?? course.name ?? course.code ?? "Course"
}

/**
 * Courses at this branch: uses the public detail payload when present,
 * otherwise fetches /api/courses/by-branch/:id.
 */
export function BranchCourses({ branch }: { branch: BranchData }) {
  const [branchCourses, setBranchCourses] = useState<BranchCourseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [modalCourse, setModalCourse] = useState<CourseInfoModalCourse | null>(null)
  const [modalCourseDurations, setModalCourseDurations] = useState<
    BranchCourseItem["available_durations"]
  >(undefined)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    if (!branch?.id) {
      setLoading(false)
      return
    }
    if (Array.isArray(branch.courses)) {
      setBranchCourses(branch.courses as BranchCourseItem[])
      setLoading(false)
      setError(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(false)
    fetch(`/api/courses/by-branch/${encodeURIComponent(branch.id)}`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to fetch"))))
      .then((data: { courses?: BranchCourseItem[] }) => {
        if (cancelled) return
        const list = Array.isArray(data?.courses) ? data.courses : []
        setBranchCourses(list)
      })
      .catch(() => {
        if (!cancelled) {
          setError(true)
          setBranchCourses([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [branch?.id, branch.courses])

  function openModal(course: BranchCourseItem) {
    setModalCourse({
      id: course.id,
      title: course.title,
      name: course.name,
      code: course.code,
      description: course.description,
      difficulty_level: course.difficulty_level,
    })
    setModalCourseDurations(course.available_durations)
    setModalOpen(true)
  }

  return (
    <section
      className="py-16 md:py-20 bg-[#171A26] relative z-10"
      data-aos="fade-up"
      data-aos-duration="600"
      data-aos-once="true"
    >
      <CourseInfoModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) {
            setModalCourse(null)
            setModalCourseDurations(undefined)
          }
        }}
        course={modalCourse}
        branchId={branch.id}
        branchDisplayName={getBranchName(branch)}
        branchTimings={branch.operational_details?.timings}
        courseSchedule={branch.assignments?.course_schedule}
        availableDurations={modalCourseDurations}
      />

      <div className="container mx-auto px-4 max-w-7xl">
        <h2 className="text-3xl md:text-4xl font-bold text-[#FFB70F] mb-10 text-center">
          Courses Available at This Branch
        </h2>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden flex flex-col animate-pulse"
              >
                <div className="aspect-[16/10] bg-gray-800" />
                <div className="p-5 flex flex-col flex-1">
                  <div className="h-5 bg-gray-700 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-700 rounded w-full mb-1" />
                  <div className="h-3 bg-gray-700 rounded w-full mb-1" />
                  <div className="h-3 bg-gray-700 rounded w-1/2 mb-4" />
                  <div className="h-4 bg-gray-700 rounded w-1/3 mb-4" />
                  <div className="h-10 bg-gray-700 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && branchCourses.length === 0 && (
          <p className="text-center text-gray-400 py-12">
            {error
              ? "Could not load courses for this branch. Please try again later."
              : "No courses currently available at this branch."}
          </p>
        )}

        {!loading && branchCourses.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {branchCourses.map((course) => (
              <div
                key={course.id}
                className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden hover:border-[#FFB70F]/50 transition-colors flex flex-col"
              >
                <div className="relative aspect-[16/10] bg-gray-800">
                  {course.media_resources?.course_image_url ? (
                    <Image
                      src={course.media_resources.course_image_url}
                      alt={getCourseName(course)}
                      fill
                      className="object-cover"
                      sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-gray-600" />
                    </div>
                  )}
                  {course.difficulty_level && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-medium bg-[#FFB70F]/90 text-[#171A26]">
                      {course.difficulty_level}
                    </span>
                  )}
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">
                    {getCourseName(course)}
                  </h3>
                  {course.description && (
                    <p className="text-gray-400 text-sm mb-4 line-clamp-3 flex-1">
                      {course.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-300 mb-4">
                    <IndianRupee className="w-4 h-4 flex-shrink-0 text-[#FFB70F]" />
                    <span>{formatPrice(course)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openModal(course)}
                    className="inline-flex items-center justify-center rounded-lg bg-[#FFB70F] px-4 py-2 text-sm font-semibold text-[#171A26] hover:bg-[#FFB70F]/90 transition-colors"
                  >
                    More Info
                  </button>
                  <Link
                    href={`/courses/${encodeURIComponent(toCourseSlug(course))}`}
                    className="mt-2 text-center text-sm text-[#FFB70F] hover:text-white transition-colors"
                  >
                    View course page
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
