"use client"

import type React from "react"
import { cn } from "@/lib/utils"

/** Shared page chrome for admin/super-admin screens */
export function AdminPageShell({
  children,
  className,
  narrow,
}: {
  children: React.ReactNode
  className?: string
  /** Forms / detail editors (max ~56rem) */
  narrow?: boolean
}) {
  return (
    <div
      className={cn(
        "admin-page w-full max-w-none",
        // narrow kept for API compat but no longer caps width — admin is full-bleed
        narrow && "admin-page--narrow",
        className
      )}
    >
      {children}
    </div>
  )
}

export function AdminPageHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
  className,
}: {
  icon?: React.ElementType
  title: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "mb-1 flex flex-wrap items-start justify-between gap-4",
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <div className="admin-icon-tile admin-icon-tile--violet">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
        <div className="min-w-0">
          <h1 className="admin-page-title">{title}</h1>
          {subtitle ? <p className="admin-page-subtitle">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="admin-actions">{actions}</div> : null}
    </div>
  )
}

export function AdminCard({
  children,
  className,
  padding = true,
}: {
  children: React.ReactNode
  className?: string
  padding?: boolean
}) {
  return (
    <div
      className={cn(
        "admin-card overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm",
        padding && "p-5 sm:p-6",
        className
      )}
    >
      {children}
    </div>
  )
}

export type AdminTone = "blue" | "green" | "amber" | "purple" | "rose" | "teal"

const kpiToneClass: Record<AdminTone, string> = {
  blue: "bg-[#E8F1FF] text-[#2563EB]",
  green: "bg-[#EAF8F0] text-[#1F9D57]",
  amber: "bg-[#FFF8E1] text-[#C9971A]",
  purple: "bg-[#F1EBFF] text-[#6D28D9]",
  rose: "bg-[#FFE8E8] text-[#E11D48]",
  teal: "bg-[#E6FAF7] text-[#0D9488]",
}

export function AdminKpiGrid({
  children,
  className,
  cols = 4,
}: {
  children: React.ReactNode
  className?: string
  cols?: 3 | 4 | 5
}) {
  return (
    <div
      className={cn(
        "admin-kpi-grid",
        cols === 3 && "md:grid-cols-3",
        cols === 5 && "md:grid-cols-5",
        className
      )}
    >
      {children}
    </div>
  )
}

export function AdminKpiCard({
  icon: Icon,
  label,
  value,
  tone = "blue",
  hint,
  className,
}: {
  icon?: React.ElementType
  label: string
  value: React.ReactNode
  tone?: AdminTone
  hint?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("admin-kpi-card", className)}>
      {Icon ? (
        <div className={cn("admin-kpi-icon", kpiToneClass[tone])}>
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </div>
      ) : null}
      <div className="min-w-0">
        <div className="admin-kpi-value">{value}</div>
        <div className="admin-kpi-label">{label}</div>
        {hint ? <div className="mt-1 text-[11px] text-[#1F9D57]">{hint}</div> : null}
      </div>
    </div>
  )
}

export function AdminFilterBar({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("admin-filter-bar", className)}>{children}</div>
}

export function AdminTableShell({
  children,
  className,
  footer,
}: {
  children: React.ReactNode
  className?: string
  footer?: React.ReactNode
}) {
  return (
    <div className={cn("admin-table-wrap", className)}>
      <div className="overflow-x-auto">{children}</div>
      {footer ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-sm text-[#6B7A99]">
          {footer}
        </div>
      ) : null}
    </div>
  )
}

export function AdminStatusPill({
  status,
  children,
  className,
}: {
  status?: "active" | "approved" | "paid" | "pending" | "draft" | "inactive" | "rejected" | "cancelled"
  children: React.ReactNode
  className?: string
}) {
  const tone =
    status === "active" || status === "approved" || status === "paid"
      ? "admin-status-active"
      : status === "pending" || status === "draft"
        ? "admin-status-pending"
        : status === "inactive" || status === "rejected" || status === "cancelled"
          ? "admin-status-inactive"
          : "admin-badge"

  return <span className={cn(tone, className)}>{children}</span>
}

export function AdminDetailLayout({
  main,
  side,
  className,
  wideSide,
}: {
  main: React.ReactNode
  side?: React.ReactNode
  className?: string
  wideSide?: boolean
}) {
  return (
    <div
      className={cn(
        "admin-detail-grid",
        wideSide && "admin-detail-grid--wide-side",
        className
      )}
    >
      <div className="admin-stack min-w-0">{main}</div>
      {side ? <aside className="admin-stack min-w-0">{side}</aside> : null}
    </div>
  )
}

export function AdminBreadcrumb({
  items,
  className,
}: {
  items: { label: string; href?: string }[]
  className?: string
}) {
  return (
    <nav className={cn("admin-breadcrumb", className)} aria-label="Breadcrumb">
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="inline-flex items-center gap-1">
          {i > 0 ? <span className="admin-breadcrumb-sep">/</span> : null}
          {item.href ? <a href={item.href}>{item.label}</a> : <span className="text-[#4F5077]">{item.label}</span>}
        </span>
      ))}
    </nav>
  )
}

export function AdminCountPill({
  children,
  tone = "blue",
  className,
}: {
  children: React.ReactNode
  tone?: AdminTone
  className?: string
}) {
  return (
    <span className={cn(`admin-count-pill admin-count-pill--${tone}`, className)}>
      {children}
    </span>
  )
}

export function AdminQuickAction({
  icon: Icon,
  children,
  onClick,
  className,
}: {
  icon?: React.ElementType
  children: React.ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <button type="button" className={cn("admin-quick-action", className)} onClick={onClick}>
      <span className="inline-flex min-w-0 items-center gap-2">
        {Icon ? <Icon className="h-4 w-4 shrink-0 text-[#6B7A99]" /> : null}
        <span className="truncate">{children}</span>
      </span>
      <span aria-hidden className="text-[#9593A8]">›</span>
    </button>
  )
}

/** Primary yellow CTA class for pages not using Button variant=default */
export const adminPrimaryBtnClass =
  "h-10 rounded-xl bg-[#E1BB33] px-4 font-semibold text-[#3d3e5c] shadow-sm hover:bg-[#d4ae2a]"

export const adminOutlineBtnClass =
  "h-10 rounded-xl border border-gray-200 bg-white px-4 font-medium text-[#4F5077] hover:bg-gray-50"
