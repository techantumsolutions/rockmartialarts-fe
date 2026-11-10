import type React from "react"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Brand-aligned form + page utilities (Skillora Alpha admin) */
export const fieldLabel = "text-sm font-medium text-[var(--brand-muted-alt,#6B7A99)]"
export const inputClass =
  "h-11 rounded-xl border-gray-200 bg-white shadow-sm focus-visible:border-[#E1BB33] focus-visible:ring-[#E1BB33]/35"
export const sectionCard =
  "rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden"
export const dashboardFormCardClass = sectionCard
export const cardContentClass =
  "space-y-4 text-[#7D8592] [&_input:not([type=checkbox]):not([type=file])]:h-11 [&_input]:rounded-xl [&_input]:border-gray-200 [&_textarea]:rounded-xl [&_textarea]:border-gray-200 [&_[data-slot=select-trigger]]:h-11 [&_[data-slot=select-trigger]]:rounded-xl [&_[data-slot=select-trigger]]:border-gray-200"
export const primaryButtonClass =
  "h-11 rounded-xl bg-[#E1BB33] px-6 font-semibold text-[#3d3e5c] hover:bg-[#d4ae2a] shadow-sm"
export const outlineButtonClass =
  "h-11 rounded-xl border-gray-200 bg-white text-[#4F5077] hover:bg-gray-50"
export const backButtonClass = outlineButtonClass
export const pageShellClass = "admin-page w-full max-w-none"
export const pageShellNarrowClass = "admin-page w-full max-w-none"
export const pageTitleClass =
  "text-2xl font-bold tracking-tight text-[#4F5077] sm:text-3xl"
export const pageSubtitleClass = "mt-1 text-sm text-[#6B7A99]"
export const BRAND_YELLOW_BTN =
  "bg-[#E1BB33] hover:bg-[#d4ae2a] text-[#3d3e5c] font-semibold rounded-xl"

export type SectionTone =
  | "violet"
  | "blue"
  | "emerald"
  | "amber"
  | "rose"
  | "indigo"
  | "sky"

const toneClasses: Record<SectionTone, string> = {
  violet: "bg-[var(--brand-dark)]/10 text-[var(--brand-dark)]",
  blue: "bg-sky-100 text-sky-700",
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-800",
  rose: "bg-rose-100 text-rose-700",
  indigo: "bg-indigo-100 text-indigo-700",
  sky: "bg-sky-100 text-sky-700",
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
