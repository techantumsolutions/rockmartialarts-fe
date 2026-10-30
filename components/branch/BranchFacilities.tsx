"use client"

import { Dumbbell, Wifi, ParkingCircle, ShowerHead } from "lucide-react"
import { BranchData } from "./types"

const facilityIcons: Record<string, typeof Dumbbell> = {
  "Accessories / Equipment": Dumbbell,
  "Wi-Fi": Wifi,
  "Parking": ParkingCircle,
  "Showers": ShowerHead,
}

/**
 * Facilities / features section when available in branch data.
 */
export function BranchFacilities({ branch }: { branch: BranchData }) {
  const facilities = (branch as BranchData & { facilities?: string[] }).facilities ?? []
  const accessoriesAvailable = branch.assignments?.accessories_available ?? false

  const items: string[] = [...facilities]
  if (accessoriesAvailable && !items.some((f) => f.toLowerCase().includes("accessor"))) {
    items.push("Accessories / Equipment")
  }

  if (items.length === 0) return null

  return (
    <section
      className="py-8 md:py-10 bg-[#171A26] relative z-10"
      data-aos="fade-up"
      data-aos-duration="600"
      data-aos-once="true"
    >
      <div className="container mx-auto px-4 max-w-7xl">
        <h2 className="text-3xl md:text-4xl font-bold text-[#FFB70F] mb-10 text-center">
          Facilities &amp; Features
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((label) => {
            const Icon = facilityIcons[label] || Dumbbell
            return (
              <div
                key={label}
                className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 flex flex-col items-center text-center gap-2 hover:border-[#FFB70F]/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-[#FFB70F]/10 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-[#FFB70F]" />
                </div>
                <span className="text-white text-sm font-medium">{label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
