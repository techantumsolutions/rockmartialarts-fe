"use client"

import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

/**
 * Lightweight route enter animation + top progress bar on pathname change.
 * Does not block rendering or data fetching.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [progress, setProgress] = useState(0)
  const [showBar, setShowBar] = useState(false)

  useEffect(() => {
    setShowBar(true)
    setProgress(18)
    const t1 = window.setTimeout(() => setProgress(70), 80)
    const t2 = window.setTimeout(() => setProgress(100), 280)
    const t3 = window.setTimeout(() => {
      setShowBar(false)
      setProgress(0)
    }, 420)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
    }
  }, [pathname])

  return (
    <>
      {showBar ? (
        <div
          className="pointer-events-none fixed left-0 right-0 top-0 z-[100000] h-[2px] bg-transparent"
          aria-hidden
        >
          <div
            className="h-full bg-[#E1BB33] shadow-[0_0_8px_rgba(225,187,51,0.6)] transition-[width] duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}
      <div className="page-enter" data-pathname={pathname}>
        {children}
      </div>
    </>
  )
}
