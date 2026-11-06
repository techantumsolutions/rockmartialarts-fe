"use client"

import { getBackendApiUrl } from "@/lib/config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Edit, Trash2, X, Eye } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { TokenManager } from "@/lib/tokenManager"
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

export default function BranchesList() {
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
  const [deactivateTarget, setDeactivateTarget] = useState<Branch | null>(null)
  const [statusUpdating, setStatusUpdating] = useState(false)

  const updateBranchActiveStatus = async (branch: Branch, isActive: boolean) => {
    try {
      setStatusUpdating(true)
      const token = TokenManager.getToken()
      if (!token) return

      const response = await fetch(getBackendApiUrl(`branches/${branch.id}`), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: isActive }),
      })

      if (response.ok) {
        setBranches((prev) =>
          prev.map((b) => (b.id === branch.id ? { ...b, is_active: isActive } : b))
        )
      }
    } catch (error) {
      console.error("Error updating branch status:", error)
    } finally {
      setStatusUpdating(false)
      setDeactivateTarget(null)
    }
  }

  const handleBranchActiveToggle = (branch: Branch, checked: boolean) => {
    if (checked) {
      void updateBranchActiveStatus(branch, true)
      return
    }
    setDeactivateTarget(branch)
  }
  // Add state for pagination
const [currentPage, setCurrentPage] = useState(1)
const itemsPerPage = 15

  // Fetch branches from API
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setLoading(true)
        setError(null)

        const token = TokenManager.getToken()
        if (!token) {
          throw new Error("Authentication token not found. Please login again.")
        }

        const response = await fetch(getBackendApiUrl("branches?active_only=false&limit=500"), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || errorData.message || `Failed to fetch branches (${response.status})`)
        }

        const data = await response.json()
        console.log("Branches fetched successfully:", data)

        // Handle different response formats
        const branchesData = data.branches || data || []
        console.log("Processed branches data:", branchesData)

        // Log statistics for debugging
        branchesData.forEach((branch: Branch, index: number) => {
          console.log(`Branch ${index + 1} (${branch.branch?.name}):`, {
            id: branch.id,
            statistics: branch.statistics,
            manager_id: branch.manager_id,
            branch_admins: branch.assignments?.branch_admins?.length || 0
          })
        })

        setBranches(branchesData)

        // If statistics are not included, try to fetch them separately
        const branchesWithoutStats = branchesData.filter((branch: Branch) => !branch.statistics)
        if (branchesWithoutStats.length > 0) {
          console.log(`Fetching statistics for ${branchesWithoutStats.length} branches...`)
          await fetchBranchStatistics(branchesWithoutStats, token)
        }

      } catch (error) {
        console.error("Error fetching branches:", error)
        setError(error instanceof Error ? error.message : 'Failed to fetch branches')
      } finally {
        setLoading(false)
      }
    }

    fetchBranches()
  }, [])

  // Fetch statistics for branches that don't have them
  const fetchBranchStatistics = async (branchesWithoutStats: Branch[], token: string) => {
    try {
      setLoadingStats(true)

      const statsPromises = branchesWithoutStats.map(async (branch) => {
        try {
          const response = await fetch(getBackendApiUrl(`branches/${branch.id}/stats`), {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })

          if (response.ok) {
            const statsData = await response.json()
            return {
              branchId: branch.id,
              statistics: statsData.statistics
            }
          }
        } catch (error) {
          console.error(`Error fetching stats for branch ${branch.id}:`, error)
        }
        return null
      })

      const statsResults = await Promise.all(statsPromises)

      // Update branches with fetched statistics
      setBranches(prevBranches =>
        prevBranches.map(branch => {
          const statsResult = statsResults.find(result => result?.branchId === branch.id)
          if (statsResult) {
            return { ...branch, statistics: statsResult.statistics }
          }
          return branch
        })
      )

    } catch (error) {
      console.error("Error fetching branch statistics:", error)
    } finally {
      setLoadingStats(false)
    }
  }

  // Fetch coaches for assignment modal
  const fetchCoaches = async () => {
    try {
      setLoadingCoaches(true)
      setAssignmentError(null)

      const token = TokenManager.getToken()
      if (!token) {
        throw new Error("Authentication token not found. Please login again.")
      }

      const response = await fetch(getBackendApiUrl("coaches?active_only=true&limit=100"), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || errorData.message || `Failed to fetch coaches (${response.status})`)
      }

      const data = await response.json()
      console.log("Coaches fetched successfully:", data)

      // Handle different response formats
      const coachesData = data.coaches || data || []
      setCoaches(coachesData)

    } catch (error) {
      console.error("Error fetching coaches:", error)
      setAssignmentError(error instanceof Error ? error.message : 'Failed to fetch coaches')
    } finally {
      setLoadingCoaches(false)
    }
  }

  const handleAssign = async () => {
    if (!selectedBranch || !selectedCoach) {
      setAssignmentError("Please select both a branch and a coach")
      return
    }

    try {
      setAssignmentLoading(true)
      setAssignmentError(null)

      const token = TokenManager.getToken()
      if (!token) {
        throw new Error("Authentication token not found. Please login again.")
      }

      // Update the branch with the new manager_id
      const response = await fetch(getBackendApiUrl(`branches/${selectedBranch}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          manager_id: selectedCoach
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || errorData.message || `Failed to assign manager (${response.status})`)
      }

      const responseData = await response.json()
      console.log("Manager assigned successfully:", responseData)

      // Update local state to reflect the change
      setBranches(prevBranches =>
        prevBranches.map(branch =>
          branch.id === selectedBranch
            ? { ...branch, manager_id: selectedCoach }
            : branch
        )
      )

      // Reset form and close modal
      setSelectedBranch("")
      setSelectedCoach("")
      setShowAssignPopup(false)

      // Show success message
      alert("Manager assigned successfully!")

    } catch (error) {
      console.error("Error assigning manager:", error)
      setAssignmentError(error instanceof Error ? error.message : 'Failed to assign manager')
    } finally {
      setAssignmentLoading(false)
    }
  }

  const handleDeleteClick = (branchId: string) => {
    setBranchToDelete(branchId)
    setShowDeletePopup(true)
  }

  const handleDeleteConfirm = async () => {
    if (branchToDelete) {
      try {
        const token = TokenManager.getToken()
        if (!token) {
          throw new Error("Authentication token not found. Please login again.")
        }

        const response = await fetch(getBackendApiUrl(`branches/${branchToDelete}`), {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || errorData.message || `Failed to delete branch (${response.status})`)
        }

        // Remove branch from local state
        setBranches(branches.filter(branch => branch.id !== branchToDelete))
        setBranchToDelete(null)
        setShowDeletePopup(false)

      } catch (error) {
        console.error("Error deleting branch:", error)
        alert(`Error deleting branch: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }

  const handleViewClick = (branchId: string) => {
    router.push(`/dashboard/branches/${branchId}`)
  }

  const handleEditClick = (branchId: string) => {
    router.push(`/dashboard/branches/edit/${branchId}`)
  }

  const handleDeleteCancel = () => {
    setShowDeletePopup(false)
    setBranchToDelete(null)
  }

  const handleOpenAssignModal = () => {
    setShowAssignPopup(true)
    setAssignmentError(null)
    setSelectedBranch("")
    setSelectedCoach("")
    fetchCoaches() // Fetch coaches when modal opens
  }

  // Enhanced search functionality - filter branches based on search term
  const filteredBranches = branches.filter((branch) => {
    if (!searchTerm) return true

    const searchLower = searchTerm.toLowerCase()
    return (
      branch.branch?.name?.toLowerCase().includes(searchLower) ||
      branch.id?.toLowerCase().includes(searchLower) ||
      branch.branch?.address?.line1?.toLowerCase().includes(searchLower) ||
      branch.branch?.address?.city?.toLowerCase().includes(searchLower) ||
      branch.branch?.address?.state?.toLowerCase().includes(searchLower) ||
      branch.branch?.email?.toLowerCase().includes(searchLower) ||
      branch.branch?.phone?.toLowerCase().includes(searchLower)
    )
  })
  // Calculate paginated data
const totalPages = Math.ceil(filteredBranches.length / itemsPerPage)
const paginatedBranches = filteredBranches.slice(
  (currentPage - 1) * itemsPerPage,
  currentPage * itemsPerPage
)


  return (
    <div className="w-full p-4 lg:px-8 overflow-x-hidden">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#4F5077]">Branches list</h1>
          <div className="flex space-x-3">
            {!BranchManagerAuth.isAuthenticated() && (
              <>
                <Button
                  onClick={() => router.push("/dashboard/create-branch")}
                  className="bg-yellow-400 hover:bg-yellow-500 text-white px-6 py-2 rounded-lg font-medium"
                >
                  + Add Branch
                </Button>
                <Button
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6"
                  onClick={handleOpenAssignModal}
                >
                  Assign Manager
                </Button>
                <Button
                  className="bg-green-500 hover:bg-green-600 text-white px-6"
                  onClick={() => router.push("/dashboard/branch-managers")}
                >
                  Branch Managers
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black w-4 h-4" />
            <Input
              placeholder="Search by name, ID, Location"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr className="text-[#6B7A99]">
                {/* <th className="px-2 py-3 text-left text-xs font-medium text-gray-500  ">
                  Branch ID
                </th> */}
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500  ">
                  Branch Name
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500  ">
                  Branch Location
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500  ">
                  <div className="flex items-center">
                    <span>Active Students</span>
                    <div className="w-2 h-2 bg-blue-500 rounded-full ml-2"></div>
                  </div>
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500  ">
                  <div className="flex items-center">
                    <span>Courses Offered</span>
                    <div className="w-2 h-2 bg-green-500 rounded-full ml-2"></div>
                  </div>
                </th>
                {/* <th className="px-2 py-3 text-left text-xs font-medium text-gray-500  ">
                  Branch Admin
                </th> */}
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500  ">
                  <div className="flex items-center">
                    <span>Assigned Coaches</span>
                    <div className="w-2 h-2 bg-purple-500 rounded-full ml-2"></div>
                  </div>
                </th>
                {/* <th className="px-2 py-3 text-left text-xs font-medium text-gray-500  ">
                  Accessories Available
                </th> */}
                {/* <th className="px-2 py-3 text-left text-xs font-medium text-gray-500  ">
                  Branch Email Id
                </th> */}
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500  ">
                  Contact number
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500  ">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 px-6 text-center text-gray-500">
                    Loading branches...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="py-8 px-6 text-center text-red-500">
                    Error: {error}
                  </td>
                </tr>
              ) : filteredBranches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 px-6 text-center text-gray-500">
                    {searchTerm ? `No branches found matching "${searchTerm}"` : 'No branches found'}
                  </td>
                </tr>
              ) : (
                paginatedBranches.map((branch) => (
                  <tr
                    key={branch.id}
                    className={`hover:bg-gray-50 ${branch.is_active === false ? "bg-gray-50/80" : ""}`}
                  >
                    {/* <td className="px-2 py-4 whitespace-nowrap text-xs text-[#6B7A99]">{branch.id}</td> */}
                    <td className="px-2 py-4 whitespace-nowrap text-xs text-[#6B7A99]">
                      <div className="flex items-center gap-2">
                        <span>{branch.branch?.name || 'N/A'}</span>
                        {branch.is_active === false && (
                          <span className="inline-flex px-2 py-0.5 text-[10px] font-medium rounded bg-red-100 text-red-700">
                            Disabled
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-4 text-xs text-[#6B7A99] max-w-xs">
                      {branch.branch?.address ?
                        `${branch.branch.address.line1}, ${branch.branch.address.city}, ${branch.branch.address.state}` :
                        'Address not available'
                      }
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap text-xs text-[#6B7A99]">
                      <div className="flex items-center">
                        {loadingStats && !branch.statistics ? (
                          <div className="animate-pulse bg-gray-200 rounded-full px-2.5 py-0.5 text-xs">
                            Loading...
                          </div>
                        ) : (
                          <span className="inline-flex items-center text-xs text-[#6B7A99]">
                            {branch.statistics?.student_count ?? 0} 
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap text-xs text-[#6B7A99]">
                      <div className="flex items-center">
                        {loadingStats && !branch.statistics ? (
                          <div className="animate-pulse bg-gray-200 rounded-full px-2.5 py-0.5 text-xs">
                            Loading...
                          </div>
                        ) : (
                          <span className="inline-flex items-center text-xstext-[#6B7A99]">
                            {branch.statistics?.course_count ?? branch.operational_details?.courses_offered?.length ?? 0} 
                          </span>
                        )}
                      </div>
                    {/* <td className="px-2 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-xs text-[#6B7A99]">{branch.manager_id || 'Not Assigned'}</span>
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-[#FFC403] text-[#FFFFFF] mt-1 w-fit">
                          Change
                        </span>
                      </div>
                    </td> */}
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap text-xs text-[#6B7A99]">
                      <div className="flex items-center">
                        {loadingStats && !branch.statistics ? (
                          <div className="animate-pulse bg-gray-200 rounded-full px-2.5 py-0.5 text-xs">
                            Loading...
                          </div>
                        ) : (
                          <span className="text-xs text-[#6B7A99]">
                            {branch.statistics?.coach_count ?? 0} 
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap text-xs text-[#6B7A99]">
                      {branch.assignments?.accessories_available ? 'Yes' : 'No'}
                    {/* <td className="px-2 py-4 whitespace-nowrap text-xs text-[#6B7A99]">
                      {branch.assignments?.accessories_available ? 'Yes' : 'No'}
                    </td> */}
                    {/* <td className="px-2 py-4 whitespace-nowrap text-xs text-[#6B7A99]">{branch.branch?.email || 'N/A'}</td> */}
                      <div className="flex items-center space-x-2">
                        <button
                          className="text-blue-400 hover:text-blue-600"
                          onClick={() => handleViewClick(branch.id)}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="text-gray-400 hover:text-gray-600"
                          onClick={() => handleEditClick(branch.id)}
                          title="Edit Branch"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          className="text-gray-400 hover:text-red-600"
                          onClick={() => handleDeleteClick(branch.id)}
                          title="Delete Branch"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <Switch
                          checked={branch.is_active ?? true}
                          disabled={statusUpdating}
                          className="data-[state=checked]:bg-yellow-400"
                          onCheckedChange={(checked) =>
                            handleBranchActiveToggle(branch, checked)
                          }
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

       <div className="flex items-center justify-center space-x-2 mt-6">
  <Button
    variant="outline"
    className="px-3 py-2 bg-transparent"
    disabled={currentPage === 1}
    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
  >
    Previous
  </Button>

  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
    <Button
      key={page}
      onClick={() => setCurrentPage(page)}
      className={`px-3 py-2 ${
        currentPage === page
          ? "bg-yellow-400 hover:bg-yellow-500 text-black"
          : "bg-transparent"
      }`}
      variant={currentPage === page ? "default" : "outline"}
    >
      {page}
    </Button>
  ))}

  <Button
    variant="outline"
    className="px-3 py-2 bg-transparent"
    disabled={currentPage === totalPages}
    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
  >
    Next
  </Button>
</div>

      {showAssignPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-auto max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Assign Branch Manager</h2>
              <button
                onClick={() => setShowAssignPopup(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={assignmentLoading}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Error Display */}
              {assignmentError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <div className="text-red-800 text-sm">
                      {assignmentError}
                    </div>
                  </div>
                </div>
              )}

              {/* Branch Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Branch <span className="text-red-500">*</span>
                </label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={assignmentLoading}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a branch to assign manager to" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredBranches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.branch?.name || 'Unknown Branch'} ({branch.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Coach Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Coach as Manager <span className="text-red-500">*</span>
                </label>
                {loadingCoaches ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-gray-500">Loading coaches...</div>
                  </div>
                ) : (
                  <Select value={selectedCoach} onValueChange={setSelectedCoach} disabled={assignmentLoading}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a coach to assign as manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {coaches.length > 0 ? (
                        coaches.map((coach) => (
                          <SelectItem key={coach.id} value={coach.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{coach.full_name}</span>
                              <span className="text-xs text-gray-500">
                                {coach.contact_info?.email} • {coach.areas_of_expertise?.join(', ')}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>
                          No active coaches available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
              <Button
                onClick={() => setShowAssignPopup(false)}
                variant="outline"
                disabled={assignmentLoading}
                className="px-6"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssign}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6"
                disabled={!selectedBranch || !selectedCoach || assignmentLoading || loadingCoaches}
              >
                {assignmentLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Assigning...
                  </>
                ) : (
                  'Assign Manager'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showDeletePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Delete Branch</h2>
              <button onClick={handleDeleteCancel} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600">
                Are you sure you want to delete this branch? This action cannot be undone.
              </p>
            </div>

            <div className="flex space-x-3">
              <Button onClick={handleDeleteCancel} variant="outline" className="flex-1 bg-transparent">
                Cancel
              </Button>
              <Button onClick={handleDeleteConfirm} className="flex-1 bg-red-500 hover:bg-red-600 text-white">
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => {
          if (!open && !statusUpdating) setDeactivateTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate this branch?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  You are about to deactivate{" "}
                  <span className="font-medium text-foreground">
                    {deactivateTarget?.branch?.name || "this branch"}
                  </span>
                  .
                </p>
                <p>
                  The assigned Branch Manager will not be able to use this branch until it is
                  reactivated. If they manage other active branches, they can switch to those.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={statusUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={statusUpdating || !deactivateTarget}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={(e) => {
                e.preventDefault()
                if (deactivateTarget) void updateBranchActiveStatus(deactivateTarget, false)
              }}
            >
              {statusUpdating ? "Deactivating…" : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
