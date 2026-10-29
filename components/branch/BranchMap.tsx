"use client"

import { BranchData, formatAddress } from "./types"

interface BranchMapProps {
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

function buildEmbedUrl(addr: BranchData["branch"]): string {
  if (!addr?.address) return ""
  const q = [addr.address.line1, addr.address.city, addr.address.state, addr.address.country]
    .filter(Boolean)
    .join(", ")
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&output=embed`
}

/**
 * Google Map section if address exists.
 */
export function BranchMap({ branch }: BranchMapProps) {
  const addr = branch.branch?.address
  const mapLink = (branch as BranchData & { map_link?: string }).map_link || buildMapsUrl(branch.branch)
  const embedUrl = buildEmbedUrl(branch.branch)
  const fullAddress = formatAddress(addr)

  if (!fullAddress && !mapLink) return null

  return (
    <section
      className="py-8 md:py-10 bg-[#171A26] relative z-10"
      data-aos="fade-up"
      data-aos-duration="600"
      data-aos-once="true"
    >
      <div className="container mx-auto px-4 max-w-7xl">
        <h2 className="text-3xl md:text-4xl font-bold text-[#FFB70F] mb-8 text-center">
          Find Us
        </h2>
        <div className="rounded-xl overflow-hidden border border-gray-800 bg-gray-900/50">
          {embedUrl ? (
            <iframe
              title="Branch location"
              src={embedUrl}
              width="100%"
              height="400"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full"
            />
          ) : (
            <div className="h-[400px] flex items-center justify-center bg-gray-800">
              <a
                href={mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FFB70F] hover:text-white font-medium"
              >
                Open in Google Maps
              </a>
            </div>
          )}
          {fullAddress && (
            <div className="p-4 md:p-6 text-gray-300 text-sm">
              <strong className="text-white">Address:</strong> {fullAddress}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
