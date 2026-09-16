"use client"

import Link from "next/link"
import { Phone, Mail, MapPin } from "lucide-react"
import { BranchData, getBranchName, getBranchPhone, getBranchEmail, formatAddress } from "./types"

interface BranchContactProps {
  branch: BranchData
}

/**
 * Contact / Visit section with CTA buttons and details.
 */
export function BranchContact({ branch }: BranchContactProps) {
  const name = getBranchName(branch)
  const phone = getBranchPhone(branch)
  const email = getBranchEmail(branch)
  const address = formatAddress(branch.branch?.address)

  return (
    <section
      className="py-16 md:py-24 bg-[#171A26] relative z-10"
      data-aos="fade-up"
      data-aos-duration="600"
      data-aos-once="true"
    >
      <div className="container mx-auto px-4 max-w-4xl text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Visit this branch
        </h2>
        <p className="text-gray-400 mb-10 max-w-xl mx-auto">
          Ready to start your martial arts journey? Drop by {name} or get in touch.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-6 mb-10">
          {phone && (
            <a
              href={`tel:${phone}`}
              className="inline-flex items-center gap-2 text-gray-300 hover:text-[#FFB70F] transition-colors"
            >
              <Phone className="w-5 h-5" />
              <span>{phone}</span>
            </a>
          )}
          {email && (
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center gap-2 text-gray-300 hover:text-[#FFB70F] transition-colors"
            >
              <Mail className="w-5 h-5" />
              <span>{email}</span>
            </a>
          )}
          {address && (
            <span className="inline-flex items-center gap-2 text-gray-400 text-sm">
              <MapPin className="w-5 h-5 flex-shrink-0" />
              <span className="text-left max-w-xs">{address}</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="inline-block rounded-lg bg-[#FFB70F] px-8 py-4 text-lg font-semibold text-black hover:bg-[#F73322] hover:text-white transition-colors duration-300"
          >
            Register now
          </Link>
          <Link
            href="/branches"
            className="inline-block rounded-lg border-2 border-white px-8 py-4 text-lg font-semibold text-white hover:bg-white hover:text-black transition-colors duration-300"
          >
            All branches
          </Link>
        </div>
      </div>
    </section>
  )
}
