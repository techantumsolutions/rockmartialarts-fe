"use client"

import { useMemo } from "react"
import { usePathname } from "next/navigation"
import {
  filterNavItemsByPermission,
  getMainNavItems,
  getOverflowNavItems,
  type DashboardRole,
} from "@/lib/dashboard-config"
import { usePermissions } from "@/hooks/use-permissions"

interface SidebarProps {
  role: DashboardRole
  onNavigate: (path: string) => void
}

export default function Sidebar({ role, onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const { hasPermission } = usePermissions(role)

  const menuItems = useMemo(
    () => filterNavItemsByPermission(getMainNavItems(role), { role, hasPermission }),
    [role, hasPermission]
  )
  const overflowItems = useMemo(
    () => filterNavItemsByPermission(getOverflowNavItems(role), { role, hasPermission }),
    [role, hasPermission]
  )

  const isActivePath = (path: string) => pathname === path || pathname.startsWith(path + "/")

  const itemClass = (path: string) =>
    `w-full text-left px-4 min-h-[48px] flex items-center rounded-lg hover:bg-gray-100/80 text-sm font-medium transition-all duration-200 touch-manipulation ${
      isActivePath(path)
        ? "bg-gradient-to-r from-yellow-50 to-yellow-100/50 text-[#E1BB33] border-l-3 border-[#E1BB33] shadow-sm"
        : "text-gray-700 hover:text-gray-900"
    }`

  const childClass = (path: string) =>
    `w-full text-left px-3 min-h-[44px] flex items-center rounded-md hover:bg-gray-100 text-sm text-gray-600 touch-manipulation ${isActivePath(path) ? "bg-yellow-50 text-[#E1BB33]" : ""}`

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 sm:p-5 border-b border-gray-200/60">
        <div className="flex items-center space-x-3">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 sm:w-9 sm:h-9" />
        </div>
      </div>
      <nav className="flex-1 p-4 sm:p-5 overflow-y-auto">
        <div className="space-y-3">
          {menuItems.map((item) => {
            const Icon = item.icon
            return item.children && item.children.length > 0 ? (
              <div key={item.path + item.label} className="px-3 py-2">
                <p className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                  {Icon && <Icon className="w-4 h-4" />}
                  {item.label}
                </p>
                {item.children.map((child) => {
                  const ChildIcon = child.icon
                  return (
                    <button
                      key={child.path}
                      onClick={() => onNavigate(child.path)}
                      className={childClass(child.path)}
                    >
                      <span className="flex items-center gap-2">
                        {ChildIcon && <ChildIcon className="w-3.5 h-3.5" />}
                        {child.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <button
                key={item.path}
                onClick={() => onNavigate(item.path)}
                className={itemClass(item.path)}
              >
                <span className="flex items-center gap-2">
                  {Icon && <Icon className="w-4 h-4" />}
                  {item.label}
                </span>
              </button>
            )
          })}
          {overflowItems.length > 0 ? (
            <div className="mt-6 pt-4 border-t border-gray-200/80 px-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">More</p>
              <div className="space-y-1">
                {overflowItems.map((item) => {
                  const Icon = item.icon
                  if (item.children && item.children.length > 0) {
                    return (
                      <div key={item.path + item.label} className="mb-2">
                        <p className="text-xs font-medium text-gray-400 px-4 mb-1">{item.label}</p>
                        {item.children.map((child) => (
                          <button
                            key={child.path}
                            onClick={() => onNavigate(child.path)}
                            className={itemClass(child.path)}
                          >
                            <span className="flex items-center gap-2">
                              {child.icon && <child.icon className="w-4 h-4" />}
                              {child.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    )
                  }
                  return (
                    <button
                      key={item.path}
                      onClick={() => onNavigate(item.path)}
                      className={itemClass(item.path)}
                    >
                      <span className="flex items-center gap-2">
                        {Icon && <Icon className="w-4 h-4" />}
                        {item.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>
      </nav>
    </div>
  )
}
