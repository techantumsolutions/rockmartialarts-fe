"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { ChevronDown, Building2, Loader2 } from "lucide-react"
import { branchNameToSlug } from "@/lib/branch-slug"
import { getBranchDisplayLabels } from "@/lib/branchDisplay"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import { usePlatformBranding } from "@/contexts/PlatformBrandingContext"

export type BranchItem = {
  id: string
  name?: string
  code?: string
  slug?: string
  partner_org_id?: string | null
  partner_org_name?: string | null
  brand_name?: string | null
  logo_url?: string | null
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
    address?: BranchItem["address"]
  }
  site_branding?: { logo_url?: string | null; org_name?: string | null } | null
}

type BranchesNavDropdownProps = {
  variant?: "desktop" | "mobile"
  onNavigate?: () => void
}

export function BranchesNavDropdown({ variant = "desktop", onNavigate }: BranchesNavDropdownProps) {
  const [branches, setBranches] = useState<BranchItem[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { logoUrl: platformLogoUrl } = usePlatformBranding()

  const isMobile = variant === "mobile"

  const fetchBranches = async () => {
    if (branches.length > 0) return
    setLoading(true)
    try {
      const res = await fetch("/api/branches/public", { headers: { "Content-Type": "application/json" } })
      const data = await res.json().catch(() => ({}))
      const list = data.branches ?? data ?? []
      setBranches(Array.isArray(list) ? list : [])
    } catch {
      setBranches([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) fetchBranches()
  }, [open])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div
      ref={ref}
      className={isMobile ? "w-full" : "relative"}
      onMouseLeave={isMobile ? undefined : () => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={isMobile ? undefined : () => setOpen(true)}
        className={
          isMobile
            ? "flex w-full items-center justify-between text-lg font-medium uppercase tracking-wide text-white py-2 hover:text-[#FFB70F] transition-colors"
            : "flex items-center gap-1 text-sm font-medium uppercase tracking-wide text-white hover:text-[#FFB70F] transition-colors"
        }
        aria-expanded={open}
        aria-haspopup="true"
      >
        Academies
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className={
            isMobile
              ? "mt-2 w-full rounded-lg border border-[#383D4D] bg-[#292E40] py-2 shadow-xl z-50"
              : "absolute left-0 top-full min-w-[280px] max-w-[340px] rounded-lg border border-[#383D4D] bg-[#292E40] py-2 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200"
          }
        >
          <Link
            href="/branches"
            onClick={() => {
              setOpen(false)
              onNavigate?.()
            }}
            className="flex items-center gap-2 px-4 py-3 hover:bg-white/10 transition-colors text-left border-b border-[#383D4D] min-h-11"
          >
            <Building2 className="h-4 w-4 text-[#FFB70F] flex-shrink-0" />
            <span className="font-medium text-white">View all branches</span>
          </Link>
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading branches...</span>
            </div>
          ) : branches.length === 0 ? (
            <div className="px-4 py-4 text-center text-gray-400 text-sm">
              No branches available
            </div>
          ) : (
            <ul className="max-h-[70vh] overflow-y-auto">
              {branches.map((b) => {
                const labels = getBranchDisplayLabels(b)
                const hrefSlug = (b.slug || branchNameToSlug(labels.placeName)).trim()
                const logo =
                  resolvePublicAssetUrl(labels.logoUrl || "") || platformLogoUrl || ""
                return (
                  <li key={b.id}>
                    <Link
                      href={`/branches/${encodeURIComponent(hrefSlug)}`}
                      onClick={() => {
                        setOpen(false)
                        onNavigate?.()
                      }}
                      className="flex items-start gap-2.5 px-4 py-3 hover:bg-white/10 transition-colors text-left"
                      title={labels.title}
                    >
                      {logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={logo}
                          alt=""
                          className="mt-0.5 h-8 w-8 flex-shrink-0 rounded-md object-contain bg-white/5 ring-1 ring-white/10"
                        />
                      ) : (
                        <Building2 className="h-4 w-4 text-[#FFB70F] mt-1.5 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="block font-medium text-white truncate leading-snug">
                          {labels.brandName}
                        </span>
                        {labels.poweredByLine ? (
                          <span className="block text-[10px] leading-tight text-gray-400 normal-case tracking-normal mt-0.5 truncate">
                            {labels.poweredByLine}
                          </span>
                        ) : null}
                        {!labels.poweredByLine && labels.locationName ? (
                          <span className="block text-xs text-gray-400 truncate mt-0.5">
                            {labels.locationName}
                          </span>
                        ) : labels.poweredByLine &&
                          labels.locationName &&
                          labels.locationName.toLowerCase() !== labels.brandName.toLowerCase() ? (
                          <span className="block text-[11px] text-gray-500 truncate mt-0.5">
                            {labels.locationName}
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export { BranchesNavDropdown as AcademiesNavDropdown }
