"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

type AppModalProps = {
  open: boolean
  onClose: () => void
  title?: string
  /** Optional centered header block above children (illustration, etc.) */
  header?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  /** sm = compact confirm; md/lg/xl = wider content; full = nearly viewport width */
  size?: "sm" | "md" | "lg" | "xl" | "full"
  closeDisabled?: boolean
  /** Hide the X button */
  hideClose?: boolean
  className?: string
  bodyClassName?: string
  /** Center title/header content (credentials-style) */
  centered?: boolean
  /**
   * When false, panel body never scrolls (content must fit / clamp).
   * Default true for long forms; use false for previews.
   */
  scrollable?: boolean
  /** Hide title/header chrome — content is edge-to-edge */
  bare?: boolean
}

/**
 * Global modal standard:
 * - Fixed full-viewport dimmed overlay (body scroll locked)
 * - Panel max height = viewport minus inset (never causes page scroll)
 * - Close (X) always available unless hideClose
 */
export function AppModal({
  open,
  onClose,
  title,
  header,
  children,
  footer,
  size = "md",
  closeDisabled,
  hideClose,
  className,
  bodyClassName,
  centered,
  scrollable = true,
  bare = false,
}: AppModalProps) {
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !closeDisabled) onClose()
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      document.documentElement.style.overflow = ""
      window.removeEventListener("keydown", onKey)
    }
  }, [open, onClose, closeDisabled])

  if (!open) return null

  const maxW =
    size === "sm"
      ? "max-w-md"
      : size === "lg"
        ? "max-w-3xl"
        : size === "xl"
          ? "max-w-5xl"
          : size === "full"
            ? "max-w-[min(96vw,72rem)]"
            : "max-w-xl"

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title || "Dialog"}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-[#0f172a]/60 backdrop-blur-[2px]"
        aria-label="Close dialog overlay"
        disabled={closeDisabled}
        onClick={() => {
          if (!closeDisabled) onClose()
        }}
      />

      <div
        className={cn(
          "relative z-[1] flex w-full flex-col overflow-hidden rounded-2xl border border-[#E8EAF0] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] animate-in fade-in-0 zoom-in-95 duration-200",
          maxW,
          /* Fit inside viewport with overlay padding — never taller than screen */
          "max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)]",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {!hideClose ? (
          <button
            type="button"
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[#F1F5F9]/95 text-[#64748B] shadow-sm transition hover:bg-[#E2E8F0] hover:text-[#0F172A] disabled:opacity-50"
            onClick={onClose}
            disabled={closeDisabled}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}

        {!bare && (header || title) ? (
          <div
            className={cn(
              "shrink-0 border-b border-[#F1F5F9] px-5 pb-3 pt-4 sm:px-6",
              centered ? "text-center" : "pr-14 text-left"
            )}
          >
            {header}
            {title ? (
              <h2
                className={cn(
                  "text-lg font-bold tracking-tight text-[#2F3153]",
                  header ? "mt-2" : ""
                )}
              >
                {title}
              </h2>
            ) : null}
          </div>
        ) : null}

        <div
          className={cn(
            "min-h-0 flex-1 overscroll-contain",
            scrollable ? "overflow-y-auto overflow-x-hidden" : "overflow-hidden",
            !bare && "px-5 py-4 sm:px-6",
            bare && "p-0",
            bodyClassName
          )}
        >
          {children}
        </div>

        {footer ? (
          <div className="shrink-0 border-t border-[#F1F5F9] bg-[#FAFBFC] px-5 py-4 sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
