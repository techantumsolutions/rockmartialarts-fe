"use client"

import { useEffect, ReactNode } from "react"
import AOS from "aos"

interface ScrollZoomProps {
  children: ReactNode
  className?: string
}

/**
 * Reusable AOS-based zoom-on-scroll wrapper.
 * Elements start slightly zoomed-out + faded and zoom to 1 on scroll.
 * Triggers on every enter (down and up) via AOS mirror + once=false.
 */
export function ScrollZoom({ children, className = "" }: ScrollZoomProps) {
  useEffect(() => {
    // Ensure AOS is initialized; safe to call multiple times on client
    AOS.init({
      duration: 1000,
      easing: "ease-out-cubic",
      once: false,
      mirror: true,
      offset: 80,
    })
    AOS.refresh()
  }, [])

  return (
    <div
      className={`scroll-zoom ${className}`}
      data-aos="zoom-in"
      data-aos-duration="1000"
      data-aos-easing="ease-out-cubic"
      data-aos-once="false"
      data-aos-mirror="true"
      data-aos-offset="80"
    >
      {children}
    </div>
  )
}

