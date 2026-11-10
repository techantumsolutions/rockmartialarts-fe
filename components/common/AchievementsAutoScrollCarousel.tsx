"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useReducedMotion } from "framer-motion"
import {
  ShowcaseAchievementCard,
  type ShowcaseAchievementItem,
} from "@/components/testimonials"

type AchievementsAutoScrollCarouselProps = {
  items: ShowcaseAchievementItem[]
  className?: string
}

/**
 * Continuous horizontal marquee for homepage achievements.
 * Pauses on hover; supports touch pan; respects prefers-reduced-motion.
 */
export function AchievementsAutoScrollCarousel({
  items,
  className = "",
}: AchievementsAutoScrollCarouselProps) {
  const reduceMotion = useReducedMotion()
  const [paused, setPaused] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(0)
  const rafRef = useRef<number | null>(null)

  const loopItems = useMemo(
    () => (items.length > 1 ? [...items, ...items] : items),
    [items]
  )

  useEffect(() => {
    if (reduceMotion || items.length <= 1) return
    const step = () => {
      const el = trackRef.current
      if (el && !paused) {
        offsetRef.current += 0.35
        const half = el.scrollWidth / 2
        if (half > 0 && offsetRef.current >= half) {
          offsetRef.current = 0
        }
        el.style.transform = `translate3d(${-offsetRef.current}px, 0, 0)`
      }
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [items.length, paused, reduceMotion])

  if (items.length === 0) {
    return null
  }

  if (reduceMotion || items.length === 1) {
    return (
      <div
        className={`flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-2 px-2 ${className}`}
        aria-label="Student achievements"
      >
        {items.map((item, i) => (
          <div
            key={item.id || i}
            className="min-w-[min(100%,18rem)] sm:min-w-[20rem] shrink-0 snap-start"
          >
            <ShowcaseAchievementCard item={item} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      aria-label="Student achievements"
    >
      <div
        ref={trackRef}
        className="flex gap-6 w-max will-change-transform"
        style={{ touchAction: "pan-x" }}
      >
        {loopItems.map((item, i) => (
          <div
            key={`${item.id || "ach"}-${i}`}
            className="w-[min(85vw,18rem)] sm:w-[20rem] shrink-0"
          >
            <ShowcaseAchievementCard item={item} />
          </div>
        ))}
      </div>
    </div>
  )
}
