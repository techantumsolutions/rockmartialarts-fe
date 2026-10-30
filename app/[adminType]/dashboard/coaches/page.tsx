"use client"

import { getBackendApiUrl } from "@/lib/config"
import { fetchAllCoaches } from "@/lib/coachFetch"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Edit, ToggleLeft, ToggleRight, Eye, Mail, Loader2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import { TokenManager } from "@/lib/tokenManager"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { useToast } from "@/hooks/use-toast"

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
  approval_status?: string | null
  created_at: string
}

export default function CoachesListPage() {
  const router = useRouter()
  const basePath = useDashboardBasePath()
  const isBranchAdmin = basePath.includes("branch-admin")
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [showSendCredentialsPopup, setShowSendCredentialsPopup] = useState(false)
  const [selectedCoachForCredentials, setSelectedCoachForCredentials] = useState<Coach | null>(null)
  const [isSendingCredentials, setIsSendingCredentials] = useState(false)
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
// Pagination state
const [currentPage, setCurrentPage] = useState(1)
const itemsPerPage = 15

  const authToken = () => {
    if (isBranchAdmin) {
      return BranchManagerAuth.getToken() || TokenManager.getToken()
    }
    return TokenManager.getToken() || BranchManagerAuth.getToken()
  }

  // Fetch coaches from API (BM token scopes list to managed branch only)
  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        setLoading(true)
        setError(null)

        const token = authToken()
        if (!token) {
          throw new Error("Authentication token not found. Please login again.")
        }

        // Branch admin: the API keeps coaches whose branch_id is a branch this
        // login manages (branches.manager_id). Do not send branch_assignment.branch_id;
        // that field can still point at a different branch.
        const coachesData = await fetchAllCoaches(token, { activeOnly: false })
        setCoaches(coachesData)

      } catch (error) {
        console.error("Error fetching coaches:", error)
        setError(error instanceof Error ? error.message : 'Failed to fetch coaches')
      } finally {
        setLoading(false)
      }
    }

    fetchCoaches()
  }, [isBranchAdmin])

  const handleViewClick = (coachId: string) => {
    router.push(`${basePath}/coaches/${coachId}`)
  }

  const handleEditClick = (coachId: string) => {
    router.push(`${basePath}/coaches/edit/${coachId}`)
  }

  const handleSendCredentialsClick = (coach: Coach) => {
    setSelectedCoachForCredentials(coach)
    setShowSendCredentialsPopup(true)
  }

  const handleSendCredentialsConfirm = async () => {
    if (!selectedCoachForCredentials) return

    setIsSendingCredentials(true)
    try {
      const token = authToken()
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
      const token = authToken()
      if (!token) {
        throw new Error("Authentication token not found. Please login again.")
      }

      const coach = coaches.find(c => c.id === coachId)
      if (!coach) return

      // Branch admin cannot use PUT /coaches/{id}; use activate / deactivate endpoints instead
      const response = isBranchAdmin
        ? await fetch(
            getBackendApiUrl(
              coach.is_active ? `coaches/${coachId}` : `coaches/${coachId}/activate`
            ),
            {
              method: coach.is_active ? "DELETE" : "PATCH",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          )
        : await fetch(getBackendApiUrl(`coaches/${coachId}`), {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              is_active: !coach.is_active,
            }),
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
  // Slice coaches for current page
const paginatedCoaches = filteredCoaches.slice(
  (currentPage - 1) * itemsPerPage,
  currentPage * itemsPerPage
)

  return (
    <div className="min-h-screen bg-gray-50">

      <main className="w-full p-4 lg:px-8 lg:py-6">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#4F5077]">Coach list</h1>
          <div className="flex space-x-3">
            {!isBranchAdmin && (
              <Button
                onClick={() => router.push(`${basePath}/coach-approvals`)}
                variant="outline"
                className="border-[#4F5077] text-[#4F5077] px-4 py-2 rounded-lg font-medium"
              >
                Coach Approvals
              </Button>
            )}
            <Button
              onClick={() => router.push(`${basePath}/coach-availability`)}
              variant="outline"
              className="border-[#4F5077] text-[#4F5077] px-4 py-2 rounded-lg font-medium"
            >
              Availability
            </Button>
            <Button
              onClick={() => router.push(`${basePath}/add-coach`)}
              className="bg-yellow-400 hover:bg-yellow-500 text-white px-6 py-2 rounded-lg font-medium"
            >
              + Add Coach
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
                    <th className="text-left py-4 px-4 font-medium text-[#6B7A99] text-sm">Approval</th>
                    <th className="text-left py-4 px-4 font-medium text-[#6B7A99] text-sm">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-8 px-6 text-center text-gray-500">
                        Loading coaches...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={5} className="py-8 px-6 text-center text-red-500">
                        Error: {error}
                      </td>
                    </tr>
                  ) : filteredCoaches.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 px-6 text-center text-gray-500">
                        {searchTerm ? `No coaches found matching "${searchTerm}"` : 'No coaches found'}
                      </td>
                    </tr>
                  ) : (
                    paginatedCoaches.map((coach) => (
                      <tr key={coach.id} className="border-b hover:bg-gray-50 text-[#6B7A99] text-xs">
                        <td className="py-4 px-6 ">{coach.full_name}</td>
                        <td className="py-4 px-6">{coach.professional_info.designation_id}</td>
                        <td className="py-4 px-6">{coach.contact_info.phone}</td>
                        <td className="py-4 px-6">
                          <Badge
                            variant="outline"
                            className={
                              (coach.approval_status || "approved") === "pending"
                                ? "bg-amber-50 text-amber-900 border-amber-200"
                                : (coach.approval_status || "approved") === "rejected"
                                  ? "bg-red-50 text-red-800 border-red-200"
                                  : "bg-green-50 text-green-800 border-green-200"
                            }
                          >
                            {(coach.approval_status || "approved").replace(/^\w/, (c) =>
                              c.toUpperCase()
                            )}
                          </Badge>
                        </td>
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
                              onClick={() => toggleCoachStatus(coach.id)}
                              className="p-1 h-8 w-8"
                              title={coach.is_active ? "Deactivate Coach" : "Activate Coach"}
                              aria-label={coach.is_active ? "Deactivate Coach" : "Activate Coach"}
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
  <Button
    variant="outline"
    size="sm"
    className="bg-gray-200"
    disabled={currentPage === 1}
    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
  >
    Previous
  </Button>

  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
    <Button
      key={page}
      onClick={() => setCurrentPage(page)}
      className={`${
        currentPage === page
          ? "bg-yellow-400 hover:bg-yellow-500 text-black"
          : "bg-transparent"
      }`}
      variant={currentPage === page ? "default" : "outline"}
      size="sm"
    >
      {page}
    </Button>
  ))}

  <Button
    variant="outline"
    size="sm"
    className="bg-gray-200"
    disabled={currentPage === totalPages}
    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
  >
    Next
  </Button>
</div>

          </CardContent>
        </Card>
      </main>

      {/* Send Credentials Confirmation Popup */}
      {showSendCredentialsPopup && selectedCoachForCredentials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Send Login Credentials</h3>
              <p className="text-gray-600 mb-2">
                Send login credentials to <strong>{selectedCoachForCredentials.full_name}</strong>?
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Email will be sent to: <strong>{selectedCoachForCredentials.contact_info.email}</strong>
              </p>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSendCredentialsPopup(false)
                    setSelectedCoachForCredentials(null)
                  }}
                  className="flex-1"
                  disabled={isSendingCredentials}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendCredentialsConfirm}
                  className="bg-green-600 hover:bg-green-700 text-white flex-1"
                  disabled={isSendingCredentials}
                >
                  {isSendingCredentials ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Credentials'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
