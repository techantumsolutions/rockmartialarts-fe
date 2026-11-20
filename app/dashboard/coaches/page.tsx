"use client"

import { getBackendApiUrl } from "@/lib/config"
import { fetchAllCoaches } from "@/lib/coachFetch"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Edit, Trash2, ToggleLeft, ToggleRight, Eye, Mail, Loader2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import DashboardHeader from "@/components/dashboard-header"
import { TokenManager } from "@/lib/tokenManager"
import { useToast } from "@/hooks/use-toast"
import { SendCredentialsModal } from "@/components/ui/SendCredentialsModal"
import { AppModal } from "@/components/ui/AppModal"

interface Coach {
  id: string
  personal_info: {
    first_name: string
    last_name: string
    gender: string
    date_of_birth: string
  }
  contact_info: {
    email: string
    phone: string
  }
  professional_info: {
    designation_id: string
    education_qualification: string
    professional_experience: string
    certifications: string[]
  }
  areas_of_expertise: string[]
  full_name: string
  is_active: boolean
  created_at: string
}

export default function CoachesListPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [showAssignPopup, setShowAssignPopup] = useState(false)
  const [showDeletePopup, setShowDeletePopup] = useState(false)
  const [showSendCredentialsPopup, setShowSendCredentialsPopup] = useState(false)
  const [selectedCoach, setSelectedCoach] = useState<string | null>(null)
  const [selectedCoachForCredentials, setSelectedCoachForCredentials] = useState<Coach | null>(null)
  const [isSendingCredentials, setIsSendingCredentials] = useState(false)
  const [assignData, setAssignData] = useState({ branch: "", coach: "" })
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assignmentLoading, setAssignmentLoading] = useState(false)
  const [assignmentError, setAssignmentError] = useState<string | null>(null)
  const [branchesLoading, setBranchesLoading] = useState(false)
