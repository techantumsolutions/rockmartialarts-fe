"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { getHeaderActionsForRole, type DashboardRole } from "@/lib/dashboard-config"
import { usePartnerFeaturePermissions } from "@/hooks/usePartnerFeaturePermissions"
import add_icon from "@/public/images/add_icon.png"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"

interface HeaderProps {
  title: string
  role: DashboardRole
  subtitle?: string
  children?: React.ReactNode
}

export default function Header({ title, role, subtitle, children }: HeaderProps) {
  const router = useRouter()
  const { coursePermissions } = usePartnerFeaturePermissions(role)
  const actions = useMemo(() => {
    const raw = getHeaderActionsForRole(role)
    if (role !== "partner_super_admin") return raw
    return raw.filter((a) => {
      if (a.path.endsWith("/create-course")) {
        return !!coursePermissions.can_create_courses
      }
      return true
    })
  }, [role, coursePermissions.can_create_courses])

  return (
    <div className="mb-5 flex flex-col gap-3 xl:mb-6 xl:flex-row xl:items-center xl:justify-between">
      <div className="min-w-0 shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-[#4F5077] sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-[#6B7A99]">{subtitle}</p> : null}
      </div>

      <div className="flex min-w-0 w-full flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:thin] xl:w-auto xl:justify-end">
        {actions.map((action, index) => {
          const isPrimary = index === 0
          return (
            <Button
              key={action.path}
              variant={isPrimary ? "default" : "outline"}
              data-no-action-overlay
              className={
                isPrimary
                  ? "inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border-transparent bg-[#E1BB33] px-3 text-sm font-semibold text-[#3d3e5c] shadow-sm hover:bg-[#d4ae2a]"
                  : "inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border-gray-200 bg-white px-3 text-sm text-[var(--brand-dark)]"
              }
              onClick={() => router.push(action.path)}
            >
              {isPrimary ? (
                <Plus className="h-4 w-4 shrink-0" aria-hidden />
              ) : (
                <img src={add_icon.src} alt="" className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
              )}
              <span className="hidden md:inline">{action.label}</span>
              <span className="md:hidden">{action.shortLabel || action.label}</span>
            </Button>
          )
        })}
        {children ? <div className="shrink-0">{children}</div> : null}
      </div>
    </div>
  )
}
