"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChevronDown, MoreVertical, Settings, User, LogOut, FileText } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"
import { useRouter, usePathname } from "next/navigation"
import { useCMS } from "@/contexts/CMSContext"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import { useState, useEffect, useMemo } from "react"
import NotificationDropdown from "@/components/notification-dropdown"
import { MobileSidebar } from "@/components/layout/responsive"
import {
  DashboardRole,
  filterNavItemsByPermission,
  getMainNavItems,
  getOverflowNavItems,
  getRoleLabel,
  getBasePath,
  type NavItem,
} from "@/lib/dashboard-config"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { usePermissions } from "@/hooks/use-permissions"

interface NavbarProps {
  role: DashboardRole
}

export default function Navbar({ role }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [profileImage, setProfileImage] = useState<string>("")
  const { hasPermission } = usePermissions(role)

  const { cms } = useCMS()
  const menuItems = useMemo(
    () => filterNavItemsByPermission(getMainNavItems(role), { role, hasPermission }),
    [role, hasPermission]
  )
  const overflowNavItems = useMemo(
    () => filterNavItemsByPermission(getOverflowNavItems(role), { role, hasPermission }),
    [role, hasPermission]
  )
  const basePath = getBasePath(role)
  const roleLabel = getRoleLabel(role)

  useEffect(() => {
    const saved = localStorage.getItem("profileImage")
    if (saved) setProfileImage(saved)
    const handleStorage = () => {
      const updated = localStorage.getItem("profileImage")
      if (updated) setProfileImage(updated)
    }
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      if (role === "branch_admin") BranchManagerAuth.clearAuthData()
      else {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
      }
      if (role === "student") router.replace("/login")
      else if (role === "branch_admin") router.replace("/branch-manager/login")
      else router.replace("/superadmin/login")
    }
  }

  const handleMobileNav = (path: string) => {
    router.push(path)
    setIsMobileMenuOpen(false)
  }

  const isActivePath = (path: string) => pathname === path || pathname.startsWith(path + "/")

  const navButtonClass = (item: NavItem) =>
    `pb-2 px-1 text-sm font-semibold whitespace-nowrap cursor-pointer transition-all duration-300 hover:scale-105 ${
      isActivePath(item.path) ? "text-[#E1BB33]" : "text-gray-600 hover:text-gray-900"
    }`

  const mobileNavButtonClass = (item: NavItem) =>
    `w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100/80 text-sm font-medium transition-all duration-200 ${
      isActivePath(item.path) ? "bg-gradient-to-r from-yellow-50 to-yellow-100/50 text-[#E1BB33] border-l-3 border-[#E1BB33] shadow-sm" : "text-gray-700 hover:text-gray-900"
    }`

  const profilePath = `${basePath}/profile`
  const settingsPath = `${basePath}/settings`
  const cmsPath = `${basePath}/cms`

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-gray-200/80 backdrop-blur-sm min-w-0">
      <div className="w-full px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5">
        <div className="flex justify-between items-center gap-2 sm:gap-4 min-h-[48px] sm:min-h-[56px]">
          <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
            <div className="flex-shrink-0">
              <img
                src={resolvePublicAssetUrl(cms?.branding?.navbar_logo) || "/logo.png"}
                alt="Logo"
                className="h-8 w-auto sm:h-9 xl:h-10 max-w-[95px] object-contain"
              />
            </div>
            <MobileSidebar role={role} onNavigate={handleMobileNav} open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen} />
          </div>

          <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 ml-auto flex-shrink-0">
            <nav className="hidden lg:flex items-center gap-2 xl:gap-3 2xl:gap-4">
              {menuItems.filter(item => item.label !== "Settings").map((item) => {
                const Icon = item.icon
                return item.children ? (
                  <DropdownMenu key={item.path}>
                    <DropdownMenuTrigger asChild>
                      <button className={navButtonClass(item) + " flex items-center"}>
                        {Icon && <Icon className="w-4 h-4 mr-1" />}
                        {item.label}
                        <ChevronDown className="w-3 h-3 ml-1 transition-transform duration-200" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuContent align="start" className="w-56 z-[1000] bg-white/95 backdrop-blur-md border border-gray-200/50 shadow-xl rounded-lg p-2" sideOffset={8}>
                        {item.children.map((child) => {
                          const ChildIcon = child.icon
                          return (
                            <DropdownMenuItem
                              key={child.path}
                              onClick={() => router.push(child.path)}
                              className="cursor-pointer hover:bg-gray-100/80 rounded-md px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200 flex items-center gap-2"
                            >
                              {ChildIcon && <ChildIcon className="w-4 h-4" />}
                              {child.label}
                            </DropdownMenuItem>
                          )
                        })}
                      </DropdownMenuContent>
                    </DropdownMenuPortal>
                  </DropdownMenu>
                ) : (
                  <button key={item.path} onClick={() => router.push(item.path)} className={navButtonClass(item) + " flex items-center"}>
                    {Icon && <Icon className="w-4 h-4 mr-1" />}
                    {item.label}
                  </button>
                )
              })}
              {(role === "super_admin" || role === "branch_admin") && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="pb-2 px-2 text-gray-700 hover:text-gray-900 cursor-pointer rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center border border-gray-200 hover:border-gray-300 flex-shrink-0 h-8 w-8">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuContent align="end" className="w-56 z-[1000] bg-white/95 backdrop-blur-md border border-gray-200/50 shadow-xl rounded-lg p-2" sideOffset={8}>
                      {overflowNavItems.map((item) => {
                        const Icon = item.icon
                        if (item.children && item.children.length > 0) {
                          return item.children.map((child) => {
                            const ChildIcon = child.icon
                            return (
                              <DropdownMenuItem
                                key={child.path}
                                onClick={() => router.push(child.path)}
                                className="cursor-pointer hover:bg-gray-100/80 rounded-md px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200 flex items-center gap-2"
                              >
                                {ChildIcon && <ChildIcon className="w-4 h-4" />}
                                {child.label}
                              </DropdownMenuItem>
                            )
                          })
                        }
                        return (
                          <DropdownMenuItem
                            key={item.path}
                            onClick={() => router.push(item.path)}
                            className="cursor-pointer hover:bg-gray-100/80 rounded-md px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200 flex items-center gap-2"
                          >
                            {Icon && <Icon className="w-4 h-4" />}
                            {item.label}
                          </DropdownMenuItem>
                        )
                      })}
                      {role === "super_admin" && (
                        <DropdownMenuItem onClick={() => router.push(`${basePath}/categories`)} className="cursor-pointer hover:bg-gray-100/80 rounded-md px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200">
                          Categories Management
                        </DropdownMenuItem>
                      )}
                      {role === "branch_admin" && (
                        <DropdownMenuItem
                          onClick={() => router.push(`${basePath}/payment-tracking`)}
                          className="cursor-pointer hover:bg-gray-100/80 rounded-md px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200"
                        >
                          Payment Tracking
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenuPortal>
                </DropdownMenu>
              )}
            </nav>

            <NotificationDropdown />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 sm:gap-3 bg-white rounded-full pl-1 pr-2 sm:px-4 py-2 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 min-h-[48px] min-w-[48px] sm:min-w-0">
                  <Avatar className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0">
                    <AvatarImage src={profileImage} />
                    <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-yellow-500 text-white font-semibold text-sm">
                      {roleLabel.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-semibold text-gray-800 hidden lg:inline">{roleLabel}</span>
                  <ChevronDown className="w-4 h-4 text-gray-600 transition-transform duration-200 hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuPortal>
                <DropdownMenuContent align="end" className="w-56 z-[1000] bg-white/95 backdrop-blur-md border border-gray-200/50 shadow-xl rounded-lg p-2" sideOffset={8}>
                  <DropdownMenuItem onClick={() => router.push(profilePath)} className="cursor-pointer hover:bg-gray-100/80 rounded-md px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Profile
                  </DropdownMenuItem>
                  {role === "super_admin" && (
                    <DropdownMenuItem onClick={() => router.push(settingsPath)} className="cursor-pointer hover:bg-gray-100/80 rounded-md px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200 flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Settings
                    </DropdownMenuItem>
                  )}
                  {role === "super_admin" && (
                    <DropdownMenuItem onClick={() => router.push(cmsPath)} className="cursor-pointer hover:bg-gray-100/80 rounded-md px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      CMS
                    </DropdownMenuItem>
                  )}
                  <div className="h-px bg-gray-200/60 my-2" />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer hover:bg-red-50/80 rounded-md px-4 py-3 text-sm font-medium text-red-600 hover:text-red-700 transition-colors duration-200 flex items-center gap-2">
                    <LogOut className="w-4 h-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenuPortal>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
