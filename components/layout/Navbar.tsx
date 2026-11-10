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
import { useState, useEffect, useMemo, useRef } from "react"
import NotificationDropdown from "@/components/notification-dropdown"
import { MobileSidebar } from "@/components/layout/responsive"
import {
  DashboardRole,
  filterNavItemsByPermission,
  getMainNavItems,
  getOverflowNavItems,
  getRoleLabel,
  getBasePath,
  isPartnerBranchManagerNav,
  type NavItem,
} from "@/lib/dashboard-config"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { TokenManager } from "@/lib/tokenManager"
import { useActiveBranch } from "@/lib/activeBranch"
import { usePermissions } from "@/hooks/use-permissions"
import { usePartnerFeaturePermissions } from "@/hooks/usePartnerFeaturePermissions"
import { filterPartnerNavByFeatures } from "@/lib/partnerFeaturePermissions"

interface NavbarProps {
  role: DashboardRole
  /** When "sidebar", hide desktop horizontal nav — used with DashboardLayout sidebar shell */
  variant?: "topnav" | "sidebar"
}

export default function Navbar({ role, variant = "topnav" }: NavbarProps) {
  const useSidebarShell = variant === "sidebar"
  const router = useRouter()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [profileImage, setProfileImage] = useState<string>("")
  const [openNavMenu, setOpenNavMenu] = useState<string | null>(null)
  const navMenuCloseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoveredNavMenu = useRef<string | null>(null)
  const { hasPermission } = usePermissions(role)
  const { permissions: partnerFeaturePermissions } = usePartnerFeaturePermissions(role)
  const { branches: assignedBranches, active: activeBranch, setActive: setActiveBranch } = useActiveBranch()

  const { cms } = useCMS()
  const basePath = getBasePath(role)
  const NAV_VISIBLE_LIMIT = 7
  const [partnerBranchManager, setPartnerBranchManager] = useState(false)

  useEffect(() => {
    setPartnerBranchManager(role === "branch_admin" && isPartnerBranchManagerNav())
  }, [role])

  const menuOptions = useMemo(
    () => ({ partnerBranchManager }),
    [partnerBranchManager]
  )

  const menuItems = useMemo(() => {
    if (useSidebarShell) return []
    const base = filterNavItemsByPermission(getMainNavItems(role, basePath, menuOptions), {
      role,
      hasPermission,
    })
    return role === "partner_super_admin"
      ? filterPartnerNavByFeatures(base, partnerFeaturePermissions)
      : base
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hasPermission stabilized via useCallback; omit identity churn
  }, [role, basePath, menuOptions, partnerFeaturePermissions, useSidebarShell])
  const overflowNavItems = useMemo(() => {
    if (useSidebarShell) return []
    const base = filterNavItemsByPermission(getOverflowNavItems(role, basePath, menuOptions), {
      role,
      hasPermission,
    })
    return role === "partner_super_admin"
      ? filterPartnerNavByFeatures(base, partnerFeaturePermissions)
      : base
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, basePath, menuOptions, partnerFeaturePermissions, useSidebarShell])
  const primaryNavItems = useMemo(
    () => menuItems.filter((item) => item.label !== "Settings"),
    [menuItems]
  )
  const visibleNavItems = useMemo(
    () => primaryNavItems.slice(0, NAV_VISIBLE_LIMIT),
    [primaryNavItems]
  )
  const moreNavItems = useMemo(() => {
    const extras = primaryNavItems.slice(NAV_VISIBLE_LIMIT)
    const seen = new Set(extras.map((i) => i.path))
    const fromOverflow = overflowNavItems.filter((i) => !seen.has(i.path))
    return [...extras, ...fromOverflow]
  }, [primaryNavItems, overflowNavItems])
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
      const partnerSlug = localStorage.getItem("partner_slug")
      if (role === "branch_admin") BranchManagerAuth.clearAuthData()
      else {
        TokenManager.clearAuthData?.()
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        localStorage.removeItem("partner_slug")
        localStorage.removeItem("partner_name")
      }
      if (role === "student") router.replace("/login")
      else if (role === "branch_admin") router.replace("/branch-manager/login")
      else if (role === "partner_super_admin")
        router.replace(partnerSlug ? `/partners/${partnerSlug}/login` : "/superadmin/login")
      else router.replace("/superadmin/login")
    }
  }

  const handleMobileNav = (_path: string) => {
    // Links in Sidebar perform navigation; only close the drawer here.
    // Calling router.push here previously double-fired navigations and stuck the martial-arts route loader.
    setIsMobileMenuOpen(false)
  }

  const openNavDropdown = (menu: string) => {
    if (navMenuCloseTimeout.current) clearTimeout(navMenuCloseTimeout.current)
    hoveredNavMenu.current = menu
    setOpenNavMenu(menu)
  }

  const scheduleNavDropdownClose = (menu: string, pointerLeft = false) => {
    if (navMenuCloseTimeout.current) clearTimeout(navMenuCloseTimeout.current)
    if (pointerLeft && hoveredNavMenu.current === menu) hoveredNavMenu.current = null
    navMenuCloseTimeout.current = setTimeout(() => {
      if (hoveredNavMenu.current !== menu) {
        setOpenNavMenu((current) => (current === menu ? null : current))
      }
    }, 300)
  }

  const isActivePath = (path: string) =>
    path === basePath
      ? pathname === path
      : pathname === path || pathname.startsWith(path + "/")

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

  useEffect(
    () => () => {
      if (navMenuCloseTimeout.current) clearTimeout(navMenuCloseTimeout.current)
    },
    []
  )

  return (
    <header
      className={`${
        useSidebarShell
          ? "relative z-40 w-full bg-transparent"
          : "fixed top-0 left-0 right-0 z-50 border-b border-gray-200/80 bg-white shadow-sm backdrop-blur-sm"
      } min-w-0`}
    >
      <div className="w-full px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5">
        <div className="flex justify-between items-center gap-2 sm:gap-4 min-h-[48px] sm:min-h-[56px]">
          <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
            {!useSidebarShell && (
              <div className="flex-shrink-0">
                <img
                  src={resolvePublicAssetUrl(cms?.branding?.navbar_logo) || "/logo.png"}
                  alt="Logo"
                  className="h-8 w-auto sm:h-9 xl:h-10 max-w-[95px] object-contain"
                />
              </div>
            )}
            <MobileSidebar
              role={role}
              onNavigate={handleMobileNav}
              open={isMobileMenuOpen}
              onOpenChange={setIsMobileMenuOpen}
            />
            {useSidebarShell && (
              <div className="hidden sm:flex flex-col min-w-0 lg:hidden">
                <span className="text-sm font-bold text-[#4F5077] truncate">SKILLORA ALPHA</span>
                <span className="text-[10px] uppercase tracking-wider text-gray-400">
                  Learn · Practice · Advance
                </span>
              </div>
            )}
            {useSidebarShell && (
              <div className="hidden md:flex items-center flex-1 max-w-md ml-2">
                <div className="relative w-full">
                  <input
                    type="search"
                    placeholder="Search…"
                    className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50/80 px-4 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E1BB33]/40 focus:border-[#E1BB33]"
                    readOnly
                    onFocus={(e) => e.currentTarget.blur()}
                    aria-label="Search"
                  />
                  <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
                    Ctrl + K
                  </kbd>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 ml-auto flex-shrink-0">
            {/* Sidebar shell: never render horizontal menu — navigation lives in the left sidebar only */}
            {!useSidebarShell && (
            <nav className="hidden lg:flex items-center gap-2 xl:gap-3 2xl:gap-4">
              {visibleNavItems.map((item) => {
                const Icon = item.icon
                return item.children ? (
                  <DropdownMenu
                    key={item.id || item.path + item.label}
                    modal={false}
                    open={openNavMenu === (item.id || item.path)}
                    onOpenChange={(open) => {
                      const key = item.id || item.path
                      if (open) openNavDropdown(key)
                      else scheduleNavDropdownClose(key)
                    }}
                  >
                    <DropdownMenuTrigger asChild>
                      <button
                        className={`${navButtonClass(item)} flex items-center ${role === "branch_admin" ? "group" : ""}`}
                        onMouseEnter={() => openNavDropdown(item.id || item.path)}
                        onMouseLeave={() => scheduleNavDropdownClose(item.id || item.path, true)}
                      >
                        {Icon && <Icon className="w-4 h-4 mr-1" />}
                        {item.label}
                        <ChevronDown
                          className={`w-3 h-3 ml-1 transition-transform duration-200 ${
                            openNavMenu === (item.id || item.path) ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuContent
                        align="start"
                        className="w-56 z-[1000] bg-white/95 backdrop-blur-md border border-gray-200/50 shadow-xl rounded-lg p-2"
                        sideOffset={8}
                        onMouseEnter={() => openNavDropdown(item.id || item.path)}
                        onMouseLeave={() => scheduleNavDropdownClose(item.id || item.path, true)}
                      >
                        {item.children.map((child) => {
                          const ChildIcon = child.icon
                          if (child.children?.length) {
                            return child.children.map((nested) => {
                              const NestedIcon = nested.icon
                              return (
                                <DropdownMenuItem
                                  key={nested.id || nested.path + nested.label}
                                  onClick={() => router.push(nested.path)}
                                  className="cursor-pointer hover:bg-gray-100/80 rounded-md px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200 flex items-center gap-2"
                                >
                                  {NestedIcon && <NestedIcon className="w-4 h-4" />}
                                  {nested.label}
                                </DropdownMenuItem>
                              )
                            })
                          }
                          return (
                            <DropdownMenuItem
                              key={child.id || child.path + child.label}
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
                  <button key={item.id || item.path + item.label} onClick={() => router.push(item.path)} className={navButtonClass(item) + " flex items-center"}>
                    {Icon && <Icon className="w-4 h-4 mr-1" />}
                    {item.label}
                  </button>
                )
              })}
              {moreNavItems.length > 0 && (
                <DropdownMenu
                  modal={false}
                  open={openNavMenu === "more"}
                  onOpenChange={(open) => {
                    if (open) openNavDropdown("more")
                    else scheduleNavDropdownClose("more")
                  }}
                >
                  <DropdownMenuTrigger asChild>
                    <button
                      aria-label="More navigation items"
                      className="px-2 min-w-[36px] text-gray-700 hover:text-gray-900 cursor-pointer rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center border border-gray-200 hover:border-gray-300 flex-shrink-0 h-8"
                      onMouseEnter={() => openNavDropdown("more")}
                      onMouseLeave={() => scheduleNavDropdownClose("more", true)}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuContent
                      align="end"
                      className="w-56 max-h-[70vh] overflow-y-auto z-[1000] bg-white/95 backdrop-blur-md border border-gray-200/50 shadow-xl rounded-lg p-2"
                      sideOffset={8}
                      onMouseEnter={() => openNavDropdown("more")}
                      onMouseLeave={() => scheduleNavDropdownClose("more", true)}
                    >
                      {moreNavItems.map((item) => {
                        const Icon = item.icon
                        if (item.children && item.children.length > 0) {
                          return item.children.flatMap((child) => {
                            if (child.children?.length) {
                              return child.children.map((nested) => {
                                const NestedIcon = nested.icon
                                return (
                                  <DropdownMenuItem
                                    key={nested.id || nested.path + nested.label}
                                    onClick={() => router.push(nested.path)}
                                    className="cursor-pointer hover:bg-gray-100/80 rounded-md px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200 flex items-center gap-2"
                                  >
                                    {NestedIcon && <NestedIcon className="w-4 h-4" />}
                                    {nested.label}
                                  </DropdownMenuItem>
                                )
                              })
                            }
                            const ChildIcon = child.icon
                            return (
                              <DropdownMenuItem
                                key={child.id || child.path + child.label}
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
                            key={item.id || item.path + item.label}
                            onClick={() => router.push(item.path)}
                            className="cursor-pointer hover:bg-gray-100/80 rounded-md px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200 flex items-center gap-2"
                          >
                            {Icon && <Icon className="w-4 h-4" />}
                            {item.label}
                          </DropdownMenuItem>
                        )
                      })}
                      {(role === "super_admin" || role === "partner_super_admin") &&
                        !visibleNavItems.some((i) => i.label === "Categories") &&
                        !moreNavItems.some((i) => i.label === "Categories") && (
                        <DropdownMenuItem onClick={() => router.push(`${basePath}/categories`)} className="cursor-pointer hover:bg-gray-100/80 rounded-md px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200">
                          Categories Management
                        </DropdownMenuItem>
                      )}
                      {role === "partner_super_admin" &&
                        !moreNavItems.some(
                          (i) =>
                            i.label === "Organization Branding" ||
                            i.label === "Branding" ||
                            i.path.endsWith("/org-branding")
                        ) && (
                        <DropdownMenuItem
                          onClick={() => router.push(`${basePath}/org-branding`)}
                          className="cursor-pointer hover:bg-gray-100/80 rounded-md px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200"
                        >
                          Organization Branding
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenuPortal>
                </DropdownMenu>
              )}
            </nav>
            )}

            {role === "branch_admin" && assignedBranches.length > 1 && activeBranch && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="group flex items-center gap-1 max-w-[9.5rem] sm:max-w-[14rem] h-8 px-2 sm:px-3 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-sm font-semibold text-gray-800"
                    title={activeBranch.name}
                  >
                    <span className="truncate">{activeBranch.name}</span>
                    <ChevronDown className="w-3 h-3 flex-shrink-0 text-gray-600 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuContent align="end" className="w-56 z-[1000] bg-white/95 backdrop-blur-md border border-gray-200/50 shadow-xl rounded-lg p-2" sideOffset={8}>
                    {assignedBranches.map((branch) => (
                      <DropdownMenuItem
                        key={branch.id}
                        onClick={() => setActiveBranch(branch)}
                        className={`cursor-pointer hover:bg-gray-100/80 rounded-md px-4 py-3 text-sm font-medium transition-colors duration-200 ${
                          branch.id === activeBranch.id ? "text-[#E1BB33]" : "text-gray-700 hover:text-gray-900"
                        }`}
                      >
                        {branch.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenuPortal>
              </DropdownMenu>
            )}

            <NotificationDropdown />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`flex items-center gap-2 sm:gap-3 bg-white rounded-full pl-1 pr-2 sm:px-4 py-2 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 min-h-[48px] min-w-[48px] sm:min-w-0 cursor-pointer ${role === "branch_admin" ? "group" : ""}`}>
                  <Avatar className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0">
                    <AvatarImage src={profileImage} />
                    <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-yellow-500 text-white font-semibold text-sm">
                      {roleLabel.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-semibold text-gray-800 hidden lg:inline">{roleLabel}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform duration-200 hidden sm:block ${role === "branch_admin" ? "group-data-[state=open]:rotate-180" : ""}`} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuPortal>
                <DropdownMenuContent align="end" className="w-56 z-[1000] bg-white/95 backdrop-blur-md border border-gray-200/50 shadow-xl rounded-lg p-2" sideOffset={8}>
                  <DropdownMenuItem onClick={() => router.push(profilePath)} className="cursor-pointer hover:bg-gray-100/80 rounded-md px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Profile
                  </DropdownMenuItem>
                  {(role === "super_admin" || role === "partner_super_admin") && (
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
