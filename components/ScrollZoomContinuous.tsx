"use client"

import { ReactNode, useRef } from "react"
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion"

interface ScrollZoomContinuousProps {
  children: ReactNode
  className?: string
}

/**
 * Smooth scroll-linked zoom. Stays near full size in view; gently eases
 * to a modest scale when scrolling past — never shrinks to near-zero.
 */
export function ScrollZoomContinuous({ children, className = "" }: ScrollZoomContinuousProps) {
  const shouldReduceMotion = useReducedMotion()
  const ref = useRef<HTMLDivElement | null>(null)

  if (shouldReduceMotion) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    )
  }

  return <ScrollZoomContinuousMotion refEl={ref} className={className}>{children}</ScrollZoomContinuousMotion>
}

function ScrollZoomContinuousMotion({
  children,
  className,
  refEl,
}: {
  children: ReactNode
  className: string
  refEl: React.MutableRefObject<HTMLDivElement | null>
}) {
  const { scrollYProgress } = useScroll({
    target: refEl,
    offset: ["start end", "end start"],
  })

  // Enter slightly soft → full at mid-viewport → gentle zoom-out (min ~0.92)
  const rawScale = useTransform(scrollYProgress, [0, 0.28, 0.55, 1], [0.96, 1, 1, 0.92])
  const rawOpacity = useTransform(scrollYProgress, [0, 0.2, 0.75, 1], [0.88, 1, 1, 0.94])
  const scale = useSpring(rawScale, { stiffness: 90, damping: 22, mass: 0.35 })
  const opacity = useSpring(rawOpacity, { stiffness: 90, damping: 22, mass: 0.35 })

  return (
    <motion.div
      ref={refEl}
      style={{ scale, opacity, transformOrigin: "center center" }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
