"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import AOS from "aos"
import {
  ArrowLeft,
  Clock,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ExternalLink,
} from "lucide-react"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"

type PartnerLanding = {
  branch_id: string
  slug: string
  partner_url?: string
  hero?: {
    name?: string
    tagline?: string
    logo_url?: string | null
    cover_banner_url?: string | null
    cta_primary?: { label?: string; href?: string }
    cta_secondary?: { label?: string; href?: string }
  }
  about?: {
    about_content?: string | null
    our_story?: string | null
    vision?: string | null
    mission?: string | null
    why_choose_us?: string | null
    why_choose_us_points?: string[]
  }
  contact?: {
    phone?: string | null
    email?: string | null
    address?: Record<string, string> | null
    map_link?: string | null
    map_embed_url?: string | null
    facilities?: string[]
    parking_info?: string | null
    location_highlights?: string[]
    operating_hours?: {
      day?: string
      open_time?: string | null
      close_time?: string | null
      is_closed?: boolean
    }[]
    hours_notes?: string | null
    social_links?: Record<string, string | null>
  }
  masters?: {
    id?: string
    name?: string
    designation?: string | null
    photo_url?: string | null
    biography?: string | null
    experience_years?: number | null
    experience_summary?: string | null
    specializations?: string[]
  }[]
  gallery?: {
    id?: string
    title?: string | null
    caption?: string | null
    media_type?: string
    media_url?: string | null
    thumbnail_url?: string | null
    video_url?: string | null
    alt_text?: string | null
  }[]
  testimonials?: {
    id?: string
    name?: string
    student_name?: string
    role?: string
    quote?: string
    content?: string
    testimonial_text?: string
    image?: string
    photo_url?: string
    rating?: number
  }[]
  team?: {
    id?: string
    name?: string
    designation?: string | null
    role?: string | null
    photo_url?: string | null
    bio?: string | null
    contact_approved?: boolean
    contact_email?: string | null
    contact_phone?: string | null
  }[]
  courses?: { id?: string; name?: string; title?: string }[]
  profile?: {
    partner_id?: string | null
    display_name?: string | null
    trade_name?: string | null
  }
}

function formatAddress(addr?: Record<string, string> | null): string {
  if (!addr) return ""
  return [addr.line1, addr.area, addr.city, addr.state, addr.pincode]
    .filter((p) => typeof p === "string" && p.trim())
    .join(", ")
}

function dayLabel(day?: string): string {
  if (!day) return ""
  return day.charAt(0).toUpperCase() + day.slice(1)
}

function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string
  title: string
}) {
  return (
    <div className="text-center mb-10 md:mb-12" data-aos="fade-up">
      <div className="w-16 h-1 bg-[#FFB70F] mx-auto mb-4" />
      <p className="text-[#FFB70F] uppercase tracking-widest text-sm mb-2">
        {eyebrow}
      </p>
      <h2 className="text-3xl md:text-4xl font-bold text-[#FFB70F]">{title}</h2>
    </div>
  )
}

