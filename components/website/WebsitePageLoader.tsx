"use client"

import { useCMS } from "@/contexts/CMSContext"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import { useEffect, useMemo, useState } from "react"

/** Built-in default when CMS has no loader — never blocks on CMS/API */
const BUILTIN_LOADER = "/assets/img/site-loader.png"
const FADE_MS = 220
const MIN_MS = 180
const MAX_MS = 900

function buildLoaderSrcChain(cmsUrl: string): string[] {
  const resolved = cmsUrl.trim()
  return [resolved, BUILTIN_LOADER, "/assets/img/loader-rock.png", "/logo.png"].filter(
    (u, i, arr) => u.length > 0 && arr.indexOf(u) === i
  )
}

/**
 * Fast first-paint loader: shows briefly then dismisses on window load
 * (or after MAX_MS). No artificial 3–4s delay.
 */
export function WebsitePageLoader() {
  const { cms } = useCMS()
  const cmsLoaderUrl = resolvePublicAssetUrl(cms?.branding?.site_loader_image)
  const srcChain = useMemo(() => buildLoaderSrcChain(cmsLoaderUrl || ""), [cmsLoaderUrl])

  const [done, setDone] = useState(false)
  const [opacity, setOpacity] = useState(1)
  const [srcIndex, setSrcIndex] = useState(0)

  const imgSrc = srcChain[Math.min(srcIndex, srcChain.length - 1)] || "/logo.png"

  useEffect(() => {
    setSrcIndex(0)
  }, [srcChain])

  useEffect(() => {
    const root = document.documentElement
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
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
          document.body.style.overflow = prevOverflow
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
      document.body.style.overflow = prevOverflow
      root.classList.remove("website-loader-active")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (done) return null

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black motion-reduce:transition-none transition-opacity duration-200 ease-out"
      style={{ opacity }}
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading site"
    >
      <div className="relative flex flex-col items-center gap-4">
        <img
          src={imgSrc}
          alt=""
          width={120}
          height={120}
          className="w-[120px] max-w-[120px] h-auto max-h-[120px] object-contain select-none martial-loader-kick"
          decoding="async"
          fetchPriority="high"
          onError={() =>
            setSrcIndex((i) => {
              const max = Math.max(srcChain.length - 1, 0)
              return i < max ? i + 1 : i
            })
          }
        />
        <div className="h-1 w-24 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 rounded-full bg-[#E1BB33] martial-loader-bar" />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  )
}
