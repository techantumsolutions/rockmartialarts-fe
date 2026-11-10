"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import AOS from "aos"
import {
  ArrowLeft,
  Loader2,
  Mail,
  MapPin,
  Phone,
} from "lucide-react"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import type { PartnerOrgLanding } from "@/lib/partnerOrgAPI"
import { PartnerOrgSiteSections } from "@/components/partner-org/PartnerOrgSiteSections"

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

export default function PartnerOrgLandingClient() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const [data, setData] = useState<PartnerOrgLanding | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      `/api/backend/partner-organizations/public/${encodeURIComponent(slug)}/landing`,
      { cache: "no-store", headers: { Accept: "application/json" } }
    )
      .then(async (res) => {
        if (!res.ok) throw new Error("Partner not found")
        return res.json()
      })
      .then((payload) => {
        if (cancelled) return
        setData(payload)
        setError(null)
      })
      .catch(() => {
        if (cancelled) return
        setData(null)
        setError("Partner not found")
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
    router.replace(`/partner-orgs/${encodeURIComponent(canonical)}`, { scroll: false })
  }, [data?.slug, slug, router])

  useEffect(() => {
    AOS.refresh()
  }, [data])

  async function submitLead(e: FormEvent) {
    e.preventDefault()
    if (!data?.slug || formSubmitting) return
    setFormError(null)
    setFormSubmitting(true)
    try {
      const res = await fetch(
        `/api/backend/partner-organizations/public/${encodeURIComponent(data.slug)}/leads`,
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
              ? payload.detail
                  .map((d: { msg?: string }) => d.msg)
                  .filter(Boolean)
                  .join(", ")
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
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-gray-400">
          <Loader2 className="w-12 h-12 animate-spin text-[#FFB70F]" />
          <p>Loading partner…</p>
        </div>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Partner not found</h1>
          <p className="text-gray-400 mb-6">
            {error || "This partner organization page is unavailable."}
          </p>
          <Link
            href="/partner-orgs"
            className="inline-flex items-center gap-2 text-[#FFB70F] hover:text-white font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Browse partner organizations
          </Link>
        </div>
      </main>
    )
  }

  const hero = data.hero || {}
  const about = data.about || {}
  const contact = data.contact || {}
  const facilities = data.facilities || {}
  const social = data.social_links || {}
  const cover =
    resolvePublicAssetUrl(hero.cover_banner_url || "") || "/assets/img/banner.jpg"
  const logo = resolvePublicAssetUrl(hero.logo_url || "")
  const name = hero.name || "Partner"
  const whyPoints = about.why_choose_us_points || []
  const facilityList = facilities.facilities || []
  const highlights = facilities.location_highlights || []
  const hasAbout = !!(
    about.about_content ||
    about.our_story ||
    about.vision ||
    about.mission ||
    about.why_choose_us ||
    whyPoints.length
  )

  return (
    <main className="min-h-screen text-white">
      <section className="relative min-h-[70vh] flex items-end overflow-hidden">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#171A26] via-[#171A26]/70 to-black/30" />
        </div>
        <div className="relative site-content px-4 pb-16 pt-28">
          <Link
            href="/partner-orgs"
            className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-[#FFB70F] mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> All partner organizations
          </Link>
          <div className="flex flex-col md:flex-row md:items-end gap-6">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt={name}
                className="w-20 h-20 md:w-24 md:h-24 object-contain rounded-xl bg-white/10 p-2 border border-white/10"
              />
            ) : null}
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">{name}</h1>
              {hero.tagline ? (
                <p className="text-lg text-gray-200 max-w-2xl">{hero.tagline}</p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {hasAbout ? (
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-4xl">
            <SectionHeading eyebrow="About" title={`About ${name}`} />
            <div className="space-y-8 text-gray-300 leading-relaxed" data-aos="fade-up">
              {about.about_content ? <p className="whitespace-pre-wrap">{about.about_content}</p> : null}
              {about.our_story ? (
                <div>
                  <h3 className="text-[#FFB70F] font-semibold mb-2">Our story</h3>
                  <p className="whitespace-pre-wrap">{about.our_story}</p>
                </div>
              ) : null}
              {(about.vision || about.mission) && (
                <div className="grid md:grid-cols-2 gap-6">
                  {about.vision ? (
                    <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-5">
                      <h3 className="text-[#FFB70F] font-semibold mb-2">Vision</h3>
                      <p className="whitespace-pre-wrap text-sm">{about.vision}</p>
                    </div>
                  ) : null}
                  {about.mission ? (
                    <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-5">
                      <h3 className="text-[#FFB70F] font-semibold mb-2">Mission</h3>
                      <p className="whitespace-pre-wrap text-sm">{about.mission}</p>
                    </div>
                  ) : null}
                </div>
              )}
              {about.why_choose_us || whyPoints.length ? (
                <div>
                  <h3 className="text-[#FFB70F] font-semibold mb-2">Why choose us</h3>
                  {about.why_choose_us ? (
                    <p className="whitespace-pre-wrap mb-3">{about.why_choose_us}</p>
                  ) : null}
                  {whyPoints.length ? (
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {whyPoints.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {(facilityList.length || highlights.length || facilities.parking_info) && (
        <section className="py-16 px-4 bg-black/20">
          <div className="container mx-auto max-w-4xl">
            <SectionHeading eyebrow="Facilities" title="Training facilities" />
            <div className="grid md:grid-cols-2 gap-8 text-gray-300" data-aos="fade-up">
              {facilityList.length ? (
                <ul className="space-y-2">
                  {facilityList.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-[#FFB70F]">•</span>
                      {f}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="space-y-4">
                {highlights.length ? (
                  <div>
                    <h3 className="text-[#FFB70F] font-semibold mb-2">Location highlights</h3>
                    <ul className="space-y-1 text-sm">
                      {highlights.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {facilities.parking_info ? (
                  <div>
                    <h3 className="text-[#FFB70F] font-semibold mb-2">Parking</h3>
                    <p className="text-sm whitespace-pre-wrap">{facilities.parking_info}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      )}

      <PartnerOrgSiteSections
        variant="public"
        orgSlug={data.slug || slug}
        branches={(data.branches || []) as never}
        achievements={data.achievements || []}
      />

      <section className="py-16 px-4">
        <div className="container mx-auto max-w-5xl grid lg:grid-cols-2 gap-10">
          <div data-aos="fade-up">
            <SectionHeading eyebrow="Contact" title="Get in touch" />
            <div className="space-y-4 text-gray-300">
              {contact.address ? (
                <p className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#FFB70F] shrink-0 mt-0.5" />
                  <span>{contact.address}</span>
                </p>
              ) : null}
              {contact.phone ? (
                <p className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-[#FFB70F] shrink-0" />
                  <a href={`tel:${contact.phone}`} className="hover:text-[#FFB70F]">
                    {contact.phone}
                  </a>
                </p>
              ) : null}
              {contact.email ? (
                <p className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-[#FFB70F] shrink-0" />
                  <a href={`mailto:${contact.email}`} className="hover:text-[#FFB70F]">
                    {contact.email}
                  </a>
                </p>
              ) : null}
              <div className="flex flex-wrap gap-3 pt-2">
                {Object.entries(social)
                  .filter(([, v]) => !!v)
                  .map(([key, url]) => (
                    <a
                      key={key}
                      href={String(url)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm capitalize px-3 py-1.5 rounded-full border border-gray-700 hover:border-[#FFB70F] hover:text-[#FFB70F]"
                    >
                      {key}
                    </a>
                  ))}
              </div>
            </div>
          </div>

          <div
            className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 md:p-8"
            data-aos="fade-up"
          >
            <h3 className="text-xl font-semibold text-[#FFB70F] mb-2">Send an enquiry</h3>
            <p className="text-sm text-gray-400 mb-6">
              Your message goes only to this partner organization.
            </p>
            {formDone ? (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-6 text-center">
                Thank you — we received your enquiry and will get back to you soon.
                <button
                  type="button"
                  className="block mx-auto mt-4 text-sm underline text-emerald-200"
                  onClick={() => setFormDone(false)}
                >
                  Send another
                </button>
              </div>
            ) : (
              <form onSubmit={submitLead} className="space-y-3">
                <input
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Your name *"
                  className="w-full h-11 px-3 rounded-lg bg-gray-950 border border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB70F]"
                />
                <input
                  required
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="Phone *"
                  className="w-full h-11 px-3 rounded-lg bg-gray-950 border border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB70F]"
                />
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full h-11 px-3 rounded-lg bg-gray-950 border border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB70F]"
                />
                <input
                  value={formInterest}
                  onChange={(e) => setFormInterest(e.target.value)}
                  placeholder="Interest / course"
                  className="w-full h-11 px-3 rounded-lg bg-gray-950 border border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB70F]"
                />
                <textarea
                  rows={4}
                  value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value)}
                  placeholder="Message"
                  className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB70F]"
                />
                {formError ? (
                  <p className="text-sm text-red-400">{formError}</p>
                ) : null}
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="w-full h-11 rounded-lg bg-[#FFB70F] text-[#171A26] font-semibold hover:bg-[#ffc53d] disabled:opacity-60 inline-flex items-center justify-center gap-2"
                >
                  {formSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  Submit enquiry
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
