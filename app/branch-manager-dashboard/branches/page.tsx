"use client"

import { getBackendApiUrl } from "@/lib/config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Edit, Trash2, X, Eye } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import Header from "@/components/layout/Header"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"

interface Branch {
  id: string
  branch: {
    name: string
    code: string
    email: string
    phone: string
    address: {
      line1: string
      area: string
      city: string
      state: string
      pincode: string
      country: string
    }
  }
  manager_id: string
  is_active?: boolean
  operational_details: {
    courses_offered: string[]
    timings: Array<{
      day: string
      open: string
      close: string
    }>
    holidays: string[]
  }
  assignments: {
    accessories_available: boolean
    courses: string[]
    branch_admins: string[]
  }
  bank_details: {
    bank_name: string
    account_number: string
    upi_id: string
  }
  statistics?: {
    coach_count: number
    student_count: number
    course_count: number
    active_courses: number
  }
  created_at: string
  updated_at: string
}

export default function BranchManagerBranchInfo() {
  const router = useRouter()
  const [showAssignPopup, setShowAssignPopup] = useState(false)
  const [showDeletePopup, setShowDeletePopup] = useState(false)
  const [branchToDelete, setBranchToDelete] = useState<string | null>(null)
  const [selectedBranch, setSelectedBranch] = useState("")
  const [selectedCoach, setSelectedCoach] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  // Modal states
  const [coaches, setCoaches] = useState<any[]>([])
  const [loadingCoaches, setLoadingCoaches] = useState(false)
  const [assignmentLoading, setAssignmentLoading] = useState(false)
  const [assignmentError, setAssignmentError] = useState<string | null>(null)
  
  // Add state for pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15

  // Authentication check
  useEffect(() => {
    if (!BranchManagerAuth.isAuthenticated()) {
      router.replace('/branch-manager/login')
      return
    }
  }, [router])

  // Load branch data from real API
  useEffect(() => {
    const fetchBranchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const currentUser = BranchManagerAuth.getCurrentUser()
        const token = BranchManagerAuth.getToken()

        if (!currentUser || !token) {
          throw new Error("Authentication required. Please login again.")
        }

        console.log('Loading branches for branch manager:', currentUser.full_name)

        // Call real backend API (via proxy to avoid 405 / CORS)
        const response = await fetch(getBackendApiUrl('branches?limit=100'), {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('Branches API error:', response.status, errorText)

          if (response.status === 401) {
            throw new Error("Authentication failed. Please login again.")
          } else if (response.status === 403) {
            throw new Error("You don't have permission to access branch information.")
          } else {
            throw new Error(`Failed to load branches: ${response.status} - ${errorText}`)
          }
        }

        const data = await response.json()
        console.log('✅ Branches API response:', data)

        const branchesData = data.branches || []

        // Debug: Show branch IDs for cross-reference with coaches page
        console.log('🏢 BRANCHES PAGE - Branch IDs that should be used for coach filtering:')
        const branchIds = branchesData.map((branch: any) => branch.id)
        console.log('🏢 Branch IDs:', branchIds)
        branchesData.forEach((branch: any, index: number) => {
          console.log(`   Branch ${index + 1}: ${branch.branch?.name || 'Unknown'} (ID: ${branch.id}) - Manager ID: ${branch.manager_id}`)
        })

        if (branchesData.length === 0) {
          console.log('No branches found for branch manager')
          setError("No branches assigned to you. Please contact your administrator to assign branches to your account.")
        } else {
          console.log(`✅ Loaded ${branchesData.length} branch(es) for ${currentUser.full_name}`)
          console.log('🔗 These branch IDs should match the coaches filtering on the coaches page')
        }

        setBranches(branchesData)
      } catch (err: any) {
        console.error('Error loading branch data:', err)
        setError(err.message || 'Failed to load branch information')
      } finally {
        setLoading(false)
      }
    }

    if (BranchManagerAuth.isAuthenticated()) {
      fetchBranchData()
    }
  }, [])

  // Filter branches based on search term (for branch manager, this would be just their branch)
  const filteredBranches = branches.filter(branch =>
    branch.branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.branch.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.branch.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Pagination
  const totalPages = Math.ceil(filteredBranches.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentBranches = filteredBranches.slice(startIndex, endIndex)

  const handleViewBranch = (branchId: string) => {
    router.push(`/branch-manager-dashboard/branches/${branchId}`)
  }

  const handleEditBranch = (branchId: string) => {
    router.push(`/branch-manager-dashboard/branches/edit/${branchId}`)
  }

  const toggleBranchStatus = (branchId: string) => {
    setBranches(branches.map(branch =>
      branch.id === branchId
        ? { ...branch, is_active: !branch.is_active }
        : branch
    ))
  }

  return (
    <>
      <Header title="Branch Info" role="branch_admin" />
      <div className="flex flex-col lg:flex-row justify-between items-start py-4 mb-4 lg:items-center gap-4">
        <div>
          <p className="text-sm text-gray-500 mt-1">Manage your branch details and settings</p>
        </div>
          <div className="flex flex-wrap gap-2 lg:gap-3">
            {branches.length > 0 && (
              <Button
                onClick={() => handleEditBranch(branches[0]?.id)}
                className="text-white"
              >
                Edit Branch
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search branch information..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Branch Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Branch Details ({filteredBranches.length})
              </h2>
            </div>

            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 1 }).map((_, index) => (
                  <div key={index} className="p-6 border border-gray-200 rounded-lg animate-pulse">
                    <div className="space-y-4">
                      <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
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
                    <h3 className="text-lg font-medium text-red-800 mb-2">Unable to Load Branches</h3>
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
            ) : currentBranches.length === 0 ? (
              <div className="text-center py-12">
                <div className="max-w-md mx-auto">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-yellow-100 rounded-full">
                      <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0h2M7 7h10M7 11h10M7 15h10" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-yellow-800 mb-2">No Branches Assigned</h3>
                    <p className="text-yellow-700 mb-4">
                      {searchTerm
                        ? `No branches match your search "${searchTerm}"`
                        : "You don't have any branches assigned to manage yet."
                      }
                    </p>
                    {!searchTerm && (
                      <div className="text-sm text-yellow-600 mb-4 text-left">
                        <p className="mb-2">This could mean:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Your branch manager account hasn't been assigned to any branches</li>
                          <li>The branch assignments are still being processed</li>
                          <li>There may be a temporary system issue</li>
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
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {currentBranches.map((branch) => (
                  <div key={branch.id} className="p-6 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{branch.branch.name}</h3>
                        <p className="text-sm text-gray-500">Code: {branch.branch.code}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Switch
                          checked={branch.is_active}
                          onCheckedChange={() => toggleBranchStatus(branch.id)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewBranch(branch.id)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditBranch(branch.id)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Contact Information */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Contact Information</h4>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>Email: {branch.branch.email}</p>
                          <p>Phone: {branch.branch.phone}</p>
                        </div>
                      </div>

                      {/* Address */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Address</h4>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>{branch.branch.address.line1}</p>
                          <p>{branch.branch.address.area}, {branch.branch.address.city}</p>
                          <p>{branch.branch.address.state} - {branch.branch.address.pincode}</p>
                          <p>{branch.branch.address.country}</p>
                        </div>
                      </div>

                      {/* Statistics */}
                      {branch.statistics && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Statistics</h4>
                          <div className="space-y-1 text-sm text-gray-600">
                            <p>Students: {branch.statistics.student_count}</p>
                            <p>Coaches: {branch.statistics.coach_count}</p>
                            <p>Courses: {branch.statistics.course_count}</p>
                            <p>Active Courses: {branch.statistics.active_courses}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Operational Details */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <h4 className="font-medium text-gray-900 mb-3">Operational Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Courses Offered</h5>
                          <div className="flex flex-wrap gap-2">
                            {branch.operational_details.courses_offered.map((course, index) => (
                              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                {course}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Operating Hours</h5>
                          <div className="space-y-1 text-xs text-gray-600">
                            {branch.operational_details.timings.slice(0, 3).map((timing, index) => (
                              <p key={index}>{timing.day}: {timing.open} - {timing.close}</p>
                            ))}
                            {branch.operational_details.timings.length > 3 && (
                              <p className="text-blue-600">+{branch.operational_details.timings.length - 3} more days</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
    </>
  )
}
