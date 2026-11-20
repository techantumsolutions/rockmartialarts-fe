"use client"

import { useEffect } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

type ImageLightboxProps = {
  src: string
  alt?: string
  onClose: () => void
}

/**
 * Viewport-fixed image preview. Portaled to document.body so parent
 * transforms/overflow cannot offset it; body scroll locked while open.
 */
export function ImageLightbox({ src, alt = "Preview", onClose }: ImageLightboxProps) {
  useEffect(() => {
    const root = document.documentElement
    const prevOverflow = document.body.style.overflow
    const prevPad = document.body.style.paddingRight
    const scrollbar = window.innerWidth - root.clientWidth
    document.body.style.overflow = "hidden"
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`
    root.classList.add("gallery-lightbox-active")

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.paddingRight = prevPad
      root.classList.remove("gallery-lightbox-active")
      window.removeEventListener("keydown", onKey)
    }
  }, [onClose])

  if (typeof document === "undefined") return null

  return createPortal(
    <div
      className="gallery-lightbox-overlay fixed inset-0 z-[99999] grid h-[100dvh] max-h-[100dvh] w-screen place-items-center overflow-hidden bg-black/92 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-[1] rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E1BB33]"
        aria-label="Close image preview"
      >
        <X className="h-6 w-6" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-h-[min(85dvh,85vh)] max-w-[min(92vw,1200px)] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />
    </div>,
    document.body
  )
}
