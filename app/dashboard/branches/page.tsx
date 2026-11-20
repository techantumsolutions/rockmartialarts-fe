"use client"

import { getBackendApiUrl } from "@/lib/config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Edit, Trash2, Eye } from "lucide-react"
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
import { AppModal } from "@/components/ui/AppModal"

interface Branch {
  id: string
  slug?: string | null
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

export default function AcademiesList() {
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
      console.error("Error updating academy status:", error)
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

  // Fetch academies from API
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
          throw new Error(errorData.detail || errorData.message || `Failed to fetch academies (${response.status})`)
        }

        const data = await response.json()
        console.log("Academies fetched successfully:", data)

        // Handle different response formats
        const branchesData = data.branches || data || []
        console.log("Processed academies data:", branchesData)

        // Log statistics for debugging
        branchesData.forEach((branch: Branch, index: number) => {
          console.log(`Academy ${index + 1} (${branch.branch?.name}):`, {
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
          console.log(`Fetching statistics for ${branchesWithoutStats.length} academies...`)
          await fetchBranchStatistics(branchesWithoutStats, token)
        }

      } catch (error) {
        console.error("Error fetching academies:", error)
        setError(error instanceof Error ? error.message : 'Failed to fetch academies')
      } finally {
        setLoading(false)
      }
    }

    fetchBranches()
  }, [])

  // Fetch statistics for academies that don't have them
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
          console.error(`Error fetching stats for academy ${branch.id}:`, error)
        }
        return null
      })

      const statsResults = await Promise.all(statsPromises)

      // Update academies with fetched statistics
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
      console.error("Error fetching academy statistics:", error)
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
      setAssignmentError("Please select both an academy and a coach")
      return
    }

    try {
      setAssignmentLoading(true)
      setAssignmentError(null)

      const token = TokenManager.getToken()
      if (!token) {
        throw new Error("Authentication token not found. Please login again.")
      }

      // Update the academy with the new manager_id
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
          throw new Error(errorData.detail || errorData.message || `Failed to delete academy (${response.status})`)
        }

        // Remove academy from local state
        setBranches(branches.filter(branch => branch.id !== branchToDelete))
        setBranchToDelete(null)
        setShowDeletePopup(false)

      } catch (error) {
        console.error("Error deleting academy:", error)
        alert(`Error deleting academy: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }

  const branchPathKey = (branch: Branch) =>
    encodeURIComponent((branch.slug || branch.id || "").trim() || branch.id)

  const handleViewClick = (branch: Branch) => {
    router.push(`/dashboard/branches/${branchPathKey(branch)}`)
  }

  const handleEditClick = (branch: Branch) => {
    router.push(`/dashboard/branches/edit/${branchPathKey(branch)}`)
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

  // Enhanced search functionality - filter academies based on search term
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
          <h1 className="text-2xl font-bold text-[#4F5077]">Academies list</h1>
          <div className="flex space-x-3">
            {!BranchManagerAuth.isAuthenticated() && (
              <>
                <Button
                  onClick={() => router.push("/dashboard/create-branch")}
                  className=" px-6 py-2 rounded-lg font-medium"
                >
                  + Add Branch
                </Button>
                <Button
                  className="px-6"
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
                {/* <th className="px-2 py-3 text-left text-xs font-medium text-gray-500">
                  Academy ID
                </th> */}
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500">
                  Branch Name
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500">
                  Branch Location
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500">
                  <div className="flex items-center">
                    <span>Active Students</span>
                    <div className="w-2 h-2 bg-blue-500 rounded-full ml-2"></div>
                  </div>
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500">
                  <div className="flex items-center">
                    <span>Courses Offered</span>
                    <div className="w-2 h-2 bg-green-500 rounded-full ml-2"></div>
                  </div>
                </th>
                {/* <th className="px-2 py-3 text-left text-xs font-medium text-gray-500">
                  Academy Admin
                </th> */}
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500">
                  <div className="flex items-center">
                    <span>Assigned Coaches</span>
                    <div className="w-2 h-2 bg-purple-500 rounded-full ml-2"></div>
                  </div>
                </th>
                {/* <th className="px-2 py-3 text-left text-xs font-medium text-gray-500">
                  Accessories Available
                </th> */}
                {/* <th className="px-2 py-3 text-left text-xs font-medium text-gray-500">
                  Academy Email Id
                </th> */}
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500">
                  Contact number
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500">
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
                    {searchTerm ? `No academies found matching "${searchTerm}"` : 'No academies found'}
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
                          onClick={() => handleViewClick(branch)}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="text-gray-400 hover:text-gray-600"
                          onClick={() => handleEditClick(branch)}
                          title="Edit Academy"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          className="text-gray-400 hover:text-red-600"
                          onClick={() => handleDeleteClick(branch.id)}
                          title="Delete Academy"
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
          ? ""
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

      <AppModal
        open={showAssignPopup}
        onClose={() => {
          if (assignmentLoading) return
          setShowAssignPopup(false)
        }}
        title="Assign Academy Manager"
        size="lg"
        closeDisabled={assignmentLoading}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              onClick={() => setShowAssignPopup(false)}
              variant="outline"
              disabled={assignmentLoading}
              className="w-full border-[#D1D5DB] text-[#4F5077] sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedBranch || !selectedCoach || assignmentLoading || loadingCoaches}
              className="w-full bg-[#E1BB33] text-[#171A26] hover:bg-[#d4a82a] sm:w-auto"
            >
              {assignmentLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#171A26] mr-2" />
                  Assigning...
                </>
              ) : (
                "Assign Manager"
              )}
            </Button>
          </div>
        }
      >
            <div className="space-y-6">
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
                  Select Academy <span className="text-red-500">*</span>
                </label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={assignmentLoading}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose an academy to assign manager to" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredBranches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.branch?.name || 'Unknown Academy'} ({branch.id})
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
      </AppModal>

      <AppModal
        open={showDeletePopup}
        onClose={handleDeleteCancel}
        title="Delete Academy"
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              onClick={handleDeleteCancel}
              variant="outline"
              className="w-full border-[#D1D5DB] text-[#4F5077] sm:w-auto"
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} className="w-full sm:w-auto">
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-[#6B7280]">
          Are you sure you want to delete this branch? This action cannot be undone.
        </p>
      </AppModal>

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
                    {deactivateTarget?.branch?.name || "this academy"}
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
