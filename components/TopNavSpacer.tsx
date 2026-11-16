"use client"

import { usePathname } from "next/navigation"
import { isDashboardPath, isLoginPath } from "./FixedTopNavWrapper"

export function TopNavSpacer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isDashboard = isDashboardPath(pathname) || isLoginPath(pathname)
  const spacerClass = isDashboard ? undefined : undefined
  return <div className={spacerClass}>{children}</div>
}
