"use client"

import {
  useEffect,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { cn } from "@/lib/utils"

type CourseAssignmentsScrollPanelProps = {
  children: ReactNode
  className?: string
  /** Ref target / scrollport classes (header stays outside this node). */
  bodyClassName?: string
  header?: ReactNode
} & Omit<HTMLAttributes<HTMLDivElement>, "children" | "className">

/**
 * Course Assignments layout:
 * - Reserves a full viewport-tall block in normal document flow (no overlap of sections below)
 * - Scrolls inner content first via a non-passive wheel trap
 * - Once the inner scroll reaches an end, further wheel events scroll the page to the next section
 */
export function CourseAssignmentsScrollPanel({
  children,
  className,
  bodyClassName,
  header,
  ...rest
}: CourseAssignmentsScrollPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const onWheel = (event: WheelEvent) => {
      const canScroll = el.scrollHeight > el.clientHeight + 1
      if (!canScroll) return

      const maxScroll = el.scrollHeight - el.clientHeight
      const atTop = el.scrollTop <= 0
      const atBottom = el.scrollTop >= maxScroll - 1
      const scrollingDown = event.deltaY > 0
      const scrollingUp = event.deltaY < 0

      if ((scrollingDown && !atBottom) || (scrollingUp && !atTop)) {
        event.preventDefault()
        el.scrollTop = Math.min(maxScroll, Math.max(0, el.scrollTop + event.deltaY))
      }
    }

    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [])

  return (
    <div
      className={cn(
        "relative z-0 flex h-[calc(100vh-5.5rem)] max-h-[calc(100vh-5.5rem)] flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm",
        className
      )}
      {...rest}
    >
      {header ? <div className="shrink-0">{header}</div> : null}
      <div
        ref={scrollRef}
        className={cn("min-h-0 flex-1 overflow-y-auto overscroll-y-auto", bodyClassName)}
      >
        {children}
      </div>
    </div>
  )
}
