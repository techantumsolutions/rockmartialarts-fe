"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { ChevronDown, GraduationCap, Loader2 } from "lucide-react"
import { toCategoryHref } from "@/lib/category-slug"

export type CategoryNavItem = {
  id: string
  name?: string
  slug?: string
}

type CoursesNavDropdownProps = {
  variant?: "desktop" | "mobile"
  onNavigate?: () => void
}

export function CoursesNavDropdown({ variant = "desktop", onNavigate }: CoursesNavDropdownProps) {
  const [categories, setCategories] = useState<CategoryNavItem[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const isMobile = variant === "mobile"

  const fetchCategories = async () => {
    if (categories.length > 0) return
    setLoading(true)
    try {
      const res = await fetch("/api/backend/categories/public/nav", {
        headers: { "Content-Type": "application/json" },
      })
      const data = await res.json().catch(() => ({}))
      const list = data.categories ?? []
      setCategories(Array.isArray(list) ? list : [])
    } catch {
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) fetchCategories()
  }, [open])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [])

  const displayName = (c: CategoryNavItem) => c.name || "Category"

  return (
    <div ref={ref} className={isMobile ? "w-full" : "relative"}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={isMobile ? undefined : () => setOpen(true)}
        className={
          isMobile
            ? "flex w-full items-center justify-between text-lg font-medium uppercase tracking-wide text-white py-2 hover:text-[#FFB70F] transition-colors min-h-11"
            : "flex items-center gap-1 text-sm font-medium uppercase tracking-wide text-white hover:text-[#FFB70F] transition-colors"
        }
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Courses categories"
      >
        Courses
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className={
            isMobile
              ? "mt-2 w-full rounded-lg border border-gray-700 bg-[#171A26] py-2 shadow-xl z-50"
              : "absolute left-0 top-full mt-1 min-w-[240px] rounded-lg border border-gray-700 bg-[#171A26] py-2 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200"
          }
          onMouseLeave={isMobile ? undefined : () => setOpen(false)}
        >
          <Link
            href="/courses"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onNavigate?.()
            }}
            className="flex items-center gap-2 px-4 py-3 hover:bg-white/10 transition-colors text-left border-b border-gray-700 min-h-11"
          >
            <GraduationCap className="h-4 w-4 text-[#FFB70F] flex-shrink-0" />
            <span className="font-medium text-white">View all courses</span>
          </Link>
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading categories...</span>
            </div>
          ) : categories.length === 0 ? (
            <div className="px-4 py-4 text-center text-gray-400 text-sm">
              No categories available
            </div>
          ) : (
            <ul className="max-h-[70vh] overflow-y-auto">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={toCategoryHref(c)}
                    role="menuitem"
                    onClick={() => {
                      setOpen(false)
                      onNavigate?.()
                    }}
                    className="flex items-start gap-2 px-4 py-3 hover:bg-white/10 transition-colors text-left min-h-11"
                  >
                    <GraduationCap className="h-4 w-4 text-[#FFB70F] mt-0.5 flex-shrink-0" />
                    <span className="block font-medium text-white truncate">
                      {displayName(c)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
