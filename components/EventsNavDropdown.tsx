"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { CalendarDays, ChevronDown } from "lucide-react"

const EVENTS_LINKS = [
  { label: "Browse events", href: "/events" },
  { label: "My registrations", href: "/events/my-registrations" },
] as const

type EventsNavDropdownProps = {
  variant?: "desktop" | "mobile"
  onNavigate?: () => void
}

export function EventsNavDropdown({ variant = "desktop", onNavigate }: EventsNavDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isMobile = variant === "mobile"

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
        aria-label="Events"
      >
        Events
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
              : "absolute left-0 top-full mt-1 min-w-[220px] rounded-lg border border-gray-700 bg-[#171A26] py-2 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200"
          }
          onMouseLeave={isMobile ? undefined : () => setOpen(false)}
        >
          <ul>
            {EVENTS_LINKS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  role="menuitem"
                  onClick={() => {
                    setOpen(false)
                    onNavigate?.()
                  }}
                  className="flex items-start gap-2 px-4 py-3 hover:bg-white/10 transition-colors text-left min-h-11"
                >
                  <CalendarDays className="h-4 w-4 text-[#FFB70F] mt-0.5 flex-shrink-0" />
                  <span className="block font-medium text-white">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
