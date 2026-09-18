import type { Metadata } from "next"
import DemoAvailabilityPublicView from "@/components/demo-sessions/DemoAvailabilityPublicView"

export const metadata: Metadata = {
  title: "Book a Demo Session | Rock Martial Arts",
  description:
    "Browse available demo session slots by branch and course at Rock Martial Arts Academy.",
}

export default function BookDemoPage() {
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
              Demo Sessions
            </h1>
            <p className="text-gray-200 text-lg">
              Pick a branch and course, reserve a seat, and pay the configured demo fee to confirm.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-[#171A26]">
        <div className="container mx-auto px-4 max-w-7xl">
          <DemoAvailabilityPublicView />
        </div>
      </section>
    </main>
  )
}
