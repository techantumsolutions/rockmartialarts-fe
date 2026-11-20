"use client"

import { getPortalIdentityLabel, type DashboardRole } from "@/lib/dashboard-config"
import { cn } from "@/lib/utils"

export function PortalIdentityBadge({
  role,
  className,
  compact = false,
}: {
  role: DashboardRole
  className?: string
  compact?: boolean
}) {
  const label = getPortalIdentityLabel(role)
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-[#FFB70F]/35 bg-[#FFB70F]/12 font-semibold uppercase tracking-wider text-[#8A6200]",
        compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
        className
      )}
      title={label}
    >
      {compact ? label.replace(" Portal", "") : label}
    </span>
  )
}
