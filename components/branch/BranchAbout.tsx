"use client"

import { BranchData, getBranchName } from "./types"

interface BranchAboutProps {
  branch: BranchData
  aboutImageUrl?: string | null
}

/**
 * About the branch: description (if any), two-column layout with image.
 */
export function BranchAbout({ branch, aboutImageUrl }: BranchAboutProps) {
  const name = getBranchName(branch)
  const description =
    (branch as BranchData & { description?: string }).description ||
    `Welcome to ${name}, a Rock Martial Arts Academy branch. We offer expert-led training in a supportive environment. Visit us to start your martial arts journey.`

  return (
    <section className="py-16 md:py-20 relative z-10">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div
            className="order-2 lg:order-1"
            data-aos="fade-right"
            data-aos-duration="600"
            data-aos-once="true"
            data-aos-offset="120"
          >
            <p className="text-[#FFB70F] uppercase tracking-widest text-sm mb-2">
              About this branch
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              {name}
            </h2>
            <p className="text-gray-300 leading-relaxed whitespace-pre-line">
              {description}
            </p>
          </div>
          <div
            className="order-1 lg:order-2 overflow-hidden rounded-xl"
            data-aos="fade-left"
            data-aos-duration="600"
            data-aos-once="true"
            data-aos-offset="120"
          >
            {aboutImageUrl ? (
              <img
                src={aboutImageUrl}
                alt={`${name} branch`}
                className="w-full h-auto object-cover max-h-[400px]"
              />
            ) : (
              <div
                className="w-full aspect-[4/3] bg-gray-800 rounded-xl bg-cover bg-center"
                style={{ backgroundImage: "url(/assets/img/courses/tr_yourself.png)" }}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
