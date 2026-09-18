import type { Metadata } from "next"
import CorporateTrainingPublicForm from "@/components/training-requests/CorporateTrainingPublicForm"

export const metadata: Metadata = {
  title: "Corporate Training Request | Rock Martial Arts",
  description:
    "Request on-site martial arts, self-defense, and wellness training for your organization with Rock Martial Arts Academy.",
}

export default function CorporateTrainingPage() {
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
              Corporate Training
            </h1>
            <p className="text-gray-200 text-lg">
              Bring structured self-defense and wellness programs to your workplace. Share
              organization details, employee count, and schedule — we will assign a coach and follow
              up.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-[#171A26]">
        <div className="container mx-auto px-4 max-w-7xl">
          <CorporateTrainingPublicForm />
        </div>
      </section>
    </main>
  )
}
