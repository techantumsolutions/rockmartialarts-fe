"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  IndianRupee,
  Loader2,
  MapPin,
  Users,
} from "lucide-react"
import {
  findPartnerBranchCourse,
  findPartnerLandingBranch,
  type PartnerOrgLanding,
  type PartnerOrgSiteBranch,
} from "@/lib/partnerOrgAPI"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import { stripUuidFromPriceDisplay } from "@/lib/priceDisplay"
import { formatCoursePriceLabel } from "@/lib/registrationPricing"

type CourseRow = Record<string, unknown> & { id: string }

export default function PartnerOrgCourseDetailPage() {
  const params = useParams()
  const orgSlug = String(params.slug || "")
  const branchSlug = String(params.branchSlug || "")
  const courseSlug = String(params.courseSlug || "")
  const [landing, setLanding] = useState<PartnerOrgLanding | null>(null)
  const [branch, setBranch] = useState<PartnerOrgSiteBranch | null>(null)
  const [course, setCourse] = useState<CourseRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgSlug) return
    let cancelled = false
    setLoading(true)
    fetch(
      `/api/backend/partner-organizations/public/${encodeURIComponent(orgSlug)}/landing`,
      { cache: "no-store", headers: { Accept: "application/json" } }
    )
      .then(async (res) => (res.ok ? res.json() : null))
      .then((payload: PartnerOrgLanding | null) => {
        if (cancelled) return
        setLanding(payload)
        const b = findPartnerLandingBranch(payload, branchSlug)
        setBranch(b)
        setCourse(findPartnerBranchCourse(b, courseSlug))
      })
      .catch(() => {
        if (cancelled) return
        setLanding(null)
        setBranch(null)
        setCourse(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [orgSlug, branchSlug, courseSlug])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#171A26] flex items-center justify-center text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#FFB70F]" />
      </main>
    )
  }

  if (!landing || !branch || !course) {
    return (
      <main className="min-h-screen bg-[#171A26] flex items-center justify-center px-4 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Course not found</h1>
          <Link
            href={`/partner-orgs/${encodeURIComponent(orgSlug)}/branches/${encodeURIComponent(branchSlug)}`}
            className="text-[#FFB70F]"
          >
            Back to branch courses
          </Link>
        </div>
      </main>
    )
  }

  const orgName = landing.hero?.name || "Partner"
  const branchName = branch.name || branch.code || "Branch"
  const title =
    (course.title as string | undefined) ||
    (course.name as string | undefined) ||
    "Course"
  const media = course.media_resources as { course_image_url?: string } | undefined
  const cover =
    resolvePublicAssetUrl(media?.course_image_url || "") || "/assets/img/banner.jpg"
  const price = stripUuidFromPriceDisplay(
    formatCoursePriceLabel(course.pricing as never)
  )
  const orgPath = encodeURIComponent(landing.slug || orgSlug)
  const branchPath = encodeURIComponent(String(branch.slug || branch.id || branchSlug))
  const addr = branch.address
  const location = addr
    ? [addr.area || addr.line1, addr.city].filter(Boolean).join(", ")
    : branchName

  const description = course.description as string | undefined
  const longDescription = course.long_description as string | undefined
  const whoIsItFor = course.who_is_it_for as string | undefined
  const whatYouLearn = course.what_you_learn as string[] | undefined
  const benefits = course.benefits as string[] | undefined
  const gallery = course.gallery as string[] | undefined
  const availableDurations = course.available_durations as
    | Array<{ id?: string; code?: string; name?: string; duration_months?: number }>
    | undefined
  const scheduleNote = course.schedule_note as string | undefined
  const difficulty = course.difficulty_level as string | undefined

  return (
    <main className="min-h-screen bg-[#171A26] text-white">
      <section className="relative min-h-[50vh] flex items-end overflow-hidden">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#171A26] via-[#171A26]/75 to-black/40" />
        </div>
        <div className="relative container mx-auto max-w-7xl px-4 pb-12 pt-28">
          <Link
            href={`/partner-orgs/${orgPath}/branches/${branchPath}`}
            className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-[#FFB70F] mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back to {branchName} courses
          </Link>
          <p className="text-[#FFB70F] uppercase tracking-[0.2em] text-xs mb-2">
            {orgName} · {branchName}
          </p>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">{title}</h1>
          {description ? (
            <p className="text-gray-200 max-w-2xl text-lg">{description}</p>
          ) : null}
        </div>
      </section>

      <section className="px-4 -mt-6 relative z-10">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-4 flex items-center gap-3">
              <IndianRupee className="w-5 h-5 text-[#FFB70F]" />
              <div>
                <p className="text-xs text-gray-400">Fee</p>
                <p className="font-semibold">{price}</p>
              </div>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-4 flex items-center gap-3">
              <Users className="w-5 h-5 text-[#FFB70F]" />
              <div>
                <p className="text-xs text-gray-400">Level</p>
                <p className="font-semibold">{difficulty || "All levels"}</p>
              </div>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-4 flex items-center gap-3">
              <MapPin className="w-5 h-5 text-[#FFB70F]" />
              <div>
                <p className="text-xs text-gray-400">Branch</p>
                <p className="font-semibold">{location}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 px-4">
        <div className="container mx-auto max-w-7xl grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
            {longDescription ? (
              <div>
                <div className="w-12 h-1 bg-[#FFB70F] mb-4" />
                <h2 className="text-2xl font-bold text-[#FFB70F] mb-3">About this course</h2>
                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {longDescription}
                </p>
              </div>
            ) : null}

            {whoIsItFor ? (
              <div>
                <h2 className="text-xl font-bold text-[#FFB70F] mb-2">Who is it for</h2>
                <p className="text-gray-300">{whoIsItFor}</p>
              </div>
            ) : null}

            {whatYouLearn?.length ? (
              <div>
                <h2 className="text-xl font-bold text-[#FFB70F] mb-3">What you will learn</h2>
                <ul className="space-y-2">
                  {whatYouLearn.map((item) => (
                    <li key={item} className="flex gap-2 text-gray-300">
                      <CheckCircle2 className="w-5 h-5 text-[#FFB70F] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {benefits?.length ? (
              <div>
                <h2 className="text-xl font-bold text-[#FFB70F] mb-3">Benefits</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {benefits.map((b) => (
                    <div
                      key={b}
                      className="rounded-lg border border-gray-800 bg-gray-900/40 px-4 py-3 text-sm text-gray-300"
                    >
                      {b}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {gallery?.length ? (
              <div>
                <h2 className="text-xl font-bold text-[#FFB70F] mb-4">Gallery</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {gallery.map((src) => (
                    <div
                      key={src}
                      className="relative aspect-[4/3] rounded-lg overflow-hidden border border-gray-800"
                    >
                      <Image
                        src={resolvePublicAssetUrl(src) || src}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="(max-width:768px) 50vw, 33vw"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-[#FFB70F] mb-4">Course plans</h3>
              {availableDurations?.length ? (
                <ul className="space-y-2 mb-5">
                  {availableDurations.map((d) => (
                    <li
                      key={d.id || d.code || d.name}
                      className="flex items-center justify-between text-sm border border-gray-800 rounded-lg px-3 py-2"
                    >
                      <span>{d.name || d.code}</span>
                      <span className="text-gray-400">
                        {d.duration_months ? `${d.duration_months} mo` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400 mb-5">Contact the branch for plan options.</p>
              )}

              {scheduleNote ? (
                <p className="text-sm text-gray-400 flex gap-2 mb-5">
                  <Clock className="w-4 h-4 text-[#FFB70F] shrink-0 mt-0.5" />
                  <span>{scheduleNote}</span>
                </p>
              ) : null}

              <p className="text-2xl font-bold mb-4">{price}</p>
              <Link
                href={`/partner-orgs/${orgPath}#enquiry`}
                className="block w-full text-center rounded-lg bg-[#FFB70F] text-[#171A26] font-semibold py-3 hover:bg-[#ffc53d]"
              >
                Enquire about this course
              </Link>
              <Link
                href={`/partner-orgs/${orgPath}/branches/${branchPath}`}
                className="block w-full text-center text-sm text-[#FFB70F] mt-3 hover:text-white"
              >
                See all courses at {branchName}
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}
