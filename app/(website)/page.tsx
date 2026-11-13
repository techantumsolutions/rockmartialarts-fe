import { branchNameToSlug } from "@/lib/branch-slug"
import { toCategoryHref } from "@/lib/category-slug"
import { toCourseSlug } from "@/lib/course-slug"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import { getBackendProxyBaseUrl } from "@/lib/serverBackendUrl"
import HomePageView from "@/components/website/HomePageView"

export const metadata = {
  title: "Rock Martial Arts Academy | Fitness & Dance",
  description: "Strengthen, discipline, and empower with martial arts. Shaolin Kung Fu, Taekwondo, Kick Boxing, Kuchipudi and more.",
}

/** Always fetch courses from API at request time (no static/cache fallback to mock). */
export const dynamic = "force-dynamic"
export const revalidate = 0

/* ---------- fetch CMS content at build / request time ---------- */
/* Reads from FastAPI (same DB admin CMS writes to). Site-origin is fallback only. */

async function getCMSContent() {
  try {
    const backendUrl = getBackendProxyBaseUrl()
    const res = await fetch(`${backendUrl.replace(/\/$/, "")}/api/cms/public`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    })
    if (res.ok) return await res.json()

    // Fallback: same-origin Next proxy (useful when only the public site host is reachable).
    const siteOrigin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")
    if (siteOrigin) {
      const proxyRes = await fetch(`${siteOrigin.replace(/\/$/, "")}/api/backend/cms/public`, {
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
      })
      if (proxyRes.ok) return await proxyRes.json()
    }
    return null
  } catch {
    return null
  }
}

/* ---------- fetch courses at build / request time ---------- */

async function getCourses(): Promise<{ courses: any[]; fromApi: boolean }> {
  try {
    const backendUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8003"
    const res = await fetch(`${backendUrl}/api/courses/public/all?limit=500`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    })
    if (!res.ok) return { courses: [], fromApi: true }
    const data = await res.json()
    const list = data.courses ?? data ?? []
    const arr = Array.isArray(list) ? list : []
    return { courses: arr, fromApi: true }
  } catch {
    return { courses: [], fromApi: false }
  }
}

function getCourseImage(c: any): string | null {
  return c?.media_resources?.course_image_url || (c?.page_content?.hero_section?.hero_image) || null
}

function looksLikeImageUrl(value?: string | null): boolean {
  const s = (value || "").trim()
  if (!s) return false
  return /^(https?:\/\/|\/|uploads\/)/i.test(s) || /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(s)
}

async function getMainCategories(): Promise<{ categories: any[]; fromApi: boolean }> {
  const qs = "active_only=true&include_subcategories=true&limit=100"
  try {
    const backendUrl = getBackendProxyBaseUrl()
    const res = await fetch(`${backendUrl.replace(/\/$/, "")}/api/categories/public/all?${qs}`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    })
    if (res.ok) {
      const data = await res.json()
      const list = data.categories ?? data ?? []
      return { categories: Array.isArray(list) ? list : [], fromApi: true }
    }

    const siteOrigin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")
    if (siteOrigin) {
      const proxyRes = await fetch(`${siteOrigin.replace(/\/$/, "")}/api/backend/categories/public/all?${qs}`, {
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
      })
      if (proxyRes.ok) {
        const data = await proxyRes.json()
        const list = data.categories ?? data ?? []
        return { categories: Array.isArray(list) ? list : [], fromApi: true }
      }
    }
    return { categories: [], fromApi: true }
  } catch {
    return { categories: [], fromApi: false }
  }
}

async function fetchPublicEndpointJson(apiPath: string): Promise<{ ok: boolean; data: any }> {
  const cleanPath = apiPath.replace(/^\/+/, "")
  try {
    const backendUrl = getBackendProxyBaseUrl()
    const res = await fetch(`${backendUrl.replace(/\/$/, "")}/api/${cleanPath}`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    })
    if (res.ok) {
      return { ok: true, data: await res.json() }
    }

    const siteOrigin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")
    if (siteOrigin) {
      const proxyRes = await fetch(`${siteOrigin.replace(/\/$/, "")}/api/backend/${cleanPath}`, {
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
      })
      if (proxyRes.ok) {
        return { ok: true, data: await proxyRes.json() }
      }
    }
    return { ok: true, data: null }
  } catch {
    return { ok: false, data: null }
  }
}

