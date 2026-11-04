"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useParams } from "next/navigation"
import { Loader2, Mail, MapPin, Phone } from "lucide-react"
import type { PartnerOrgLanding } from "@/lib/partnerOrgAPI"

export default function PartnerOrgContactPage() {
  const params = useParams()
  const slug = String(params?.slug || "")
  const [data, setData] = useState<PartnerOrgLanding | null>(null)
  const [loading, setLoading] = useState(true)

  const [formName, setFormName] = useState("")
  const [formPhone, setFormPhone] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formMessage, setFormMessage] = useState("")
  const [formInterest, setFormInterest] = useState("")
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formDone, setFormDone] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    fetch(
      `/api/backend/partner-organizations/public/${encodeURIComponent(slug)}/landing`,
      { cache: "no-store", headers: { Accept: "application/json" } }
    )
      .then(async (res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!cancelled) setData(payload)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

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
            : "Could not send your enquiry. Please try again."
        throw new Error(detail)
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
      <main className="flex justify-center py-24 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#FFB70F]" />
      </main>
    )
  }

  if (!data) {
    return (
      <main className="text-center py-24 text-white">
        <h1 className="text-2xl font-bold mb-2">Partner not found</h1>
      </main>
    )
  }

  const name = data.hero?.name || "Partner"
  const cp = data.contact_page || {}
  const contact = {
    headline: cp.headline || `Contact ${name}`,
    intro:
      cp.intro ||
      "Your message goes only to this partner organization.",
    address: cp.address || data.contact?.address,
    phone: cp.phone || data.contact?.phone,
    email: cp.email || data.contact?.email,
    map: cp.map_embed_url,
  }

  return (
    <main className="text-white pb-16">
      <section className="pt-10 pb-8 px-4 border-b border-gray-800">
        <div className="container mx-auto max-w-5xl">
          <p className="text-[#FFB70F] uppercase tracking-[0.2em] text-xs mb-2">Contact</p>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">{contact.headline}</h1>
          {contact.intro ? <p className="text-gray-300 max-w-2xl">{contact.intro}</p> : null}
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="container mx-auto max-w-5xl grid lg:grid-cols-2 gap-10">
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
            {contact.map ? (
              <a
                href={contact.map}
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-sm text-[#FFB70F] hover:underline pt-2"
              >
                Open map
              </a>
            ) : null}
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 md:p-8">
            <h2 className="text-xl font-semibold text-[#FFB70F] mb-2">Send an enquiry</h2>
            <p className="text-sm text-gray-400 mb-6">
              This enquiry is visible only to this partner&apos;s admin leads inbox.
            </p>
            {formDone ? (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-6 text-center">
                Thank you — we received your enquiry.
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
                {formError ? <p className="text-sm text-red-400">{formError}</p> : null}
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="w-full h-11 rounded-lg bg-[#FFB70F] text-[#171A26] font-semibold hover:bg-[#ffc53d] disabled:opacity-60 inline-flex items-center justify-center gap-2"
                >
                  {formSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
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
