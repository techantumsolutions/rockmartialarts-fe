import type { Metadata } from "next"
import CoachRegistrationPublicForm from "@/components/coaches/CoachRegistrationPublicForm"

export const metadata: Metadata = {
  title: "Become a Coach | Rock Martial Arts",
  description:
    "Apply to join Rock Martial Arts Academy as a coach. Submit your experience, specializations, and service locations for approval.",
}

export default function CoachRegisterPage() {
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
              Become a Coach
            </h1>
            <p className="text-gray-200 text-lg">
              Share your experience and the branches you can serve. Our team will review your
              application before activation.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-[#171A26]">
        <div className="container mx-auto px-4 max-w-7xl">
          <CoachRegistrationPublicForm />
        </div>
      </section>
    </main>
  )
}
