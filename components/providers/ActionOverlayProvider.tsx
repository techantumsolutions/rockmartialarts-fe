"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import {
  beginActionOverlay,
  endActionOverlay,
  findActionButton,
  getActionOverlayState,
  inferOverlayMode,
  isActionLocked,
  shouldSkipActionOverlayTarget,
  subscribeActionOverlay,
  type ActionOverlayMode,
} from "@/lib/action-overlay"
import { SiteLoader } from "@/components/ui/SiteLoader"

/**
 * On every actionable click: show the Platform Branding site loader
 * (transparent background, image only) until the route/process finishes.
 */
export function ActionOverlayProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [snapshot, setSnapshot] = useState(() => getActionOverlayState())
  const starterClickRef = useRef(false)

  useEffect(() => subscribeActionOverlay(() => setSnapshot(getActionOverlayState())), [])

  // Hide as soon as the new page is ready
  useEffect(() => {
    endActionOverlay()
  }, [pathname])

  useEffect(() => {
    const onClickCapture = (event: MouseEvent) => {
      if (event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      if (isActionLocked()) {
        if (starterClickRef.current) return
        const btn = findActionButton(event.target)
        if (btn && !shouldSkipActionOverlayTarget(btn)) {
          event.preventDefault()
          event.stopPropagation()
        }
        return
      }

      const btn = findActionButton(event.target)
      if (!btn) return
      if (shouldSkipActionOverlayTarget(btn)) return

      const mode: ActionOverlayMode = inferOverlayMode(btn)
      const isNav =
        btn.tagName === "A" ||
        Boolean(btn.closest("a[href]")) ||
        btn.getAttribute("data-nav") === "true"

      starterClickRef.current = true
      window.setTimeout(() => {
        beginActionOverlay({
          // Always the same full transparent platform loader
          mode: "full",
          label: "Loading",
          showVisual: true,
          // Nav: stay until pathname changes (capped). Actions: short pulse.
          overlayMs: isNav ? 10000 : mode === "short" ? 900 : 1800,
          lockMs: isNav ? 400 : mode === "short" ? 500 : 1600,
        })
        starterClickRef.current = false
      }, 0)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") endActionOverlay()
    }

    document.addEventListener("click", onClickCapture, true)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("click", onClickCapture, true)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [])

  return (
    <>
      {children}
      {snapshot.visible ? (
        <div
          className="pointer-events-none fixed inset-0 z-[100050] grid place-items-center bg-transparent"
          aria-busy="true"
          aria-live="polite"
          aria-label="Loading"
        >
          <SiteLoader mode="full" label="Loading" />
        </div>
      ) : null}
    </>
  )
}
