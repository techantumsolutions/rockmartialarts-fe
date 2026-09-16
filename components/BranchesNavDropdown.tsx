"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { ChevronDown, Building2, Loader2 } from "lucide-react"
import { branchNameToSlug } from "@/lib/branch-slug"

export type BranchItem = {
  id: string
  name?: string
  code?: string
  address?: {
    line1?: string
    area?: string
    city?: string
    state?: string
    pincode?: string
    country?: string
  }
}

/** Second line under branch name: area/locality when set, otherwise city + state */
function formatBranchSecondaryLine(addr: BranchItem["address"]): string {
  if (!addr) return ""
  const area = typeof addr.area === "string" ? addr.area.trim() : ""
  if (area) return area
  return [addr.city, addr.state].filter(Boolean).join(", ")
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

  const displayName = (b: BranchItem) => b.name || b.code || "Branch"

  return (
    <div ref={ref} className={isMobile ? "w-full" : "relative"}>
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
        Branches
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className={
            isMobile
              ? "mt-2 w-full rounded-lg border border-gray-700 bg-[#171A26] py-2 shadow-xl z-50"
              : "absolute left-0 top-full mt-1 min-w-[240px] rounded-lg border border-gray-700 bg-[#171A26] py-2 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200"
          }
          onMouseLeave={isMobile ? undefined : () => setOpen(false)}
        >
          <Link
            href="/branches"
            onClick={() => {
              setOpen(false)
              onNavigate?.()
            }}
            className="flex items-center gap-2 px-4 py-3 hover:bg-white/10 transition-colors text-left border-b border-gray-700 min-h-11"
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
                const secondary = formatBranchSecondaryLine(b.address)
                return (
                  <li key={b.id}>
                    <Link
                      href={`/branches/${branchNameToSlug(displayName(b))}`}
                      onClick={() => {
                        setOpen(false)
                        onNavigate?.()
                      }}
                      className="flex items-start gap-2 px-4 py-3 hover:bg-white/10 transition-colors text-left"
                    >
                      <Building2 className="h-4 w-4 text-[#FFB70F] mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="block font-medium text-white truncate">
                          {displayName(b)}
                        </span>
                        {secondary ? (
                          <span className="block text-xs text-gray-400 truncate mt-0.5">{secondary}</span>
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
