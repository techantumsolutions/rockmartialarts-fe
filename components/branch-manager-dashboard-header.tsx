"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bell, Search, ChevronDown, MoreHorizontal, Menu, MoreVertical } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuPortal } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useRouter, usePathname } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { searchAPI, SearchResult, GlobalSearchResponse } from "@/lib/searchAPI"
import SearchResults from "@/components/search-results"
import NotificationDropdown from "@/components/notification-dropdown"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"

interface BranchManagerDashboardHeaderProps {
  currentPage?: string;
}

export default function BranchManagerDashboardHeader({ currentPage = "Dashboard" }: BranchManagerDashboardHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Search functionality state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Search functionality
  const performSearch = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      setTotalResults(0);
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No authentication token found");
        return;
      }

      const response = await searchAPI.globalSearch(query, token, { limit: 10 });
      const transformedResults = searchAPI.transformResults(response);

      setSearchResults(transformedResults);
      setTotalResults(response.total_results);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
      setTotalResults(0);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchQuery.length >= 2) {
        performSearch(searchQuery);
      }
    }
    if (e.key === 'Escape') {
      setShowSearchResults(false);
      setSearchQuery("");
    }
  };

  const handleCloseSearch = () => {
    setShowSearchResults(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Get current branch manager
  const currentUser = BranchManagerAuth.getCurrentUser();

  // Handle logout
  const handleLogout = () => {
    BranchManagerAuth.logout();
    router.push('/branch-manager/login');
  };

  // Mobile navigation handler
  const handleMobileNavigation = (path: string) => {
    router.push(path);
    setIsMobileMenuOpen(false);
  };

  // Check if current path is active
  const isActivePath = (path: string) => {
    return pathname === path || pathname.startsWith(path);
  };

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
                      <button
                        onClick={() => handleMobileNavigation("/branch-manager-dashboard")}
                        className={`w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100/80 text-sm font-medium  transition-all duration-200 ${
                          isActivePath("/branch-manager-dashboard") && pathname === "/branch-manager-dashboard"
                            ? "bg-gradient-to-r from-blue-50 to-blue-100/50 text-blue-800 border-l-3 border-blue-400 shadow-sm"
                            : "text-gray-700 hover:text-gray-900"
                        }`}
                      >
                        Dashboard
                      </button>
                      <button
                        onClick={() => handleMobileNavigation("/branch-manager-dashboard/branches")}
                        className={`w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100/80 text-sm font-medium transition-all duration-200 ${
                          isActivePath("/branch-manager-dashboard/branches")
                            ? "bg-gradient-to-r from-blue-50 to-blue-100/50 text-blue-800 border-l-3 border-blue-400 shadow-sm"
                            : "text-gray-700 hover:text-gray-900"
                        }`}
                      >
                        Branch Info
                      </button>
                      <button
                        onClick={() => handleMobileNavigation("/branch-manager-dashboard/coaches")}
                        className={`w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100/80 text-sm font-medium transition-all duration-200 ${
                          isActivePath("/branch-manager-dashboard/coaches")
                            ? "bg-gradient-to-r from-blue-50 to-blue-100/50 text-blue-800 border-l-3 border-blue-400 shadow-sm"
                            : "text-gray-700 hover:text-gray-900"
                        }`}
                      >
                        Coachs
                      </button>
                      <button
                        onClick={() => handleMobileNavigation("/branch-manager-dashboard/students")}
                        className={`w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100/80 text-sm font-medium transition-all duration-200 ${
                          isActivePath("/branch-manager-dashboard/students")
                            ? "bg-gradient-to-r from-blue-50 to-blue-100/50 text-blue-800 border-l-3 border-blue-400 shadow-sm"
                            : "text-gray-700 hover:text-gray-900"
                        }`}
                      >
                        Students
                      </button>

                      <button
                        onClick={() => handleMobileNavigation("/branch-manager-dashboard/courses")}
                        className={`w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100/80 text-sm font-medium transition-all duration-200 ${
                          isActivePath("/branch-manager-dashboard/courses")
                            ? "bg-gradient-to-r from-blue-50 to-blue-100/50 text-blue-800 border-l-3 border-blue-400 shadow-sm"
                            : "text-gray-700 hover:text-gray-900"
                        }`}
                      >
                        Courses
                      </button>

                      <div className="px-3 py-2">
                        <p className="text-sm font-medium text-gray-500 mb-2">Attendance</p>
                        <button
                          onClick={() => handleMobileNavigation("/branch-manager-dashboard/attendance/students")}
                          className={`w-full text-left px-3 py-1 rounded-md hover:bg-gray-100 text-sm text-gray-600 ${
                            isActivePath("/branch-manager-dashboard/attendance/students") ? "bg-blue-50 text-blue-700" : ""
                          }`}
                        >
                          Student Attendance
                        </button>
                        <button
                          onClick={() => handleMobileNavigation("/branch-manager-dashboard/attendance/coaches")}
                          className={`w-full text-left px-3 py-1 rounded-md hover:bg-gray-100 text-sm text-gray-600 ${
                            isActivePath("/branch-manager-dashboard/attendance/coaches") ? "bg-blue-50 text-blue-700" : ""
                          }`}
                        >
                          Coach Attendance
                        </button>
                      </div>
                      <button
                        onClick={() => handleMobileNavigation("/branch-manager-dashboard/reports")}
                        className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 text-sm ${
                          isActivePath("/branch-manager-dashboard/reports") ? "bg-blue-50 text-blue-700" : ""
                        }`}
                      >
                        Reports
                      </button>
                      <div className="px-3 py-2">
                        <p className="text-sm font-medium text-gray-500 mb-2">More</p>
                        <button
                          onClick={() => handleMobileNavigation("/branch-manager-dashboard/payment-tracking")}
                          className={`w-full text-left px-3 py-1 rounded-md hover:bg-gray-100 text-sm text-gray-600 ${
                            isActivePath("/branch-manager-dashboard/payment-tracking") ? "bg-blue-50 text-blue-700" : ""
                          }`}
                        >
                          Payment Tracking
                        </button>

                      </div>
                    </div>
                  </nav>
                </div>
              </SheetContent>
            </Sheet>

            <nav className="hidden lg:flex items-center space-x-5 xl:space-x-4">
              <button
                onClick={() => router.push("/branch-manager-dashboard")}
                className={`pb-2 px-1 text-sm font-semibold whitespace-nowrap cursor-pointer border-b-2 transition-all duration-300 hover:scale-105 ${
                  pathname === "/branch-manager-dashboard"
                    ? "text-gray-900 border-blue-400 shadow-sm items-center"
                    : "text-gray-600 hover:text-gray-900 border-transparent hover:border-gray-300"
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => router.push("/branch-manager-dashboard/branches")}
                className={`pb-2 px-1 text-sm font-semibold whitespace-nowrap cursor-pointer border-b-2 transition-all duration-300 hover:scale-105 ${
                  isActivePath("/branch-manager-dashboard/branches")
                    ? "text-gray-900 border-blue-400 shadow-sm"
                    : "text-gray-600 hover:text-gray-900 border-transparent hover:border-gray-300"
                }`}
              >
                Branch Info
              </button>
              <button
                onClick={() => router.push("/branch-manager-dashboard/coaches")}
                className={`pb-2 px-1 text-sm font-semibold whitespace-nowrap cursor-pointer border-b-2 transition-all duration-300 hover:scale-105 ${
                  isActivePath("/branch-manager-dashboard/coaches")
                    ? "text-gray-900 border-blue-400 shadow-sm"
                    : "text-gray-600 hover:text-gray-900 border-transparent hover:border-gray-300"
                }`}
              >
                Coachs
              </button>
              <button
                onClick={() => router.push("/branch-manager-dashboard/students")}
                className={`pb-2 px-1 text-sm font-semibold whitespace-nowrap cursor-pointer border-b-2 transition-all duration-300 hover:scale-105 ${
                  isActivePath("/branch-manager-dashboard/students")
                    ? "text-gray-900 border-blue-400 shadow-sm"
                    : "text-gray-600 hover:text-gray-900 border-transparent hover:border-gray-300"
                }`}
              >
                Students
              </button>
              <button
                onClick={() => router.push("/branch-manager-dashboard/courses")}
                className={`pb-2 px-1 text-sm font-semibold whitespace-nowrap cursor-pointer border-b-2 transition-all duration-300 hover:scale-105 ${
                  isActivePath("/branch-manager-dashboard/courses")
                    ? "text-gray-900 border-blue-400 shadow-sm"
                    : "text-gray-600 hover:text-gray-900 border-transparent hover:border-gray-300"
                }`}
              >
                Courses
              </button>

              {/* Attendance Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={`group pb-2 px-1 text-sm font-semibold whitespace-nowrap cursor-pointer border-b-2 transition-all duration-300 hover:scale-105 ${
                      isActivePath("/branch-manager-dashboard/attendance")
                        ? "text-gray-900 border-blue-400 shadow-sm"
                        : "text-gray-600 hover:text-gray-900 border-transparent hover:border-gray-300"
                    }`}
                  >
                    Attendance
                    <ChevronDown className="w-3 h-3 ml-1 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuContent align="start" className="w-48 bg-white/95 backdrop-blur-md border border-gray-200/50 shadow-lg">
                    <DropdownMenuItem
                      onClick={() => router.push("/branch-manager-dashboard/attendance/students")}
                      className={`cursor-pointer hover:bg-gray-100/80 transition-colors ${
                        pathname === "/branch-manager-dashboard/attendance/students" ? "bg-blue-50 text-blue-700" : ""
                      }`}
                    >
                      Student Attendance
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push("/branch-manager-dashboard/attendance/coaches")}
                      className={`cursor-pointer hover:bg-gray-100/80 transition-colors ${
                        pathname === "/branch-manager-dashboard/attendance/coaches" ? "bg-blue-50 text-blue-700" : ""
                      }`}
                    >
                      Coach Attendance
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenuPortal>
              </DropdownMenu>

              {/* More Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="group pb-2 px-1 text-sm font-semibold whitespace-nowrap cursor-pointer border-b-2 border-transparent hover:border-gray-300 text-gray-600 hover:text-gray-900 transition-all duration-300 hover:scale-105"
                  >
                    More
                    <ChevronDown className="w-3 h-3 ml-1 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuContent align="start" className="w-48 bg-white/95 backdrop-blur-md border border-gray-200/50 shadow-lg">
                    <DropdownMenuItem
                      onClick={() => router.push("/branch-manager-dashboard/reports")}
                      className="cursor-pointer hover:bg-gray-100/80 transition-colors"
                    >
                      Reports
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push("/branch-manager-dashboard/payment-tracking")}
                      className="cursor-pointer hover:bg-gray-100/80 transition-colors"
                    >
                      Payment Tracking
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenuPortal>
              </DropdownMenu>
            </nav>
          </div>

          {/* Search and Actions */}
          <div className="flex items-center space-x-3 lg:space-x-4 min-w-0">
            {/* Search */}
            <div className="relative hidden lg:block" ref={searchContainerRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search students, coaches, courses..."
                  className="pl-10 pr-4 py-2 w-64 xl:w-80 bg-gray-50/80 border-gray-200/60 focus:bg-white focus:border-blue-300 transition-all duration-200 rounded-lg text-sm"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyPress}
                />
              </div>

              {/* Search Results */}
              {showSearchResults && (
                <SearchResults
                  results={searchResults}
                  isLoading={isSearching}
                  totalResults={totalResults}
                  onClose={handleCloseSearch}
                  searchQuery={searchQuery}
                />
              )}
            </div>

            {/* Notifications */}
            <NotificationDropdown />

            {/* User Profile Dropdown */}
            <div className="relative z-[1000]">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="group flex border border-gray-200 items-center space-x-2 hover:bg-gray-100/80 rounded-lg px-2 py-2 transition-all duration-200 hover:shadow-sm"
                  >
                    <Avatar className="w-6 h-6 ring-2 ring-gray-200/50 hover:ring-blue-400/30 transition-all duration-200">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-500 text-white font-semibold text-xs">BM</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-semibold text-gray-800 hidden xl:inline">Branch Manager</span>
                    <ChevronDown className="w-3 h-3 text-gray-600 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuContent align="end" className="w-56 bg-white/95 backdrop-blur-md border border-gray-200/50 shadow-lg">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{currentUser?.full_name || 'Branch Manager'}</p>
                      <p className="text-xs text-gray-500">{currentUser?.email || 'manager@branch.com'}</p>
                      <p className="text-xs text-blue-600">{currentUser?.branch_name || 'Main Branch'}</p>
                    </div>
                    <DropdownMenuItem
                      onClick={() => router.push("/branch-manager-dashboard/profile")}
                      className="cursor-pointer hover:bg-gray-100/80 transition-colors"
                    >
                      Profile Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="cursor-pointer hover:bg-red-50 text-red-600 transition-colors"
                    >
                      Sign Out
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
