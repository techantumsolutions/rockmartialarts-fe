import type { Metadata } from "next"
import CallbackRequestPublicForm from "@/components/callbacks/CallbackRequestPublicForm"

export const metadata: Metadata = {
  title: "Request a Callback | Rock Martial Arts",
  description:
    "Leave your details and Rock Martial Arts will call you back at a time that works for you.",
}

export default function RequestCallbackPage() {
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
              Request a Callback
            </h1>
            <p className="text-gray-200 text-lg">
              Tell us how to reach you. Our team will call back at your preferred time.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-[#171A26]">
        <div className="container mx-auto px-4 max-w-7xl">
          <CallbackRequestPublicForm />
        </div>
      </section>
    </main>
  )
}
