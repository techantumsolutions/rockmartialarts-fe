"use client"

import * as React from "react"
import { X, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type BeautifiedTone =
  | "violet"
  | "blue"
  | "green"
  | "rose"
  | "amber"
  | "teal"
  | "slate"

const TONE: Record<
  BeautifiedTone,
  {
    iconBg: string
    iconFg: string
    glow: string
    sectionBg: string
    sectionBorder: string
    sectionIcon: string
    fieldIcon: string
  }
> = {
  violet: {
    iconBg: "bg-[#EDE9FE]",
    iconFg: "text-[#6D28D9]",
    glow: "shadow-[0_8px_24px_rgba(109,40,217,0.18)]",
    sectionBg: "bg-[#F5F3FF]",
    sectionBorder: "border-[#E9E5FF]",
    sectionIcon: "text-[#7C3AED]",
    fieldIcon: "text-[#8B5CF6]",
  },
  blue: {
    iconBg: "bg-[#DBEAFE]",
    iconFg: "text-[#1D4ED8]",
    glow: "shadow-[0_8px_24px_rgba(37,99,235,0.16)]",
    sectionBg: "bg-[#EFF6FF]",
    sectionBorder: "border-[#DBEAFE]",
    sectionIcon: "text-[#2563EB]",
    fieldIcon: "text-[#3B82F6]",
  },
  green: {
    iconBg: "bg-[#DCFCE7]",
    iconFg: "text-[#15803D]",
    glow: "shadow-[0_8px_24px_rgba(22,163,74,0.16)]",
    sectionBg: "bg-[#F0FDF4]",
    sectionBorder: "border-[#DCFCE7]",
    sectionIcon: "text-[#16A34A]",
    fieldIcon: "text-[#22C55E]",
  },
  rose: {
    iconBg: "bg-[#FFE4E6]",
    iconFg: "text-[#BE123C]",
    glow: "shadow-[0_8px_24px_rgba(225,29,72,0.14)]",
    sectionBg: "bg-[#FFF1F2]",
    sectionBorder: "border-[#FFE4E6]",
    sectionIcon: "text-[#E11D48]",
    fieldIcon: "text-[#F43F5E]",
  },
  amber: {
    iconBg: "bg-[#FEF3C7]",
    iconFg: "text-[#B45309]",
    glow: "shadow-[0_8px_24px_rgba(217,119,6,0.16)]",
    sectionBg: "bg-[#FFFBEB]",
    sectionBorder: "border-[#FDE68A]",
    sectionIcon: "text-[#D97706]",
    fieldIcon: "text-[#F59E0B]",
  },
  teal: {
    iconBg: "bg-[#CCFBF1]",
    iconFg: "text-[#0F766E]",
    glow: "shadow-[0_8px_24px_rgba(13,148,136,0.16)]",
    sectionBg: "bg-[#F0FDFA]",
    sectionBorder: "border-[#CCFBF1]",
    sectionIcon: "text-[#0D9488]",
    fieldIcon: "text-[#14B8A6]",
  },
  slate: {
    iconBg: "bg-[#F1F5F9]",
    iconFg: "text-[#475569]",
    glow: "shadow-[0_8px_24px_rgba(71,85,105,0.12)]",
    sectionBg: "bg-[#F8FAFC]",
    sectionBorder: "border-[#E2E8F0]",
    sectionIcon: "text-[#64748B]",
    fieldIcon: "text-[#94A3B8]",
  },
}

type BeautifiedModalProps = {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  icon?: LucideIcon
  tone?: BeautifiedTone
  size?: "md" | "lg" | "xl"
  children: React.ReactNode
  footer?: React.ReactNode
  closeDisabled?: boolean
  className?: string
}

export function BeautifiedModal({
  open,
  onClose,
  title,
  subtitle,
  icon: Icon,
  tone = "violet",
  size = "lg",
  children,
  footer,
  closeDisabled,
  className,
}: BeautifiedModalProps) {
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !closeDisabled) onClose()
    }
    window.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose, closeDisabled])

  if (!open) return null

  const t = TONE[tone]
  const maxW =
    size === "md" ? "max-w-lg" : size === "xl" ? "max-w-4xl" : "max-w-3xl"

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#0f172a]/55 backdrop-blur-[3px] transition-opacity"
        aria-label="Close dialog overlay"
        disabled={closeDisabled}
        onClick={() => {
          if (!closeDisabled) onClose()
        }}
      />
      <div
        className={cn(
          "relative z-[1] flex w-full flex-col overflow-hidden rounded-[1.35rem] border border-white/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] animate-in zoom-in-95 fade-in-0 duration-200",
          maxW,
          "max-h-[min(92vh,900px)]",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative shrink-0 overflow-hidden border-b border-[#F1F5F9] px-5 pb-4 pt-5 sm:px-6">
          <div
            className="pointer-events-none absolute -right-8 -top-10 h-40 w-56 rounded-full bg-gradient-to-br from-[#EDE9FE]/90 via-[#F5F3FF]/50 to-transparent blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute right-8 top-0 h-24 w-40 opacity-40"
            aria-hidden
            style={{
              background:
                "radial-gradient(ellipse at top right, rgba(167,139,250,0.35), transparent 70%)",
            }}
          />
          <div className="relative flex items-start gap-3">
            {Icon ? (
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                  t.iconBg,
                  t.iconFg,
                  t.glow
                )}
              >
                <Icon className="h-6 w-6" strokeWidth={1.75} />
              </div>
            ) : null}
            <div className="min-w-0 flex-1 pr-10">
              <h2 className="text-[1.15rem] font-bold leading-snug tracking-tight text-[#1E1B4B] sm:text-xl">
                {title}
              </h2>
              {subtitle ? (
                <p className="mt-1 text-sm leading-relaxed text-[#64748B]">{subtitle}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-full bg-[#F1F5F9] text-[#64748B] transition hover:bg-[#E2E8F0] hover:text-[#0F172A] disabled:opacity-50"
              onClick={onClose}
              disabled={closeDisabled}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:py-5">
          {children}
        </div>

        {footer ? (
          <div className="shrink-0 border-t border-[#F1F5F9] bg-[#FFFBEB] px-5 py-3.5 sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}

type BeautifiedHeroProps = {
  name: string
  idLabel?: string
  statusLabel?: string
  statusTone?: "success" | "warning" | "danger" | "info" | "neutral"
  subtitle?: string
  avatarUrl?: string | null
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function BeautifiedHero({
  name,
  idLabel,
  statusLabel,
  statusTone = "success",
  subtitle,
  avatarUrl,
}: BeautifiedHeroProps) {
  const statusCls =
    statusTone === "success"
      ? "bg-[#ECFDF5] text-[#047857]"
      : statusTone === "warning"
        ? "bg-[#FFFBEB] text-[#B45309]"
        : statusTone === "danger"
          ? "bg-[#FFF1F2] text-[#BE123C]"
          : statusTone === "info"
            ? "bg-[#EFF6FF] text-[#1D4ED8]"
            : "bg-[#F1F5F9] text-[#475569]"
  const dotCls =
    statusTone === "success"
      ? "bg-[#10B981]"
      : statusTone === "warning"
        ? "bg-[#F59E0B]"
        : statusTone === "danger"
          ? "bg-[#F43F5E]"
          : statusTone === "info"
            ? "bg-[#3B82F6]"
            : "bg-[#94A3B8]"

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-gradient-to-r from-[#F8FAFC] to-white px-4 py-3.5 shadow-sm">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EDE9FE] text-sm font-bold text-[#6D28D9] ring-2 ring-white shadow">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initials(name)
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-base font-bold text-[#1E1B4B]">{name}</p>
          {idLabel ? (
            <span className="rounded-full bg-[#EDE9FE] px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-[#6D28D9]">
              {idLabel}
            </span>
          ) : null}
        </div>
        {subtitle ? (
          <p className="mt-0.5 truncate text-xs text-[#64748B]">{subtitle}</p>
        ) : null}
      </div>
      {statusLabel ? (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
            statusCls
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", dotCls)} />
          {statusLabel}
        </span>
      ) : null}
    </div>
  )
}

type BeautifiedSectionProps = {
  title: string
  icon?: LucideIcon
  tone?: BeautifiedTone
  children: React.ReactNode
  className?: string
}

export function BeautifiedSection({
  title,
  icon: Icon,
  tone = "blue",
  children,
  className,
}: BeautifiedSectionProps) {
  const t = TONE[tone]
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border bg-white shadow-sm",
        t.sectionBorder,
        className
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 border-b px-4 py-2.5",
          t.sectionBg,
          t.sectionBorder
        )}
      >
        {Icon ? <Icon className={cn("h-4 w-4", t.sectionIcon)} strokeWidth={2} /> : null}
        <h3 className="text-sm font-semibold text-[#1E1B4B]">{title}</h3>
      </div>
      <div className="divide-y divide-[#F1F5F9] px-1 py-0.5">{children}</div>
    </section>
  )
}

type BeautifiedFieldProps = {
  label: string
  value?: React.ReactNode
  icon?: LucideIcon
  tone?: BeautifiedTone
  empty?: string
}

export function BeautifiedField({
  label,
  value,
  icon: Icon,
  tone = "blue",
  empty = "—",
}: BeautifiedFieldProps) {
  const t = TONE[tone]
  const display =
    value === null || value === undefined || value === "" ? empty : value
  return (
    <div className="flex items-start gap-3 px-3 py-2.5 sm:items-center">
      {Icon ? (
        <Icon
          className={cn("mt-0.5 h-4 w-4 shrink-0 sm:mt-0", t.fieldIcon)}
          strokeWidth={1.75}
        />
      ) : (
        <span className="mt-0.5 h-4 w-4 shrink-0 sm:mt-0" />
      )}
      <span className="w-[38%] min-w-[7.5rem] shrink-0 text-[13px] text-[#64748B] sm:w-44">
        {label}
      </span>
      <span className="min-w-0 flex-1 text-right text-sm font-semibold text-[#1E1B4B] break-words">
        {display}
      </span>
    </div>
  )
}

/** Map a plain record into BeautifiedField rows (skips empty keys optionally). */
export function BeautifiedKvFields({
  data,
  tone = "blue",
  icons,
  labels,
  hideEmpty = false,
}: {
  data?: Record<string, unknown> | null
  tone?: BeautifiedTone
  icons?: Record<string, LucideIcon>
  labels?: Record<string, string>
  hideEmpty?: boolean
}) {
  if (!data) return null
  const entries = Object.entries(data).filter(([k, v]) => {
    if (k.startsWith("_")) return false
    if (hideEmpty && (v === null || v === undefined || v === "")) return false
    return true
  })
  if (!entries.length) {
    return (
      <p className="px-4 py-3 text-sm text-[#94A3B8]">No details available.</p>
    )
  }
  return (
    <>
      {entries.map(([k, v]) => {
        const Icon = icons?.[k]
        const label =
          labels?.[k] ||
          k
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase())
        return (
          <BeautifiedField
            key={k}
            label={label}
            value={typeof v === "boolean" ? (v ? "Yes" : "No") : String(v ?? "")}
            icon={Icon}
            tone={tone}
          />
        )
      })}
    </>
  )
}

export function BeautifiedFooterNote({
  balance,
  note,
  icon: Icon,
}: {
  balance?: React.ReactNode
  note?: React.ReactNode
  icon?: LucideIcon
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      {balance != null ? (
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#92400E]">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E1BB33]/25 text-[#B45309]">
            {Icon ? <Icon className="h-3.5 w-3.5" /> : "₹"}
          </span>
          {balance}
        </div>
      ) : (
        <span />
      )}
      {note ? (
        <p className="inline-flex items-start gap-1.5 text-xs leading-relaxed text-[#78716C] sm:max-w-[65%] sm:text-right">
          <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#FEF3C7] text-[10px] font-bold text-[#B45309]">
            i
          </span>
          {note}
        </p>
      ) : null}
    </div>
  )
}
