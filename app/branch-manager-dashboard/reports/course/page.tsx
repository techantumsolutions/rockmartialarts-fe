"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  Filter,
  Download,
  FileText,
  TrendingUp,
  AlertCircle,
  Loader2,
  ArrowLeft
} from "lucide-react"
import Header from "@/components/layout/Header"
import { reportsAPI, CourseReportsResponse, CourseReportFiltersResponse, CourseData } from "@/lib/reportsAPI"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import BranchSelectionField from "@/components/layout/BranchSelectionField"
import { toast } from "sonner"

interface FilterState {
  branch_id: string
  category_id: string
  difficulty_level: string
  active_only: boolean
}

// Removed REPORT_CATEGORIES - not needed for dedicated course reports page

export default function BranchManagerCourseReportPage() {
  const router = useRouter()

  // State management
  const [searchLoading, setSearchLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [courseResults, setCourseResults] = useState<CourseData[]>([])
  const [filterOptions, setFilterOptions] = useState<CourseReportFiltersResponse | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [managedBranches, setManagedBranches] = useState<string[]>([])

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    branch_id: "",
    category_id: "",
    difficulty_level: "",
    active_only: true
  })

  // Load filter options on component mount
  useEffect(() => {
    const currentUser = BranchManagerAuth.getCurrentUser()
    console.log('🏢 Branch Manager User Info:', {
      user: currentUser?.full_name,
      email: currentUser?.email,
      branch_id: currentUser?.branch_id,
      managed_branches: currentUser?.managed_branches,
      managed_branches_count: currentUser?.managed_branches?.length || 0,
      role: currentUser?.role
    })

    // If managed branches are not available, try to fetch them
    if (!currentUser?.managed_branches || currentUser.managed_branches.length === 0) {
      console.log('⚠️ No managed branches found, attempting to fetch...')
      BranchManagerAuth.fetchManagedBranches().then(branches => {
        console.log('✅ Fetched managed branches:', branches)
        // Reload filter options after fetching branches
        loadFilterOptions()
      }).catch(error => {
        console.error('❌ Failed to fetch managed branches:', error)
        loadFilterOptions() // Still try to load filter options
      })
    } else {
      loadFilterOptions()
    }
  }, [])

  // Load filter options with branch-specific filtering - following branches page pattern
  const loadFilterOptions = async () => {
    try {
      setInitialLoading(true)
      setError(null)

      const currentUser = BranchManagerAuth.getCurrentUser()
      const token = BranchManagerAuth.getToken()

      if (!currentUser || !token) {
        throw new Error("Authentication required. Please login again.")
      }

      console.log('🔧 Loading course report filter options for branch manager:', currentUser.full_name)

      // Use the reportsAPI method instead of manual fetch
      const data = await reportsAPI.getCourseReportFilters(token)
      console.log('✅ Course report filters API response:', data)

      const filtersData = data.filters || {}
      setFilterOptions({ filters: filtersData })

      // Extract managed branches from filter options (same as branches page pattern)
      const branches = filtersData.branches || []
      const branchIds = branches.map((branch: any) => branch.id)
      setManagedBranches(branchIds)

      // Debug: Show branch IDs for cross-reference (same as branches page)
      console.log('🏢 COURSE REPORTS - Branch IDs available for filtering:')
      console.log('🏢 Branch IDs:', branchIds)
      branches.forEach((branch: any, index: number) => {
        console.log(`   Branch ${index + 1}: ${branch.name || 'Unknown'} (ID: ${branch.id})`)
      })

      if (branches.length === 0) {
        console.log('No branches found for branch manager')
        setError("No branches assigned to you. Please contact your administrator to assign branches to your account.")
      } else {
        console.log(`✅ Loaded ${branches.length} branch(es) for ${currentUser.full_name}`)
        console.log('🔗 These branch IDs should be used for course filtering')
      }

    } catch (err: any) {
      console.error('Error loading course report filter options:', err)
      setError(err.message || 'Failed to load course report filter options')
      toast.error(err.message || 'Failed to load filter options')
    } finally {
      setInitialLoading(false)
    }
  }

  // Handle download functionality
  const handleDownloadReport = () => {
    toast.info('Download course reports')
  }

  // Handle filter changes
  const handleFilterChange = (key: keyof FilterState, value: string | boolean) => {
    const processedValue = typeof value === 'string' && value === 'all' ? '' : value
    setFilters(prev => ({ ...prev, [key]: processedValue }))
  }

  // Handle course search with branch-specific filtering
  const handleCourseSearch = async () => {
    if (!BranchManagerAuth.isAuthenticated()) {
      toast.error('Authentication required')
      return
    }

    const token = localStorage.getItem("access_token") || localStorage.getItem("token")
    if (!token) {
      toast.error('Authentication token not found')
      return
    }

    setSearchLoading(true)
    setHasSearched(true)

    try {
      // Get current branch manager's managed branches for filtering
      const currentUser = BranchManagerAuth.getCurrentUser()
      const managedBranches = currentUser?.managed_branches || []

      console.log('🔍 Branch Manager Course Search:', {
        currentUser: currentUser?.full_name,
        managedBranches,
        filters,
        token: token ? 'Present' : 'Missing'
      })

      // Apply search filters - let backend handle branch manager filtering automatically
      const searchFilters = {
        ...filters,
        skip: 0,
        limit: 50
      }

      // Remove empty/null values to let backend apply default filtering
      Object.keys(searchFilters).forEach(key => {
        if (searchFilters[key] === '' || searchFilters[key] === null || searchFilters[key] === undefined) {
          delete searchFilters[key]
        }
      })

      console.log('📡 API Request Filters:', searchFilters)

      // Use the specific course reports method with proper typing
      const response = await reportsAPI.getCourseReports(token, {
        branch_id: searchFilters.branch_id,
        category_id: searchFilters.category_id,
        difficulty_level: searchFilters.difficulty_level,
        active_only: searchFilters.active_only,
        skip: searchFilters.skip,
        limit: searchFilters.limit
      })

      console.log('✅ API Response:', response)
      console.log('📊 Response structure:', {
        hasCourses: !!response?.courses,
        coursesLength: response?.courses?.length || 0,
        hasMessage: !!response?.message,
        message: response?.message,
        summary: response?.summary
      })

      if (response && response.courses) {
        setCourseResults(response.courses)
        const courseCount = response.courses.length
        if (courseCount > 0) {
          toast.success(`Found ${courseCount} course${courseCount !== 1 ? 's' : ''}`)
        } else {
          toast.info(response.message || 'No courses found for your search criteria')
        }
      } else {
        console.warn('⚠️ No courses in response:', response)
        setCourseResults([])
        const message = response?.message || 'No courses found for your search criteria'
        toast.info(message)
      }
    } catch (error) {
      console.error('❌ Error searching courses:', error)
      toast.error('Failed to search courses. Please try again.')
      setCourseResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  // Auto-load filter options and perform initial search on component mount
  useEffect(() => {
    // Perform initial search when component loads and filter options are available
    if (filterOptions && !hasSearched) {
      console.log('🚀 Performing initial course search...')
      handleCourseSearch()
    }
  }, [filterOptions])

  // Trigger initial search even without filter options if they fail to load
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasSearched && !searchLoading) {
        console.log('⏰ Triggering fallback initial search...')
        handleCourseSearch()
      }
    }, 2000) // Wait 2 seconds for filter options, then search anyway

    return () => clearTimeout(timer)
  }, [])

  // Check authentication
  const currentUser = BranchManagerAuth.getCurrentUser()
  const isAuthenticated = BranchManagerAuth.isAuthenticated()

  if (!isAuthenticated || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please log in to access course reports.</p>
        </div>
      </div>
    )
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Reports" role="branch_admin" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Course Reports</h2>
            <p className="text-gray-600">Setting up your course analytics...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Reports" role="branch_admin" />

      <main className="w-full p-4 lg:px-8 mx-auto">
        {/* Page Header - Course Reports Specific */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/branch-manager-dashboard/reports")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Reports</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Course Reports</h1>
              <p className="text-gray-600">
                Course enrollment, completion rates, and performance analytics for your branches
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                console.log('🧪 Manual test triggered')
                handleCourseSearch()
              }}
              className="flex items-center space-x-2"
            >
              <Search className="w-4 h-4" />
              <span>Test Search</span>
            </Button>
            <Button
              className="bg-yellow-400 hover:bg-yellow-500 text-black flex items-center space-x-2"
              onClick={handleDownloadReport}
            >
              <Download className="w-4 h-4" />
              <span>Download Report</span>
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-red-700">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Course Reports Search/Filter Card */}
          {/* Search/Filter Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Search Course Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {/* Branch Dropdown - Filter to show only managed branches */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                  <BranchSelectionField readOnly />
                </div>

                {/* Category Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <Select
                    value={filters.category_id || "all"}
                    onValueChange={(value) => handleFilterChange('category_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {filterOptions?.filters?.categories?.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      )) || []}
                    </SelectContent>
                  </Select>
                </div>

                {/* Difficulty Level Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty Level</label>
                  <Select
                    value={filters.difficulty_level || "all"}
                    onValueChange={(value) => handleFilterChange('difficulty_level', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      {filterOptions?.filters?.difficulty_levels?.map((level) => (
                        <SelectItem key={level.id} value={level.id}>
                          {level.name}
                        </SelectItem>
                      )) || []}
                    </SelectContent>
                  </Select>
                </div>

                {/* Active Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Active Status</label>
                  <Select
                    value={filters.active_only ? "true" : "false"}
                    onValueChange={(value) => handleFilterChange('active_only', value === 'true')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Active Only</SelectItem>
                      <SelectItem value="false">Include Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Search Button */}
              <div className="flex justify-end">
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                  onClick={handleCourseSearch}
                  disabled={searchLoading}
                >
                  {searchLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Search Course Reports
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Course Reports Results</CardTitle>
              {courseResults.length > 0 && (
                <p className="text-sm text-gray-600">
                  Found {courseResults.length} course{courseResults.length !== 1 ? 's' : ''}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {searchLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-4 animate-spin" />
                    <p className="text-gray-600">Loading course data...</p>
                  </div>
                </div>
              ) : courseResults.length > 0 ? (
                <div className="overflow-x-auto -mx-6 sm:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm">Course Name</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm hidden sm:table-cell">Category</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm hidden md:table-cell">Enrollments</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm hidden lg:table-cell">Pricing</th>
                        </tr>
                      </thead>
                      <tbody>
                        {courseResults.map((course, index) => (
                          <tr key={course.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="py-3 px-4 text-sm text-gray-900">
                              <div>
                                <p className="font-medium">{course.title}</p>
                                <p className="text-xs text-gray-500">Code: {course.code}</p>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-900 hidden sm:table-cell">{course.category_name}</td>
                            <td className="py-3 px-4 text-sm text-gray-900 hidden md:table-cell">
                              {course.total_enrollments} ({course.active_enrollments} active)
                            </td>
                            <td className="py-3 px-4 text-sm">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                course.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {course.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 hidden lg:table-cell">
                              {course.pricing.currency} {course.pricing.amount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : hasSearched ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No courses found matching your criteria.</p>
                    <p className="text-sm text-gray-500 mt-2">Try adjusting your search filters.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Click "Search Course Reports" to view courses from your managed branches.</p>
                    <p className="text-sm text-gray-500 mt-2">
                      {currentUser?.managed_branches?.length ?
                        `You manage ${currentUser.managed_branches.length} branch${currentUser.managed_branches.length !== 1 ? 'es' : ''}` :
                        'No branches assigned - contact your administrator'
                      }
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
      </main>
    </div>
  )
}
