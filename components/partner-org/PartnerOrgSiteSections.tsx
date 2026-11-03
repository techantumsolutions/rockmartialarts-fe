"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  BookOpen,
  Building2,
  ChevronDown,
  IndianRupee,
  Loader2,
  Mail,
  MapPin,
  Phone,
} from "lucide-react"
import { toCourseSlug } from "@/lib/course-slug"
import { stripUuidFromPriceDisplay } from "@/lib/priceDisplay"
import { formatCoursePriceLabel } from "@/lib/registrationPricing"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import { CourseInfoModal, type CourseInfoModalCourse } from "@/components/common/CourseInfoModal"
import {
  ShowcaseAchievementCard,
  type ShowcaseAchievementItem,
} from "@/components/testimonials"

export type PartnerOrgBranchCourse = {
  id: string
  title?: string
  name?: string
  code?: string
  slug?: string
  description?: string
  difficulty_level?: string
  media_resources?: { course_image_url?: string }
  pricing?: Record<string, unknown>
  available_durations?: Array<{
    id?: string
    code?: string
    name?: string
    duration_months?: number
  }>
}

export type PartnerOrgBranchCard = {
  id: string
  name?: string
  code?: string
  slug?: string
  email?: string
  phone?: string
  address?: {
    line1?: string
    area?: string
    city?: string
    state?: string
    pincode?: string
    country?: string
  }
  branch?: {
    name?: string
    code?: string
    email?: string
    phone?: string
    address?: PartnerOrgBranchCard["address"]
  }
  courses?: PartnerOrgBranchCourse[]
  operational_details?: { timings?: unknown[] }
  assignments?: { course_schedule?: unknown[] }
}

export type PartnerOrgAchievementItem = ShowcaseAchievementItem & {
  source?: string
  branch_id?: string
  is_featured?: boolean
}

function getBranchName(b: PartnerOrgBranchCard): string {
  return b.branch?.name || b.name || b.code || "Branch"
}

function formatAddress(addr: PartnerOrgBranchCard["address"]): string {
  if (!addr) return ""
  return [addr.line1, addr.area, addr.city, addr.state, addr.pincode]
    .filter(Boolean)
    .join(", ")
}

function formatLocation(addr: PartnerOrgBranchCard["address"]): string {
  if (!addr) return ""
  return [addr.city, addr.state].filter(Boolean).join(", ")
}

function getCourseName(course: PartnerOrgBranchCourse): string {
  return course.title ?? course.name ?? course.code ?? "Course"
}

function formatPrice(course: PartnerOrgBranchCourse): string {
  return stripUuidFromPriceDisplay(formatCoursePriceLabel(course.pricing as never))
}

function branchPathKey(b: PartnerOrgBranchCard): string {
  return String(b.slug || b.id || b.code || "")
}

type Props = {
  branches: PartnerOrgBranchCard[]
  achievements: PartnerOrgAchievementItem[]
  /** Admin preview uses light cards; public uses dark Rock website look */
  variant?: "public" | "admin"
  loading?: boolean
  /** When set on public pages, branch cards navigate to a dedicated courses page */
  orgSlug?: string
}

