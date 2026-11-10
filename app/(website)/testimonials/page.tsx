import Link from "next/link"
import { TestimonialCard, type TestimonialCardItem } from "@/components/testimonials"

/* ---------- fetch CMS content ---------- */

export const dynamic = "force-dynamic"
export const revalidate = 0

async function getMongoTestimonials(): Promise<TestimonialCardItem[]> {
  try {
    const siteOrigin =
      process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")
    const qs = `is_global=true&limit=48`
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

async function getCMSContent() {
  try {
    const siteOrigin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")

    if (siteOrigin) {
      const res = await fetch(`${siteOrigin.replace(/\/$/, "")}/api/backend/cms/public`, {
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
      })
      if (res.ok) return await res.json()
    }

    const backendUrl =
      process.env.API_BASE_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "http://127.0.0.1:8003"
    const res = await fetch(`${backendUrl.replace(/\/$/, "")}/api/cms/public`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export const metadata = {
  title: "Testimonials | Rock Martial Arts Academy",
  description: "Success stories and testimonials from students and parents at Rock Martial Arts Academy.",
}

export default async function TestimonialsPage() {
  const [cms, mongoList] = await Promise.all([getCMSContent(), getMongoTestimonials()])
  const homepage = cms?.homepage || {}
  const testimonialsTitle = homepage.testimonials_title || "Success stories"
  const testimonialsSubtitle = homepage.testimonials_subtitle || "Testimonials"
  const testimonials: TestimonialCardItem[] = mongoList

  return (
    <main className="min-h-screen bg-[#171A26]">
      <div className="site-content px-0 sm:px-1 py-16 md:py-20 lg:py-24">
        <div className="mb-12 md:mb-14">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#FFB70F] hover:text-white transition-colors text-sm mb-6"
          >
            ← Back to home
          </Link>
          <div className="w-16 h-1 bg-[#FFB70F] mb-4" />
          <p className="text-[#FFB70F] uppercase tracking-widest text-sm mb-2">{testimonialsSubtitle}</p>
          <h1 className="text-3xl md:text-4xl font-bold text-[#FFB70F]">{testimonialsTitle}</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 pt-2">
          {testimonials.length === 0 ? (
            <p className="text-gray-400 col-span-full text-center py-12">No testimonials available</p>
          ) : null}
          {testimonials.map((t, i) => (
            <TestimonialCard key={t.id || i} item={t} />
          ))}
        </div>
      </div>
    </main>
  )
}
