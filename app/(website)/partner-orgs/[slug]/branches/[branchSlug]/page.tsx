"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useParams } from "next/navigation"
import { ArrowLeft, BookOpen, IndianRupee, Loader2, MapPin, Phone } from "lucide-react"
import {
  findPartnerLandingBranch,
  type PartnerOrgLanding,
  type PartnerOrgSiteBranch,
} from "@/lib/partnerOrgAPI"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import { stripUuidFromPriceDisplay } from "@/lib/priceDisplay"
import { formatCoursePriceLabel } from "@/lib/registrationPricing"

export default function PartnerOrgBranchCoursesPage() {
  const params = useParams()
  const orgSlug = String(params.slug || "")
  const branchSlug = String(params.branchSlug || "")
  const [landing, setLanding] = useState<PartnerOrgLanding | null>(null)
  const [branch, setBranch] = useState<PartnerOrgSiteBranch | null>(null)
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
        setBranch(findPartnerLandingBranch(payload, branchSlug))
      })
      .catch(() => {
        if (cancelled) return
        setLanding(null)
        setBranch(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [orgSlug, branchSlug])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#171A26] flex items-center justify-center text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#FFB70F]" />
      </main>
    )
  }

  if (!landing || !branch) {
    return (
      <main className="min-h-screen bg-[#171A26] flex items-center justify-center px-4 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Branch not found</h1>
          <Link href={`/partner-orgs/${encodeURIComponent(orgSlug)}`} className="text-[#FFB70F]">
            Back to partner
          </Link>
        </div>
      </main>
    )
  }

  const orgName = landing.hero?.name || "Partner"
  const branchName = branch.name || branch.code || "Branch"
  const addr = branch.address
  const addressLine = addr
    ? [addr.line1, addr.area, addr.city, addr.state, addr.pincode].filter(Boolean).join(", ")
    : ""
  const courses = branch.courses || []
  const orgPath = encodeURIComponent(landing.slug || orgSlug)
  const branchPath = encodeURIComponent(String(branch.slug || branch.id || branchSlug))

  return (
    <main className="min-h-screen bg-[#171A26] text-white">
      <section className="pt-28 pb-10 px-4 border-b border-gray-800">
        <div className="container mx-auto max-w-7xl">
          <Link
            href={`/partner-orgs/${orgPath}`}
            className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-[#FFB70F] mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back to {orgName}
          </Link>
          <p className="text-[#FFB70F] uppercase tracking-[0.2em] text-xs mb-2">{orgName}</p>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{branchName}</h1>
          {addressLine ? (
            <p className="text-gray-400 flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-[#FFB70F] shrink-0" />
              {addressLine}
            </p>
          ) : null}
          {branch.phone ? (
            <p className="text-gray-400 flex items-center gap-2 text-sm mt-2">
              <Phone className="w-4 h-4 text-[#FFB70F] shrink-0" />
              {branch.phone}
            </p>
          ) : null}
          <p className="text-gray-300 mt-6 max-w-2xl">
            Courses available at this branch. Open a course for full details.
          </p>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="container mx-auto max-w-7xl">
          {courses.length === 0 ? (
            <p className="text-center text-gray-400 py-16">No courses at this branch yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => {
                const courseSlug = String(course.slug || course.id)
                const media = (course as { media_resources?: { course_image_url?: string } })
                  .media_resources
                const img = resolvePublicAssetUrl(media?.course_image_url || "")
                const title =
                  (course as { title?: string }).title ||
                  (course as { name?: string }).name ||
                  "Course"
                const description = (course as { description?: string }).description
                const price = stripUuidFromPriceDisplay(
                  formatCoursePriceLabel((course as { pricing?: never }).pricing as never)
                )
                const href = `/partner-orgs/${orgPath}/branches/${branchPath}/courses/${encodeURIComponent(courseSlug)}`

                return (
                  <Link
                    key={String(course.id)}
                    href={href}
                    className="group rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden flex flex-col hover:border-[#FFB70F]/60 transition-colors"
                  >
                    <div className="relative aspect-[16/10] bg-gray-800">
                      {img ? (
                        <Image
                          src={img}
                          alt=""
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width:768px) 100vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                          <BookOpen className="w-10 h-10" />
                        </div>
                      )}
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <h2 className="text-lg font-semibold text-[#FFB70F] mb-2">{title}</h2>
                      {description ? (
                        <p className="text-sm text-gray-400 line-clamp-3 mb-4">{description}</p>
                      ) : null}
                      <p className="mt-auto text-sm text-gray-300 flex items-center gap-1">
                        <IndianRupee className="w-3.5 h-3.5 text-[#FFB70F]" />
                        {price}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
