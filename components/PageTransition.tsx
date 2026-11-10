"use client"

import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

/**
 * Route enter animation + top progress bar + brief soft page loader veil.
 * Does not block rendering or data fetching.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [progress, setProgress] = useState(0)
  const [showBar, setShowBar] = useState(false)
  const [veil, setVeil] = useState(false)
  const [enterKey, setEnterKey] = useState(0)

  useEffect(() => {
    setShowBar(true)
    setVeil(true)
    setProgress(18)
    setEnterKey((k) => k + 1)
    const t1 = window.setTimeout(() => setProgress(70), 80)
    const t2 = window.setTimeout(() => setProgress(100), 280)
    const t3 = window.setTimeout(() => {
      setShowBar(false)
      setProgress(0)
    }, 420)
    const t4 = window.setTimeout(() => setVeil(false), 260)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      window.clearTimeout(t4)
    }
  }, [pathname])

  return (
    <>
      {showBar ? (
        <div
          className="pointer-events-none fixed left-0 right-0 top-0 z-[100000] h-[3px] bg-transparent"
          aria-hidden
        >
          <div
            className="h-full bg-[#E1BB33] shadow-[0_0_10px_rgba(225,187,51,0.65)] transition-[width] duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}
      {veil ? (
        <div
          className="pointer-events-none fixed inset-0 z-[99999] bg-white/35 backdrop-blur-[1px] transition-opacity duration-200"
          aria-hidden
        >
          <div className="absolute left-1/2 top-[42%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
            <div className="relative h-10 w-10">
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-[#E1BB33]/25 border-t-[#E1BB33]" />
              <span className="martial-loader-kick absolute inset-0 flex items-center justify-center text-lg" aria-hidden>
                🥋
              </span>
            </div>
          </div>
        </div>
      ) : null}
      <div key={enterKey} className="page-enter content-stagger" data-pathname={pathname}>
        {children}
      </div>
    </>
  )
}
