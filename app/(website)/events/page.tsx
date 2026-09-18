"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, Calendar, Loader2, MapPin, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SafeImage } from "@/components/ui/safe-image"
import {
  ACADEMY_EVENT_TYPES,
  academyEventAPI,
  academyEventTypeLabel,
  formatEventFee,
  type AcademyEvent,
} from "@/lib/academyEventAPI"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

function formatWhen(iso?: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export default function EventsCataloguePage() {
  const [events, setEvents] = useState<AcademyEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [eventType, setEventType] = useState("all")

  useEffect(() => {
    setLoading(true)
    academyEventAPI
      .listPublic({
        search: search || undefined,
        event_type: eventType,
      })
      .then((data) => setEvents(Array.isArray(data.events) ? data.events : []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [search, eventType])

  return (
    <main className="min-h-screen bg-[#171A26]">
      <section
        className="relative py-20 md:py-28 bg-cover bg-center"
        style={{ backgroundImage: "url(/assets/img/banner.jpg)" }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="container relative z-10 mx-auto px-4 max-w-7xl">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold text-white uppercase mb-4">
              Events, Seminars &amp; Workshops
            </h1>
            <p className="text-gray-200 text-lg">
              Join upcoming academy sessions. Browse details, venues, and
              register when seats are open.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-[#171A26]">
        <div className="container mx-auto px-4 max-w-7xl space-y-8">
          <div className="flex flex-col md:flex-row gap-3 max-w-3xl">
            <form
              className="flex flex-col sm:flex-row gap-2 flex-1"
              onSubmit={(e) => {
                e.preventDefault()
                setSearch(searchInput.trim())
              }}
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search events…"
                  className="pl-9 bg-gray-950 border-gray-700 text-white"
                />
              </div>
              <Button
                type="submit"
                className="bg-[#FFB70F] hover:bg-[#e0a00d] text-black"
              >
                Search
              </Button>
            </form>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger className="w-full md:w-44 bg-gray-950 border-gray-700 text-white">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {ACADEMY_EVENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-[#FFB70F]" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="mb-4">
                No published events yet. Check back soon.
              </p>
              <Link
                href="/"
                className="text-[#FFB70F] hover:text-white font-medium"
              >
                Back to home
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {events.map((ev) => (
                <Link
                  key={ev.id}
                  href={`/events/${ev.slug || ev.id}`}
                  className="group block rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden hover:border-[#FFB70F] transition-colors"
                >
                  <div className="aspect-[4/3] bg-gray-800 overflow-hidden">
                    <SafeImage
                      src={ev.thumbnail_url || undefined}
                      alt={ev.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-5">
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                      {academyEventTypeLabel(ev.event_type)}
                    </p>
                    <h2 className="text-xl font-bold text-[#FFB70F] group-hover:text-white transition-colors mb-2">
                      {ev.title}
                    </h2>
                    {formatWhen(ev.start_at) ? (
                      <p className="text-gray-400 text-sm flex items-center gap-1.5 mb-1">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        {formatWhen(ev.start_at)}
                      </p>
                    ) : null}
                    {ev.venue || ev.branch_name ? (
                      <p className="text-gray-500 text-sm flex items-center gap-1.5 mb-2">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        {ev.venue || ev.branch_name}
                      </p>
                    ) : null}
                    {ev.short_description ? (
                      <p className="text-gray-400 text-sm line-clamp-2">
                        {ev.short_description}
                      </p>
                    ) : null}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-sm text-white font-medium">
                        {formatEventFee(ev.fee_inr)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[#FFB70F] font-medium text-sm group-hover:gap-2 transition-all">
                        Details <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
