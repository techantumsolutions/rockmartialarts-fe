"use client"

import { useMemo, useState, useRef, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"
import {
  Menu,
  Home,
  BookOpen,
  User,
  Users,
  LogOut,
  Calendar,
  TrendingUp,
  MoreVertical,
  DollarSign,
  ClipboardCheck,
  BarChart3,
  Clock,
  CreditCard,
  UserPlus,
} from "lucide-react"
import { usePermissions } from "@/hooks/use-permissions"

interface CoachDashboardHeaderProps {
  currentPage?: string
  coachName?: string
}

export default function CoachDashboardHeader({
  currentPage = "Dashboard",
  coachName = "Coach",
}: CoachDashboardHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const userMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Handle smooth hover interactions for the user profile dropdown
  const handleUserMenuEnter = () => {
    if (userMenuTimeoutRef.current) {
      clearTimeout(userMenuTimeoutRef.current)
      userMenuTimeoutRef.current = null
    }
    setIsUserMenuOpen(true)
  }

  const handleUserMenuLeave = () => {
    if (userMenuTimeoutRef.current) {
      clearTimeout(userMenuTimeoutRef.current)
    }
    userMenuTimeoutRef.current = setTimeout(() => {
      setIsUserMenuOpen(false)
    }, 150)
  }

  // Close dropdown on outside click or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      if (userMenuTimeoutRef.current) {
        clearTimeout(userMenuTimeoutRef.current)
      }
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  // Mobile navigation handler
  const handleMobileNavigation = (path: string) => {
    try {
      router.push(path)
      setIsMobileMenuOpen(false)
    } catch (error) {
      console.error("Navigation error:", error)
    }
  }

  // Desktop navigation handler
  const handleDesktopNavigation = (path: string) => {
    try {
      router.push(path)
    } catch (error) {
      console.error("Navigation error:", error)
    }
  }

  // Check if current path is active
  const isActivePath = (path: string, exact: boolean = false) => {
    if (exact) {
      return pathname === path
    }
    // For non-exact matches, ensure we don't match partial paths incorrectly
    if (path === "/coach-dashboard") {
      return pathname === path
    }
    return pathname.startsWith(path + "/") || pathname === path
  }

  const handleLogout = () => {
    // Clear all authentication data including coach-specific tokens
    localStorage.removeItem("access_token")
    localStorage.removeItem("token_type")
    localStorage.removeItem("expires_in")
    localStorage.removeItem("token_expiration")
    localStorage.removeItem("coach")
    localStorage.removeItem("user")
    // Also clear legacy token if exists
    localStorage.removeItem("token")

    console.log("Coach logged out, redirecting to coach login")
    router.push("/coach/login")
  }

  const navigationItemsAll = [
    {
      name: "Dashboard",
      path: "/coach-dashboard",
      icon: Home,
      exact: true,
      description: "Overview and statistics",
      permissionId: "dashboard",
    },
    {
      name: "My Courses",
      path: "/coach-dashboard/courses",
      icon: BookOpen,
      exact: false,
      description: "Assigned courses",
      permissionId: "courses",
    },
    {
      name: "Students",
      path: "/coach-dashboard/students",
      icon: Users,
      exact: false,
      description: "Manage students",
      permissionId: "students",
    },
    {
      name: "Attendance",
      path: "/coach-dashboard/attendance",
      icon: Calendar,
      exact: false,
      description: "Track attendance",
      permissionId: "attendance",
    },
    {
      name: "Availability",
      path: "/coach-dashboard/availability",
      icon: Clock,
      exact: false,
      description: "Weekly availability",
      permissionId: "profile",
    },
    {
      name: "Schedule",
      path: "/coach-dashboard/schedule",
      icon: Calendar,
      exact: false,
      description: "Lead session schedule",
      permissionId: "dashboard",
    },
    {
      name: "Lead Assignments",
      path: "/coach-dashboard/lead-assignments",
      icon: UserPlus,
      exact: false,
      description: "Accept or decline leads",
      permissionId: "students",
    },
    {
      name: "Subscription",
      path: "/coach-dashboard/subscription",
      icon: CreditCard,
      exact: false,
      description: "Plan and renewals",
      permissionId: "payments",
    },
    {
      name: "Reports",
      path: "/coach-dashboard/reports",
      icon: TrendingUp,
      exact: false,
      description: "Performance reports",
      permissionId: "reports",
    },
    {
      name: "Payment Tracking",
      path: "/coach-dashboard/payment-tracking",
      icon: DollarSign,
      exact: false,
      description: "Monitor student payments",
      permissionId: "payments",
    },
    {
      name: "Profile",
      path: "/coach-dashboard/profile",
      icon: User,
      exact: false,
      description: "My profile",
      permissionId: "profile",
    },
  ]

  const { hasPermission } = usePermissions("coach")
  const navigationItems = useMemo(
    () => navigationItemsAll.filter((item) => !item.permissionId || hasPermission(item.permissionId)),
    [hasPermission]
  )

  return (
    // sticky (not fixed) so page content starts below the header on all coach pages
    <header className="sticky top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-gray-200/80 backdrop-blur-sm">
      <div className="w-full px-4 lg:px-6 py-2">
        <div className="flex justify-between items-center h-auto roboto">
          {/* Left: Brand Logo */}
          <div className="flex items-center flex-shrink-0">
            <button
              type="button"
              onClick={() => router.push("/coach-dashboard")}
              className="focus:outline-none transition-transform hover:scale-105"
              aria-label="Coach dashboard home"
            >
              <img
                src="/logo.png"
                alt="Logo"
                className="xl:w-[95px] w-[75px] sm:w-[85px] h-auto object-contain"
              />
            </button>
          </div>

          {/* Right: Navigation Items + Quick Actions + User Icon + Mobile/Tablet Menu */}
          <div className="flex items-center justify-end space-x-2 sm:space-x-3 xl:space-x-4 min-w-0">
            {/* Desktop Navigation Items aligned to the right */}
            <nav className="hidden xl:flex items-center space-x-2 2xl:space-x-4">
              {navigationItems.map((item) => {
                const isActive = isActivePath(item.path, item.exact)

                return (
                  <button
                    key={item.path}
                    onClick={() => handleDesktopNavigation(item.path)}
                    className={`pb-2 px-1 text-xs 2xl:text-sm font-semibold whitespace-nowrap cursor-pointer border-b-2 transition-all duration-300 hover:scale-105 ${
                      isActive
                        ? "text-gray-900 border-yellow-400 shadow-sm"
                        : "text-gray-600 hover:text-gray-900 border-transparent hover:border-gray-300"
                    }`}
                    title={item.description}
                  >
                    {item.name}
                  </button>
                )
              })}

              {/* Quick Actions Dropdown (Click-based) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    title="Quick actions"
                    aria-label="Quick actions"
                    className="pb-2 px-2 text-gray-700 hover:text-gray-900 cursor-pointer rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center border border-gray-200 hover:border-gray-300 flex-shrink-0 min-w-[36px] h-8"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 z-[1000] bg-white/95 backdrop-blur-md border border-gray-200/50 shadow-xl rounded-xl p-1.5 overflow-hidden"
                    sideOffset={8}
                  >
                    <DropdownMenuItem
                      onClick={() => handleDesktopNavigation("/coach-dashboard/attendance")}
                      className="cursor-pointer hover:bg-gray-100/80 rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200 flex items-center"
                    >
                      <ClipboardCheck className="w-4 h-4 mr-2 text-gray-500" />
                      Mark Attendance
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDesktopNavigation("/coach-dashboard/students")}
                      className="cursor-pointer hover:bg-gray-100/80 rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200 flex items-center"
                    >
                      <Users className="w-4 h-4 mr-2 text-gray-500" />
                      View Students
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDesktopNavigation("/coach-dashboard/reports")}
                      className="cursor-pointer hover:bg-gray-100/80 rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200 flex items-center"
                    >
                      <BarChart3 className="w-4 h-4 mr-2 text-gray-500" />
                      Progress Reports
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenuPortal>
              </DropdownMenu>
            </nav>

            {/* User Icon with Non-Flickering Hover Dropdown (Profile & Logout) */}
            <div
              ref={userMenuRef}
              className="relative"
              onMouseEnter={handleUserMenuEnter}
              onMouseLeave={handleUserMenuLeave}
            >
              <button
                type="button"
                aria-label="Coach profile and account menu"
                aria-expanded={isUserMenuOpen}
                onClick={(e) => {
                  e.preventDefault()
                  setIsUserMenuOpen((prev) => !prev)
                }}
                className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-yellow-50 hover:bg-yellow-400 border-2 border-yellow-400 text-yellow-700 hover:text-white transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer group focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
              >
                <User className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
              </button>

              {/* Hover Dropdown with invisible padding bridge to prevent mouseleave flickering */}
              {isUserMenuOpen && (
                <div
                  className="absolute right-0 top-full pt-2 z-[1000] animate-in fade-in-0 zoom-in-95 duration-150"
                  onMouseEnter={handleUserMenuEnter}
                  onMouseLeave={handleUserMenuLeave}
                >
                  <div className="w-56 bg-white/95 backdrop-blur-md border border-gray-200/80 shadow-xl rounded-xl p-1.5 overflow-hidden">
                    {coachName && (
                      <div className="px-3 py-2 border-b border-gray-100 mb-1">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Signed in as</p>
                        <p className="text-sm font-semibold text-gray-800 truncate">{coachName}</p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false)
                        handleDesktopNavigation("/coach-dashboard/profile")
                      }}
                      className="w-full text-left cursor-pointer hover:bg-yellow-50 hover:text-yellow-900 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors duration-150 flex items-center gap-2"
                    >
                      <User className="w-4 h-4 text-gray-500" />
                      <span>Profile</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false)
                        handleLogout()
                      }}
                      className="w-full text-left cursor-pointer hover:bg-red-50 text-red-600 hover:text-red-700 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile & Tablet Hamburger Menu Trigger */}
            <div className="xl:hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Open navigation menu"
                    className="hover:bg-gray-100/80 transition-colors duration-200 rounded-lg p-2 h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center border border-gray-200/80"
                  >
                    <Menu className="w-5 h-5 text-gray-700" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-72 sm:w-80 p-0 bg-white/95 backdrop-blur-md border-r border-gray-200/60 flex flex-col h-full max-h-screen"
                >
                  {/* Drawer Header */}
                  <div className="p-4 sm:p-5 border-b border-gray-200/70 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img
                        src="/logo.png"
                        alt="Logo"
                        className="w-8 sm:w-9 h-auto object-contain"
                      />
                      <div>
                        <p className="text-xs font-bold text-gray-900 uppercase tracking-wider">Coach Portal</p>
                        <p className="text-[11px] text-gray-500">Rock Martial Arts</p>
                      </div>
                    </div>
                  </div>

                  {/* Coach Info Badge */}
                  <div className="px-5 py-3 bg-gradient-to-r from-yellow-50/60 to-yellow-100/30 border-b border-yellow-200/40 flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 text-white flex items-center justify-center font-semibold text-sm shadow-sm ring-2 ring-yellow-400/30 flex-shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-gray-500 font-medium">Logged in as</p>
                      <p className="text-sm font-bold text-gray-900 truncate">{coachName}</p>
                    </div>
                  </div>

                  {/* Drawer Nav Items */}
                  <nav className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-1.5 focus:outline-none">
                    {navigationItems.map((item) => {
                      const Icon = item.icon
                      const isActive = isActivePath(item.path, item.exact)

                      return (
                        <button
                          key={item.path}
                          onClick={() => handleMobileNavigation(item.path)}
                          className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-3 ${
                            isActive
                              ? "bg-gradient-to-r from-yellow-50 to-yellow-100/70 text-yellow-900 border-l-4 border-yellow-400 shadow-xs font-semibold"
                              : "text-gray-700 hover:text-gray-900 hover:bg-gray-100/80"
                          }`}
                        >
                          <Icon
                            className={`w-4 h-4 flex-shrink-0 ${
                              isActive ? "text-yellow-600" : "text-gray-500"
                            }`}
                          />
                          <span className="truncate">{item.name}</span>
                        </button>
                      )
                    })}
                  </nav>

                  {/* Drawer Footer Actions */}
                  <div className="p-4 sm:p-5 border-t border-gray-200/70 space-y-2 bg-gray-50/50">
                    <button
                      onClick={() => handleMobileNavigation("/coach-dashboard/profile")}
                      className="w-full text-left px-3.5 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors flex items-center space-x-2.5"
                    >
                      <User className="w-4 h-4 text-gray-500" />
                      <span>My Profile</span>
                    </button>
                    <Button
                      onClick={handleLogout}
                      variant="outline"
                      className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 justify-center h-10 transition-colors"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
