"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuPortal, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { usePermissions } from "@/hooks/use-permissions"
import NotificationDropdown from "@/components/notification-dropdown"
import { useCMS } from "@/contexts/CMSContext"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import { getBackendApiUrl } from "@/lib/config"
import { TokenManager } from "@/lib/tokenManager"
import LinkedStudentSwitcher from "@/components/linked-student-switcher"
import {
  Menu,
  Home,
  BookOpen,
  Calendar,
  TrendingUp,
  Medal,
  CreditCard,
  MessageSquare,
  FileText,
  LogOut,
  ChevronDown,
  Loader2,
  UserPlus
} from "lucide-react"

interface StudentDashboardHeaderProps {
  studentName?: string
  onLogout?: () => void
  isLoading?: boolean
}

export default function StudentDashboardHeader({
  studentName = "Student",
  onLogout,
  isLoading = false
}: StudentDashboardHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [profileImage, setProfileImage] = useState<string>("")
  const [hasRegistrationForms, setHasRegistrationForms] = useState(false)
  const { cms } = useCMS()

  const readProfileImage = () => {
    try {
      const raw = localStorage.getItem("user")
      if (!raw) return
      const u = JSON.parse(raw) as { profile_image?: string }
      setProfileImage(u.profile_image || "")
    } catch {
      setProfileImage("")
    }
  }

  // *** MOVED HERE: Call usePermissions at the top level, before any early returns ***
  const { hasPermission } = usePermissions('student')

  // Handle hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    readProfileImage()
    const onUpdate = () => readProfileImage()
    window.addEventListener("student-profile-image-updated", onUpdate)
    return () => window.removeEventListener("student-profile-image-updated", onUpdate)
  }, [pathname, studentName])

  useEffect(() => {
    const token = TokenManager.getToken()
    if (!token) return
    ;(async () => {
      try {
        const res = await fetch(getBackendApiUrl("registration-forms/student"), {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
        if (!res.ok) {
          setHasRegistrationForms(false)
          return
        }
        const data = await res.json()
        const list = Array.isArray(data.registration_forms) ? data.registration_forms : []
        setHasRegistrationForms(list.length > 0)
      } catch {
        setHasRegistrationForms(false)
      }
    })()
  }, [pathname])

  const isActivePath = (path: string) => {
    if (!mounted) return false
    if (path === "/student-dashboard") {
      return pathname === path
    }
    return pathname.startsWith(path)
  }

  const handleNavigation = async (path: string) => {
    if (isNavigating) return

    setIsNavigating(true)
    try {
      await router.push(path)
    } catch (error) {
      console.error("Navigation error:", error)
    } finally {
      setIsNavigating(false)
    }
  }

  const handleMobileNavigation = async (path: string) => {
    setIsMobileMenuOpen(false)
    await handleNavigation(path)
  }

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
    }
  }

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <header className="bg-white shadow-sm border-b fixed top-0 left-0 right-0 z-50">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="w-24 h-8 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </header>
    )
  }

  const allNavigationItems = [
    {
      name: "Dashboard",
      path: "/student-dashboard",
      icon: Home,
      exact: true,
      description: "Overview and quick stats",
      permissionId: "dashboard"
    },
    {
      name: "My Courses",
      path: "/student-dashboard/courses",
      icon: BookOpen,
      exact: false,
      description: "View enrolled courses",
      permissionId: "courses"
    },
    {
      name: "Attendance",
      path: "/student-dashboard/attendance",
      icon: Calendar,
      exact: false,
      description: "Track class attendance",
      permissionId: "attendance"
    },
    {
      name: "Performance",
      path: "/student-dashboard/performance",
      icon: Medal,
      exact: false,
      description: "Achievements, skills, and coach feedback",
      permissionId: "performance"
    },
    {
      name: "Progress",
      path: "/student-dashboard/progress",
      icon: TrendingUp,
      exact: false,
      description: "Monitor training progress",
      permissionId: "reports"
    },
    {
      name: "Payments",
      path: "/student-dashboard/payments",
      icon: CreditCard,
      exact: false,
      description: "View payment history",
      permissionId: "payments"
    },
    ...(hasRegistrationForms
      ? [
          {
            name: "Registration Form",
            path: "/student-dashboard/registration-forms",
            icon: FileText,
            exact: false,
            description: "Download registration form PDF",
            permissionId: "registration_forms",
          },
        ]
      : []),
  ]

  // Filter navigation items based on permissions
  const navigationItems = allNavigationItems.filter(item => hasPermission(item.permissionId))
  const navbarLogo = resolvePublicAssetUrl(cms?.branding?.navbar_logo) || "/logo.png"


  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-gray-200/80 backdrop-blur-sm">
      <div className="w-full px-4 lg:px-6 py-2">
        <div className="flex justify-between items-center h-auto roboto">
          {/* Logo and Mobile Menu */}
          <div className="flex items-center space-x-2 min-w-0 flex-shrink-0">
            <div className="flex-shrink-0">
              <img
                src={navbarLogo}
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
                        src={navbarLogo}
                        alt="Logo"
                        className="w-8 h-8"
                      />
                    </div>
                  </div>
                  <nav className="flex-1 p-6">
                    <div className="space-y-3">
                      {navigationItems.map((item) => {
                        const isActive = item.exact
                          ? pathname === item.path
                          : isActivePath(item.path)

                        return (
                          <button
                            key={item.path}
                            onClick={() => handleMobileNavigation(item.path)}
                            disabled={isNavigating}
                            className={`w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100/80 text-sm font-medium transition-all duration-200 ${
                              isActive
                                ? "bg-gradient-to-r from-yellow-50 to-yellow-100/50 text-yellow-800 border-l-3 border-yellow-400 shadow-sm"
                                : "text-gray-700 hover:text-gray-900"
                            } ${isNavigating ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            {item.name}
                          </button>
                        )
                      })}
                    </div>
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Right-aligned: Nav items + Notifications + User Profile */}
          <div className="flex items-center justify-end space-x-4 lg:space-x-5 xl:space-x-6 min-w-0 flex-1">
            <nav className="hidden lg:flex items-center space-x-5 xl:space-x-4">
              {navigationItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.path
                  : isActivePath(item.path)
                const Icon = item.icon

                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    disabled={isNavigating}
                    className={`pb-2 px-1 text-sm font-semibold whitespace-nowrap cursor-pointer border-b-2 transition-all duration-300 hover:scale-105 flex items-center ${
                      isActive
                        ? "text-gray-900 border-yellow-400 shadow-sm"
                        : "text-gray-600 hover:text-gray-900 border-transparent hover:border-gray-300"
                    } ${isNavigating ? "opacity-50 cursor-not-allowed" : ""}`}
                    aria-current={isActive ? "page" : undefined}
                    title={item.description}
                  >
                    {Icon && <Icon className="w-4 h-4 mr-1" />}
                    {item.name}
                  </button>
                )
              })}
            </nav>
            <NotificationDropdown />
            <LinkedStudentSwitcher />

            <div className="relative z-[1000]">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex border border-gray-200 items-center space-x-2 hover:bg-gray-100/80 rounded-lg px-2 py-2 transition-all duration-200 hover:shadow-sm"
                  >
                    <Avatar className="w-6 h-6 ring-2 ring-gray-200/50 hover:ring-yellow-400/30 transition-all duration-200">
                      <AvatarImage src={profileImage} alt="" />
                      <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-yellow-500 text-white font-semibold text-xs">
                        {studentName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-semibold text-gray-800 hidden xl:inline">{studentName}</span>
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
                      onClick={() => handleNavigation("/student-dashboard/profile")}
                      className="cursor-pointer hover:bg-gray-100/80 rounded-md px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200"
                    >
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleNavigation("/student-dashboard/add-student")}
                      className="cursor-pointer hover:bg-gray-100/80 rounded-md px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add another student
                    </DropdownMenuItem>
                    <div className="h-px bg-gray-200/60 my-2"></div>
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="cursor-pointer hover:bg-red-50/80 rounded-md px-4 py-3 text-sm font-medium text-red-600 hover:text-red-700 transition-colors duration-200"
                    >
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenuPortal>
              </DropdownMenu>
            </div>


          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="flex items-center space-x-2 text-yellow-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Loading...</span>
          </div>
        </div>
      )}
    </header>
  )
}