export default function PartnerLandingClient() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const [formName, setFormName] = useState("")
  const [formPhone, setFormPhone] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formMessage, setFormMessage] = useState("")
  const [formInterest, setFormInterest] = useState("")
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formDone, setFormDone] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)


  useEffect(() => {
    AOS.init({
      duration: 600,
      easing: "ease-out-cubic",
      once: true,
      offset: 100,
    })
  }, [])

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(
      `/api/backend/collaboration-partners/public/by-slug/${encodeURIComponent(slug)}`,
      { cache: "no-store", headers: { Accept: "application/json" } }
    )
      .then(async (res) => {
        if (res.status === 404) return null
        if (!res.ok) throw new Error("Failed to load partner")
        return res.json()
      })
      .then((payload) => {
        if (cancelled) return
        setData(payload)
        if (!payload) setError("Partner not found")
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to load partner")
          setData(null)
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
    if (!data?.slug || !slug) return
    const canonical = String(data.slug).trim()
    if (!canonical) return
    if (decodeURIComponent(slug).toLowerCase() === canonical.toLowerCase()) return
    router.replace(`/partners/${encodeURIComponent(canonical)}`, { scroll: false })
  }, [data?.slug, slug, router])

  useEffect(() => {
    AOS.refresh()
  }, [data])

  async function submitPartnerLead(e: FormEvent) {
    e.preventDefault()
    if (!data?.slug || formSubmitting) return
    setFormError(null)
    setFormSubmitting(true)
    try {
      const res = await fetch(
        `/api/backend/collaboration-partners/public/by-slug/${encodeURIComponent(data.slug)}/leads`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            name: formName.trim(),
            phone: formPhone.trim(),
            email: formEmail.trim() || undefined,
            message: formMessage.trim() || undefined,
            interest: formInterest.trim() || undefined,
          }),
        }
      )
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        const detail =
          typeof payload?.detail === "string"
            ? payload.detail
            : Array.isArray(payload?.detail)
              ? payload.detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join(", ")
              : "Could not send your enquiry. Please try again."
        throw new Error(detail || "Could not send your enquiry.")
      }
      setFormDone(true)
      setFormName("")
      setFormPhone("")
      setFormEmail("")
      setFormMessage("")
      setFormInterest("")
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Could not send your enquiry.")
    } finally {
      setFormSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#171A26] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-gray-400">
          <Loader2 className="w-12 h-12 animate-spin text-[#FFB70F]" />
          <p>Loading partner…</p>
        </div>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#171A26] flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Partner not found</h1>
          <p className="text-gray-400 mb-6">
            {error || "This collaboration partner page is unavailable."}
          </p>
          <Link
            href="/partners"
            className="inline-flex items-center gap-2 text-[#FFB70F] hover:text-white font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Browse partners
          </Link>
        </div>
      </main>
    )
  }

  const hero = data.hero || {}
  const about = data.about || {}
  const contact = data.contact || {}
  const cover =
    resolvePublicAssetUrl(hero.cover_banner_url || "") ||
    "/assets/img/banner.jpg"
  const logo = resolvePublicAssetUrl(hero.logo_url || "")
  const name = hero.name || "Partner"
  const addressLine = formatAddress(contact.address)
  const ctaPrimary = hero.cta_primary || { label: "Book a Demo", href: "/book-demo" }
  const ctaSecondary = hero.cta_secondary || {
    label: "Request Callback",
    href: "/request-callback",
  }
  const masters = data.masters || []
  const gallery = data.gallery || []
  const testimonials = data.testimonials || []
  const team = data.team || []
  const hours = contact.operating_hours || []
  const whyPoints = about.why_choose_us_points || []
  const hasAbout =
    !!(
      about.about_content ||
      about.our_story ||
      about.vision ||
      about.mission ||
      about.why_choose_us ||
      whyPoints.length
    )

  return (
    <main className="min-h-screen bg-[#171A26] text-white">
      {/* Hero */}
      <section className="relative min-h-[70vh] flex items-end overflow-hidden">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#171A26] via-[#171A26]/75 to-[#171A26]/20" />
        </div>
        <div className="relative z-10 container mx-auto px-4 max-w-7xl pb-12 md:pb-16 pt-28">
          {logo ? (
            <div className="mb-6" data-aos="fade-up">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logo}
                alt={name}
                className="h-16 md:h-20 w-auto object-contain"
              />
            </div>
          ) : null}
          <p
            className="text-[#FFB70F] uppercase tracking-[0.2em] text-xs md:text-sm mb-3"
            data-aos="fade-up"
          >
            Collaboration Partner
            {data.profile?.partner_id ? ` · ${data.profile.partner_id}` : ""}
          </p>
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white uppercase tracking-wide max-w-4xl"
            data-aos="fade-up"
            data-aos-delay="60"
          >
            {name}
          </h1>
          {hero.tagline ? (
            <p
              className="mt-4 text-lg md:text-xl text-white/85 max-w-2xl"
              data-aos="fade-up"
              data-aos-delay="100"
            >
              {hero.tagline}
            </p>
          ) : null}
          {addressLine ? (
            <p
              className="mt-3 text-[#FFB70F]/90 flex items-center gap-2"
              data-aos="fade-up"
              data-aos-delay="120"
            >
              <MapPin className="w-4 h-4 flex-shrink-0" />
              {addressLine}
            </p>
          ) : null}
          <div
            className="mt-8 flex flex-wrap gap-3"
            data-aos="fade-up"
            data-aos-delay="160"
          >
            <Link
              href={ctaPrimary.href || "/book-demo"}
              className="inline-flex items-center justify-center px-6 py-3 bg-[#FFB70F] text-[#171A26] font-semibold rounded-md hover:bg-[#ffc53d] transition-colors"
            >
              {ctaPrimary.label || "Book a Demo"}
            </Link>
            <Link
              href={ctaSecondary.href || "/request-callback"}
              className="inline-flex items-center justify-center px-6 py-3 border border-[#FFB70F] text-[#FFB70F] font-semibold rounded-md hover:bg-[#FFB70F]/10 transition-colors"
            >
              {ctaSecondary.label || "Request Callback"}
            </Link>
            <Link
              href={`/branches/${encodeURIComponent(data.slug)}`}
              className="inline-flex items-center gap-2 px-4 py-3 text-white/70 hover:text-white text-sm"
            >
              Branch page <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* About / Why choose us */}
      {hasAbout ? (
        <section className="py-16 md:py-20 relative z-10">
          <div className="container mx-auto px-4 max-w-7xl">
            <SectionHeading eyebrow="Who we are" title="About" />
            <div className="grid lg:grid-cols-2 gap-10">
              <div className="space-y-6" data-aos="fade-up">
                {about.about_content ? (
                  <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                    {about.about_content}
                  </p>
                ) : null}
                {about.our_story ? (
                  <div>
                    <h3 className="text-[#FFB70F] font-semibold mb-2">Our story</h3>
                    <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                      {about.our_story}
                    </p>
                  </div>
                ) : null}
                <div className="grid sm:grid-cols-2 gap-4">
                  {about.vision ? (
                    <div className="border-l-2 border-[#FFB70F] pl-4">
                      <h3 className="text-[#FFB70F] font-semibold mb-1">Vision</h3>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {about.vision}
                      </p>
                    </div>
                  ) : null}
                  {about.mission ? (
                    <div className="border-l-2 border-[#FFB70F] pl-4">
                      <h3 className="text-[#FFB70F] font-semibold mb-1">Mission</h3>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {about.mission}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
              <div data-aos="fade-up" data-aos-delay="80">
                {(about.why_choose_us || whyPoints.length > 0) && (
                  <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-6 md:p-8">
                    <h3 className="text-xl font-bold text-[#FFB70F] mb-4">
                      Why choose us
                    </h3>
                    {about.why_choose_us ? (
                      <p className="text-gray-300 leading-relaxed mb-4 whitespace-pre-line">
                        {about.why_choose_us}
                      </p>
                    ) : null}
                    {whyPoints.length > 0 ? (
                      <ul className="space-y-3">
                        {whyPoints.map((point, i) => (
                          <li key={`${point}-${i}`} className="flex gap-3 text-gray-200">
                            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#FFB70F] flex-shrink-0" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Masters */}
      {masters.length > 0 ? (
        <section className="py-16 md:py-20 bg-[#12141e] relative z-10">
          <div className="container mx-auto px-4 max-w-7xl">
            <SectionHeading eyebrow="Expertise" title="Masters & Experts" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {masters.map((m, i) => (
                <div
                  key={m.id || `${m.name}-${i}`}
                  className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 flex flex-col"
                  data-aos="fade-up"
                  data-aos-delay={i * 60}
                >
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#FFB70F]/40 mb-4 bg-gray-700 flex items-center justify-center text-2xl text-gray-400">
                    {m.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolvePublicAssetUrl(m.photo_url)}
                        alt={m.name || "Master"}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      "🥋"
                    )}
                  </div>
                  <h3 className="text-[#FFB70F] font-semibold text-lg">{m.name}</h3>
                  {m.designation ? (
                    <p className="text-white/80 text-sm mt-1">{m.designation}</p>
                  ) : null}
                  {m.experience_years != null ? (
                    <p className="text-gray-400 text-xs mt-1">
                      {m.experience_years}+ years experience
                    </p>
                  ) : null}
                  {(m.experience_summary || m.biography) && (
                    <p className="text-gray-300 text-sm mt-3 line-clamp-4 leading-relaxed">
                      {m.experience_summary || m.biography}
                    </p>
                  )}
                  {(m.specializations || []).length > 0 ? (
                    <p className="text-[#FFB70F]/80 text-xs mt-3">
                      {(m.specializations || []).slice(0, 4).join(" · ")}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Gallery */}
      {gallery.length > 0 ? (
        <section className="py-16 md:py-20 relative z-10">
          <div className="container mx-auto px-4 max-w-7xl">
            <SectionHeading eyebrow="Inside the academy" title="Gallery" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {gallery.map((g, i) => {
                const src = resolvePublicAssetUrl(
                  g.thumbnail_url || g.media_url || g.video_url || ""
                )
                return (
                  <div
                    key={g.id || i}
                    className="aspect-square overflow-hidden rounded-lg border border-gray-800 bg-gray-900"
                    data-aos="fade-up"
                    data-aos-delay={(i % 8) * 40}
                  >
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={src}
                        alt={g.alt_text || g.title || "Gallery"}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* Testimonials */}
      {testimonials.length > 0 ? (
        <section className="py-16 md:py-20 bg-[#12141e] relative z-10">
          <div className="container mx-auto px-4 max-w-7xl">
            <SectionHeading eyebrow="Voices" title="Testimonials" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.map((t, i) => {
                const quote =
                  t.quote || t.content || t.testimonial_text || ""
                const who = t.name || t.student_name || "Student"
                const photo = resolvePublicAssetUrl(
                  t.photo_url || t.image || ""
                )
                return (
                  <div
                    key={t.id || i}
                    className="bg-gray-900/50 border border-gray-800 rounded-xl p-6"
                    data-aos="fade-up"
                    data-aos-delay={i * 60}
                  >
                    <p className="text-gray-200 leading-relaxed italic">
                      “{quote}”
                    </p>
                    <div className="mt-5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                        {photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photo}
                            alt={who}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : null}
                      </div>
                      <div>
                        <p className="text-[#FFB70F] font-medium text-sm">{who}</p>
                        {t.role ? (
                          <p className="text-gray-400 text-xs">{t.role}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* Team */}
      {team.length > 0 ? (
        <section className="py-16 md:py-20 relative z-10">
          <div className="container mx-auto px-4 max-w-7xl">
            <SectionHeading eyebrow="Our people" title="Partner Team" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {team.map((m, i) => (
                <div
                  key={m.id || i}
                  className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 text-center"
                  data-aos="fade-up"
                  data-aos-delay={i * 50}
                >
                  <div className="w-16 h-16 mx-auto rounded-full overflow-hidden border border-[#FFB70F]/40 mb-3 bg-gray-700 flex items-center justify-center text-xl text-gray-400">
                    {m.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolvePublicAssetUrl(m.photo_url)}
                        alt={m.name || "Team"}
                        className="w-full h-full object-cover"
                        loading="lazy"
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
                  {m.bio ? (
                    <p className="text-gray-300 text-sm mt-2 line-clamp-3">{m.bio}</p>
                  ) : null}
                  {m.contact_approved && (m.contact_phone || m.contact_email) ? (
                    <p className="text-[#FFB70F]/90 text-xs mt-2">
                      {[m.contact_phone, m.contact_email].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Contact / hours / map */}
      <section className="py-16 md:py-20 bg-[#12141e] relative z-10" id="contact">
        <div className="container mx-auto px-4 max-w-7xl">
          <SectionHeading eyebrow="Visit us" title="Contact & Hours" />
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-5" data-aos="fade-up">
              {addressLine ? (
                <p className="flex gap-3 text-gray-200">
                  <MapPin className="w-5 h-5 text-[#FFB70F] flex-shrink-0 mt-0.5" />
                  <span>{addressLine}</span>
                </p>
              ) : null}
              {contact.phone ? (
                <p className="flex gap-3 text-gray-200">
                  <Phone className="w-5 h-5 text-[#FFB70F] flex-shrink-0" />
                  <a href={`tel:${contact.phone}`} className="hover:text-[#FFB70F]">
                    {contact.phone}
                  </a>
                </p>
              ) : null}
              {contact.email ? (
                <p className="flex gap-3 text-gray-200">
                  <Mail className="w-5 h-5 text-[#FFB70F] flex-shrink-0" />
                  <a
                    href={`mailto:${contact.email}`}
                    className="hover:text-[#FFB70F]"
                  >
                    {contact.email}
                  </a>
                </p>
              ) : null}
              {(contact.facilities || []).length > 0 ? (
                <div>
                  <h3 className="text-[#FFB70F] font-semibold mb-2">Facilities</h3>
                  <ul className="grid sm:grid-cols-2 gap-2 text-sm text-gray-300">
                    {(contact.facilities || []).map((f, i) => (
                      <li key={`${f}-${i}`}>· {f}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {contact.map_link ? (
                <a
                  href={contact.map_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[#FFB70F] hover:underline text-sm"
                >
                  Open in maps <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : null}
            </div>
            <div data-aos="fade-up" data-aos-delay="80" className="space-y-6">
              {hours.length > 0 ? (
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-[#FFB70F] font-semibold mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Operating hours
                  </h3>
                  <ul className="space-y-2 text-sm">
                    {hours.map((h) => (
                      <li
                        key={h.day}
                        className="flex justify-between gap-4 text-gray-300 border-b border-gray-800/80 pb-2 last:border-0"
                      >
                        <span>{dayLabel(h.day)}</span>
                        <span className="text-white/90">
                          {h.is_closed
                            ? "Closed"
                            : `${h.open_time || "—"} – ${h.close_time || "—"}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {contact.hours_notes ? (
                    <p className="text-gray-400 text-xs mt-4">{contact.hours_notes}</p>
                  ) : null}
                </div>
              ) : null}

              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <h3 className="text-[#FFB70F] font-semibold mb-2">Send an enquiry</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Leave your details and this partner academy will follow up with you.
                </p>
                {formDone ? (
                  <div className="rounded-md border border-[#FFB70F]/40 bg-[#FFB70F]/10 px-4 py-3 text-sm text-[#FFB70F]">
                    Thank you — we received your enquiry. Our team will contact you soon.
                  </div>
                ) : (
                  <form onSubmit={submitPartnerLead} className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block" htmlFor="partner-lead-name">
                        Name *
                      </label>
                      <input
                        id="partner-lead-name"
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full h-11 rounded-md bg-[#171A26] border border-gray-700 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FFB70F]"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block" htmlFor="partner-lead-phone">
                        Phone *
                      </label>
                      <input
                        id="partner-lead-phone"
                        required
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        className="w-full h-11 rounded-md bg-[#171A26] border border-gray-700 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FFB70F]"
                        placeholder="Mobile number"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block" htmlFor="partner-lead-email">
                        Email
                      </label>
                      <input
                        id="partner-lead-email"
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        className="w-full h-11 rounded-md bg-[#171A26] border border-gray-700 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FFB70F]"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block" htmlFor="partner-lead-interest">
                        Interest
                      </label>
                      <input
                        id="partner-lead-interest"
                        value={formInterest}
                        onChange={(e) => setFormInterest(e.target.value)}
                        className="w-full h-11 rounded-md bg-[#171A26] border border-gray-700 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FFB70F]"
                        placeholder="e.g. Kids karate, adults MMA"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block" htmlFor="partner-lead-message">
                        Message
                      </label>
                      <textarea
                        id="partner-lead-message"
                        rows={3}
                        value={formMessage}
                        onChange={(e) => setFormMessage(e.target.value)}
                        className="w-full rounded-md bg-[#171A26] border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FFB70F]"
                        placeholder="How can we help?"
                      />
                    </div>
                    {formError ? (
                      <p className="text-sm text-red-400">{formError}</p>
                    ) : null}
                    <button
                      type="submit"
                      disabled={formSubmitting}
                      className="w-full inline-flex items-center justify-center px-4 py-3 bg-[#FFB70F] text-[#171A26] font-semibold rounded-md hover:bg-[#ffc53d] transition-colors disabled:opacity-60"
                    >
                      {formSubmitting ? "Sending…" : "Submit enquiry"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
          <div
            className="mt-10 flex flex-wrap gap-3 justify-center"
            data-aos="fade-up"
          >
            <Link
              href={ctaPrimary.href || "/book-demo"}
              className="inline-flex items-center justify-center px-6 py-3 bg-[#FFB70F] text-[#171A26] font-semibold rounded-md hover:bg-[#ffc53d] transition-colors"
            >
              {ctaPrimary.label || "Book a Demo"}
            </Link>
            <Link
              href={ctaSecondary.href || "/request-callback"}
              className="inline-flex items-center justify-center px-6 py-3 border border-[#FFB70F] text-[#FFB70F] font-semibold rounded-md hover:bg-[#FFB70F]/10 transition-colors"
            >
              {ctaSecondary.label || "Request Callback"}
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