async function getHomepageBranches(): Promise<any[]> {
  const { data } = await fetchPublicEndpointJson("branches/public/search?active_only=true&limit=100")
  const list = data?.branches ?? []
  return Array.isArray(list) ? list : []
}

async function getHomepagePartnerBranches(): Promise<{ collabPartners: any[]; partnerOrgs: any[] }> {
  const [collabRes, orgRes] = await Promise.all([
    fetchPublicEndpointJson("collaboration-partners/public/partners?limit=100"),
    fetchPublicEndpointJson("partner-organizations/public/directory?limit=100"),
  ])
  const collabPartners = Array.isArray(collabRes.data?.partners) ? collabRes.data.partners : []
  const partnerOrgs = Array.isArray(orgRes.data?.partners) ? orgRes.data.partners : []
  return { collabPartners, partnerOrgs }
}

const coachImageFallback = "/assets/img/courses/kung-fu-trainer.png"

async function getHomepageAboutFromApi(): Promise<{
  title?: string
  subtitle?: string
  content?: string
  image?: string
}> {
  try {
    // Same backend preference as getCMSContent — keep About in sync with admin saves.
    const backendUrl = getBackendProxyBaseUrl()
    const res = await fetch(`${backendUrl.replace(/\/$/, "")}/api/homepage/public`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    })
    if (res.ok) {
      const data = await res.json()
      return data.about || {}
    }

    const siteOrigin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")
    if (siteOrigin) {
      const proxyRes = await fetch(`${siteOrigin.replace(/\/$/, "")}/api/backend/homepage/public`, {
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
      })
      if (proxyRes.ok) {
        const data = await proxyRes.json()
        return data.about || {}
      }
    }
    return {}
  } catch {
    return {}
  }
}

async function getShowcaseTestimonialsFromApi(): Promise<
  {
    id?: string
    student_name?: string
    student_photo?: string
    testimonial_text?: string
    rating?: number
  }[]
> {
  try {
    const siteOrigin =
      process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")
    const qs = `is_global=true&limit=6`
    if (siteOrigin) {
      const res = await fetch(`${siteOrigin.replace(/\/$/, "")}/api/backend/testimonials?${qs}`, {
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
      })
      if (res.ok) {
        const data = await res.json()
        return Array.isArray(data.testimonials) ? data.testimonials : []
      }
    }
    const backendUrl =
      process.env.API_BASE_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "http://127.0.0.1:8003"
    const res = await fetch(`${backendUrl.replace(/\/$/, "")}/api/testimonials?${qs}`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data.testimonials) ? data.testimonials : []
  } catch {
    return []
  }
}

function mapPublicAchievements(items: any[]) {
  return items.map((a: any) => ({
    id: a.id,
    student_name: a.student_name || "Student",
    student_photo: null as string | null,
    achievement_title: a.title || "Achievement",
    description: a.description || null,
    image: Array.isArray(a.images) && a.images.length > 0 ? a.images[0] : null,
  }))
}

async function getShowcaseAchievementsFromApi(): Promise<
  {
    id?: string
    student_name?: string
    student_photo?: string | null
    achievement_title?: string
    description?: string | null
    image?: string | null
  }[]
> {
  try {
    // Prefer local FastAPI (same DB the admin featured toggle writes to).
    // Do not hit NEXT_PUBLIC_SITE_URL first — that can be production and ignore local featured flags.
    const qs = `limit=12`
    const backendUrl = getBackendProxyBaseUrl()
    const res = await fetch(`${backendUrl.replace(/\/$/, "")}/api/achievements/public/global?${qs}`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    })
    if (res.ok) {
      const data = await res.json()
      const items = Array.isArray(data.achievements) ? data.achievements : []
      return mapPublicAchievements(items)
    }

    const siteOrigin =
      process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")
    if (siteOrigin) {
      const proxyRes = await fetch(
        `${siteOrigin.replace(/\/$/, "")}/api/backend/achievements/public/global?${qs}`,
        {
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
        }
      )
      if (proxyRes.ok) {
        const data = await proxyRes.json()
        const items = Array.isArray(data.achievements) ? data.achievements : []
        return mapPublicAchievements(items)
      }
    }
    return []
  } catch {
    return []
  }
}

async function getHomepageCoaches(): Promise<
  { name: string; role: string; img: string; about?: string; rating?: number | null }[]