export function PartnerOrgSiteSections({
  branches,
  achievements,
  variant = "public",
  loading = false,
  orgSlug,
}: Props) {
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [modalCourse, setModalCourse] = useState<CourseInfoModalCourse | null>(null)
  const [modalDurations, setModalDurations] = useState<
    PartnerOrgBranchCourse["available_durations"]
  >(undefined)
  const [modalOpen, setModalOpen] = useState(false)

  const selectedBranch = useMemo(
    () => branches.find((b) => b.id === selectedBranchId) || null,
    [branches, selectedBranchId]
  )

  const isPublic = variant === "public"
  const navigateBranches = isPublic && !!orgSlug
  const sectionBg = isPublic ? "bg-[#171A26] text-white" : "bg-white text-[#1a2332]"
  const cardClass = isPublic
    ? "rounded-xl border border-gray-800 bg-gray-900/40 hover:border-[#FFB70F]/50 transition-colors"
    : "rounded-xl border border-gray-200 bg-white hover:border-amber-300 shadow-sm transition-colors"
  const titleClass = isPublic
    ? "text-3xl md:text-4xl font-bold text-[#FFB70F]"
    : "text-xl font-semibold text-[#1a2332]"
  const muted = isPublic ? "text-gray-400" : "text-gray-500"

  function toggleBranch(id: string) {
    setSelectedBranchId((prev) => (prev === id ? null : id))
  }

  function openCourseModal(course: PartnerOrgBranchCourse) {
    setModalCourse({
      id: course.id,
      title: course.title,
      name: course.name,
      code: course.code,
      slug: course.slug,
      description: course.description,
      difficulty_level: course.difficulty_level,
    })
    setModalDurations(course.available_durations)
    setModalOpen(true)
  }

  if (loading) {
    return (
      <div className={`py-12 flex justify-center ${muted}`}>
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-12">
      {/* Branches */}
      <section className={sectionBg}>
        <div className={isPublic ? "container mx-auto max-w-7xl px-4 py-12" : ""}>
          <div className="text-center mb-8">
            {isPublic ? <div className="w-16 h-1 bg-[#FFB70F] mx-auto mb-4" /> : null}
            <h2 className={titleClass}>Our Branches</h2>
            <p className={`mt-2 text-sm ${muted}`}>
              {navigateBranches
                ? "Open a branch to view courses available there"
                : "Select a branch to view courses available there"}
            </p>
          </div>

          {branches.length === 0 ? (
            <p className={`text-center py-8 ${muted}`}>No branches published for this organization yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {branches.map((b) => {
                const addr = b.branch?.address || b.address
                const active = !navigateBranches && selectedBranchId === b.id
                const courseCount = Array.isArray(b.courses) ? b.courses.length : 0
                const inner = (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Building2
                          className={`w-5 h-5 shrink-0 ${isPublic ? "text-[#FFB70F]" : "text-amber-700"}`}
                        />
                        <h3 className={`font-semibold ${isPublic ? "text-[#FFB70F]" : "text-[#1a2332]"}`}>
                          {getBranchName(b)}
                        </h3>
                      </div>
                      {!navigateBranches ? (
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${active ? "rotate-180" : ""} ${muted}`}
                        />
                      ) : null}
                    </div>
                    {formatLocation(addr) ? (
                      <p className={`mt-2 text-sm flex items-center gap-1.5 ${muted}`}>
                        <MapPin className="w-3.5 h-3.5" />
                        {formatLocation(addr)}
                      </p>
                    ) : null}
                    {formatAddress(addr) ? (
                      <p className={`mt-1 text-xs line-clamp-2 ${muted}`}>{formatAddress(addr)}</p>
                    ) : null}
                    <div className={`mt-3 flex flex-wrap gap-3 text-xs ${muted}`}>
                      {(b.branch?.phone || b.phone) && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {b.branch?.phone || b.phone}
                        </span>
                      )}
                      {(b.branch?.email || b.email) && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {b.branch?.email || b.email}
                        </span>
                      )}
                    </div>
                    <p className={`mt-3 text-xs font-medium ${isPublic ? "text-[#FFB70F]" : "text-amber-800"}`}>
                      {courseCount} course{courseCount === 1 ? "" : "s"}
                    </p>
                  </>
                )

                if (navigateBranches) {
                  const key = branchPathKey(b)
                  return (
                    <Link
                      key={b.id}
                      href={`/partner-orgs/${encodeURIComponent(orgSlug!)}/branches/${encodeURIComponent(key)}`}
                      className={`${cardClass} block p-5`}
                    >
                      {inner}
                    </Link>
                  )
                }

                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => toggleBranch(b.id)}
                    className={`${cardClass} text-left p-5 ${active ? (isPublic ? "border-[#FFB70F]" : "border-amber-400 ring-1 ring-amber-200") : ""}`}
                  >
                    {inner}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Courses for selected branch (admin / inline preview only) */}
      {!navigateBranches && selectedBranch ? (
        <section className={isPublic ? "bg-[#171A26] text-white pb-12" : ""}>
          <div className={isPublic ? "container mx-auto max-w-7xl px-4" : ""}>
            <CourseInfoModal
              open={modalOpen}
              onOpenChange={(open) => {
                setModalOpen(open)
                if (!open) {
                  setModalCourse(null)
                  setModalDurations(undefined)
                }
              }}
              course={modalCourse}
              branchId={selectedBranch.id}
              branchDisplayName={getBranchName(selectedBranch)}
              branchTimings={selectedBranch.operational_details?.timings as never}
              courseSchedule={selectedBranch.assignments?.course_schedule as never}
              availableDurations={modalDurations}
            />

            <h2 className={`${titleClass} text-center mb-8`}>
              Courses at {getBranchName(selectedBranch)}
            </h2>

            {!selectedBranch.courses?.length ? (
              <p className={`text-center py-8 ${muted}`}>
                No courses currently available at this branch.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {selectedBranch.courses.map((course) => {
                  const img = resolvePublicAssetUrl(
                    course.media_resources?.course_image_url || ""
                  )
                  return (
                    <div
                      key={course.id}
                      className={
                        isPublic
                          ? "rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden flex flex-col"
                          : "rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col shadow-sm"
                      }
                    >
                      <div className="relative aspect-[16/10] bg-gray-800">
                        {img ? (
                          <Image
                            src={img}
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
                      </div>
                      <div className="p-5 flex flex-col flex-1">
                        <h3
                          className={`text-lg font-bold mb-2 line-clamp-2 ${isPublic ? "text-white" : "text-[#1a2332]"}`}
                        >
                          {getCourseName(course)}
                        </h3>
                        {course.description ? (
                          <p className={`text-sm mb-4 line-clamp-3 flex-1 ${muted}`}>
                            {course.description}
                          </p>
                        ) : null}
                        <div className={`flex items-center gap-2 text-sm mb-4 ${isPublic ? "text-gray-300" : "text-gray-700"}`}>
                          <IndianRupee className={`w-4 h-4 ${isPublic ? "text-[#FFB70F]" : "text-amber-700"}`} />
                          <span>{formatPrice(course)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => openCourseModal(course)}
                          className="inline-flex items-center justify-center rounded-lg bg-[#FFB70F] px-4 py-2 text-sm font-semibold text-[#171A26] hover:bg-[#FFB70F]/90"
                        >
                          More Info
                        </button>
                        <Link
                          href={`/courses/${encodeURIComponent(toCourseSlug(course))}`}
                          className={`mt-2 text-center text-sm ${isPublic ? "text-[#FFB70F] hover:text-white" : "text-amber-800 hover:underline"}`}
                        >
                          View course page
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {/* Student achievements */}
      <section className={isPublic ? "bg-[#171A26] text-white py-12" : ""}>
        <div className={isPublic ? "container mx-auto max-w-7xl px-4" : ""}>
          <div className="text-center mb-8">
            {isPublic ? <div className="w-16 h-1 bg-[#FFB70F] mx-auto mb-4" /> : null}
            <h2 className={titleClass}>Student Achievements</h2>
            <p className={`mt-2 text-sm ${muted}`}>
              Achievements from students of this organization
            </p>
          </div>

          {achievements.length === 0 ? (
            <p className={`text-center py-8 ${muted}`}>No student achievements yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {achievements.map((item) => (
                <ShowcaseAchievementCard
                  key={`${item.source || "a"}-${item.id}`}
                  item={item}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