// Pagination state
const [currentPage, setCurrentPage] = useState(1)
const itemsPerPage = 15

  // Fetch academies for the assignment modal (preload on mount)
  useEffect(() => {
    const loadBranches = async () => {
      const token = TokenManager.getToken()
      if (!token) return
      try {
        setBranchesLoading(true)
        const response = await fetch(getBackendApiUrl("branches?skip=0&limit=100"), {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        })
        if (response.ok) {
          const data = await response.json()
          setBranches(data.branches || data || [])
        }
      } catch (e) {
        console.error("Error fetching academies:", e)
      } finally {
        setBranchesLoading(false)
      }
    }
    loadBranches()
  }, [])

  // Fetch coaches from API
  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        setLoading(true)
        setError(null)

        const token = TokenManager.getToken()
        if (!token) {
          throw new Error("Authentication token not found. Please login again.")
        }

        const coachesData = await fetchAllCoaches(token, { activeOnly: false })
        console.log("Coaches fetched successfully:", { coaches: coachesData, total: coachesData.length })
        setCoaches(coachesData)

      } catch (error) {
        console.error("Error fetching coaches:", error)
        setError(error instanceof Error ? error.message : 'Failed to fetch coaches')
      } finally {
        setLoading(false)
      }
    }

    fetchCoaches()
  }, [])

  const handleAssignClick = () => {
    setShowAssignPopup(true)
  }

  const handleAssignSubmit = async () => {
    if (!assignData.branch || !assignData.coach) {
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

      // Update the academy with the new manager_id (coach)
      const response = await fetch(getBackendApiUrl(`branches/${assignData.branch}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          manager_id: assignData.coach
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || errorData.message || `Failed to assign manager (${response.status})`)
      }

      alert("Coach assigned as manager successfully!")
      setShowAssignPopup(false)
      setAssignData({ branch: "", coach: "" })

    } catch (error) {
      setAssignmentError(error instanceof Error ? error.message : 'Failed to assign manager')
    } finally {
      setAssignmentLoading(false)
    }
  }

  const handleDeleteClick = (coachId: string) => {
    setSelectedCoach(coachId)
    setShowDeletePopup(true)
  }

  const handleDeleteConfirm = async () => {
    if (selectedCoach !== null) {
      try {
        const token = TokenManager.getToken()
        if (!token) {
          throw new Error("Authentication token not found. Please login again.")
        }

        const response = await fetch(getBackendApiUrl(`coaches/${selectedCoach}`), {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || errorData.message || `Failed to delete coach (${response.status})`)
        }

        // Remove coach from local state
        setCoaches(coaches.filter(coach => coach.id !== selectedCoach))
        setShowDeletePopup(false)
        setSelectedCoach(null)

      } catch (error) {
        console.error("Error deleting coach:", error)
        alert(`Error deleting coach: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }

  const handleViewClick = (coachId: string) => {
    router.push(`/dashboard/coaches/${coachId}`)
  }

  const handleEditClick = (coachId: string) => {
    router.push(`/dashboard/coaches/edit/${coachId}`)
  }

  const handleSendCredentialsClick = (coach: Coach) => {
    setSelectedCoachForCredentials(coach)
    setShowSendCredentialsPopup(true)
  }

  const handleSendCredentialsConfirm = async () => {
    if (!selectedCoachForCredentials) return

    setIsSendingCredentials(true)
    try {
      const token = TokenManager.getToken()
      if (!token) {
        throw new Error("Authentication token not found. Please login again.")
      }

      const response = await fetch(getBackendApiUrl(`coaches/${selectedCoachForCredentials.id}/send-credentials`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || errorData.message || `Failed to send credentials (${response.status})`)
      }

      const result = await response.json()

      toast({
        title: "Success",
        description: `Login credentials have been sent to ${selectedCoachForCredentials.contact_info.email}`,
      })

      setShowSendCredentialsPopup(false)
      setSelectedCoachForCredentials(null)

    } catch (error) {
      console.error("Error sending credentials:", error)
      toast({
        title: "Error",
        description: `Failed to send credentials: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      })
    } finally {
      setIsSendingCredentials(false)
    }
  }

  const toggleCoachStatus = async (coachId: string) => {
    try {
      const token = TokenManager.getToken()
      if (!token) {
        throw new Error("Authentication token not found. Please login again.")
      }

      const coach = coaches.find(c => c.id === coachId)
      if (!coach) return

      const response = await fetch(getBackendApiUrl(`coaches/${coachId}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_active: !coach.is_active
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || errorData.message || `Failed to update coach status (${response.status})`)
      }

      // Update local state
      setCoaches(coaches.map(c =>
        c.id === coachId ? { ...c, is_active: !c.is_active } : c
      ))

    } catch (error) {
      console.error("Error updating coach status:", error)
      alert(`Error updating coach status: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Enhanced search functionality - filter coaches based on search term
  const filteredCoaches = coaches.filter((coach) => {
    if (!searchTerm) return true

    const searchLower = searchTerm.toLowerCase()
    return (
      coach.full_name?.toLowerCase().includes(searchLower) ||
      coach.id?.toLowerCase().includes(searchLower) ||
      coach.contact_info?.email?.toLowerCase().includes(searchLower) ||
      coach.contact_info?.phone?.toLowerCase().includes(searchLower) ||
      coach.personal_info?.gender?.toLowerCase().includes(searchLower) ||
      coach.professional_info?.designation_id?.toLowerCase().includes(searchLower) ||
      coach.areas_of_expertise?.some(expertise =>
        expertise.toLowerCase().includes(searchLower)
      )
    )
  })

    // Calculate total pages
const totalPages = Math.ceil(filteredCoaches.length / itemsPerPage)
  useEffect(() => {
    setCurrentPage((page) => Math.min(page, Math.max(totalPages, 1)))
  }, [totalPages])
  // Slice coaches for current page
const paginatedCoaches = filteredCoaches.slice(
  (currentPage - 1) * itemsPerPage,
  currentPage * itemsPerPage
)

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader currentPage="Coaches" />

      <main className="w-full p-4 lg:px-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#4F5077]">Coach list</h1>
          <div className="flex space-x-3">
            <Button
              onClick={() => router.push("/dashboard/add-coach")}
              className=" px-6 py-2 rounded-lg font-medium"
            >
              + Add Coach
            </Button>
            <Button
              onClick={handleAssignClick}
              className="px-6"
            >
              Assign Manager
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black w-4 h-4" />
          <Input
            placeholder="Search by name, ID, location"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          </div>
        </div>

        {/* Coaches Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-4 px-4 font-medium text-[#6B7A99] text-sm">Coach Name</th>
                    <th className="text-left py-4 px-4 font-medium text-[#6B7A99] text-sm">Designation</th>
                    <th className="text-left py-4 px-4 font-medium text-[#6B7A99] text-sm">Phone Number</th>
                    <th className="text-left py-4 px-4 font-medium text-[#6B7A99] text-sm">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="py-8 px-6 text-center text-gray-500">
                        Loading coaches...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={4} className="py-8 px-6 text-center text-red-500">
                        Error: {error}
                      </td>
                    </tr>
                  ) : filteredCoaches.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 px-6 text-center text-gray-500">
                        {searchTerm ? `No coaches found matching "${searchTerm}"` : 'No coaches found'}
                      </td>
                    </tr>
                  ) : (
                    paginatedCoaches.map((coach) => (
                      <tr key={coach.id} className="border-b hover:bg-gray-50 text-[#6B7A99] text-xs">
                        <td className="py-4 px-6">{coach.full_name}</td>
                        <td className="py-4 px-6">{coach.professional_info.designation_id}</td>
                        <td className="py-4 px-6">{coach.contact_info.phone}</td>
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewClick(coach.id)}
                              className="p-1 h-8 w-8"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(coach.id)}
                              className="p-1 h-8 w-8"
                              title="Edit Coach"
                            >
                              <Edit className="w-4 h-4 text-gray-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSendCredentialsClick(coach)}
                              className="p-1 h-8 w-8"
                              title="Send Credentials via Email"
                            >
                              <Mail className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(coach.id)}
                              className="p-1 h-8 w-8"
                              title="Delete Coach"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleCoachStatus(coach.id)}
                              className="p-1 h-8 w-8"
                            >
                              {coach.is_active ? (
                                <ToggleRight className="w-4 h-4 text-green-600" />
                              ) : (
                                <ToggleLeft className="w-4 h-4 text-gray-400" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

           {/* Pagination */}
<div className="flex justify-center items-center space-x-2 py-4 border-t">
  {totalPages > 1 && (
    <Button
      variant="outline"
      size="sm"
      className="bg-gray-200"
      disabled={currentPage <= 1}
      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
    >
      Previous
    </Button>
  )}

  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
    <Button
      key={page}
      onClick={() => setCurrentPage(page)}
      className={`${
        currentPage === page
          ? ""
          : "bg-transparent"
      }`}
      variant={currentPage === page ? "default" : "outline"}
      size="sm"
    >
      {page}
    </Button>
  ))}

  {totalPages > 1 && (
    <Button
      variant="outline"
      size="sm"
      className="bg-gray-200"
      disabled={currentPage >= totalPages}
      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
    >
      Next
    </Button>
  )}
</div>

          </CardContent>
        </Card>
      </main>

      <AppModal
        open={showAssignPopup}
        onClose={() => {
          if (assignmentLoading) return
          setShowAssignPopup(false)
          setAssignmentError(null)
          setAssignData({ branch: "", coach: "" })
        }}
        title="Assign Coach as Branch Manager"
        size="md"
        closeDisabled={assignmentLoading}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowAssignPopup(false)
                setAssignmentError(null)
                setAssignData({ branch: "", coach: "" })
              }}
              disabled={assignmentLoading}
              className="w-full border-[#D1D5DB] text-[#4F5077] sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignSubmit}
              disabled={assignmentLoading}
              className="w-full bg-[#E1BB33] text-[#171A26] hover:bg-[#d4a82a] sm:w-auto"
            >
              {assignmentLoading ? "Assigning..." : "Assign as Manager"}
            </Button>
          </div>
        }
      >
        {assignmentError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{assignmentError}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Academy</label>
            <Select
              value={assignData.branch}
              onValueChange={(value) => setAssignData({ ...assignData, branch: value })}
              disabled={branchesLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={branchesLoading ? "Loading academies..." : branches.length === 0 ? "No academies available" : "Choose an branch..."} />
              </SelectTrigger>
              <SelectContent
                position="popper"
                className="w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)]"
              >
                {branches.map((branch) => {
                  const branchName = branch.branch?.name ?? branch.name ?? "Unnamed Academy"
                  const address = branch.branch?.address ?? branch.address
                  const addressText = address ? [address.area, address.city].filter(Boolean).join(", ") || "No address" : "No address"

                  return (
                    <SelectItem key={branch.id} value={branch.id} className="max-w-full">
                      <span className="block truncate">{branchName} - {addressText}</span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Coach</label>
            <Select
              value={assignData.coach}
              onValueChange={(value) => setAssignData({ ...assignData, coach: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={filteredCoaches.length === 0 ? "No coaches available" : "Choose a coach..."} />
              </SelectTrigger>
              <SelectContent
                position="popper"
                className="w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)]"
              >
                {filteredCoaches.map((coach) => (
                  <SelectItem key={coach.id} value={coach.id} className="max-w-full">
                    <div className="flex flex-col min-w-0 max-w-full overflow-hidden">
                      <span className="font-medium truncate">{coach.full_name}</span>
                      <span className="text-sm text-gray-500 truncate">{coach.contact_info?.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </AppModal>

      <AppModal
        open={showDeletePopup}
        onClose={() => setShowDeletePopup(false)}
        title="Delete Coach"
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setShowDeletePopup(false)}
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
          Are you sure you want to delete this coach? This action cannot be undone.
        </p>
      </AppModal>

      <SendCredentialsModal
        open={Boolean(showSendCredentialsPopup && selectedCoachForCredentials)}
        onClose={() => {
          if (isSendingCredentials) return
          setShowSendCredentialsPopup(false)
          setSelectedCoachForCredentials(null)
        }}
        onConfirm={handleSendCredentialsConfirm}
        name={selectedCoachForCredentials?.full_name || ""}
        email={selectedCoachForCredentials?.contact_info?.email || ""}
        roleLabel="Coach"
        sending={isSendingCredentials}
      />
    </div>
  )
}
