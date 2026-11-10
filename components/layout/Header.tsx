"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { getHeaderActionsForRole, type DashboardRole } from "@/lib/dashboard-config"
import add_icon from "@/public/images/add_icon.png"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { useRouter } from "next/navigation"

interface HeaderProps {
  title: string
  role: DashboardRole
  subtitle?: string
  children?: React.ReactNode
}

export default function Header({ title, role, subtitle, children }: HeaderProps) {
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

  const actionButtons = actions.map((action, index) => {
    const isPrimary = index === 0
    return (
      <Button
        key={action.path}
        variant={isPrimary ? "default" : "outline"}
        data-no-action-overlay
        className={
          isPrimary
            ? "flex items-center gap-1.5 sm:gap-2 text-sm min-h-[44px] sm:min-h-[40px] shrink-0 rounded-xl bg-[#E1BB33] hover:bg-[#d4ae2a] text-[#3d3e5c] font-semibold border-transparent shadow-sm"
            : "flex items-center gap-1.5 sm:gap-2 bg-white text-sm min-h-[44px] sm:min-h-[40px] shrink-0 rounded-xl border-gray-200 text-[var(--brand-dark)]"
        }
        onClick={() => router.push(action.path)}
      >
        {isPrimary ? (
          <Plus className="w-4 h-4" aria-hidden />
        ) : (
          <img src={add_icon.src} alt="" className="w-5 h-5 sm:w-6 sm:h-6" />
        )}
        <span className="hidden sm:inline">{action.label}</span>
        <span className="sm:hidden">{action.shortLabel || action.label}</span>
      </Button>
    )
  })

  return (
    <div className="mb-5 flex flex-col items-start justify-between gap-4 lg:mb-6 lg:flex-row lg:items-center">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-[#4F5077] sm:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-[#6B7A99]">{subtitle}</p>
        ) : null}
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap lg:flex-nowrap items-stretch sm:items-center gap-2 lg:gap-3 text-[var(--brand-muted)] roboto w-full lg:w-auto min-w-0">
        {actions.length > 0 ? (
          <div className="relative lg:hidden w-full min-w-0">
            {canScrollLeft ? (
              <button
                type="button"
                aria-label="Scroll actions left"
                data-no-action-overlay
                onClick={() => scrollByAmount(-1)}
                className="absolute left-0 top-1/2 z-10 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white"
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
                data-no-action-overlay
                onClick={() => scrollByAmount(1)}
                className="absolute right-0 top-1/2 z-10 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white"
              >
                <ChevronRight className="h-4 w-4 text-gray-700" />
              </button>
            ) : null}
          </div>
        ) : null}

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
