"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"

export function RouteScrollToTop() {
  const pathname = usePathname()
  const isPopStateRef = useRef(false)
  const lastPathnameRef = useRef<string | null>(null)

  useEffect(() => {
    // Disable clumsy automatic browser scroll restoration on unmounted DOM
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual"
    }

    const handlePopState = () => {
      isPopStateRef.current = true
    }

    window.addEventListener("popstate", handlePopState)
    return () => {
      window.removeEventListener("popstate", handlePopState)
    }
  }, [])

  // Save scroll position for the current path as user scrolls
  useEffect(() => {
    let timeoutId: any
    const handleScroll = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        if (typeof window === "undefined") return
        try {
          const y = window.scrollY
          sessionStorage.setItem(`rma_scroll_${window.location.pathname}`, String(y))
        } catch {
          /* ignore */
        }
      }, 50)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  useEffect(() => {
    const isPop = isPopStateRef.current
    isPopStateRef.current = false

    // Save scroll of previous page before switching (only if scrolled down to avoid overwriting)
    if (lastPathnameRef.current && lastPathnameRef.current !== pathname) {
      try {
        if (window.scrollY > 0) {
          sessionStorage.setItem(`rma_scroll_${lastPathnameRef.current}`, String(window.scrollY))
        }
      } catch {
        /* ignore */
      }
    }
    lastPathnameRef.current = pathname

    // If there is an anchor hash, scroll to that element
    if (typeof window !== "undefined" && window.location.hash) {
      const el = document.querySelector(window.location.hash)
      if (el) {
        el.scrollIntoView({ behavior: "smooth" })
        return
      }
    }

    const scrollToTarget = (y: number) => {
      window.scrollTo({ top: y, left: 0, behavior: "instant" as ScrollBehavior })
      requestAnimationFrame(() => {
        window.scrollTo({ top: y, left: 0, behavior: "instant" as ScrollBehavior })
      })
      setTimeout(() => {
        window.scrollTo({ top: y, left: 0, behavior: "instant" as ScrollBehavior })
      }, 50)
    }

    if (isPop) {
      let savedY = 0
      try {
        const stored =
          sessionStorage.getItem(`rma_scroll_${pathname}`) ||
          (pathname === "/courses" ? sessionStorage.getItem("rma_courses_scroll_y") : null)
        if (stored !== null) {
          const parsed = parseInt(stored, 10)
          if (!isNaN(parsed) && parsed > 0) {
            savedY = parsed
          }
        }
      } catch {
        /* ignore */
      }

      if (savedY > 0) {
        // Return to the specific section from where user went forward
        scrollToTarget(savedY)
        setTimeout(() => scrollToTarget(savedY), 150)
        setTimeout(() => scrollToTarget(savedY), 350)
      } else {
        // Was at the top or no position recorded -> ALWAYS scroll to top
        scrollToTarget(0)
      }
    } else {
      // Normal navigation or redirect -> ALWAYS scroll to top
      scrollToTarget(0)
    }
  }, [pathname])

  return null
}
