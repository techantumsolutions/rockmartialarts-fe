"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { SectionLoader } from "@/components/ui/SectionLoader"

/**
 * Defers mounting heavy below-the-fold sections until near viewport.
 * Shows SectionLoader until visible.
 */
export function LazySection({
  children,
  className,
  rootMargin = "200px",
  minHeight,
  fallback,
}: {
  children: ReactNode
  className?: string
  rootMargin?: string
  minHeight?: number | string
  fallback?: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || visible) return
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          io.disconnect()
        }
      },
      { rootMargin, threshold: 0.01 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [rootMargin, visible])

  const placeholder =
    fallback ?? <SectionLoader minHeight={minHeight || 240} label="Loading section…" />

  return (
    <div
      ref={ref}
      className={cn(className)}
      style={minHeight && !visible ? { minHeight } : undefined}
    >
      {visible ? children : placeholder}
    </div>
  )
}
