import type { Metadata } from "next"
import Link from "next/link"
import ResidentialTrainingPublicForm from "@/components/training-requests/ResidentialTrainingPublicForm"

export const metadata: Metadata = {
  title: "Residential Training Request | Rock Martial Arts",
  description:
    "Request residential martial arts training packages with accommodation and food at Rock Martial Arts Academy.",
}

export default function ResidentialTrainingPage() {
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
              Residential Training
            </h1>
            <p className="text-gray-200 text-lg">
              Choose a residential package, share participant details, and optionally pay the deposit
              online. Looking for our published camp event?{" "}
              <Link href="/residential-camp" className="text-[#FFB70F] hover:underline">
                Open Residential Camp
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="site-content px-0 sm:px-1">
          <ResidentialTrainingPublicForm />
        </div>
      </section>
    </main>
  )
}
