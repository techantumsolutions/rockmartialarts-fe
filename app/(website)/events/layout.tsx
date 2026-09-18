import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Events, Seminars & Workshops | Rock Martial Arts Academy",
  description:
    "Browse upcoming events, seminars, and workshops at Rock Martial Arts Academy. View venues, fees, and register when seats are open.",
  alternates: { canonical: "/events" },
}

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
