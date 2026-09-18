"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  Clock,
  Loader2,
  MapPin,
  Ticket,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SafeImage } from "@/components/ui/safe-image"
import {
  academyEventAPI,
  academyEventTypeLabel,
  formatEventFee,
  type AcademyEvent,
} from "@/lib/academyEventAPI"

function formatWhen(iso?: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    dateStyle: "full",
    timeStyle: "short",
  })
}

export default function EventDetailClient() {
  const params = useParams()
  const slug = String(params?.slug || "")
  const [event, setEvent] = useState<AcademyEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setError(null)
    academyEventAPI
      .getPublic(slug)
      .then((data) => setEvent(data.event))
      .catch((e) => {
        setEvent(null)
        setError(e instanceof Error ? e.message : "Event not found")
      })
      .finally(() => setLoading(false))
  }, [slug])

  const registrationOpen = Boolean(event?.registration_open)
  const isFull = Boolean(event?.is_full)
  const registrationClosed =
    event != null && event.registration_enabled === false

  return (
    <main className="min-h-screen bg-[#171A26]">
      <section
        className="relative py-16 md:py-24 bg-cover bg-center"
        style={{ backgroundImage: "url(/assets/img/banner.jpg)" }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="container relative z-10 mx-auto px-4 max-w-7xl">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-[#FFB70F] mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            All events
          </Link>
          {loading ? (
            <Loader2 className="w-8 h-8 animate-spin text-[#FFB70F]" />
          ) : event ? (
            <div className="max-w-3xl">
              <p className="text-[#FFB70F] text-sm uppercase tracking-wide mb-2">
                {academyEventTypeLabel(event.event_type)}
              </p>
              <h1 className="text-3xl md:text-5xl font-bold text-white uppercase mb-3">
                {event.title}
              </h1>
              {event.short_description ? (
                <p className="text-gray-200 text-lg">{event.short_description}</p>
              ) : null}
            </div>
          ) : (
            <p className="text-red-300">{error || "Event not found"}</p>
          )}
        </div>
      </section>

      <section className="py-12 md:py-16 bg-[#171A26]">
        <div className="container mx-auto px-4 max-w-7xl">
          {loading ? null : !event ? (
            <div className="text-center text-gray-400">
              <Button
                asChild
                className="bg-[#FFB70F] text-black hover:bg-[#e0a00d]"
              >
                <Link href="/events">Back to events</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2 space-y-6">
                <div className="aspect-video rounded-xl overflow-hidden border border-gray-800 bg-gray-900">
                  <SafeImage
                    src={event.thumbnail_url || undefined}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-3">
                    About this {academyEventTypeLabel(event.event_type).toLowerCase()}
                  </h2>
                  <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {event.description ||
                      event.short_description ||
                      "Details will be added soon."}
                  </p>
                </div>

                <div
                  id="register"
                  className="rounded-xl border border-gray-800 bg-gray-900/40 p-6 scroll-mt-28"
                >
                  <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-[#FFB70F]" />
                    Registration
                  </h3>
                  {registrationOpen ? (
                    <div className="space-y-3">
                      <p className="text-gray-300 text-sm">
                        Seats are open
                        {event.seats_remaining != null
                          ? ` — ${event.seats_remaining} remaining`
                          : ""}
                        . Fill in your details to complete registration
                        {Number(event.fee_inr || 0) > 0
                          ? " and pay securely"
                          : " (free)"}
                        .
                      </p>
                      <Button
                        asChild
                        className="bg-[#FFB70F] hover:bg-[#e0a00d] text-black"
                      >
                        <Link
                          href={`/events/${event.slug || slug}/register`}
                        >
                          Register now — {formatEventFee(event.fee_inr)}
                        </Link>
                      </Button>
                    </div>
                  ) : isFull ? (
                    <p className="text-amber-300/90 text-sm">
                      This event is at full capacity. Please check back or
                      contact the academy for waitlist options.
                    </p>
                  ) : registrationClosed ? (
                    <p className="text-gray-400 text-sm">
                      Registration is currently closed for this event.
                    </p>
                  ) : (
                    <p className="text-gray-400 text-sm">
                      Registration is not available at this time.
                    </p>
                  )}
                </div>
              </div>

              <aside className="space-y-4">
                <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 space-y-4">
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {formatEventFee(event.fee_inr)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {Number(event.fee_inr || 0) > 0
                        ? "Registration fee"
                        : "Free event"}
                    </p>
                  </div>

                  {formatWhen(event.start_at) ? (
                    <p className="text-sm text-gray-300 flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-[#FFB70F] shrink-0 mt-0.5" />
                      <span>
                        <span className="text-gray-500 block text-xs uppercase mb-0.5">
                          Starts
                        </span>
                        {formatWhen(event.start_at)}
                      </span>
                    </p>
                  ) : null}
                  {formatWhen(event.end_at) ? (
                    <p className="text-sm text-gray-300 flex items-start gap-2">
                      <Clock className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                      <span>
                        <span className="text-gray-500 block text-xs uppercase mb-0.5">
                          Ends
                        </span>
                        {formatWhen(event.end_at)}
                      </span>
                    </p>
                  ) : null}
                  {event.venue || event.venue_address ? (
                    <p className="text-sm text-gray-300 flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-[#FFB70F] shrink-0 mt-0.5" />
                      <span>
                        {event.venue ? (
                          <span className="block font-medium">{event.venue}</span>
                        ) : null}
                        {event.venue_address ? (
                          <span className="text-gray-400">
                            {event.venue_address}
                          </span>
                        ) : null}
                      </span>
                    </p>
                  ) : null}
                  {event.branch_name ? (
                    <p className="text-sm text-gray-400">
                      Branch: {event.branch_name}
                    </p>
                  ) : null}
                  {event.capacity != null ? (
                    <p className="text-sm text-gray-300 flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-500" />
                      Capacity {event.capacity}
                      {event.seats_remaining != null
                        ? ` · ${event.seats_remaining} left`
                        : ""}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-500" />
                      Unlimited seats
                    </p>
                  )}

                  {registrationOpen ? (
                    <Button
                      asChild
                      className="w-full bg-[#FFB70F] hover:bg-[#e0a00d] text-black"
                    >
                      <a href="#register">Register now</a>
                    </Button>
                  ) : isFull ? (
                    <Button
                      disabled
                      className="w-full bg-gray-800 text-gray-400"
                    >
                      Sold out
                    </Button>
                  ) : (
                    <Button
                      disabled
                      className="w-full bg-gray-800 text-gray-400"
                    >
                      Registration closed
                    </Button>
                  )}
                </div>

                <p className="text-xs text-gray-500 text-center">
                  Need help?{" "}
                  <Link
                    href="/request-callback"
                    className="text-[#FFB70F] hover:underline"
                  >
                    Request a callback
                  </Link>
                  {" · "}
                  <Link
                    href="/events/my-registrations"
                    className="text-[#FFB70F] hover:underline"
                  >
                    My registrations
                  </Link>
                </p>
              </aside>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