> {
  try {
    const siteOrigin =
      process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")

    if (siteOrigin) {
      const res = await fetch(`${siteOrigin.replace(/\/$/, "")}/api/coaches/public/homepage?limit=8`, {
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
      })
      if (res.ok) {
        const data = await res.json()
        const list = data.coaches ?? []
        if (!Array.isArray(list)) return []
        return list.map((c: any) => ({
          name: c.full_name || "Coach",
          role: c.designation || "",
          img: resolvePublicAssetUrl(c.profile_image_url) || coachImageFallback,
          about: (c.about_short || "").trim(),
          rating: typeof c.rating === "number" ? c.rating : null,
        }))
      }
    }

    const backendUrl =
      process.env.API_BASE_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "http://127.0.0.1:8003"
    const res = await fetch(`${backendUrl.replace(/\/$/, "")}/api/coaches/public/homepage?limit=8`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    })
    if (!res.ok) return []
    const data = await res.json()
    const list = data.coaches ?? []
    if (!Array.isArray(list)) return []
    return list.map((c: any) => ({
      name: c.full_name || "Coach",
      role: c.designation || "",
      img: resolvePublicAssetUrl(c.profile_image_url) || coachImageFallback,
      about: (c.about_short || "").trim(),
      rating: typeof c.rating === "number" ? c.rating : null,
    }))
  } catch {
    return []
  }
}

/* ---------- component ---------- */

