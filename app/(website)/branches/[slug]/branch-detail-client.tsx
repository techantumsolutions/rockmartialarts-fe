"use client"

import { useEffect, useState, type CSSProperties } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, ArrowLeft } from "lucide-react"
import AOS from "aos"
import {
  BranchHero,
  BranchInfoCards,
  BranchMap,
  BranchContact,
  BranchFacilities,
  BranchCourses,
  BranchAchievements,
} from "@/components/branch"
import type { BranchData } from "@/components/branch"
import { AboutFounderSection } from "@/components/website/AboutFounderSection"
import {
  OurMembersSection,
  type MemberCardData,
} from "@/components/website/OurMembersSection"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import { useBranchPublicBrand } from "@/contexts/BranchPublicBrandContext"
import {
  clearPartnerPublicChrome,
  setPartnerPublicChrome,
} from "@/lib/partnerPublicChrome"
import {
  BRANCH_MEMBER_PLACEHOLDERS,
  PUBLIC_SECTION_FALLBACKS,
  VERIFIED_ORG_FOUNDER,
} from "@/lib/cmsContentFallback"
import { DEFAULT_IMAGE_PLACEHOLDER } from "@/components/ui/safe-image"

type BranchTestimonial = {
  student_name?: string
  name?: string
  role?: string
  quote?: string
  content?: string
  testimonial_text?: string
  image?: string
  student_photo?: string
  achievement?: string
  rating?: number
}

const memoryBranchCache: Record<string, BranchData> = {}

