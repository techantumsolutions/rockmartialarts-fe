import { branchNameToSlug } from "@/lib/branch-slug"
import { toCategoryHref } from "@/lib/category-slug"
import { toCourseSlug } from "@/lib/course-slug"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import { getBackendProxyBaseUrl } from "@/lib/serverBackendUrl"
import {
  MOCK_SHOWCASE_ACHIEVEMENTS,
  MOCK_WARRIOR_TESTIMONIALS,
} from "@/lib/imagePlaceholders"
import { PUBLIC_SECTION_FALLBACKS, resolveCmsText } from "@/lib/cmsContentFallback"
import HomePageView from "@/components/website/HomePageView"

export const metadata = {
  title: {
    absolute: "Rock Martial Arts Academy | Fitness & Dance",
  },
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
    const backendUrl = getBackendProxyBaseUrl()
    const res = await fetch(`${backendUrl.replace(/\/$/, "")}/api/courses/public/all?limit=500`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    })
    if (res.ok) {
      const data = await res.json()
      const list = data.courses ?? data ?? []
      const arr = Array.isArray(list) ? list : []
      return { courses: arr, fromApi: true }
    }

    const siteOrigin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")
    if (siteOrigin) {
      const proxyRes = await fetch(`${siteOrigin.replace(/\/$/, "")}/api/backend/courses/public/all?limit=500`, {
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
      })
      if (proxyRes.ok) {
        const data = await proxyRes.json()
        const list = data.courses ?? data ?? []
        const arr = Array.isArray(list) ? list : []
        return { courses: arr, fromApi: true }
      }
    }
    return { courses: [], fromApi: true }
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
    academy_name?: string | null
    branch_name?: string | null
  }[]
> {
  try {
    const siteOrigin =
      process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")
    // All academy testimonials for the public homepage (not global-only).
    const qs = `limit=12`
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
    student_photo: (a.student_photo || a.profile_image_url || a.profile_image || null) as string | null,
    achievement_title: a.title || a.achievement_title || "Achievement",
    description: a.description || null,
    image: Array.isArray(a.images) && a.images.length > 0 ? a.images[0] : a.image || null,
  }))
}

function mergeUniqueAchievements<T extends { id?: string; student_name?: string; achievement_title?: string }>(
  primary: T[],
  fallback: T[],
  minCount = 4
): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  const push = (item: T) => {
    const key = String(
      item.id ||
        `${(item.student_name || "").trim().toLowerCase()}|${(item.achievement_title || "").trim().toLowerCase()}`
    )
    if (!key || seen.has(key)) return
    seen.add(key)
    out.push(item)
  }
  primary.forEach(push)
  if (out.length < minCount) fallback.forEach(push)
  return out
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
    const qs = `limit=500&include_all=true`
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
    cms,
    trainers,
    showcaseTestimonials,
    showcaseAchievements,
    homepageAbout,
  ] = await Promise.all([
    getCourses(),
    getMainCategories(),
    getHomepageBranches(),
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
          return {
            id: cat.id,
            name: cat.name || cat.code || "Category",
            img: resolvedImg,
            href: toCategoryHref({
              id: cat.id,
              name: cat.name,
              code: cat.code,
              slug: cat.slug,
            }),
          }
        })
      : fromApi || categoriesFromApi
        ? [{ id: "explore", name: "Explore our courses", img: "/assets/img/courses/choose_img1.png", href: "/courses" }]
        : []

  /* Dual auto-scrolling showcase courses list */
  const showcaseCourses = activeCourses.map((c: any) => {
    const rawImg = getCourseImage(c)
    const img = (rawImg && (resolvePublicAssetUrl(rawImg) || rawImg)) || "/assets/img/courses/choose_img1.png"
    const matchedCategory = apiCategories.find(
      (cat: any) => String(cat?.id) === String(c?.category_id) || String(cat?.id) === String(c?.sub_category)
    )
    const categoryName =
      matchedCategory?.name ||
      c.category_name ||
      c.difficulty_level ||
      "Martial Arts"
    return {
      id: String(c.id || c._id || toCourseSlug(c)),
      title: String(c.title || c.name || c.code || "Course"),
      category: categoryName,
      img,
      href: `/courses/${toCourseSlug(c)}`,
    }
  })

  const { getBranchDisplayLabels } = await import("@/lib/branchDisplay")
  const branchCards = apiBranches
    .filter((b: any) => b && b.is_active !== false)
    .map((b: any, idx: number) => {
      const labels = getBranchDisplayLabels(b)
      const placeName = labels.placeName
      const addr = b.branch?.address || b.address || {}
      const location = [addr.city, addr.state].filter(Boolean).join(", ")
      const area = labels.locationName || [addr.area, addr.city].filter(Boolean).join(", ") || location
      const address = [addr.line1, addr.area, addr.city, addr.state, addr.pincode].filter(Boolean).join(", ")
      const phone = String(b.branch?.phone || b.phone || "").trim()
      const slug = String(b.slug || branchNameToSlug(placeName)).trim()
      const offered = Array.isArray(b.operational_details?.courses_offered)
        ? b.operational_details.courses_offered.map((x: any) => String(x || "").trim()).filter(Boolean)
        : []
      const coverRaw = b.cover_image_url || ""
      const cover =
        (coverRaw && (resolvePublicAssetUrl(coverRaw) || coverRaw)) ||
        `/assets/img/glry_img${(idx % 9) + 1}.jpg`
      return {
        id: String(b.id || slug || placeName),
        name: labels.brandName,
        brandName: labels.brandName,
        poweredByLine: labels.poweredByLine,
        locationName: labels.locationName,
        logoUrl: labels.logoUrl || null,
        location,
        area,
        address,
        phone: phone || undefined,
        href: `/branches/${encodeURIComponent(slug || String(b.id || ""))}`,
        img: cover,
        tags: offered.slice(0, 3),
        rating: typeof b.rating === "number" ? b.rating : null,
        reviewCount: typeof b.review_count === "number" ? b.review_count : null,
      }
    })

  /* Hero content from CMS — no hardcoded title/CTA fallbacks; show only when set in admin */
  const heroTitle = resolveCmsText(
    (homepage.hero_title || "").trim(),
    "",
    PUBLIC_SECTION_FALLBACKS.heroTitle
  )
  const heroSubtitle = (homepage.hero_subtitle || "").trim()
  const heroDescription = resolveCmsText(
    (homepage.hero_description || "").trim(),
    "",
    PUBLIC_SECTION_FALLBACKS.heroDescription
  )
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
  const coursesTitle = homepage.courses_title || "Our Training Program"
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
  const resolvedShowcaseTestimonials =
    showcaseTestimonials.length > 0
      ? showcaseTestimonials
      : MOCK_WARRIOR_TESTIMONIALS.map((t) => ({ ...t }))
  const resolvedShowcaseAchievements = mergeUniqueAchievements(
    showcaseAchievements,
    MOCK_SHOWCASE_ACHIEVEMENTS.map((a) => ({ ...a })),
    4
  )
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
      showcaseTestimonials={resolvedShowcaseTestimonials}
      showcaseAchievements={resolvedShowcaseAchievements}
      courseShowcaseTag={homepage.course_showcase_tag}
      courseShowcaseTitle={homepage.course_showcase_title}
      courseShowcaseDescription={homepage.course_showcase_description}
      showcaseCourses={showcaseCourses}
    />
  )
}