export default async function HomePage() {
  const [
    coursesResult,
    categoriesResult,
    apiBranches,
    partnerData,
    cms,
    trainers,
    showcaseTestimonials,
    showcaseAchievements,
    homepageAbout,
  ] = await Promise.all([
    getCourses(),
    getMainCategories(),
    getHomepageBranches(),
    getHomepagePartnerBranches(),
    getCMSContent(),
    getHomepageCoaches(),
    getShowcaseTestimonialsFromApi(),
    getShowcaseAchievementsFromApi(),
    getHomepageAboutFromApi(),
  ])
  const { courses: apiCourses, fromApi } = coursesResult
  const { categories: apiCategories, fromApi: categoriesFromApi } = categoriesResult

  const homepage = cms?.homepage || {}
  const footer = cms?.footer || {}

  /* All active super-admin courses — used to pick representative thumbnails for each main category */
  const activeCourses = [...apiCourses]
    .filter((c: any) => c.settings?.active !== false && c.enabled !== false)
    .sort((a: any, b: any) => {
      const ta = new Date(a.created_at || 0).getTime()
      const tb = new Date(b.created_at || 0).getTime()
      return ta - tb
    })

  /* Main categories shown in the home page Training Program carousel; clicking navigates to all related courses */
  const classCards =
    apiCategories.length > 0
      ? apiCategories.map((cat: any) => {
          const allowedIds = new Set<string>(
            [
              cat.id,
              ...(Array.isArray(cat.subcategories) ? cat.subcategories.map((sub: any) => sub?.id) : []),
            ]
              .filter(Boolean)
              .map((v: any) => String(v))
          )
          const rawCategoryImg = looksLikeImageUrl(cat.image_url)
            ? cat.image_url
            : looksLikeImageUrl(cat.icon_url)
              ? cat.icon_url
              : null
          const matchingCourse = activeCourses.find(
            (c: any) =>
              ((c.category_id && allowedIds.has(String(c.category_id))) ||
                (c.sub_category && allowedIds.has(String(c.sub_category)))) &&
              Boolean(getCourseImage(c))
          )
          const courseImg = matchingCourse ? getCourseImage(matchingCourse) : null
          const resolvedImg =
            (rawCategoryImg && (resolvePublicAssetUrl(rawCategoryImg) || rawCategoryImg)) ||
            (courseImg && (resolvePublicAssetUrl(courseImg) || courseImg)) ||
            "/assets/img/courses/choose_img1.png"
          const derivedSlug = String(cat.name || "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/_/g, "-")
            .replace(/[^a-z0-9-]/g, "")
          return {
            id: cat.id,
            name: cat.name || cat.code || "Category",
            img: resolvedImg,
            href: toCategoryHref({
              id: cat.id,
              name: cat.name,
              slug: cat.slug || derivedSlug || cat.id,
            }),
          }
        })
      : fromApi || categoriesFromApi
        ? [{ id: "explore", name: "Explore our courses", img: "/assets/img/courses/choose_img1.png", href: "/courses" }]
        : []

  const branchCards = apiBranches
    .filter((b: any) => b && b.is_active !== false)
    .map((b: any) => {
      const name = String(b.branch?.name || b.name || b.code || "Branch")
      const addr = b.branch?.address || b.address || {}
      const location = [addr.city, addr.state].filter(Boolean).join(", ")
      const address = [addr.line1, addr.area, addr.city, addr.state, addr.pincode].filter(Boolean).join(", ")
      const phone = String(b.branch?.phone || b.phone || "").trim()
      const slug = String(b.slug || branchNameToSlug(name)).trim()
      return {
        id: String(b.id || slug || name),
        name,
        location,
        address,
        phone: phone || undefined,
        href: `/branches/${encodeURIComponent(slug || String(b.id || ""))}`,
      }
    })

  const partnerSeen = new Set<string>()
  const partnerBranchCards: {
    id: string
    name: string
    location?: string
    description?: string
    img?: string
    href: string
  }[] = []

  const addPartnerCard = (item: {
    key: string
    id: string
    name: string
    location?: string
    description?: string
    img?: string
    href: string
  }) => {
    const norm = item.key.trim().toLowerCase()
    if (!norm || partnerSeen.has(norm)) return
    partnerSeen.add(norm)
    partnerBranchCards.push({
      id: item.id,
      name: item.name,
      location: item.location || undefined,
      description: item.description || undefined,
      img: item.img || undefined,
      href: item.href,
    })
  }

  for (const p of partnerData.collabPartners) {
    const name = String(p?.name || p?.code || "Partner Branch").trim()
    const slug = String(p?.slug || branchNameToSlug(name)).trim()
    const coverRaw = p?.cover_banner_url || p?.logo_url || ""
    const img = coverRaw ? resolvePublicAssetUrl(coverRaw) || String(coverRaw) : ""
    const location = [p?.city, p?.state].filter(Boolean).join(", ")
    addPartnerCard({
      key: slug || p?.branch_id || name,
      id: String(p?.branch_id || slug || name),
      name,
      location,
      description: p?.short_description ? String(p.short_description) : undefined,
      img: img || undefined,
      href: p?.partner_url || `/partners/${encodeURIComponent(slug || String(p?.branch_id || ""))}`,
    })
  }

  for (const org of partnerData.partnerOrgs) {
    const name = String(org?.name || "Partner").trim()
    const slug = String(org?.slug || branchNameToSlug(name)).trim()
    const coverRaw = org?.cover_banner_url || org?.logo_url || ""
    const img = coverRaw ? resolvePublicAssetUrl(coverRaw) || String(coverRaw) : ""
    addPartnerCard({
      key: slug || org?.partner_org_id || name,
      id: String(org?.partner_org_id || slug || name),
      name,
      location: org?.address ? String(org.address) : undefined,
      description: org?.tagline || org?.short_description ? String(org.tagline || org.short_description) : undefined,
      img: img || undefined,
      href: org?.landing_path || `/partner-orgs/${encodeURIComponent(slug || String(org?.partner_org_id || ""))}`,
    })
  }

  if (partnerBranchCards.length === 0) {
    for (const b of apiBranches) {
      if (!b || b.is_active === false) continue
      const isPartner = Boolean(b.partner_org_id || b.allows_collaboration || b.is_collaboration_partner)
      if (!isPartner) continue
      const name = String(b.branch?.name || b.name || b.code || "Partner Branch")
      const addr = b.branch?.address || b.address || {}
      const location = [addr.city, addr.state].filter(Boolean).join(", ")
      const address = [addr.line1, addr.area, addr.city, addr.state, addr.pincode].filter(Boolean).join(", ")
      const slug = String(b.slug || branchNameToSlug(name)).trim()
      addPartnerCard({
        key: slug || b.id || name,
        id: String(b.id || slug || name),
        name,
        location: location || undefined,
        description: address || undefined,
        href:
          b.allows_collaboration || b.is_collaboration_partner
            ? `/partners/${encodeURIComponent(slug || String(b.id || ""))}`
            : `/branches/${encodeURIComponent(slug || String(b.id || ""))}`,
      })
    }
  }

  const partnerDirectoryHref = partnerData.partnerOrgs.length > 0 ? "/partner-orgs" : "/partners"

  /* Hero content from CMS — no hardcoded title/CTA fallbacks; show only when set in admin */
  const heroTitle = (homepage.hero_title || "").trim()
  const heroSubtitle = (homepage.hero_subtitle || "").trim()
  const heroDescription = (homepage.hero_description || "").trim()
  const heroVideo = homepage.hero_video || "/assets/img/slider.mp4"
  const heroImage = homepage.hero_image || ""
  const heroPrimaryCtaText = (homepage.hero_primary_cta_text || "").trim()
  const heroPrimaryCtaLink = (homepage.hero_primary_cta_link || "").trim()
  const heroSecondaryCtaText = (homepage.hero_secondary_cta_text || "").trim()
  const heroSecondaryCtaLink = (homepage.hero_secondary_cta_link || "").trim()

  /* About: homepage_content API first, then legacy CMS fields */
  const aboutTitle = homepageAbout.title?.trim() || homepage.about_title || "Advantages of Rock Martial Arts"
  const aboutSubtitle = homepageAbout.subtitle?.trim() || homepage.about_subtitle || ""
  const aboutContentHtml = homepageAbout.content?.trim() || ""
  const aboutImage = homepageAbout.image?.trim() || ""
  const coursesTitle = homepage.courses_title || "Our Classes"
  const coursesSubtitle = homepage.courses_subtitle || "Choose"
  const mediaSectionTitle = (homepage.media_section_title || "").trim()
  const mediaSectionSubtitle = (homepage.media_section_subtitle || "").trim()
  const mediaSectionItems = (Array.isArray(homepage.media_section) ? homepage.media_section : [])
    .filter((item: any) => item && item.enabled !== false && (item.video_url || "").trim())
    .sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .map((item: any) => ({
      id: item.id,
      title: (item.title || "").trim() || undefined,
      subtitle: (item.subtitle || "").trim() || undefined,
      video_url: String(item.video_url).trim(),
      poster_url: (item.poster_url || "").trim() || undefined,
    }))
  const testimonialsTitle = homepage.testimonials_title || "Success stories"
  const testimonialsSubtitle = homepage.testimonials_subtitle || "Testimonials"
  const testimonialsEnabled = homepage.testimonials_enabled !== false
  const testimonials: { name: string; role: string; quote?: string; image?: string; achievement?: string }[] = []

  const ctaTitle = homepage.cta_title || "Learn martial arts with discipline energy enhance your physical and mental well-being with our holistic tai-chi training."
  const ctaSubtitle = homepage.cta_subtitle || ""
  const bottomCtaTitle = homepage.bottom_cta_title || ""
  const bottomCtaSubtitle = homepage.bottom_cta_subtitle || ""

  return (
    <HomePageView
      heroTitle={heroTitle}
      heroSubtitle={heroSubtitle}
      heroDescription={heroDescription}
      heroVideo={heroVideo}
      heroImage={heroImage}
      heroPrimaryCtaText={heroPrimaryCtaText}
      heroPrimaryCtaLink={heroPrimaryCtaLink}
      heroSecondaryCtaText={heroSecondaryCtaText}
      heroSecondaryCtaLink={heroSecondaryCtaLink}
      ctaTitle={ctaTitle}
      ctaSubtitle={ctaSubtitle}
      bottomCtaTitle={bottomCtaTitle}
      bottomCtaSubtitle={bottomCtaSubtitle}
      aboutTitle={aboutTitle}
      aboutSubtitle={aboutSubtitle}
      aboutContentHtml={aboutContentHtml}
      aboutImage={aboutImage}
      coursesTitle={coursesTitle}
      coursesSubtitle={coursesSubtitle}
      mediaSectionTitle={mediaSectionTitle}
      mediaSectionSubtitle={mediaSectionSubtitle}
      mediaSectionItems={mediaSectionItems}
      testimonialsTitle={testimonialsTitle}
      testimonialsSubtitle={testimonialsSubtitle}
      testimonialsEnabled={testimonialsEnabled}
      classCards={classCards}
      branches={branchCards}
      partnerBranches={partnerBranchCards}
      partnerDirectoryHref={partnerDirectoryHref}
      physicalBenefits={
        Array.isArray(homepage.physical_benefits)
          ? homepage.physical_benefits.filter((x: any) => String(x || "").trim())
          : []
      }
      mentalBenefits={
        Array.isArray(homepage.mental_benefits)
          ? homepage.mental_benefits.filter((x: any) => String(x || "").trim())
          : []
      }
      trainers={trainers}
      testimonials={testimonials}
      defaultTestimonialQuote={(homepage.default_testimonial_quote || "").trim()}
      showcaseTestimonials={showcaseTestimonials}
      showcaseAchievements={showcaseAchievements}
    />
  )
}
