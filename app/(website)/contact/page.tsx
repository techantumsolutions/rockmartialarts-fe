"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Loader2, MapPin, Phone, Mail, Building2 } from "lucide-react"
import { branchNameToSlug } from "@/lib/branch-slug"

type Branch = {
  id: string
  name?: string
  code?: string
  email?: string
  phone?: string
  address?: {
    line1?: string
    area?: string
    city?: string
    state?: string
    pincode?: string
    country?: string
  }
  branch?: {
    name?: string
    code?: string
    email?: string
    phone?: string
    address?: {
      line1?: string
      area?: string
      city?: string
      state?: string
      pincode?: string
      country?: string
    }
  }
  settings?: { active?: boolean }
  is_active?: boolean
}

function getBranchName(b: Branch): string {
  return b.branch?.name || b.name || b.code || "Branch"
}

function getBranchEmail(b: Branch): string | undefined {
  return b.branch?.email || b.email
}

function getBranchPhone(b: Branch): string | undefined {
  return b.branch?.phone || b.phone
}

function getBranchAddress(b: Branch) {
  return b.branch?.address || b.address
}

function formatAddress(addr: Branch["address"]): string {
  if (!addr) return ""
  const parts = [addr.line1, addr.area, addr.city, addr.state, addr.pincode, addr.country].filter(Boolean)
  return parts.join(", ")
}

function formatLocation(addr: Branch["address"]): string {
  if (!addr) return ""
  return [addr.city, addr.state].filter(Boolean).join(", ")
}

export default function ContactPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/branches/public", { headers: { "Content-Type": "application/json" } })
      .then((res) => (res.ok ? res.json() : Promise.resolve({ branches: [] })))
      .then((data) => {
        const list = data.branches ?? data ?? []
        setBranches(Array.isArray(list) ? list : [])
      })
      .catch(() => setBranches([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="min-h-screen bg-[#171A26]">
      {/* Hero */}
      <section
        className="relative py-20 md:py-28 bg-cover bg-center"
        style={{ backgroundImage: "url(/assets/img/banner.jpg)" }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="container relative z-10 mx-auto px-4 max-w-7xl">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold text-white uppercase mb-4">
              Contact Us
            </h1>
            <p className="text-gray-200 text-lg">
              Find a Rock Martial Arts branch near you. Visit us to begin your martial arts journey.
            </p>
            <Link
              href="/request-callback"
              className="inline-block mt-6 rounded-[10px] bg-[#FFB70F] px-5 py-3.5 text-base font-medium text-black transition-colors hover:bg-[#F73322] hover:text-white"
            >
              Request a callback
            </Link>
          </div>
        </div>
      </section>

      {/* Branches list */}
      <section className="py-16 md:py-20 bg-[#171A26]">
        <div className="container mx-auto px-4 max-w-7xl">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-[#FFB70F]" />
            </div>
          ) : branches.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <p className="mb-4 text-lg">No branches available yet. Check back soon.</p>
              <Link href="/" className="text-[#FFB70F] hover:text-white font-medium">
                Back to home
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {branches.map((b) => {
                const addr = getBranchAddress(b)
                const location = formatLocation(addr)
                const fullAddress = formatAddress(addr)
                const phone = getBranchPhone(b)
                const email = getBranchEmail(b)

                return (
                  <div
                    key={b.id}
                    className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 hover:border-[#FFB70F] transition-colors"
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-12 h-12 rounded-lg bg-[#FFB70F]/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6 text-[#FFB70F]" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-[#FFB70F]">
                          {getBranchName(b)}
                        </h2>
                        {location && (
                          <p className="text-gray-400 text-sm flex items-center gap-1 mt-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {location}
                          </p>
                        )}
                      </div>
                    </div>

                    {fullAddress && (
                      <div className="flex items-start gap-2 mb-3 text-gray-300 text-sm">
                        <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                        <span>{fullAddress}</span>
                      </div>
                    )}

                    {phone && (
                      <div className="flex items-center gap-2 mb-3 text-gray-300 text-sm">
                        <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <a href={`tel:${phone}`} className="hover:text-[#FFB70F] transition-colors">
                          {phone}
                        </a>
                      </div>
                    )}

                    {email && (
                      <div className="flex items-center gap-2 mb-3 text-gray-300 text-sm">
                        <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <a href={`mailto:${email}`} className="hover:text-[#FFB70F] transition-colors">
                          {email}
                        </a>
                      </div>
                    )}

                    <Link
                      href={`/branches/${branchNameToSlug(getBranchName(b))}`}
                      className="inline-block mt-4 text-sm font-medium text-[#FFB70F] hover:text-white transition-colors"
                    >
                      View branch details →
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
