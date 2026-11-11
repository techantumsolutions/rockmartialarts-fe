"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { type DashboardRole } from "@/lib/dashboard-config"
import Navbar from "@/components/layout/Navbar"
import Sidebar, {
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
} from "@/components/layout/Sidebar"
import Footer from "@/components/layout/Footer"
import { ResponsiveContainer } from "@/components/layout/responsive"
import NewLeadAlerts from "@/components/dashboard/NewLeadAlerts"

interface DashboardLayoutProps {
  children: React.ReactNode
  role: DashboardRole
}

const SIDEBAR_ROLES: DashboardRole[] = [
  "super_admin",
  "branch_admin",
  "partner_super_admin",
  "student",
]

const SIDEBAR_COLLAPSED_KEY = "skillora-admin-sidebar-collapsed"

/**
 * Shared layout for all dashboards.
 * Admin roles: fixed full-height sidebar + fixed top bar; only main content scrolls.
 */
export default function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const useSidebar = SIDEBAR_ROLES.includes(role)
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, left: 0 })
    }
  }, [pathname])

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1")
    } catch {
      /* ignore */
    }
  }, [])

  if (!useSidebar) {
    return (
      <div className="flex min-h-screen min-w-0 flex-col bg-gray-50">
        <Navbar role={role} />
        <main className="w-full min-w-0 flex-1">
          <ResponsiveContainer maxWidth="full" className="pb-4 pt-20 sm:pb-5 md:pb-6">
            {children}
          </ResponsiveContainer>
        </main>
        <Footer />
        <NewLeadAlerts />
      </div>
    )
  }

  const sidebarWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED

  return (
    <div
      className="flex h-dvh max-h-dvh min-w-0 overflow-hidden bg-[#F8FAFC]"
      data-admin-shell
      data-admin-role={role}
      data-sidebar-collapsed={collapsed ? "true" : "false"}
      style={
        {
          ["--admin-sidebar-w" as string]: `${sidebarWidth}px`,
        } as React.CSSProperties
      }
    >
      {/* Left nav: full viewport height, own scroll */}
      <aside
        className="z-[60] hidden h-full shrink-0 flex-col overflow-hidden border-r border-[#E2E8F0] bg-white transition-[width] duration-200 ease-out lg:flex"
        style={{ width: sidebarWidth }}
      >
        <Sidebar
          role={role}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
        />
      </aside>

      {/* Right column: fixed top bar + scrollable content only */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="z-40 h-[70px] shrink-0 border-b border-[#E2E8F0] bg-white/95 backdrop-blur-sm">
          <Navbar role={role} variant="sidebar" />
        </div>
        <main ref={mainRef} className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
          {/* min-h-full + flex column keeps footer at the bottom of the viewport when content is short */}
          <div className="flex min-h-full flex-col">
            <div className="admin-content-frame w-full max-w-none flex-1 px-4 py-4 md:px-6 md:py-5">
              {children}
            </div>
            <Footer />
          </div>
        </main>
      </div>
      <NewLeadAlerts />
    </div>
  )
}
