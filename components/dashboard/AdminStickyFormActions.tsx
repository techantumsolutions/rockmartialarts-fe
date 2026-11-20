"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

/**
 * Fixed bottom action bar for admin create/edit forms.
 * Portals to document.body so position:fixed is never trapped by
 * overflow/transform on the dashboard scroll container.
 */
export function AdminStickyFormActions({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    document.body.classList.add("admin-has-sticky-form-actions")
    return () => {
      document.body.classList.remove("admin-has-sticky-form-actions")
    }
  }, [])

  const bar = (
    <div className={cn("admin-sticky-form-actions", className)} role="toolbar" aria-label="Form actions">
      <div className="admin-sticky-form-actions__inner">{children}</div>
    </div>
  )

  if (!mounted || typeof document === "undefined") {
    return <div className="admin-page-with-sticky-actions__spacer" aria-hidden />
  }

  return createPortal(bar, document.body)
}
