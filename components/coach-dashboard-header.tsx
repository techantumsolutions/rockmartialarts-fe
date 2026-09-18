"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuPortal } from "@/components/ui/dropdown-menu"
import { Menu, Home, BookOpen, User, Users, LogOut, Calendar, TrendingUp, ChevronDown, MoreVertical, DollarSign, ClipboardCheck, BarChart3, Clock, CreditCard, UserPlus } from "lucide-react"

interface CoachDashboardHeaderProps {
  currentPage?: string
  coachName?: string
}

export default function CoachDashboardHeader({ 
  currentPage = "Dashboard",
  coachName = "Coach"
}: CoachDashboardHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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

  const navigationItems = [
    {
      name: "Dashboard",
      path: "/coach-dashboard",
      icon: Home,
      exact: true,
      description: "Overview and statistics"
    },
    {
      name: "My Courses",
      path: "/coach-dashboard/courses",
      icon: BookOpen,
      exact: false,
      description: "Assigned courses"
    },
    {
      name: "Students",
      path: "/coach-dashboard/students",
      icon: Users,
      exact: false,
      description: "Manage students"
    },
    {
      name: "Attendance",
      path: "/coach-dashboard/attendance",
      icon: Calendar,
      exact: false,
      description: "Track attendance"
    },
    {
      name: "Availability",
      path: "/coach-dashboard/availability",
      icon: Clock,
      exact: false,
      description: "Weekly availability"
    },
    {
      name: "Schedule",
      path: "/coach-dashboard/schedule",
      icon: Calendar,
      exact: false,
      description: "Lead session schedule"
    },
    {
      name: "Lead Assignments",
      path: "/coach-dashboard/lead-assignments",
      icon: UserPlus,
      exact: false,
      description: "Accept or decline leads"
    },
    {
      name: "Subscription",
      path: "/coach-dashboard/subscription",
      icon: CreditCard,
      exact: false,
      description: "Plan and renewals"
    },

    {
      name: "Reports",
      path: "/coach-dashboard/reports",
      icon: TrendingUp,
      exact: false,
      description: "Performance reports"
    },
    {
      name: "Payment Tracking",
      path: "/coach-dashboard/payment-tracking",
      icon: DollarSign,
      exact: false,
      description: "Monitor student payments"
    },
    {
      name: "Profile",
      path: "/coach-dashboard/profile",
      icon: User,
      exact: false,
      description: "My profile"
    }
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-gray-200/80 backdrop-blur-sm">
      <div className="w-full px-4 lg:px-6 py-2">
        <div className="flex justify-between items-center h-auto roboto">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-2 min-w-0">
            <div className="flex-shrink-0">
              <img
                src="/logo.png"
                alt="Logo"
                className="xl:w-[95px] w-[80px] h-auto"
              />
            </div>

            {/* Mobile Menu Button */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden hover:bg-gray-100/80 transition-colors duration-200 rounded-lg"
                >
                  <Menu className="w-5 h-5 text-gray-700" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-white/95 backdrop-blur-md border-r border-gray-200/50">
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b border-gray-200/60">
                    <div className="flex items-center space-x-3">
                      <img
                        src="/logo.png"
                        alt="Logo"
                        className="w-8 h-8"
                      />
                    </div>
                  </div>
                  <nav className="flex-1 p-6">
                    <div className="space-y-3">
                      {navigationItems.map((item) => {
                        const Icon = item.icon
                        const isActive = isActivePath(item.path, item.exact)

                        return (
                          <button
                            key={item.path}
                            onClick={() => handleMobileNavigation(item.path)}
                            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-3 ${
                              isActive
                                ? "bg-gradient-to-r from-yellow-50 to-yellow-100/50 text-yellow-800 border-l-4 border-yellow-400 shadow-sm"
                                : "text-gray-700 hover:text-gray-900 hover:bg-gray-100/80"
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            <span>{item.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  </nav>

                  {/* Mobile User Info and Logout */}
                  <div className="p-4 border-t border-gray-200/60">
                    <div className="mb-4">
                      <p className="text-sm text-gray-500">Logged in as</p>
                      <p className="font-medium text-gray-900">{coachName}</p>
                    </div>
                    <Button
                      onClick={handleLogout}
                      variant="outline"
                      className="w-full text-red-600 border-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <nav className="hidden lg:flex items-center space-x-5 xl:space-x-4">
              {navigationItems.map((item) => {
                const isActive = isActivePath(item.path, item.exact)

                return (
                  <button
                    key={item.path}
                    onClick={() => handleDesktopNavigation(item.path)}
                    className={`pb-2 px-1 text-sm font-semibold whitespace-nowrap cursor-pointer border-b-2 transition-all duration-300 hover:scale-105 ${
                      isActive
                        ? "text-gray-900 border-yellow-400 shadow-sm items-center"
                        : "text-gray-600 hover:text-gray-900 border-transparent hover:border-gray-300"
                    }`}
                  >
                    {item.name}
                  </button>
                )
              })}

              {/* Quick Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="pb-2 px-2 text-gray-700 hover:text-gray-900 cursor-pointer rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center border border-gray-200 hover:border-gray-300 flex-shrink-0 min-w-[40px]">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 z-[1000] bg-white/95 backdrop-blur-md border border-gray-200/50 shadow-xl rounded-lg p-2 overflow-hidden"
                    sideOffset={8}
                  >
                    <DropdownMenuItem
                      onClick={() => handleDesktopNavigation("/coach-dashboard/attendance")}
                      className="cursor-pointer hover:bg-gray-100/80 rounded-md px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200"
                    >
                      <ClipboardCheck className="w-4 h-4 mr-2" />
                      Mark Attendance
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDesktopNavigation("/coach-dashboard/students")}
                      className="cursor-pointer hover:bg-gray-100/80 rounded-md px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      View Students
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDesktopNavigation("/coach-dashboard/reports")}
                      className="cursor-pointer hover:bg-gray-100/80 rounded-md px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200"
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Progress Reports
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenuPortal>
              </DropdownMenu>
            </nav>
          </div>

          {/* Right side - User Profile */}
          <div className="flex items-center space-x-4">
            <div className="relative z-[1000]">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex border border-gray-200 items-center space-x-2 hover:bg-gray-100/80 rounded-lg px-2 py-2 transition-all duration-200 hover:shadow-sm"
                  >
                    <Avatar className="w-6 h-6 ring-2 ring-gray-200/50 hover:ring-yellow-400/30 transition-all duration-200">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-yellow-500 text-white font-semibold text-xs">
                        {coachName.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-semibold text-gray-800 hidden xl:inline">{coachName}</span>
                    <ChevronDown className="w-3 h-3 text-gray-600 transition-transform duration-200 group-hover:rotate-180" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 z-[1000] bg-white/95 backdrop-blur-md border border-gray-200/50 shadow-xl rounded-lg p-2 overflow-hidden"
                    sideOffset={8}
                  >
                    <DropdownMenuItem
                      onClick={() => handleDesktopNavigation("/coach-dashboard/profile")}
                      className="cursor-pointer hover:bg-gray-100/80 rounded-md px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200"
                    >
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="cursor-pointer hover:bg-red-50 rounded-md px-4 py-3 text-sm font-medium text-red-600 hover:text-red-700 transition-colors duration-200"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenuPortal>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