function getInitialBranch(slug: string): BranchData | null {
  if (!slug) return null
  const decoded = decodeURIComponent(slug).toLowerCase()
  if (memoryBranchCache[decoded]) return memoryBranchCache[decoded]
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(`rma_branch_cache_${decoded}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        memoryBranchCache[decoded] = parsed
        return parsed
      }
    } catch {
      /* ignore */
    }
  }
  return null
}

export default function BranchDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const [branch, setBranch] = useState<BranchData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [branchTestimonials, setBranchTestimonials] = useState<BranchTestimonial[]>([])
  const [partnerTeam, setPartnerTeam] = useState<
    {
      id?: string
      name?: string
      designation?: string
      role?: string
      photo_url?: string
      bio?: string
      contact_email?: string | null
      contact_phone?: string | null
      contact_approved?: boolean
    }[]
  >([])
  const [testimonialsTitle, setTestimonialsTitle] = useState<string>("Rock Warriors")
  const [testimonialsSubtitle, setTestimonialsSubtitle] = useState<string>("Success stories")
  const [founderAbout, setFounderAbout] = useState<{
    title?: string
    subtitle?: string
    content?: string
    image?: string
  }>({})
  const [members, setMembers] = useState<MemberCardData[]>([])
  const { setOverride, clearOverride } = useBranchPublicBrand()

  useEffect(() => {
    AOS.init({
      duration: 600,
      easing: "ease-out-cubic",
      once: true,
      offset: 120,
    })
  }, [])

  // Partner branding on public academy page only while partner_org_id is set.
  // Unassign → clear override so Rock CMS / academy own branding returns.
  useEffect(() => {
    const partnerOrgId = String(
      (branch as BranchData & { partner_org_id?: string | null })?.partner_org_id || ""
    ).trim()
    const branding = branch?.site_branding
    const footerEnabled = !!(
      branch as BranchData & { public_footer_enabled?: boolean | null }
    )?.public_footer_enabled
    const hasPartnerBrand = !!(
      partnerOrgId &&
      branding &&
      (branding.logo_url ||
        branding.cover_banner_url ||
        branding.about_content ||
        branding.short_description ||
        branding.tagline ||
        branding.footer?.logo_url)
    )
    if (!partnerOrgId) {
      clearOverride()
      clearPartnerPublicChrome()
      return
    }
    setPartnerPublicChrome({ partnerOrgId, footerEnabled })
    // Always set partner chrome when partner-owned so footer enable/disable applies.
    setOverride({
      partnerOrgId,
      orgName:
        branding?.org_name ||
        branding?.display_name ||
        (branch as BranchData & { partner_org_name?: string })?.partner_org_name ||
        null,
      logoUrl: hasPartnerBrand ? branding?.logo_url || null : null,
      logoAlt: hasPartnerBrand
        ? branding?.logo_alt || branding?.org_name || null
        : null,
      footerLogoUrl: hasPartnerBrand
        ? branding?.footer?.logo_url || branding?.logo_url || null
        : null,
      footerDescription: hasPartnerBrand
        ? branding?.footer?.description ||
          branding?.short_description ||
          branding?.tagline ||
          null
        : null,
      phone: hasPartnerBrand ? branding?.contact?.phone || null : null,
      email: hasPartnerBrand ? branding?.contact?.email || null : null,
      address: hasPartnerBrand ? branding?.contact?.address || null : null,
      primaryColor: hasPartnerBrand ? branding?.primary_color || null : null,
      secondaryColor: hasPartnerBrand ? branding?.secondary_color || null : null,
      footerEnabled,
    })
  }, [branch, setOverride, clearOverride])

  useEffect(() => {
    return () => {
      clearOverride()
      clearPartnerPublicChrome()
    }
  }, [clearOverride])

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/backend/branches/public/by-slug/${encodeURIComponent(slug)}`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })
      .then((res) => {
        if (res.status === 404) return null
        if (!res.ok) throw new Error("Failed to load academy")
        return res.json()
      })
      .then((data) => {
        if (!cancelled) {
          setBranch(data ?? null)
          if (!data) setError("Academy not found")
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to load academy")
          setBranch(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  useEffect(() => {
    if (!branch?.slug || !slug) return
    const canonical = String(branch.slug).trim()
    if (!canonical) return
    if (decodeURIComponent(slug).toLowerCase() === canonical.toLowerCase()) return
    router.replace(`/branches/${encodeURIComponent(canonical)}`, { scroll: false })
  }, [branch?.slug, slug, router])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/backend/cms/public`, { cache: "no-store", headers: { "Content-Type": "application/json" } })
      .then(async (cmsRes) => {
        const cmsPayload = cmsRes.ok ? await cmsRes.json().catch(() => ({})) : {}
        if (cancelled) return
        const hp = cmsPayload?.homepage || {}
        if (typeof hp.testimonials_title === "string" && hp.testimonials_title.trim()) {
          setTestimonialsTitle(hp.testimonials_title.trim())
        }
        if (typeof hp.testimonials_subtitle === "string" && hp.testimonials_subtitle.trim()) {
          setTestimonialsSubtitle(hp.testimonials_subtitle.trim())
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!branch?.id) {
      setBranchTestimonials([])
      return
    }
    let cancelled = false
    const isPartner = !!(
      (branch as BranchData & { is_collaboration_partner?: boolean; allows_collaboration?: boolean })
        .is_collaboration_partner ||
      (branch as BranchData & { allows_collaboration?: boolean }).allows_collaboration
    )

    const loadLegacy = () =>
      fetch(`/api/backend/testimonials?branch_id=${encodeURIComponent(branch.id)}&limit=12`, {
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
      }).then(async (mRes) => {
        const mongo = mRes.ok ? await mRes.json().catch(() => ({})) : {}
        if (cancelled) return
        const mongoList = Array.isArray(mongo.testimonials) ? mongo.testimonials : []
        setBranchTestimonials(mongoList)
      })

    if (isPartner) {
      fetch(
        `/api/backend/collaboration-partners/public/branches/${encodeURIComponent(branch.id)}/testimonials?limit=12`,
        { cache: "no-store", headers: { "Content-Type": "application/json" } }
      )
        .then(async (pRes) => {
          const payload = pRes.ok ? await pRes.json().catch(() => ({})) : {}
          if (cancelled) return
          const partnerList = Array.isArray(payload.testimonials)
            ? payload.testimonials
            : []
          if (partnerList.length > 0) {
            setBranchTestimonials(partnerList)
            return
          }
          await loadLegacy()
        })
        .catch(async () => {
          if (!cancelled) await loadLegacy().catch(() => setBranchTestimonials([]))
        })
    } else {
      loadLegacy().catch(() => {
        if (!cancelled) setBranchTestimonials([])
      })
    }

    return () => {
      cancelled = true
    }
  }, [branch])

  useEffect(() => {
    if (!branch?.id) {
      setPartnerTeam([])
      return
    }
    const isPartner = !!(
      (branch as BranchData & { is_collaboration_partner?: boolean; allows_collaboration?: boolean })
        .is_collaboration_partner ||
      (branch as BranchData & { allows_collaboration?: boolean }).allows_collaboration
    )
    if (!isPartner) {
      setPartnerTeam([])
      return
    }
    let cancelled = false
    fetch(
      `/api/backend/collaboration-partners/public/branches/${encodeURIComponent(branch.id)}/team?limit=24`,
      { cache: "no-store", headers: { "Content-Type": "application/json" } }
    )
      .then(async (res) => {
        const payload = res.ok ? await res.json().catch(() => ({})) : {}
        if (cancelled) return
        setPartnerTeam(Array.isArray(payload.members) ? payload.members : [])
      })
      .catch(() => {
        if (!cancelled) setPartnerTeam([])
      })
    return () => {
      cancelled = true
    }
  }, [branch])

  // Org founder / about content from homepage CMS (same source as former Discover section)
  useEffect(() => {
    let cancelled = false
    fetch("/api/backend/homepage/public", {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => (res.ok ? res.json() : Promise.resolve({})))
      .then((data) => {
        if (cancelled) return
        const about = data?.about || {}
        setFounderAbout({
          title: typeof about.title === "string" ? about.title : "",
          subtitle: typeof about.subtitle === "string" ? about.subtitle : "",
          content: typeof about.content === "string" ? about.content : "",
          image: typeof about.image === "string" ? about.image : "",
        })
      })
      .catch(() => {
        if (!cancelled) setFounderAbout({})
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Only coaches assigned to this academy. Never fall back to Home org coaches.
  useEffect(() => {
    if (!branch?.id) {
      setMembers([])
      return
    }
    let cancelled = false
    const mapCoaches = (list: any[]): MemberCardData[] =>
      (Array.isArray(list) ? list : []).map((c: any) => ({
        name: c.full_name || "Coach",
        role: c.designation || "",
        img: resolvePublicAssetUrl(c.profile_image_url) || DEFAULT_IMAGE_PLACEHOLDER,
        about: (c.about_short || "").trim(),
        rating: typeof c.rating === "number" ? c.rating : null,
      }))

    const load = async () => {
      try {
        const branchRes = await fetch(
          `/api/backend/coaches/public/homepage?limit=8&branch_id=${encodeURIComponent(branch.id)}`,
          { cache: "no-store", headers: { "Content-Type": "application/json" } }
        )
        const branchData = branchRes.ok ? await branchRes.json().catch(() => ({})) : {}
        const list = mapCoaches(branchData.coaches || [])
        if (!cancelled) setMembers(list)
      } catch {
        if (!cancelled) setMembers([])
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [branch?.id])

  useEffect(() => {
    AOS.refresh()
  }, [branch, branchTestimonials, partnerTeam, members, founderAbout])

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-gray-400">
          <Loader2 className="w-12 h-12 animate-spin text-[#FFB70F]" />
          <p>Loading academy...</p>
        </div>
      </main>
    )
  }

  if (error || !branch) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Academy not found</h1>
          <p className="text-gray-400 mb-6">{error || "This academy may no longer exist."}</p>
          <Link
            href="/branches"
            className="inline-flex items-center gap-2 text-[#FFB70F] hover:text-white font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to academies page
          </Link>
        </div>
      </main>
    )
  }

  const partnerOrgId = String(
    (branch as BranchData & { partner_org_id?: string | null }).partner_org_id || ""
  ).trim()
  const branding = partnerOrgId ? branch.site_branding : undefined
  const usePartnerBrand = !!(
    partnerOrgId &&
    branding &&
    (branding.logo_url ||
      branding.cover_banner_url ||
      branding.about_content ||
      branding.short_description ||
      branding.tagline)
  )

  // Partner assigned → partner banner/content; otherwise branch/CMS own assets.
  const coverImage = usePartnerBrand
    ? resolvePublicAssetUrl(branding?.cover_banner_url || "") ||
      resolvePublicAssetUrl(branch.cover_image_url || "") ||
      branch.gallery_images?.[0] ||
      null
    : resolvePublicAssetUrl(branch.cover_image_url || "") ||
      branch.gallery_images?.[0] ||
      null

  const contactBranch: BranchData =
    usePartnerBrand && branding?.contact
      ? {
          ...branch,
          branch: {
            ...(branch.branch || {}),
            phone: branding.contact.phone || branch.branch?.phone,
            email: branding.contact.email || branch.branch?.email,
            address: branding.contact.address
              ? {
                  ...(branch.branch?.address || {}),
                  line1: branding.contact.address,
                }
              : branch.branch?.address,
          },
        }
      : branch

  const aboutHtml = usePartnerBrand
    ? (branding?.about_content || branding?.our_story || branding?.short_description || "").trim()
    : String(branch.description || "").trim()
  const aboutTagline = usePartnerBrand
    ? (branding?.tagline || branding?.why_choose_us || "").trim()
    : ""
  const ownFacilities =
    usePartnerBrand && Array.isArray(branding?.facilities) && branding!.facilities!.length > 0
      ? branding!.facilities!
      : null
  const displayBranch: BranchData =
    ownFacilities && (!branch.facilities || branch.facilities.length === 0)
      ? { ...contactBranch, facilities: ownFacilities }
      : contactBranch

  const primaryColor =
    (usePartnerBrand && (branding?.primary_color || "").trim()) || "#FFB70F"
  const secondaryColor =
    (usePartnerBrand && (branding?.secondary_color || "").trim()) || "#171A26"
  const brandStyle = {
    ["--academy-primary" as string]: primaryColor,
    ["--academy-secondary" as string]: secondaryColor,
  } as CSSProperties

  return (
    <main className="min-h-screen" style={brandStyle}>
      <BranchHero
        branch={displayBranch}
        coverImageUrl={coverImage}
        logoUrl={usePartnerBrand ? branding?.logo_url : null}
        logoAlt={usePartnerBrand ? branding?.logo_alt || branding?.org_name : null}
        orgName={usePartnerBrand ? branding?.org_name || branding?.display_name || branch.partner_org_name : null}
      />
      {aboutHtml || aboutTagline ? (
        <section className="py-8 md:py-10 relative z-10">
          <div className="site-content px-0 sm:px-1 max-w-3xl mx-auto text-center">
            <div
              className="w-16 h-1 mx-auto mb-4"
              style={{ backgroundColor: "var(--academy-primary, #FFB70F)" }}
            />
            {aboutTagline ? (
              <p
                className="uppercase tracking-widest text-sm mb-2"
                style={{ color: "var(--academy-primary, #FFB70F)" }}
              >
                {aboutTagline}
              </p>
            ) : null}
            <h2
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ color: "var(--academy-primary, #FFB70F)" }}
            >
              About
            </h2>
            {aboutHtml ? (
              <div
                className="text-gray-300 text-sm md:text-base leading-relaxed whitespace-pre-line"
              >
                {aboutHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
      <BranchCourses branch={displayBranch} />
      <AboutFounderSection
        eyebrow={PUBLIC_SECTION_FALLBACKS.founderEyebrow}
        title={
          founderAbout.title?.trim() || PUBLIC_SECTION_FALLBACKS.founderTitle
        }
        subtitle={founderAbout.subtitle?.trim() || undefined}
        contentHtml={founderAbout.content || ""}
        imageUrl={founderAbout.image || ""}
        founderName={VERIFIED_ORG_FOUNDER.name}
        founderTitle={VERIFIED_ORG_FOUNDER.title}
      />
      <OurMembersSection
        members={
          members.length > 0
            ? members
            : BRANCH_MEMBER_PLACEHOLDERS.map((p) => ({ ...p }))
        }
        eyebrow={PUBLIC_SECTION_FALLBACKS.membersEyebrow}
        title={PUBLIC_SECTION_FALLBACKS.membersTitle}
        emptyMessage={PUBLIC_SECTION_FALLBACKS.membersEmpty}
        lazy={false}
      />
      <section className="py-8 md:py-10 relative z-10">
        <div className="site-content px-0 sm:px-1">
          <div className="text-center mb-12" data-aos="fade-up">
            <div className="w-16 h-1 bg-[#FFB70F] mx-auto mb-4" />
            <p className="text-[#FFB70F] uppercase tracking-widest text-sm mb-2">{testimonialsSubtitle}</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#FFB70F]">{testimonialsTitle}</h2>
          </div>
          {branchTestimonials.length === 0 ? (
            <p className="text-center text-gray-500 py-8 text-sm">No testimonials available</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {branchTestimonials.map((t, i) => (
                <div
                  key={`${t.student_name || t.name}-${i}`}
                  className="bg-gray-900/50 rounded-xl p-6 border border-gray-800 h-full flex flex-col items-center text-center"
                  data-aos="fade-up"
                  data-aos-delay={i * 80}
                >
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#FFB70F]/50 mb-4 flex-shrink-0">
                    {t.image || t.student_photo ? (
                      <img
                        src={resolvePublicAssetUrl(t.image || t.student_photo || "")}
                        alt={t.student_name || t.name || "Student"}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-700 flex items-center justify-center text-2xl text-gray-400">
                        👤
                      </div>
                    )}
                  </div>
                  <img
                    src="/assets/img/courses/quote.png"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-8 h-8 mb-2 opacity-80"
                  />
                  <p className="text-gray-300 text-sm leading-relaxed mb-4 flex-1">
                    {(t.testimonial_text || t.quote || t.content)?.trim() ||
                      "We're proud of every student who trains with us — discipline, confidence, and growth show in every class."}
                  </p>
                  <h3 className="text-[#FFB70F] font-semibold">{t.student_name || t.name}</h3>
                  {t.achievement?.trim() ? (
                    <p className="text-[#FFB70F]/90 text-xs font-medium uppercase tracking-wide mt-1">
                      {t.achievement}
                    </p>
                  ) : null}
                  {t.rating != null && t.rating > 0 ? (
                    <p className="text-[#FFB70F] text-xs mt-1">★ {Number(t.rating).toFixed(1)}</p>
                  ) : null}
                  {t.role?.trim() ? <p className="text-white/80 text-sm mt-1">{t.role}</p> : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      {partnerTeam.length > 0 ? (
        <section className="py-8 md:py-10 relative z-10">
          <div className="site-content px-0 sm:px-1">
            <div className="text-center mb-12" data-aos="fade-up">
              <div className="w-16 h-1 bg-[#FFB70F] mx-auto mb-4" />
              <p className="text-[#FFB70F] uppercase tracking-widest text-sm mb-2">
                Our people
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-[#FFB70F]">
                Our Team
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {partnerTeam.map((m, i) => (
                <div
                  key={m.id || `${m.name}-${i}`}
                  className="bg-gray-900/50 rounded-xl p-6 border border-gray-800 h-full flex flex-col items-center text-center"
                  data-aos="fade-up"
                  data-aos-delay={i * 80}
                >
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#FFB70F]/50 mb-4 flex-shrink-0 bg-gray-700 flex items-center justify-center text-2xl text-gray-400">
                    {m.photo_url ? (
                      <img
                        src={resolvePublicAssetUrl(m.photo_url)}
                        alt={m.name || "Team"}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      "👤"
                    )}
                  </div>
                  <h3 className="text-[#FFB70F] font-semibold">{m.name}</h3>
                  {(m.designation || m.role) && (
                    <p className="text-white/80 text-sm mt-1">
                      {[m.designation, m.role].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {m.bio?.trim() ? (
                    <p className="text-gray-300 text-sm leading-relaxed mt-3">
                      {m.bio}
                    </p>
                  ) : null}
                  {m.contact_approved && (m.contact_phone || m.contact_email) ? (
                    <p className="text-[#FFB70F]/90 text-xs mt-3">
                      {[m.contact_phone, m.contact_email].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}
      <BranchAchievements branchId={branch.id} />
      <BranchFacilities branch={displayBranch} />
      <BranchInfoCards branch={displayBranch} />
      <BranchMap branch={displayBranch} />
      <BranchContact branch={displayBranch} />
    </main>
  )
}
