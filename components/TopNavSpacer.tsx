"use client"

import { usePathname } from "next/navigation"
import { isDashboardPath } from "./FixedTopNavWrapper"

export function TopNavSpacer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isDashboard = isDashboardPath(pathname)
  const spacerClass = isDashboard ? undefined : undefined
  return <div className={spacerClass}>{children}</div>
}
