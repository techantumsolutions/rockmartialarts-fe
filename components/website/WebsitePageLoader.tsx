"use client"

import { useEffect, useState } from "react"
import { SiteLoader } from "@/components/ui/SiteLoader"

const FADE_MS = 200
const MIN_MS = 280
const MAX_MS = 1200

/**
 * First-paint loader — transparent site_loader_image only (no backdrop).
 */
export function WebsitePageLoader() {
  const [done, setDone] = useState(false)
  const [opacity, setOpacity] = useState(1)

  useEffect(() => {
    const root = document.documentElement
    root.classList.add("website-loader-active")

    const started = performance.now()
    let finished = false

    const finish = () => {
      if (finished) return
      finished = true
      const elapsed = performance.now() - started
      const wait = Math.max(0, MIN_MS - elapsed)
      window.setTimeout(() => {
        setOpacity(0)
        window.setTimeout(() => {
          setDone(true)
          root.classList.remove("website-loader-active")
        }, FADE_MS)
      }, wait)
    }

    if (document.readyState === "complete") {
      finish()
    } else {
      window.addEventListener("load", finish, { once: true })
    }
    const maxTimer = window.setTimeout(finish, MAX_MS)

    return () => {
      window.clearTimeout(maxTimer)
      window.removeEventListener("load", finish)
      root.classList.remove("website-loader-active")
    }
  }, [])

  if (done) return null

  return (
    <div
      className="website-global-loader pointer-events-none fixed inset-0 z-[99999] grid place-items-center bg-transparent transition-opacity duration-200 ease-out"
      style={{ opacity }}
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading site"
    >
      <SiteLoader mode="full" label="Loading" />
    </div>
  )
}
