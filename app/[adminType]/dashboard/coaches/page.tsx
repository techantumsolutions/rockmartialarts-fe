"use client"

import { getBackendApiUrl } from "@/lib/config"
import { coachDisplayInfo, fetchAllCoaches } from "@/lib/coachFetch"
import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  Edit,
  Eye,
  Mail,
  Loader2,
  Users,
  UserCheck,
  UserX,
  Phone,
  Building2,
  Briefcase,
  RefreshCw,
  MoreVertical,
  Target,
  Plus,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import { useRouter } from "next/navigation"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import { TokenManager } from "@/lib/tokenManager"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { useToast } from "@/hooks/use-toast"
import {
  AdminPageShell,
  AdminPageHeader,
  AdminKpiGrid,
  AdminKpiCard,
  AdminFilterBar,
  AdminTableShell,
  AdminStatusPill,
  adminPrimaryBtnClass,
} from "@/components/dashboard/AdminPageShell"

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
  branch_name?: string
  profile_image_url?: string
}

const ITEMS_PER_PAGE = 15

const AVATAR_TONES = [
  "bg-violet-100 text-violet-700",
  "bg-sky-100 text-sky-800",
  "bg-emerald-100 text-emerald-800",
  "bg-amber-100 text-amber-900",
  "bg-rose-100 text-rose-800",
  "bg-indigo-100 text-indigo-800",
]

function coachInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "CO"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase()
}

function avatarToneClass(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % AVATAR_TONES.length
  return AVATAR_TONES[hash]
}

function getCoachBranchName(coach: Coach & Record<string, unknown>): string {
  const fromName = String(coach?.branch_name || "").trim()
  if (fromName) return fromName
  const raw = coach as Record<string, unknown>
  const branches = raw.branches as Array<Record<string, unknown>> | undefined
  if (branches?.length) {
    const b = branches[0]
    return String(b?.branch?.name || b?.name || "").trim() || "—"
  }
  const assignments = raw.branch_assignments as unknown[] | undefined
  if (assignments?.length) {
    const a = assignments[0]
    if (typeof a === "string") return a.trim() || "—"
    if (a && typeof a === "object") {
      const o = a as Record<string, unknown>
      return String(o.branch_name || o.name || "").trim() || "—"
    }
  }
  return "—"
}

function formatCoachPhone(coach: Coach) {
  const cc = (coach as { contact_info?: { country_code?: string } }).contact_info?.country_code || ""
  const local = coachDisplayInfo(coach).phone || coach.contact_info?.phone || ""
  const combined = `${cc} ${local}`.trim()
  return combined || "—"
}

