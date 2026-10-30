"use client"

import { MapPin, Phone, Mail, Clock, ExternalLink } from "lucide-react"
import { BranchData, formatAddress, formatOperationalTimingsForDisplay } from "./types"

interface BranchInfoCardsProps {
  branch: BranchData
}

function buildMapsUrl(addr: BranchData["branch"]): string {
  if (!addr?.address) return ""
  const parts = [
    addr.address.line1,
    addr.address.area,
    addr.address.city,
    addr.address.state,
    addr.address.pincode,
    addr.address.country,
  ].filter(Boolean)
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(", "))}`
}

/**
 * Quick info bar: address, phone, email, working hours, map link in modern cards.
 */
export function BranchInfoCards({ branch }: BranchInfoCardsProps) {
  const addr = branch.branch?.address
  const fullAddress = formatAddress(addr)
  const phone = branch.branch?.phone
  const email = branch.branch?.email
  const timings = branch.operational_details?.timings ?? []
  const hoursText = formatOperationalTimingsForDisplay(timings)
  const mapUrl = buildMapsUrl(branch.branch)

  const cards = [
    fullAddress && {
      icon: MapPin,
      label: "Address",
      value: fullAddress,
      href: mapUrl,
    },
    phone && { icon: Phone, label: "Phone", value: phone, href: `tel:${phone}` },
    email && { icon: Mail, label: "Email", value: email, href: `mailto:${email}` },
    hoursText && {
      icon: Clock,
      label: "Working Hours",
      value: hoursText,
      href: undefined,
    },
    mapUrl && {
      icon: ExternalLink,
      label: "View on Map",
      value: "Open in Google Maps",
      href: mapUrl,
    },
  ].filter(Boolean) as Array<{ icon: typeof MapPin; label: string; value: string; href?: string }>

  if (cards.length === 0) return null

  return (
    <section className="py-8 md:py-10 bg-[#171A26] relative z-10">
      <div className="container mx-auto px-4 max-w-7xl">
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
          data-aos="fade-up"
          data-aos-duration="600"
          data-aos-once="true"
          data-aos-offset="120"
        >
          {cards.map((item) => {
            const Icon = item.icon
            const content = (
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 h-full flex flex-col gap-3 hover:border-[#FFB70F]/50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-[#FFB70F]/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[#FFB70F]" />
                </div>
                <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  {item.label}
                </span>
                <span className="text-white text-sm leading-relaxed break-words">
                  {item.value}
                </span>
              </div>
            )
            if (item.href) {
              return (
                <a
                  key={item.label}
                  href={item.href}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                  rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="block h-full"
                >
                  {content}
                </a>
              )
            }
            return <div key={item.label}>{content}</div>
          })}
        </div>
      </div>
    </section>
  )
}
