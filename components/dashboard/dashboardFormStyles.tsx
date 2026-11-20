import type React from "react"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Brand-aligned form + page utilities — matches global Input/Select/Textarea */
export const fieldLabel = "text-sm font-medium text-[#4F5077]"
export const inputClass =
  "h-14 w-full rounded-xl border-[#E5E7EB] bg-[#F8FAFC] text-[15px] text-[#2F3153] shadow-none focus-visible:border-[#E1BB33] focus-visible:bg-white focus-visible:ring-[#E1BB33]/35"
export const sectionCard =
  "rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden"
export const dashboardFormCardClass = sectionCard
/**
 * Course Assignments panel shell — in-flow full viewport height (no sticky/z-index overlay).
 * Prefer CourseAssignmentsScrollPanel for wheel trapping; these classes are fallbacks.
 */
export const courseAssignmentsStickyCardClass =
  `${sectionCard} relative z-0 flex h-[calc(100vh-5.5rem)] max-h-[calc(100vh-5.5rem)] flex-col overflow-hidden`
export const courseAssignmentsScrollBodyClass =
  "min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-y-auto pr-1"
export const cardContentClass =
  "space-y-4 text-[#6B7A99] [&_input:not([type=checkbox]):not([type=file])]:h-14 [&_input]:rounded-xl [&_input]:border-[#E5E7EB] [&_input]:bg-[#F8FAFC] [&_textarea]:rounded-xl [&_textarea]:border-[#E5E7EB] [&_textarea]:bg-[#F8FAFC] [&_[data-slot=select-trigger]]:h-14 [&_[data-slot=select-trigger]]:w-full [&_[data-slot=select-trigger]]:rounded-xl [&_[data-slot=select-trigger]]:border-[#E5E7EB] [&_[data-slot=select-trigger]]:bg-[#F8FAFC]"
export const primaryButtonClass =
  "h-14 rounded-xl bg-[#E1BB33] px-6 font-semibold text-[#171A26] hover:bg-[#d4ae2a] shadow-sm"
export const outlineButtonClass =
  "h-14 rounded-xl border border-[#E5E7EB] bg-white text-[#4F5077] hover:bg-[#F8FAFC]"
export const backButtonClass = outlineButtonClass
export const pageShellClass = "admin-page w-full max-w-none"
export const pageShellNarrowClass = "admin-page w-full max-w-none"
export const pageTitleClass =
  "text-2xl font-bold tracking-tight text-[#4F5077] sm:text-3xl"
export const pageSubtitleClass = "mt-1 text-sm text-[#6B7A99]"
export const BRAND_YELLOW_BTN =
  "bg-[#E1BB33] hover:bg-[#d4ae2a] text-[#171A26] font-semibold rounded-xl"

export type SectionTone =
  | "violet"
  | "blue"
  | "emerald"
  | "amber"
  | "rose"
  | "indigo"
  | "sky"

/** Global admin section icon tile — gold brand accent (same across all admin roles) */
const toneClasses: Record<SectionTone, string> = {
  violet: "bg-[#FFF8E1] text-[#C9971A]",
  blue: "bg-[#FFF8E1] text-[#C9971A]",
  emerald: "bg-[#FFF8E1] text-[#C9971A]",
  amber: "bg-[#FFF8E1] text-[#C9971A]",
  rose: "bg-[#FFF8E1] text-[#C9971A]",
  indigo: "bg-[#FFF8E1] text-[#C9971A]",
  sky: "bg-[#FFF8E1] text-[#C9971A]",
}

export function DashboardSectionHeading({
  icon: Icon,
  title,
  subtitle,
  tone = "violet",
  className,
}: {
  icon: React.ElementType
  title: string
  subtitle?: string
  tone?: SectionTone
  className?: string
}) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <div
        className={cn(
          "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          toneClasses[tone]
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-[#4F5077]">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-[#6B7A99]">{subtitle}</p> : null}
      </div>
    </div>
  )
}

export function DashboardFormPageHeader({
  title,
  subtitle,
  backLabel = "Back",
  onBack,
  actions,
}: {
  title: string
  subtitle?: string
  backLabel?: string
  onBack: () => void
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className={cn(backButtonClass, "shrink-0 self-start")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {backLabel}
        </Button>
        <div>
          <h1 className={pageTitleClass}>{title}</h1>
          {subtitle ? <p className={pageSubtitleClass}>{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
