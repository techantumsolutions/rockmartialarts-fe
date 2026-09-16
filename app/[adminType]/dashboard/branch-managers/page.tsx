"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Edit, Trash2, ToggleLeft, ToggleRight, Eye, Mail, Loader2, Plus } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TokenManager } from "@/lib/tokenManager"
import { SuperAdminAuth } from "@/lib/auth"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { useToast } from "@/hooks/use-toast"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import { getBackendApiUrl } from "@/lib/config"

interface BranchManager {
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
    designation: string
    education_qualification: string
    professional_experience: string
    certifications: string[]
  }
  branch_assignment: {
    branch_id: string
    branch_name: string
  }
  full_name: string
  is_active: boolean
  created_at: string
  email: string
}

export default function BranchManagersListPage() {
  const router = useRouter()
  const basePath = useDashboardBasePath()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [showDeletePopup, setShowDeletePopup] = useState(false)
  const [showSendCredentialsPopup, setShowSendCredentialsPopup] = useState(false)
  const [selectedManager, setSelectedManager] = useState<string | null>(null)
  const [selectedManagerForCredentials, setSelectedManagerForCredentials] = useState<BranchManager | null>(null)
  const [isSendingCredentials, setIsSendingCredentials] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [branchManagers, setBranchManagers] = useState<BranchManager[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [branches,setBranches] = useState<any[]>([]) // <-- new state for branches
  const [selectedBranch, setSelectedBranch] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15

  // Branch admin cannot access branch managers list — redirect to branch admin dashboard
  useEffect(() => {
    if (BranchManagerAuth.isAuthenticated()) {
      router.replace("/branch-admin/dashboard")
    }
  }, [router])

  // Fetch branch managers from API
useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🔄 Starting to fetch branch managers & branches...")
      console.log("🔗 API Base URL:", process.env.NEXT_PUBLIC_API_BASE_URL)

      // 🔹 Step 1: Health check (optional; don't block if backend URL not set or proxy used)
      const backendBase = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL
      if (backendBase) {
        try {
          const healthResponse = await fetch(`${backendBase.replace(/\/$/, "")}/health`)
          console.log("🏥 Health check:", healthResponse.status, await healthResponse.json().catch(() => ({})))
        } catch (healthError) {
          console.warn("Health check failed (continuing):", healthError)
        }
      }

      // 🔹 Step 2: Superadmin auth check
      if (!SuperAdminAuth.isAuthenticated()) {
        console.log("❌ Superadmin not authenticated")
        router.push("/superadmin/login")
        return
      }

      const token = SuperAdminAuth.getToken()
      console.log("🔑 Token available:", !!token)

      if (!token) {
        console.log("❌ No authentication token found")
        router.push("/superadmin/login")
        return
      }

      // 🔹 Step 3: Fetch all Branch Managers (active and inactive)
      const allManagers: BranchManager[] = []
      let skip = 0
      const pageSize = 100
      let totalCount = Infinity
      while (skip < totalCount) {
        const managersUrl = getBackendApiUrl(
          `branch-managers?active_only=false&skip=${skip}&limit=${pageSize}`
        )
        console.log("📡 Fetching managers:", managersUrl)

        const managersResponse = await fetch(managersUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!managersResponse.ok) {
          const errorData = await managersResponse.json().catch(() => ({ detail: "Unknown error" }))
          throw new Error(
            errorData.detail ||
              errorData.message ||
              `Failed to fetch branch managers (${managersResponse.status})`
          )
        }

        const managersData = await managersResponse.json()
        const batch = managersData.branch_managers || []
        totalCount = typeof managersData.total_count === "number" ? managersData.total_count : skip + batch.length
        allManagers.push(...batch)
        if (batch.length < pageSize) break
        skip += pageSize
      }

      setBranchManagers(allManagers)
      console.log("✅ Branch managers fetched:", allManagers)

      // 🔹 Step 4: Fetch Branches (Authenticated)
      const branchesUrl = getBackendApiUrl("branches?skip=0&limit=50")
      console.log("📡 Fetching branches:", branchesUrl)

      const branchesResponse = await fetch(branchesUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!branchesResponse.ok) {
        const errorData = await branchesResponse.json().catch(() => ({ detail: "Unknown error" }))
        throw new Error(
          errorData.detail ||
            errorData.message ||
            `Failed to fetch branches (${branchesResponse.status})`
        )
      }

      const branchesData = await branchesResponse.json()
      const branchesList = branchesData.branches || []
      setBranches(branchesList)
      console.log("✅ Branches fetched:", branchesList)
    } catch (error) {
      console.error("❌ Error fetching data:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch data"
      setError(errorMessage)

      if (errorMessage.includes("Authentication token not found") || errorMessage.includes("Not authenticated")) {
        router.push("/superadmin/login")
      }
    } finally {
      setLoading(false)
    }
  }

  fetchData()
}, [])



  const handleDeleteClick = (managerId: string) => {
    setSelectedManager(managerId)
    setShowDeletePopup(true)
  }

  const handleDeleteConfirm = async () => {
    if (selectedManager !== null) {
      try {
        setIsDeleting(true)

        // Enhanced authentication debugging
        console.log("🔍 Starting delete operation for branch manager:", selectedManager)

        const token = SuperAdminAuth.getToken()
        const user = SuperAdminAuth.getCurrentUser()
        const isAuth = SuperAdminAuth.isAuthenticated()

        console.log("Authentication status:", {
          hasToken: !!token,
          tokenPreview: token ? token.substring(0, 20) + "..." : "null",
          isAuthenticated: isAuth,
          user: user,
          userRole: user?.role
        })

        if (!token) {
          throw new Error("Authentication token not found. Please login again.")
        }

        if (!isAuth) {
          throw new Error("Authentication token has expired. Please login again.")
        }

        // Check user role - only super admin can delete branch managers
        const allowedRoles = ['super_admin', 'superadmin']
        if (!user || !allowedRoles.includes(user.role)) {
          throw new Error(`Insufficient permissions. Only Super Admin can delete branch managers. Current role: ${user?.role || 'none'}`)
        }

        console.log("🚀 Making DELETE request to:", getBackendApiUrl(`branch-managers/${selectedManager}`))

        const response = await fetch(getBackendApiUrl(`branch-managers/${selectedManager}`), {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        console.log("📡 Response received:", {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error("❌ Delete request failed:", errorData)

          if (response.status === 403) {
            // Show the actual error message from the backend
            throw new Error(errorData.detail || errorData.message || "Insufficient permissions to delete branch managers.")
          } else if (response.status === 404) {
            throw new Error("Branch manager not found. It may have already been deleted.")
          } else if (response.status === 401) {
            throw new Error("Authentication failed. Please login again.")
          } else {
            throw new Error(errorData.detail || errorData.message || `Failed to delete branch manager (${response.status})`)
          }
        }

        console.log("✅ Branch manager deleted successfully")

        // Remove manager from local state
        setBranchManagers(branchManagers.filter(manager => manager.id !== selectedManager))
        setShowDeletePopup(false)
        setSelectedManager(null)

        toast({
          title: "Success",
          description: "Branch manager deleted successfully",
        })

      } catch (error) {
        console.error("❌ Error deleting branch manager:", error)
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : 'Failed to delete branch manager',
          variant: "destructive",
        })
      } finally {
        setIsDeleting(false)
      }
    }
  }

  const handleSendCredentials = (manager: BranchManager) => {
    setSelectedManagerForCredentials(manager)
    setShowSendCredentialsPopup(true)
  }

  const handleSendCredentialsConfirm = async () => {
    if (!selectedManagerForCredentials) return

    try {
      setIsSendingCredentials(true)

      const token = SuperAdminAuth.getToken()

      if (!token || !SuperAdminAuth.isAuthenticated()) {
        throw new Error("Authentication token not found. Please login again.")
      }

      const response = await fetch(getBackendApiUrl(`branch-managers/${selectedManagerForCredentials.id}/send-credentials`), {
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

      toast({
        title: "Success",
        description: "Credentials sent successfully to branch manager's email",
      })

      setShowSendCredentialsPopup(false)
      setSelectedManagerForCredentials(null)

    } catch (error) {
      console.error("Error sending credentials:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to send credentials',
        variant: "destructive",
      })
    } finally {
      setIsSendingCredentials(false)
    }
  }

  const toggleManagerStatus = async (managerId: string, currentStatus: boolean) => {
    try {
      const token = SuperAdminAuth.getToken()

      if (!token || !SuperAdminAuth.isAuthenticated()) {
        throw new Error("Authentication token not found. Please login again.")
      }

      const response = await fetch(getBackendApiUrl(`branch-managers/${managerId}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_active: !currentStatus
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || errorData.message || `Failed to update status (${response.status})`)
      }

      // Update local state
      setBranchManagers(branchManagers.map(manager => 
        manager.id === managerId 
          ? { ...manager, is_active: !currentStatus }
          : manager
      ))

      toast({
        title: "Success",
        description: `Branch manager ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      })

    } catch (error) {
      console.error("Error updating manager status:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to update status',
        variant: "destructive",
      })
    }
  }
const filteredManagers = branchManagers.filter((manager) => {
  const matchesSearch =
    manager.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (manager.contact_info?.email || manager.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    manager.branch_assignment?.branch_name?.toLowerCase().includes(searchTerm.toLowerCase())

  const matchesStatus =
    selectedStatus === "all" ||
    (selectedStatus === "active" && manager.is_active) ||
    (selectedStatus === "inactive" && !manager.is_active)

  const matchesBranch =
    selectedBranch === "all" || manager.branch_assignment?.branch_id === selectedBranch

  return matchesSearch && matchesStatus && matchesBranch
})




  // Pagination logic
  const totalPages = Math.ceil(filteredManagers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentManagers = filteredManagers.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="w-full p-4 lg:px-8">
          <div className="mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="flex justify-between items-center">
                <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                <div className="h-10 bg-gray-200 rounded w-32"></div>
              </div>
              <div className="bg-white rounded-lg p-6 space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="w-full p-4 lg:px-8">
          <div className="mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 font-bold">!</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-800">Error Loading Branch Managers</h3>
                  <p className="text-red-600 mt-1">{error}</p>
                  <div className="flex gap-3 mt-4">
                    {error.includes('Authentication') ? (
                      <Button
                        onClick={() => router.push('/superadmin/login')}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Go to Superadmin Login
                      </Button>
                    ) : (
                      <Button
                        onClick={() => window.location.reload()}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Retry
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      <main className="w-full p-4 lg:px-8">
        <div className=" mx-auto">
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#4F5077]">Branch Managers</h1>
            </div>
            <Button
              onClick={() => router.push(`${basePath}/branch-managers/create`)}
              className="bg-yellow-400 hover:bg-yellow-500 text-white font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Branch Manager
            </Button>
          </div>

          {/* Search and Filters */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by name, email, or branch..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                 <Select value={selectedBranch} onValueChange={(value) => setSelectedBranch(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>

                    {loading ? (
                      <SelectItem value="loading" disabled>
                        Loading...
                      </SelectItem>
                    ) : error ? (
                      <SelectItem value="error" disabled>
                        Error loading branches
                      </SelectItem>
                    ) : (
                      branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.branch.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error State */}
          {error && (
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="text-center text-red-600">
                  <p>{error}</p>
                  <Button 
                    onClick={() => window.location.reload()} 
                    className="mt-4"
                    variant="outline"
                  >
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Branch Managers List */}
          <Card>
            <CardContent className="p-0">
              {currentManagers.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">No branch managers found</p>
                  <Button
                    onClick={() => router.push(`${basePath}/branch-managers/create`)}
                    className="bg-yellow-400 hover:bg-yellow-500 text-black"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Branch Manager
                  </Button>
                </div>
              ) : (
                <>
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b font-medium text-sm text-gray-700">
                    <div className="col-span-3">Manager</div>
                    <div className="col-span-2">Branch</div>
                    <div className="col-span-2">Contact</div>
                    <div className="col-span-2">Designation</div>
                    <div className="col-span-1">Status</div>
                    <div className="col-span-2">Actions</div>
                  </div>

                  {/* Table Body */}
                  <div className="divide-y divide-gray-200">
                    {currentManagers.map((manager) => (
                      <div key={manager.id} className="grid grid-cols-12 gap-4 p-4 hover:bg-gray-50 transition-colors">
                        <div className="col-span-3 flex items-center space-x-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src="" />
                            <AvatarFallback>
                              {manager.full_name ? manager.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'BM'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900">{manager.full_name}</p>
                            <p className="text-sm text-gray-500">
                              {manager.created_at ? new Date(manager.created_at).toLocaleDateString() : 'No date'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="col-span-2 flex items-center">
                          <div>
                            <p className="font-medium text-gray-900">
                              {manager.branch_assignment?.branch_name || 'Unassigned'}
                            </p>
                            <p className="text-sm text-gray-500">Branch Manager</p>
                          </div>
                        </div>
                        
                        <div className="col-span-2 flex items-center">
                          <div>
                            <p className="text-sm text-gray-900">{manager.contact_info?.email || manager.email || 'No email'}</p>
                            <p className="text-sm text-gray-500">{manager.contact_info?.phone || 'No phone'}</p>
                          </div>
                        </div>
                        
                        <div className="col-span-2 flex items-center">
                          <p className="text-sm text-gray-900">
                            {manager.professional_info?.designation || 'Branch Manager'}
                          </p>
                        </div>
                        
                        <div className="col-span-1 flex items-center">
                          <Badge variant={manager.is_active ? "default" : "secondary"}>
                            {manager.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        
                        <div className="col-span-2 flex items-center space-x-1">
                          {/* View Button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => router.push(`${basePath}/branch-managers/${manager.id}`)}
                            className="p-1 h-8 w-8"
                            title="View Branch Manager"
                          >
                            <Eye className="w-4 h-4 text-gray-600" />
                          </Button>

                          {/* Edit Button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => router.push(`${basePath}/branch-managers/edit/${manager.id}`)}
                            className="p-1 h-8 w-8"
                            title="Edit Branch Manager"
                          >
                            <Edit className="w-4 h-4 text-gray-600" />
                          </Button>

                          {/* Send Credentials Button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSendCredentials(manager)}
                            className="p-1 h-8 w-8"
                            title="Send Credentials"
                          >
                            <Mail className="w-4 h-4 text-blue-600" />
                          </Button>

                          {/* Toggle Status Button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleManagerStatus(manager.id, manager.is_active)}
                            className="p-1 h-8 w-8"
                            title={manager.is_active ? "Deactivate" : "Activate"}
                          >
                            {manager.is_active ? (
                              <ToggleRight className="w-4 h-4 text-green-600" />
                            ) : (
                              <ToggleLeft className="w-4 h-4 text-orange-600" />
                            )}
                          </Button>

                          {/* Delete Button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteClick(manager.id)}
                            className="p-1 h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete Branch Manager"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                Previous
              </Button>
              
              {Array.from({ length: totalPages }).map((_, index) => (
                <Button
                  key={index}
                  variant={currentPage === index + 1 ? "default" : "outline"}
                  size="sm"
                  className={currentPage === index + 1 ? "bg-yellow-400 text-black hover:bg-yellow-500" : ""}
                  onClick={() => handlePageChange(index + 1)}
                >
                  {index + 1}
                </Button>
              ))}
              
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Popup */}
      {showDeletePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Branch Manager</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this branch manager? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeletePopup(false)
                  setSelectedManager(null)
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Send Credentials Popup */}
      {showSendCredentialsPopup && selectedManagerForCredentials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Login Credentials</h3>
            <p className="text-gray-600 mb-6">
              Send login credentials to <strong>{selectedManagerForCredentials.full_name}</strong> at{" "}
              <strong>{selectedManagerForCredentials.contact_info?.email}</strong>?
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSendCredentialsPopup(false)
                  setSelectedManagerForCredentials(null)
                }}
                disabled={isSendingCredentials}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendCredentialsConfirm}
                disabled={isSendingCredentials}
                className="bg-green-600 hover:bg-green-700 text-white"
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
      )}
    </div>
  )
}