function designationPillClass(designation: string) {
  const key = designation.toLowerCase()
  if (key.includes("founder")) return "border-sky-200 bg-sky-50 text-sky-800"
  if (key.includes("assistant")) return "border-violet-200 bg-violet-50 text-violet-800"
  if (key.includes("senior")) return "border-amber-200 bg-amber-50 text-amber-900"
  return "border-gray-200 bg-gray-50 text-[#4F5077]"
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
  const [currentPage, setCurrentPage] = useState(1)
  const [branchFilter, setBranchFilter] = useState("all")
  const [designationFilter, setDesignationFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    if (typeof window === "undefined") return
    const statusParam = (new URLSearchParams(window.location.search).get("status") || "").toLowerCase()
    if (statusParam === "active" || statusParam === "inactive") {
      setStatusFilter(statusParam)
    }
  }, [])

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
        // In-house coaches only — online enrollments live under Online Coaches
        const coachesData = await fetchAllCoaches(token, {
          activeOnly: false,
          registrationSource: "admin",
        })
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

  const branchOptions = useMemo(() => {
    const names = coaches
      .map((c) => getCoachBranchName(c as Coach & Record<string, unknown>))
      .filter((n) => n && n !== "—")
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))
  }, [coaches])

  const designationOptions = useMemo(() => {
    const values = coaches
      .map((c) => c.professional_info?.designation_id || "")
      .filter(Boolean)
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b))
  }, [coaches])

  const kpis = useMemo(() => {
    const total = coaches.length
    const active = coaches.filter((c) => c.is_active).length
    const inactive = total - active
    return { total, active, inactive }
  }, [coaches])

  const filteredCoaches = useMemo(() => {
    const searchLower = searchTerm.trim().toLowerCase()
    return coaches.filter((coach) => {
      if (branchFilter !== "all") {
        const branch = getCoachBranchName(coach as Coach & Record<string, unknown>)
        if (branch !== branchFilter) return false
      }
      if (designationFilter !== "all") {
        const d = coach.professional_info?.designation_id || ""
        if (d !== designationFilter) return false
      }
      if (statusFilter === "active" && !coach.is_active) return false
      if (statusFilter === "inactive" && coach.is_active) return false
      if (!searchLower) return true
      return (
        coach.full_name?.toLowerCase().includes(searchLower) ||
        coach.id?.toLowerCase().includes(searchLower) ||
        coach.contact_info?.email?.toLowerCase().includes(searchLower) ||
        coach.contact_info?.phone?.toLowerCase().includes(searchLower) ||
        coach.professional_info?.designation_id?.toLowerCase().includes(searchLower) ||
        coach.areas_of_expertise?.some((expertise) =>
          expertise.toLowerCase().includes(searchLower)
        )
      )
    })
  }, [coaches, searchTerm, branchFilter, designationFilter, statusFilter])

  const totalPages = Math.ceil(filteredCoaches.length / ITEMS_PER_PAGE) || 1
  useEffect(() => {
    setCurrentPage((page) => Math.min(page, Math.max(totalPages, 1)))
  }, [totalPages])

  const paginatedCoaches = filteredCoaches.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const showingFrom =
    filteredCoaches.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1
  const showingTo = Math.min(currentPage * ITEMS_PER_PAGE, filteredCoaches.length)

  const resetFilters = () => {
    setSearchTerm("")
    setBranchFilter("all")
    setDesignationFilter("all")
    setStatusFilter("all")
    setCurrentPage(1)
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        icon={Users}
        title="Coach List"
        subtitle="Manage and monitor in-house coaches across branches."
        actions={
          <Button
            type="button"
            onClick={() => router.push(`${basePath}/add-coach`)}
            className={adminPrimaryBtnClass}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Coach
          </Button>
        }
      />

      <AdminKpiGrid cols={3}>
        <AdminKpiCard
          icon={Users}
          label="Total Coaches"
          value={loading ? "—" : kpis.total}
          tone="blue"
        />
        <AdminKpiCard
          icon={UserCheck}
          label="Active"
          value={loading ? "—" : kpis.active}
          tone="green"
        />
        <AdminKpiCard
          icon={UserX}
          label="Inactive"
          value={loading ? "—" : kpis.inactive}
          tone="purple"
        />
      </AdminKpiGrid>

      <AdminFilterBar>
        <div className="relative min-w-0 flex-1 lg:min-w-[260px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7A99]" />
          <Input
            placeholder="Search by coach name, phone or email…"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="h-11 rounded-xl border-gray-200 pl-10"
          />
        </div>
        <Select
          value={branchFilter}
          onValueChange={(v) => {
            setBranchFilter(v)
            setCurrentPage(1)
          }}
        >
          <SelectTrigger className="h-11 w-full rounded-xl border-gray-200 sm:w-[170px]">
            <span className="flex items-center gap-2 truncate">
              <Building2 className="h-4 w-4 shrink-0 text-[#6B7A99]" />
              <SelectValue placeholder="All Branches" />
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branchOptions.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={designationFilter}
          onValueChange={(v) => {
            setDesignationFilter(v)
            setCurrentPage(1)
          }}
        >
          <SelectTrigger className="h-11 w-full rounded-xl border-gray-200 sm:w-[180px]">
            <span className="flex items-center gap-2 truncate">
              <Briefcase className="h-4 w-4 shrink-0 text-[#6B7A99]" />
              <SelectValue placeholder="All Designations" />
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Designations</SelectItem>
            {designationOptions.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v)
            setCurrentPage(1)
          }}
        >
          <SelectTrigger className="h-11 w-full rounded-xl border-gray-200 sm:w-[150px]">
            <span className="flex items-center gap-2 truncate">
              <Target className="h-4 w-4 shrink-0 text-[#6B7A99]" />
              <SelectValue placeholder="All Status" />
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" className="btn-admin-outline h-11" onClick={resetFilters}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Reset
        </Button>
      </AdminFilterBar>

      <AdminTableShell
        footer={
          totalPages > 0 ? (
            <>
              <span>
                Showing {showingFrom} – {showingTo} of {filteredCoaches.length} coach
                {filteredCoaches.length === 1 ? "" : "es"}
              </span>
              <div className="admin-pagination flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                >
                  Previous
                </Button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    size="sm"
                    variant={currentPage === page ? "default" : "outline"}
                    className={currentPage === page ? adminPrimaryBtnClass : undefined}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                >
                  Next
                </Button>
              </div>
            </>
          ) : undefined
        }
      >
        <table className="min-w-[960px]">
          <thead>
            <tr>
              <th>Coach</th>
              <th>Designation</th>
              <th>Branch</th>
              <th>Phone</th>
              <th>Status</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#6B7A99]">
                  <Loader2 className="mr-2 inline h-5 w-5 animate-spin" />
                  Loading coaches…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-red-600">
                  {error}
                </td>
              </tr>
            ) : filteredCoaches.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#6B7A99]">
                  {searchTerm || branchFilter !== "all" || designationFilter !== "all" || statusFilter !== "all"
                    ? "No coaches match your filters."
                    : "No coaches found."}
                </td>
              </tr>
            ) : (
              paginatedCoaches.map((coach) => {
                const designation = coach.professional_info?.designation_id || "—"
                const branch = getCoachBranchName(coach as Coach & Record<string, unknown>)
                const profileSrc = coach.profile_image_url
                  ? resolvePublicAssetUrl(coach.profile_image_url)
                  : ""
                return (
                  <tr key={coach.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-gray-100">
                          {profileSrc ? (
                            <AvatarImage src={profileSrc} alt={coach.full_name} />
                          ) : null}
                          <AvatarFallback
                            className={`text-xs font-semibold ${avatarToneClass(coach.full_name)}`}
                          >
                            {coachInitials(coach.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[#4F5077]">{coach.full_name}</p>
                          <p className="truncate text-xs text-[#6B7A99]">{coach.contact_info?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${designationPillClass(designation)}`}
                      >
                        {designation}
                      </span>
                    </td>
                    <td>
                      <span className="flex items-center gap-1.5 text-sm text-[#4F5077]">
                        <Building2 className="h-4 w-4 shrink-0 text-[#6B7A99]" />
                        <span className="truncate">{branch}</span>
                      </span>
                    </td>
                    <td>
                      <span className="flex items-center gap-1.5 text-sm text-[#4F5077]">
                        <Phone className="h-4 w-4 shrink-0 text-[#6B7A99]" />
                        {formatCoachPhone(coach)}
                      </span>
                    </td>
                    <td>
                      <AdminStatusPill status={coach.is_active ? "active" : "inactive"}>
                        {coach.is_active ? "Active" : "Inactive"}
                      </AdminStatusPill>
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewClick(coach.id)}
                              className="h-9 w-9 rounded-lg p-0 text-[#6B7A99] hover:text-[#4F5077]"
                              aria-label="View coach"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View Details</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(coach.id)}
                              className="h-9 w-9 rounded-lg p-0 text-[#6B7A99] hover:text-[#4F5077]"
                              aria-label="Edit coach"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit Coach</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSendCredentialsClick(coach)}
                              className="h-9 w-9 rounded-lg p-0 text-[#6B7A99] hover:text-[#4F5077]"
                              aria-label="Send credentials"
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Send Credentials</TooltipContent>
                        </Tooltip>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-9 w-9 rounded-lg p-0 text-[#6B7A99]"
                              aria-label="More actions"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toggleCoachStatus(coach.id)}>
                              {coach.is_active ? "Deactivate coach" : "Activate coach"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </AdminTableShell>

      {showSendCredentialsPopup && selectedCoachForCredentials ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 backdrop-blur-[2px] p-4">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-[#2F3158]">Send Login Credentials</h3>
              <p className="mb-2 text-[#6B7A99]">
                Send login credentials to <strong>{selectedCoachForCredentials.full_name}</strong>?
              </p>
              <p className="mb-6 text-sm text-[#9593A8]">
                Email will be sent to: <strong>{selectedCoachForCredentials.contact_info.email}</strong>
              </p>
              <div className="flex gap-3">
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
                  className={`${adminPrimaryBtnClass} flex-1`}
                  disabled={isSendingCredentials}
                >
                  {isSendingCredentials ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Credentials"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AdminPageShell>
  )
}
