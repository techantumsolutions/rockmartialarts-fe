"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { getHeaderActionsForRole, type DashboardRole } from "@/lib/dashboard-config"
import add_icon from "@/public/images/add_icon.png"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"

interface HeaderProps {
  title: string
  role: DashboardRole
  children?: React.ReactNode
}

export default function Header({ title, role, children }: HeaderProps) {
  const router = useRouter()
  const actions = getHeaderActionsForRole(role)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollArrows = useCallback(() => {
    const el = scrollRef.current
    if (!el) {
      setCanScrollLeft(false)
      setCanScrollRight(false)
      return
    }
    const { scrollLeft, scrollWidth, clientWidth } = el
    setCanScrollLeft(scrollLeft > 2)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    updateScrollArrows()
    const onScroll = () => updateScrollArrows()
    el.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", updateScrollArrows)

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateScrollArrows) : null
    ro?.observe(el)

    // Recheck after fonts/images settle
    const t = window.setTimeout(updateScrollArrows, 100)

    return () => {
      el.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", updateScrollArrows)
      ro?.disconnect()
      window.clearTimeout(t)
    }
  }, [updateScrollArrows, actions.length])

  const scrollByAmount = (direction: -1 | 1) => {
    const el = scrollRef.current
    if (!el) return
    const amount = Math.max(140, Math.floor(el.clientWidth * 0.7))
    el.scrollBy({ left: direction * amount, behavior: "smooth" })
  }

  const actionButtons = actions.map((action) => (
    <Button
      key={action.path}
      variant="outline"
      className="flex items-center gap-1 sm:gap-2 bg-transparent text-sm min-h-[48px] sm:min-h-[40px] shrink-0"
      onClick={() => router.push(action.path)}
    >
      <img src={add_icon.src} alt="" className="w-8 h-8" />
      <span className="hidden sm:inline">{action.label}</span>
      <span className="sm:hidden">{action.shortLabel || action.label}</span>
    </Button>
  ))

  return (
    <div className="flex flex-col lg:flex-row justify-between items-start py-4 sm:py-6 lg:py-8 mb-4 lg:items-center gap-4">
      <h1 className="text-xl sm:text-2xl font-medium text-[var(--brand-dark)]">{title}</h1>

      <div className="flex flex-col sm:flex-row sm:flex-wrap lg:flex-nowrap items-stretch sm:items-center gap-2 lg:gap-3 text-[var(--brand-muted)] roboto w-full lg:w-auto min-w-0">
        {/* Mobile / tablet: horizontally scrollable action buttons */}
        {actions.length > 0 ? (
          <div className="relative lg:hidden w-full min-w-0">
            {canScrollLeft ? (
              <button
                type="button"
                aria-label="Scroll actions left"
                onClick={() => scrollByAmount(-1)}
                className="absolute left-0 top-1/2 z-10 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm"
              >
                <ChevronLeft className="h-4 w-4 text-gray-700" />
              </button>
            ) : null}

            <div
              ref={scrollRef}
              className={`flex flex-nowrap items-center gap-2 overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
                canScrollLeft ? "pl-10" : "pl-0"
              } ${canScrollRight ? "pr-10" : "pr-0"}`}
            >
              {actionButtons}
            </div>

            {canScrollRight ? (
              <button
                type="button"
                aria-label="Scroll actions right"
                onClick={() => scrollByAmount(1)}
                className="absolute right-0 top-1/2 z-10 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm"
              >
                <ChevronRight className="h-4 w-4 text-gray-700" />
              </button>
            ) : null}
          </div>
        ) : null}

        {/* Desktop: keep buttons in a normal row */}
        {actions.length > 0 ? (
          <div className="hidden lg:flex flex-wrap items-center gap-2 lg:gap-3">
            {actionButtons}
          </div>
        ) : null}

        {children}
      </div>
    </div>
  )
}
