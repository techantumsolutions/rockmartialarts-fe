"use client"

import { useMemo, useState, useEffect } from "react"
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
  CalendarCheck,
  BarChart3,
  Clock,
  CreditCard,
  UserPlus,
  ClipboardList,
  ChevronDown,
} from "lucide-react"
import { usePermissions } from "@/hooks/use-permissions"
import { useCoachSubscriptionGuard } from "@/lib/coachSubscriptionGuard"

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
  const [resolvedCoachName, setResolvedCoachName] = useState<string>(coachName || "Coach")

  useEffect(() => {
    if (coachName && coachName !== "Coach") {
      setResolvedCoachName(coachName)
      return
    }
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("coach") || localStorage.getItem("user")
        if (raw) {
          const c = JSON.parse(raw)
          const name =
            c.full_name ||
            c.name ||
            (c.first_name ? `${c.first_name} ${c.last_name || ""}`.trim() : null)
          if (name) setResolvedCoachName(name)
        }
      } catch {
        // ignore
      }
    }
  }, [coachName])

  const initials = useMemo(() => {
    const name = (resolvedCoachName || "Coach").trim()
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }, [resolvedCoachName])

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
    if (path === "/coach-dashboard") {
      return pathname === path
    }
    return pathname.startsWith(path + "/") || pathname === path
  }

  const handleLogout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("token_type")
    localStorage.removeItem("expires_in")
    localStorage.removeItem("token_expiration")
    localStorage.removeItem("coach")
    localStorage.removeItem("user")
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
      name: "Training Requests",
      path: "/coach-dashboard/training-requests",
      icon: ClipboardList,
      exact: false,
      description: "Assigned training requests",
      permissionId: "dashboard",
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
  const { isRestricted, registrationSource } = useCoachSubscriptionGuard()

  const isSelfRegistered = useMemo(() => {
    if (registrationSource && registrationSource.toLowerCase() === "self") return true
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("coach") || localStorage.getItem("user")
        if (raw) {
          const c = JSON.parse(raw)
          return (c?.registration_source || "").toLowerCase() === "self"
        }
      } catch {
        // ignore
      }
    }
    return false
  }, [registrationSource])

  const navigationItems = useMemo(() => {
    if (isRestricted) {
      return navigationItemsAll.filter((item) => item.path === "/coach-dashboard/subscription")
    }
    return navigationItemsAll.filter((item) => {
      if (item.path === "/coach-dashboard/subscription") {
        return false
      }
      // Training Requests is moved to the dropdown menu as requested
      if (item.path === "/coach-dashboard/training-requests") {
        return false
      }
      return !item.permissionId || hasPermission(item.permissionId)
    })
  }, [isRestricted, hasPermission])

  return (
    // sticky (not fixed) so page content starts below the header on all coach pages
    <header className="sticky top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-gray-200/80 backdrop-blur-sm">
      <div className="w-full px-4 lg:px-6 py-2">
        <div className="flex justify-between items-center h-auto roboto">
          {/* Left: Brand Logo */}
          <div className="flex items-center flex-shrink-0">
            <button
              type="button"
              onClick={() => router.push(isRestricted ? "/coach-dashboard/subscription" : "/coach-dashboard")}
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

          {/* Right: Navigation Items + Quick Actions + User Pill + Mobile/Tablet Menu */}
          <div className="flex items-center justify-end space-x-2 sm:space-x-3 xl:space-x-4 min-w-0">
            {/* Desktop Navigation Items aligned to the right */}
            <nav className="hidden xl:flex items-center space-x-2 2xl:space-x-3.5">
              {navigationItems.map((item) => {
                const Icon = item.icon
                const isActive = isActivePath(item.path, item.exact)

                return (
                  <button
                    key={item.path}
                    onClick={() => handleDesktopNavigation(item.path)}
                    className={`px-1.5 2xl:px-2 py-1 text-sm 2xl:text-[15px] font-semibold whitespace-nowrap cursor-pointer transition-colors duration-200 flex items-center gap-1.5 ${
                      isActive
                        ? "text-[#FFB70F]"
                        : "text-gray-600 hover:text-[#FFB70F]"
                    }`}
                    title={item.description}
                  >
                    {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                    <span>{item.name}</span>
                  </button>
                )
              })}

              {/* Quick Actions Dropdown (Click-based) */}
              {!isRestricted && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      title="Quick actions"
                      aria-label="Quick actions"
                      className="px-2 text-gray-700 hover:text-gray-900 cursor-pointer rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center border border-gray-200 hover:border-gray-300 flex-shrink-0 min-w-[36px] h-8"
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
                        onClick={() => handleDesktopNavigation("/coach-dashboard/training-requests")}
                        className="cursor-pointer hover:bg-gray-100/80 rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200 flex items-center"
                      >
                        <ClipboardList className="w-4 h-4 mr-2 text-gray-500" />
                        Training Requests
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDesktopNavigation("/coach-dashboard/my-attendance")}
                        className="cursor-pointer hover:bg-gray-100/80 rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200 flex items-center"
                      >
                        <CalendarCheck className="w-4 h-4 mr-2 text-gray-500" />
                        My Attendance
                      </DropdownMenuItem>
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
                      {isSelfRegistered && (
                        <DropdownMenuItem
                          onClick={() => handleDesktopNavigation("/coach-dashboard/subscription")}
                          className="cursor-pointer hover:bg-gray-100/80 rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200 flex items-center"
                        >
                          <CreditCard className="w-4 h-4 mr-2 text-gray-500" />
                          Subscription Plan
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenuPortal>
                </DropdownMenu>
              )}
            </nav>

            {/* User Profile Pill Design with Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Coach profile and account menu"
                  className="flex items-center space-x-2.5 sm:space-x-3 bg-white rounded-full pl-1.5 pr-3.5 py-1.5 sm:pl-2 sm:pr-4 sm:py-2 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#FFB70F]/50 group"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#FFB70F] text-white flex items-center justify-center font-bold text-xs sm:text-sm flex-shrink-0 shadow-xs">
                    {initials}
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-gray-800 hidden sm:inline max-w-[140px] truncate">
                    {resolvedCoachName}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuPortal>
                <DropdownMenuContent
                  align="end"
                  className="w-56 z-[1000] bg-white/95 backdrop-blur-md border border-gray-200/80 shadow-xl rounded-xl p-1.5 overflow-hidden"
                  sideOffset={8}
                >
                  <div className="px-3 py-2 border-b border-gray-100 mb-1">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Signed in as</p>
                    <p className="text-sm font-semibold text-gray-800 truncate">{resolvedCoachName}</p>
                  </div>
                  {!isRestricted && (
                    <DropdownMenuItem
                      onClick={() => handleDesktopNavigation("/coach-dashboard/profile")}
                      className="cursor-pointer hover:bg-yellow-50 hover:text-yellow-900 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors duration-150 flex items-center gap-2"
                    >
                      <User className="w-4 h-4 text-gray-500" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                  )}
                  {isSelfRegistered && (
                    <DropdownMenuItem
                      onClick={() => handleDesktopNavigation("/coach-dashboard/subscription")}
                      className="cursor-pointer hover:bg-yellow-50 hover:text-yellow-900 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors duration-150 flex items-center gap-2"
                    >
                      <CreditCard className="w-4 h-4 text-gray-500" />
                      <span>Subscription Plan</span>
                    </DropdownMenuItem>
                  )}
                  <div className="h-px bg-gray-100 my-1" />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer hover:bg-red-50 text-red-600 hover:text-red-700 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenuPortal>
            </DropdownMenu>

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
                    <div className="w-10 h-10 rounded-full bg-[#FFB70F] text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-yellow-400/30 flex-shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-gray-500 font-medium">Logged in as</p>
                      <p className="text-sm font-bold text-gray-900 truncate">{resolvedCoachName}</p>
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

                    {!isRestricted && (
                      <button
                        onClick={() => handleMobileNavigation("/coach-dashboard/training-requests")}
                        className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-3 ${
                          pathname === "/coach-dashboard/training-requests"
                            ? "bg-gradient-to-r from-yellow-50 to-yellow-100/70 text-yellow-900 border-l-4 border-yellow-400 shadow-xs font-semibold"
                            : "text-gray-700 hover:text-gray-900 hover:bg-gray-100/80"
                        }`}
                      >
                        <ClipboardList
                          className={`w-4 h-4 flex-shrink-0 ${
                            pathname === "/coach-dashboard/training-requests" ? "text-yellow-600" : "text-gray-500"
                          }`}
                        />
                        <span className="truncate">Training Requests</span>
                      </button>
                    )}

                    {!isRestricted && (
                      <button
                        onClick={() => handleMobileNavigation("/coach-dashboard/my-attendance")}
                        className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-3 ${
                          pathname === "/coach-dashboard/my-attendance"
                            ? "bg-gradient-to-r from-yellow-50 to-yellow-100/70 text-yellow-900 border-l-4 border-yellow-400 shadow-xs font-semibold"
                            : "text-gray-700 hover:text-gray-900 hover:bg-gray-100/80"
                        }`}
                      >
                        <CalendarCheck
                          className={`w-4 h-4 flex-shrink-0 ${
                            pathname === "/coach-dashboard/my-attendance" ? "text-yellow-600" : "text-gray-500"
                          }`}
                        />
                        <span className="truncate">My Attendance</span>
                      </button>
                    )}

                    {isSelfRegistered && !isRestricted && (
                      <button
                        onClick={() => handleMobileNavigation("/coach-dashboard/subscription")}
                        className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-3 ${
                          pathname === "/coach-dashboard/subscription"
                            ? "bg-gradient-to-r from-yellow-50 to-yellow-100/70 text-yellow-900 border-l-4 border-yellow-400 shadow-xs font-semibold"
                            : "text-gray-700 hover:text-gray-900 hover:bg-gray-100/80"
                        }`}
                      >
                        <CreditCard
                          className={`w-4 h-4 flex-shrink-0 ${
                            pathname === "/coach-dashboard/subscription" ? "text-yellow-600" : "text-gray-500"
                          }`}
                        />
                        <span className="truncate">Subscription Plan</span>
                      </button>
                    )}
                  </nav>

                  {/* Drawer Footer Actions */}
                  <div className="p-4 sm:p-5 border-t border-gray-200/70 space-y-2 bg-gray-50/50">
                    {!isRestricted && (
                      <button
                        onClick={() => handleMobileNavigation("/coach-dashboard/profile")}
                        className="w-full text-left px-3.5 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors flex items-center space-x-2.5"
                      >
                        <User className="w-4 h-4 text-gray-500" />
                        <span>My Profile</span>
                      </button>
                    )}
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
