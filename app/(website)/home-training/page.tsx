import type { Metadata } from "next"
import HomeTrainingPublicForm from "@/components/training-requests/HomeTrainingPublicForm"

export const metadata: Metadata = {
  title: "Home Training Request | Rock Martial Arts",
  description:
    "Request personalized home martial arts training with Rock Martial Arts Academy.",
}

export default function HomeTrainingPage() {
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
              Home Training
            </h1>
            <p className="text-gray-200 text-lg">
              Prefer to train at home? Tell us about your goals, location, and schedule — we will
              assign a coach and get back to you.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-[#171A26]">
        <div className="container mx-auto px-4 max-w-7xl">
          <HomeTrainingPublicForm />
        </div>
      </section>
    </main>
  )
}
