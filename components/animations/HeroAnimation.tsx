"use client"

import { motion, useReducedMotion } from "framer-motion"
import { ReactNode, useEffect, useState } from "react"
import { useIsMobile } from "@/components/ui/use-mobile"

interface HeroAnimationProps {
  /** Hero title (main heading) — omitted when empty / not set in admin */
  title?: ReactNode
  /** Optional subtitle */
  subtitle?: ReactNode
  /** Optional description line */
  description?: ReactNode
  /** Optional CTA buttons or links (scale on hover when wrapped in motion) */
  actions?: ReactNode
  /** Optional hero media (video or image) - slide-in + subtle scale on load */
  media?: ReactNode
  className?: string
}

// Cult.fit-style: stagger 0.12s, duration 0.4–0.8s, easeOut
const stagger = 0.12
const duration = 0.6
const ease = [0.25, 0.46, 0.45, 0.94] as const
const EXIT_DELAY_MS = 5000
const exitDuration = 0.5

/**
 * Hero section: title fades in from bottom, staggered text, animated CTA buttons, hero image/video slides in.
 * On mobile: video full viewport height; title/description enter with animation then exit after 5s.
 * Uses transform + opacity only; respects prefers-reduced-motion.
 */
export function HeroAnimation({
  title,
  subtitle,
  description,
  actions,
  media,
  className = "",
}: HeroAnimationProps) {
  const shouldReduceMotion = useReducedMotion()
  const isMobile = useIsMobile()
  const [exited, setExited] = useState(false)

  useEffect(() => {
    if (!isMobile || shouldReduceMotion) return
    const t = setTimeout(() => setExited(true), EXIT_DELAY_MS)
    return () => clearTimeout(t)
  }, [isMobile, shouldReduceMotion])

  if (shouldReduceMotion) {
    return (
      <div className={className}>
        {media}
        <div className="container relative z-10 mx-auto px-4 text-center text-white">
          {title ? (
            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold uppercase tracking-wide mb-4">
              {title}
            </h1>
          ) : null}
          {subtitle && <h2 className="text-2xl md:text-3xl font-semibold mb-3">{subtitle}</h2>}
          {description && <h6 className="text-lg md:text-xl max-w-2xl mx-auto">{description}</h6>}
          {actions}
        </div>
      </div>
    )
  }

  const contentAnimate = isMobile && exited
    ? { opacity: 0, y: -24 }
    : { opacity: 1, y: 0 }
  const contentTransition = isMobile && exited
    ? { duration: exitDuration, ease: "easeOut" }
    : { duration, ease }

  return (
    <section
      className={`relative min-h-screen flex items-center justify-center overflow-hidden md:min-h-screen ${className}`}
      style={isMobile ? { minHeight: "100dvh", height: "100dvh" } : undefined}
    >
      {/* Hero image/video: full height on mobile; slide in from right + subtle scale on desktop */}
      {media && (
        <motion.div
          className="absolute inset-0 w-full h-full"
          initial={{ opacity: 0.85, x: 24, scale: 1.03 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {media}
        </motion.div>
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/70" />
      <div
        className={`container relative z-10 mx-auto px-4 text-center text-white ${isMobile && exited ? "pointer-events-none" : ""}`}
      >
        {title ? (
          <motion.h1
            className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold uppercase tracking-wide mb-4"
            initial={{ opacity: 0, y: 32 }}
            animate={contentAnimate}
            transition={{ ...contentTransition, delay: exited ? 0 : 0.2 }}
          >
            {title}
          </motion.h1>
        ) : null}
        {subtitle && (
          <motion.h2
            className="text-2xl md:text-3xl font-semibold mb-3"
            initial={{ opacity: 0, y: 24 }}
            animate={contentAnimate}
            transition={{ ...contentTransition, delay: exited ? 0 : 0.2 + stagger }}
          >
            {subtitle}
          </motion.h2>
        )}
        {description && (
          <motion.h6
            className="text-lg md:text-xl max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={contentAnimate}
            transition={{ ...contentTransition, delay: exited ? 0 : 0.2 + stagger * 2 }}
          >
            {description}
          </motion.h6>
        )}
        {actions && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={contentAnimate}
            transition={{ ...contentTransition, delay: exited ? 0 : 0.2 + stagger * 3 }}
            className="mt-6 flex flex-wrap items-center justify-center gap-4"
          >
            {actions}
          </motion.div>
        )}
      </div>
    </section>
  )
}
