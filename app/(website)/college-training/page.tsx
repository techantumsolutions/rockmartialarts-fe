import type { Metadata } from "next"
import CollegeTrainingPublicForm from "@/components/training-requests/CollegeTrainingPublicForm"

export const metadata: Metadata = {
  title: "College Training Request | Rock Martial Arts",
  description:
    "Request on-campus martial arts and self-defense training for your college with Rock Martial Arts Academy.",
}

export default function CollegeTrainingPage() {
  return (
    <main className="min-h-screen">
      <section
        className="relative py-20 md:py-28 bg-cover bg-center"
        style={{ backgroundImage: "url(/assets/img/banner.jpg)" }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="site-content relative z-10 px-0 sm:px-1">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold text-white uppercase mb-4">
              College Training
            </h1>
            <p className="text-gray-200 text-lg">
              Bring structured martial arts and self-defense programs to your campus. Share college
              details, participant information, and schedule — we will assign a coach and follow up.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="site-content px-0 sm:px-1">
          <CollegeTrainingPublicForm />
        </div>
      </section>
    </main>
  )
}
