"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Edit, Trash2, RefreshCw, Eye, Star, User, AlertCircle } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { useRouter } from "next/navigation"
import Header from "@/components/layout/Header"
import { getBackendApiUrl } from "@/lib/config"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"

interface Coach {
  id: string
  full_name: string
  email: string
  phone: string
  specialization: string
  experience_years: number
  is_active: boolean
  branch_id: string
  created_at: string
  updated_at: string
  assigned_courses?: Array<{
    course_id: string
    course_name: string
    level: string
  }>
}

export default function BranchManagerCoachesList() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [showDeletePopup, setShowDeletePopup] = useState(false)
  const [coachToDelete, setCoachToDelete] = useState<string | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15

  // Authentication check
  useEffect(() => {
    if (!BranchManagerAuth.isAuthenticated()) {
      router.replace('/branch-manager/login')
      return
    }
  }, [router])

  // Load coaches data for branch manager from API
  useEffect(() => {
    const loadCoachesData = async () => {
      try {
        setLoading(true)
        setError(null)

        const currentUser = BranchManagerAuth.getCurrentUser()
        const token = BranchManagerAuth.getToken()

        if (!currentUser || !token) {
          throw new Error("Authentication required. Please login again.")
        }

        console.log('Loading coaches for branch manager:', currentUser.full_name)
        console.log('Branch manager branch assignment:', currentUser.branch_assignment)

        // First, let's get the branches this manager manages to understand the filtering (via proxy to avoid 405/CORS)
        console.log('🔍 DEBUGGING: Fetching branches first to understand filtering...')
        const branchesResponse = await fetch(getBackendApiUrl('branches?limit=100'), {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })

        if (branchesResponse.ok) {
          const branchesData = await branchesResponse.json()
          const managedBranches = branchesData.branches || []
          const branchIds = managedBranches.map((branch: any) => branch.id)
          console.log('🏢 Branches managed by this branch manager:', managedBranches.length)
          console.log('🏢 Branch IDs:', branchIds)
          managedBranches.forEach((branch: any, index: number) => {
            console.log(`   Branch ${index + 1}: ${branch.branch?.name || 'Unknown'} (ID: ${branch.id})`)
          })
        }

        // Call real backend API via proxy to get coaches (avoids 405 Method Not Allowed)
        console.log('🧑‍🏫 Now fetching coaches...')
        const coachesResponse = await fetch(getBackendApiUrl('coaches?active_only=true&limit=100'), {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })

        console.log('Coaches API response status:', coachesResponse.status)

        if (!coachesResponse.ok) {
          const errorText = await coachesResponse.text()
          console.error('Coaches API error:', coachesResponse.status, errorText)

          if (coachesResponse.status === 401) {
            throw new Error("Authentication failed. Please login again.")
          } else if (coachesResponse.status === 403) {
            throw new Error("You don't have permission to access coach information.")
          } else {
            throw new Error(`Failed to load coaches: ${coachesResponse.status} - ${errorText}`)
          }
        }

        const coachesData = await coachesResponse.json()
        console.log('🧑‍🏫 Coaches API response:', coachesData)
        console.log('🧑‍🏫 Coaches API response type:', typeof coachesData)
        console.log('🧑‍🏫 Coaches API response keys:', Object.keys(coachesData || {}))

        // Handle different response structures
        let allCoaches = []
        if (Array.isArray(coachesData)) {
          allCoaches = coachesData
        } else if (coachesData.coaches && Array.isArray(coachesData.coaches)) {
          allCoaches = coachesData.coaches
        } else if (coachesData.data && Array.isArray(coachesData.data)) {
          allCoaches = coachesData.data
        } else {
          console.warn('Unexpected coaches API response structure:', coachesData)
          allCoaches = []
        }

        console.log('🧑‍🏫 Processing coaches:', allCoaches.length)
        console.log('🧑‍🏫 Raw coaches data:', allCoaches)

        // Debug: Show branch_id for each coach
        allCoaches.forEach((coach: any, index: number) => {
          console.log(`   Coach ${index + 1}: ${coach.full_name || coach.first_name + ' ' + coach.last_name || 'Unknown'} - Branch ID: ${coach.branch_id || 'No branch_id'}`)
        })

        // Transform the API data to match our Coach interface
        const transformedCoaches: Coach[] = allCoaches.map((coach: any) => {
          // Handle different API response structures
          const personalInfo = coach.personal_info || {}
          const contactInfo = coach.contact_info || {}
          const professionalInfo = coach.professional_info || {}

          return {
            id: coach.id || coach._id,
            full_name: coach.full_name ||
                      `${personalInfo.first_name || coach.first_name || ''} ${personalInfo.last_name || coach.last_name || ''}`.trim() ||
                      'Unknown Coach',
            email: coach.email || contactInfo.email || "",
            phone: coach.phone || contactInfo.phone || "",
            specialization: (coach.areas_of_expertise && coach.areas_of_expertise[0]) ||
                           professionalInfo.specialization ||
                           coach.specialization ||
                           "General",
            experience_years: professionalInfo.experience_years || coach.experience_years || 0,
            is_active: coach.is_active ?? true,
            branch_id: coach.branch_id || "",
            created_at: coach.created_at || new Date().toISOString(),
            updated_at: coach.updated_at || new Date().toISOString(),
            assigned_courses: coach.assigned_courses || []
          }
        })

        console.log('Transformed coaches:', transformedCoaches)
        console.log('Final coaches count:', transformedCoaches.length)

        if (transformedCoaches.length === 0) {
          console.log('No coaches found for branch manager')
          setError("No coaches assigned to your branches. Please contact your administrator if you expect to see coaches here.")
        } else {
          console.log(`✅ Loaded ${transformedCoaches.length} coach(es) for ${currentUser.full_name}`)
        }

        setCoaches(transformedCoaches)
      } catch (err: any) {
        console.error('Error loading coaches data:', err)
        setError(err.message || 'Failed to load coach information')
      } finally {
        setLoading(false)
      }
    }

    if (BranchManagerAuth.isAuthenticated()) {
      loadCoachesData()
    }
  }, [])

  // Filter coaches based on search term
  const filteredCoaches = coaches.filter(coach =>
    coach.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coach.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coach.phone.includes(searchTerm) ||
    coach.specialization.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Pagination
  const totalPages = Math.ceil(filteredCoaches.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentCoaches = filteredCoaches.slice(startIndex, endIndex)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const token = BranchManagerAuth.getToken()
      if (!token) {
        setError("Authentication token not found. Please login again.")
        return
      }

      // Get branch manager profile
      const profileResponse = await fetch(`/api/backend/branch-managers/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!profileResponse.ok) {
        throw new Error(`Failed to fetch branch manager profile: ${profileResponse.status}`)
      }

      const profileData = await profileResponse.json()
      const branchId = profileData.branch_manager?.branch_assignment?.branch_id

      if (!branchId) {
        setError("No branch assigned to this manager")
        return
      }

      // Fetch fresh coaches data
      const coachesResponse = await fetch(`/api/backend/coaches`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!coachesResponse.ok) {
        throw new Error(`Failed to fetch coaches: ${coachesResponse.status}`)
      }

      const coachesData = await coachesResponse.json()
      const allCoaches = coachesData.coaches || []
      const branchCoaches = allCoaches.filter((coach: any) => coach.branch_id === branchId)

      const transformedCoaches: Coach[] = branchCoaches.map((coach: any) => ({
        id: coach.id,
        full_name: coach.full_name || `${coach.first_name || ''} ${coach.last_name || ''}`.trim(),
        email: coach.email || coach.contact_info?.email || "",
        phone: coach.phone || coach.contact_info?.phone || "",
        specialization: coach.areas_of_expertise?.[0] || coach.specialization || "General",
        experience_years: coach.experience_years || 0,
        is_active: coach.is_active ?? true,
        branch_id: coach.branch_id || branchId,
        created_at: coach.created_at || new Date().toISOString(),
        updated_at: coach.updated_at || new Date().toISOString(),
        assigned_courses: coach.assigned_courses || []
      }))

      setCoaches(transformedCoaches)
      setError(null)
    } catch (err: any) {
      console.error('Error refreshing coaches data:', err)
      setError(err.message || 'Failed to refresh coaches data')
    } finally {
      setRefreshing(false)
    }
  }

  const handleViewCoach = (coachId: string) => {
    router.push(`/branch-manager-dashboard/coaches/${coachId}`)
  }

  const handleEditCoach = (coachId: string) => {
    router.push(`/branch-manager-dashboard/coaches/edit/${coachId}`)
  }

  const handleDeleteCoach = (coachId: string) => {
    setCoachToDelete(coachId)
    setShowDeletePopup(true)
  }

  const confirmDelete = async () => {
    if (coachToDelete) {
      try {
        const authHeaders = BranchManagerAuth.getAuthHeaders()
        if (!authHeaders.Authorization) {
          throw new Error("Authentication token not found. Please login again.")
        }

        const response = await fetch(`/api/backend/coaches/${coachToDelete}`, {
          method: 'DELETE',
          headers: authHeaders
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.detail || errorData.message || `Failed to delete coach (${response.status})`)
        }

        // Remove coach from local state
        setCoaches(coaches.filter(c => c.id !== coachToDelete))
        setCoachToDelete(null)
        setShowDeletePopup(false)

        // Show success message
        alert('Coach deleted successfully')

      } catch (error) {
        console.error("Error deleting coach:", error)
        alert(`Error deleting coach: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }

  const toggleCoachStatus = (coachId: string) => {
    setCoaches(coaches.map(coach =>
      coach.id === coachId
        ? { ...coach, is_active: !coach.is_active }
        : coach
    ))
  }

  return (
    <>
      <Header title="Coaches" role="branch_admin" />
      <div className="flex flex-col lg:flex-row justify-between items-start py-4 mb-4 lg:items-center gap-4">
        <div>
          <p className="text-sm text-gray-500 mt-1">Manage coaches in your branch</p>
        </div>
          <div className="flex flex-wrap gap-2 lg:gap-3">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
            <Button
              onClick={() => router.push("/branch-manager-dashboard/add-coach")}
              className="text-white"
            >
              Add Coach
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search coaches by name, email, phone, or specialization..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Coaches Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Coaches ({filteredCoaches.length})
              </h2>
            </div>

            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg animate-pulse">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                    </div>
                    <div className="h-6 w-16 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="max-w-md mx-auto">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-red-800 mb-2">Unable to Load Coaches</h3>
                    <p className="text-red-700 mb-4">{error}</p>
                    <Button
                      onClick={() => window.location.reload()}
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              </div>
            ) : currentCoaches.length === 0 ? (
              <div className="text-center py-12">
                <div className="max-w-md mx-auto">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-yellow-100 rounded-full">
                      <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-yellow-800 mb-2">No Coaches Found</h3>
                    <p className="text-yellow-700 mb-4">
                      {searchTerm
                        ? `No coaches match your search "${searchTerm}"`
                        : "You don't have any coaches assigned to your branches yet."
                      }
                    </p>
                    {!searchTerm && (
                      <div className="text-sm text-yellow-600 mb-4 text-left">
                        <p className="mb-2">This could mean:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>No coaches have been created and assigned to your branches</li>
                          <li>Your branch manager account may not have branch assignments</li>
                          <li>The coach assignments are still being processed</li>
                        </ul>
                        <p className="mt-2">
                          Please contact your system administrator for assistance.
                        </p>
                      </div>
                    )}
                    <div className="flex justify-center space-x-3">
                      {searchTerm && (
                        <Button
                          variant="outline"
                          onClick={() => setSearchTerm("")}
                          className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                        >
                          Clear Search
                        </Button>
                      )}
                      <Button
                        onClick={() => window.location.reload()}
                        variant="outline"
                        className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                      >
                        Refresh
                      </Button>
                      <Button
                        onClick={() => router.push("/branch-manager-dashboard/add-coach")}
                        className="text-white"
                      >
                        Add Coach
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {currentCoaches.map((coach) => (
                  <div key={coach.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {coach.full_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium text-gray-900">{coach.full_name}</h3>
                        <p className="text-sm text-gray-500">{coach.email}</p>
                        <p className="text-xs text-gray-400">{coach.phone}</p>
                        <div className="flex items-center mt-1">
                          <Star className="w-3 h-3 text-yellow-400 fill-current mr-1" />
                          <span className="text-xs text-gray-500">
                            {coach.experience_years} years experience
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <Badge variant={coach.is_active ? "default" : "secondary"}>
                          {coach.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          {coach.specialization}
                        </p>
                        {coach.assigned_courses && coach.assigned_courses.length > 0 && (
                          <p className="text-xs text-blue-600 mt-1">
                            {coach.assigned_courses.length} course(s)
                          </p>
                        )}
                      </div>
                      
                      <Switch
                        checked={coach.is_active}
                        onCheckedChange={() => toggleCoachStatus(coach.id)}
                      />
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewCoach(coach.id)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditCoach(coach.id)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Coach
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteCoach(coach.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Coach
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredCoaches.length)} of {filteredCoaches.length} coaches
                </p>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

      {/* Delete Confirmation Modal */}
      {showDeletePopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 backdrop-blur-[2px] p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this coach? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowDeletePopup(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
