"use client"

import { cn } from "@/lib/utils"

/**
 * Mobile-first responsive container.
 * Breakpoints: sm 640px, md 768px, lg 1024px, xl 1280px, 2xl 1536px
 * Prevents horizontal scroll and provides consistent max-width + padding.
 */
interface ResponsiveContainerProps {
  children: React.ReactNode
  className?: string
  /** Max width: default full. Use "7xl"/breakpoints only when intentionally constrained. */
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "7xl" | "full"
  /** Padding: default none — admin shell already pads content */
  noPadding?: boolean
}

const maxWidthClass = {
  sm: "max-w-screen-sm",
  md: "max-w-screen-md",
  lg: "max-w-screen-lg",
  xl: "max-w-screen-xl",
  "2xl": "max-w-screen-2xl",
  "7xl": "max-w-7xl",
  full: "",
}

export function ResponsiveContainer({
  children,
  className,
  maxWidth = "full",
  noPadding = true,
}: ResponsiveContainerProps) {
  return (
    <div
      className={cn(
        "w-full",
        maxWidth !== "full" && "mx-auto",
        maxWidth !== "full" && maxWidthClass[maxWidth],
        !noPadding && "px-4 sm:px-6 lg:px-8",
        className
      )}
    >
      {children}
    </div>
  )
}
