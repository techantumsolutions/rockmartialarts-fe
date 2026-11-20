"use client"

import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { SiteLoader } from "@/components/ui/SiteLoader"

/**
 * Soft page enter + transparent platform loader until the new route paints.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [enterKey, setEnterKey] = useState(0)
  const [showLoader, setShowLoader] = useState(false)

  useEffect(() => {
    setEnterKey((k) => k + 1)
    setShowLoader(true)
    const t = window.setTimeout(() => setShowLoader(false), 420)
    return () => window.clearTimeout(t)
  }, [pathname])

  return (
    <>
      {showLoader ? (
        <div
          className="pointer-events-none fixed inset-0 z-[99990] grid place-items-center bg-transparent"
          aria-hidden
        >
          <SiteLoader mode="full" label="Loading" />
        </div>
      ) : null}
      <div key={enterKey} className="page-enter content-stagger" data-pathname={pathname}>
        {children}
      </div>
    </>
  )
}
