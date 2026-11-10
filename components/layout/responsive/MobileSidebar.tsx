"use client"

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { type DashboardRole } from "@/lib/dashboard-config"
import Sidebar from "@/components/layout/Sidebar"

interface MobileSidebarProps {
  role: DashboardRole
  onNavigate: (path: string) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger?: React.ReactNode
}

/**
 * Slide-in drawer sidebar for mobile/tablet.
 * Trigger: hamburger button (min 48px tap target). Overlay + smooth animation.
 */
export function MobileSidebar({
  role,
  onNavigate,
  open,
  onOpenChange,
  trigger,
}: MobileSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button
            variant="ghost"
            size="icon"
            data-no-action-overlay
            className="h-12 w-12 min-h-[48px] min-w-[48px] lg:hidden hover:bg-gray-100/80 rounded-lg"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6 text-gray-700" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex h-dvh max-h-screen w-[248px] flex-col overflow-hidden border-r border-[#E2E8F0] bg-white p-0 sm:w-[248px]"
      >
        <Sidebar role={role} onNavigate={onNavigate} collapsed={false} />
      </SheetContent>
    </Sheet>
  )
}
