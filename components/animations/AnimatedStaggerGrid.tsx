"use client"

import { motion, useInView, useReducedMotion } from "framer-motion"
import { useRef, Children, ReactNode } from "react"

interface AnimatedStaggerGridProps {
  children: ReactNode
  /** Delay between each child (seconds) */
  staggerDelay?: number
  /** Class for the grid container */
  className?: string
  /** Class for each child wrapper */
  childClassName?: string
  /** Threshold for triggering in-view: "some" (default) triggers when entering view; number requires ratio */
  amount?: "some" | "all" | number
  /** Margin for in-view trigger */
  margin?: string
}

/**
 * Scroll-reveal grid with staggered children (Cult.fit-style).
 * Card 1 → delay 0ms, Card 2 → staggerDelay, Card 3 → 2*staggerDelay (0.1–0.2s typical).
 */
export function AnimatedStaggerGrid({
  children,
  staggerDelay = 0.1,
  className = "",
  childClassName = "",
  amount = "some",
  margin = "-60px 0px",
}: AnimatedStaggerGridProps) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: margin as any, amount })
  const shouldReduceMotion = useReducedMotion()

  const items = Children.toArray(children).filter((c) => c != null && c !== false)

  if (shouldReduceMotion) {
    return (
      <div ref={ref} className={className}>
        {items.map((child, i) => (
          <div key={i} className={`min-w-0 ${childClassName}`.trim()}>
            {child}
          </div>
        ))}
      </div>
    )
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: 0.1,
          },
        },
      }}
    >
      {items.map((child, i) => (
        <motion.div
          key={i}
          className={`min-w-0 ${childClassName}`.trim()}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
            },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  )
}
