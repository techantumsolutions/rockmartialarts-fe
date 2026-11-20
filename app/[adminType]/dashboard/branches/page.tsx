"use client"

import { getBackendApiUrl } from "@/lib/config"
import {
  branchManagerDisplayInfo,
  coachDisplayInfo,
  fetchAllBranchManagers,
  fetchAllCoaches,
} from "@/lib/coachFetch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Search,
  Edit,
  X,
  Eye,
  Handshake,
  ImageIcon,
  Award,
  Images,
  MessageSquareQuote,
  UserCog,
  SearchCode,
  ChevronLeft,
  ChevronRight,
  Building2,
  Users,
  BookOpen,
  UserCheck,
  UserCog as UserCogIcon,
  RotateCcw,
  MoreHorizontal,
  Store,
} from "lucide-react"
import {
  AdminPageShell,
  AdminPageHeader,
  AdminKpiGrid,
  AdminKpiCard,
  AdminFilterBar,
  AdminTableShell,
  AdminStatusPill,
} from "@/components/dashboard/AdminPageShell"
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
import { useRouter, usePathname } from "next/navigation"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { TokenManager } from "@/lib/tokenManager"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { useDashboardBasePath, useDashboardRole } from "@/lib/useDashboardBasePath"
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
  manager_id?: string | null
  is_active?: boolean
  allows_collaboration?: boolean
  is_collaboration_partner?: boolean
  partner_org_id?: string | null
  partner_org_name?: string | null
  partner_org_slug?: string | null
  is_partner_branch?: boolean
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
  const pathname = usePathname()
  const basePath = useDashboardBasePath()
  const dashboardRole = useDashboardRole()
  const canCreateBranch = dashboardRole === "super_admin"
  const [showAssignPopup, setShowAssignPopup] = useState(false)

  // Branch admin cannot access branches — redirect to dashboard
  useEffect(() => {
    if (pathname?.startsWith("/branch-admin/dashboard/branches")) {
      router.replace("/branch-admin/dashboard")
    }
  }, [pathname, router])
  const [selectedBranch, setSelectedBranch] = useState("")
  const [selectedManagerId, setSelectedManagerId] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [locationFilter, setLocationFilter] = useState("all")
  const [managerFilter, setManagerFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  /** branch_manager.id → display info */
  const [branchManagerById, setBranchManagerById] = useState<
    Record<string, { full_name: string; phone: string }>
  >({})
  /** Coach id → display info (for legacy branch.manager_id values) */
  const [coachById, setCoachById] = useState<
    Record<string, { full_name: string; phone: string }>
  >({})
  /** First coach phone per academy (for contact fallback) */
  const [coachPhoneByBranchId, setCoachPhoneByBranchId] = useState<Record<string, string>>({})

  // Modal states
  const [branchManagersForAssign, setBranchManagersForAssign] = useState<any[]>([])
  const [loadingBranchManagers, setLoadingBranchManagers] = useState(false)
  const [assignmentLoading, setAssignmentLoading] = useState(false)
  const [assignmentError, setAssignmentError] = useState<string | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<Branch | null>(null)
  const [unassignTarget, setUnassignTarget] = useState<Branch | null>(null)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [unassigning, setUnassigning] = useState(false)
  // Add state for pagination
const [currentPage, setCurrentPage] = useState(1)
const itemsPerPage = 20

  // Mobile action-button scroll
  const actionScrollRef = useRef<HTMLDivElement>(null)
  const [canScrollActionsLeft, setCanScrollActionsLeft] = useState(false)
  const [canScrollActionsRight, setCanScrollActionsRight] = useState(false)

  const updateActionScrollArrows = useCallback(() => {
    const el = actionScrollRef.current
    if (!el) {
      setCanScrollActionsLeft(false)
      setCanScrollActionsRight(false)
      return
    }
    const { scrollLeft, scrollWidth, clientWidth } = el
    setCanScrollActionsLeft(scrollLeft > 2)
    setCanScrollActionsRight(scrollLeft + clientWidth < scrollWidth - 2)
  }, [])

  useEffect(() => {
    const el = actionScrollRef.current
    if (!el) return
    updateActionScrollArrows()
    const onScroll = () => updateActionScrollArrows()
    el.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", updateActionScrollArrows)
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateActionScrollArrows) : null
    ro?.observe(el)
    const t = window.setTimeout(updateActionScrollArrows, 100)
    return () => {
      el.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", updateActionScrollArrows)
      ro?.disconnect()
      window.clearTimeout(t)
    }
  }, [updateActionScrollArrows])

  const scrollActionsToFullyVisible = (direction: -1 | 1) => {
    const el = actionScrollRef.current
    if (!el) return
    const items = Array.from(el.children) as HTMLElement[]
    if (items.length === 0) return

    const viewLeft = el.scrollLeft
    const viewRight = viewLeft + el.clientWidth
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth)
    const epsilon = 2
    let targetScroll = el.scrollLeft

    if (direction === 1) {
      const target = items.find((item) => item.offsetLeft + item.offsetWidth > viewRight + epsilon)
      if (!target) {
        targetScroll = maxScroll
      } else {
        const left = target.offsetLeft
        const right = left + target.offsetWidth
        targetScroll = left
        if (targetScroll + el.clientWidth < right) {
          targetScroll = right - el.clientWidth
        }
      }
    } else {
      const target = [...items].reverse().find((item) => item.offsetLeft < viewLeft - epsilon)
      if (!target) {
        targetScroll = 0
      } else {
        const left = target.offsetLeft
        const right = left + target.offsetWidth
        targetScroll = left
        if (targetScroll + el.clientWidth < right) {
          targetScroll = right - el.clientWidth
        }
      }
    }

    el.scrollTo({
      left: Math.max(0, Math.min(maxScroll, targetScroll)),
      behavior: "smooth",
    })
  }

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

  // Resolve academy manager names/phones + coach contact fallback for list display.
  useEffect(() => {
    const loadManagerAndCoachContacts = async () => {
      const token = TokenManager.getToken()
      if (!token || branches.length === 0) return

      const bmList = await fetchAllBranchManagers(token, { activeOnly: false })

      const bmMap: Record<string, { full_name: string; phone: string }> = {}
      for (const bm of bmList) {
        if (bm?.id) bmMap[bm.id] = branchManagerDisplayInfo(bm)
      }
      setBranchManagerById(bmMap)

      const coachesList = await fetchAllCoaches(token, { activeOnly: false })

      const coachMap: Record<string, { full_name: string; phone: string }> = {}
      for (const c of coachesList) {
        if (c?.id) coachMap[c.id] = coachDisplayInfo(c)
      }
      setCoachById(coachMap)

      const coachPhones: Record<string, string> = {}
      for (const c of coachesList) {
        const bid = c.branch_id as string | undefined
        if (!bid || coachPhones[bid]) continue
        const phone = c.contact_info?.phone ?? c.phone ?? ""
        const s = typeof phone === "string" ? phone : String(phone || "")
        if (s.trim()) coachPhones[bid] = s.trim()
      }
      setCoachPhoneByBranchId(coachPhones)
    }

    loadManagerAndCoachContacts()
  }, [branches])

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

  // Academy `manager_id` must be an academy_manager id (see branch_manager auth), not a coach document id.
  const fetchBranchManagersForModal = async () => {
    try {
      setLoadingBranchManagers(true)
      setAssignmentError(null)

      const token = TokenManager.getToken()
      if (!token) {
        throw new Error("Authentication token not found. Please login again.")
      }

      const all: any[] = []
      for (let skip = 0; skip < 1000; skip += 100) {
        const response = await fetch(
          getBackendApiUrl(`branch-managers?active_only=true&limit=100&skip=${skip}`),
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        )

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(
            errorData.detail || errorData.message || `Failed to fetch academy managers (${response.status})`
          )
        }

        const data = await response.json()
        const batch = data.branch_managers || []
        all.push(...batch)
        if (batch.length < 100) break
      }

      setBranchManagersForAssign(all)
    } catch (error) {
      console.error("Error fetching academy managers:", error)
      setAssignmentError(error instanceof Error ? error.message : "Failed to fetch academy managers")
    } finally {
      setLoadingBranchManagers(false)
    }
  }

  const handleAssign = async () => {
    if (!selectedBranch || !selectedManagerId) {
      setAssignmentError("Please select both an academy and an academy manager")
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
          manager_id: selectedManagerId
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
            ? { ...branch, manager_id: selectedManagerId }
            : branch
        )
      )

      // Reset form and close modal
      setSelectedBranch("")
      setSelectedManagerId("")
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

  const branchPathKey = (branch: Branch) =>
    encodeURIComponent((branch.slug || branch.id || "").trim() || branch.id)

  const handleViewClick = (branch: Branch) => {
    router.push(`${basePath}/branches/${branchPathKey(branch)}`)
  }

  const handleEditClick = (branch: Branch) => {
    router.push(`${basePath}/branches/edit/${branchPathKey(branch)}`)
  }

  const handleOpenAssignModal = () => {
    setShowAssignPopup(true)
    setAssignmentError(null)
    setSelectedBranch("")
    setSelectedManagerId("")
    fetchBranchManagersForModal()
  }

  const getManagerDisplayName = (branch: Branch) => {
    const mid = branch.manager_id
    if (!mid) return "—"
    const bm = branchManagerById[mid]
    if (bm?.full_name?.trim()) return bm.full_name.trim()
    const coach = coachById[mid]
    if (coach?.full_name?.trim()) return coach.full_name.trim()
    return "—"
  }

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

  const isPartnerAssigned = (branch: Branch) =>
    !!(branch.partner_org_id || branch.is_partner_branch)

  const unassignPartnerFromBranch = async (branch: Branch) => {
    try {
      setUnassigning(true)
      const token = TokenManager.getToken()
      if (!token) return
      const response = await fetch(getBackendApiUrl(`branches/${branch.id}`), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ partner_org_id: null }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err?.detail || "Failed to unassign partner")
      }
      setBranches((prev) =>
        prev.map((b) =>
          b.id === branch.id
            ? {
                ...b,
                partner_org_id: null,
                partner_org_name: null,
                partner_org_slug: null,
                is_partner_branch: false,
              }
            : b
        )
      )
    } catch (error) {
      console.error("Error unassigning partner:", error)
    } finally {
      setUnassigning(false)
      setUnassignTarget(null)
    }
  }

  /** Academy phone first; if missing, first assigned coach phone for that branch. */
  const getBranchContactDisplay = (branch: Branch) => {
    const branchPhone = branch.branch?.phone?.trim()
    if (branchPhone) return branchPhone
    const coachPh = coachPhoneByBranchId[branch.id]
    if (coachPh?.trim()) return coachPh.trim()
    return "—"
  }

  const listBranches = useMemo(
    () =>
      branches.filter((branch) => {
        // White-label partner academies always belong on Academies (not Collaboration Partners).
        if (branch.partner_org_id || branch.is_partner_branch) return true
        return !branch.is_collaboration_partner && !branch.allows_collaboration
      }),
    [branches]
  )

  const locationOptions = useMemo(() => {
    const cities = new Set<string>()
    listBranches.forEach((b) => {
      const city = b.branch?.address?.city?.trim()
      if (city) cities.add(city)
    })
    return Array.from(cities).sort((a, b) => a.localeCompare(b))
  }, [listBranches])

  const managerFilterOptions = useMemo(() => {
    const entries = new Map<string, string>()
    listBranches.forEach((b) => {
      if (!b.manager_id) return
      const name = getManagerDisplayName(b)
      entries.set(b.manager_id, name !== "—" ? name : b.manager_id)
    })
    return Array.from(entries.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [listBranches, branchManagerById, coachById])

  const kpiTotals = useMemo(
    () => ({
      total: listBranches.length,
      students: listBranches.reduce((sum, b) => sum + (b.statistics?.student_count ?? 0), 0),
      courses: listBranches.reduce(
        (sum, b) =>
          sum + (b.statistics?.course_count ?? b.operational_details?.courses_offered?.length ?? 0),
        0
      ),
      coaches: listBranches.reduce((sum, b) => sum + (b.statistics?.coach_count ?? 0), 0),
    }),
    [listBranches]
  )

  const filteredBranches = useMemo(() => {
    return listBranches.filter((branch) => {
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const managerName = getManagerDisplayName(branch).toLowerCase()
        const matchesSearch =
          branch.branch?.name?.toLowerCase().includes(searchLower) ||
          branch.id?.toLowerCase().includes(searchLower) ||
          branch.branch?.address?.line1?.toLowerCase().includes(searchLower) ||
          branch.branch?.address?.city?.toLowerCase().includes(searchLower) ||
          branch.branch?.address?.state?.toLowerCase().includes(searchLower) ||
          branch.branch?.email?.toLowerCase().includes(searchLower) ||
          branch.branch?.phone?.toLowerCase().includes(searchLower) ||
          (branch.partner_org_name || "").toLowerCase().includes(searchLower) ||
          managerName.includes(searchLower)
        if (!matchesSearch) return false
      }
      if (locationFilter !== "all") {
        const city = branch.branch?.address?.city?.trim()
        if (city !== locationFilter) return false
      }
      if (managerFilter !== "all" && branch.manager_id !== managerFilter) return false
      if (statusFilter === "active" && branch.is_active === false) return false
      if (statusFilter === "inactive" && branch.is_active !== false) return false
      return true
    })
  }, [listBranches, searchTerm, locationFilter, managerFilter, statusFilter, branchManagerById, coachById])

  const resetFilters = () => {
    setSearchTerm("")
    setLocationFilter("all")
    setManagerFilter("all")
    setStatusFilter("all")
    setCurrentPage(1)
  }

  const totalPages = Math.ceil(filteredBranches.length / itemsPerPage) || 1
  const paginatedBranches = filteredBranches.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )
  const pageStart =
    filteredBranches.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const pageEnd = Math.min(currentPage * itemsPerPage, filteredBranches.length)

  const renderHeaderActions = () => (
    <>
      <Button
        type="button"
        variant="outline"
        className="btn-admin-outline h-10 shrink-0"
        onClick={handleOpenAssignModal}
      >
        <UserCogIcon className="mr-2 h-4 w-4 text-[#2563EB]" />
        Assign Manager
      </Button>
      <Button
        type="button"
        variant="outline"
        className="btn-admin-outline h-10 shrink-0"
        onClick={() => router.push(`${basePath}/branch-managers`)}
      >
        <Users className="mr-2 h-4 w-4 text-[#1F9D57]" />
        Branch Managers
      </Button>
      {canCreateBranch ? (
        <Button
          type="button"
          className="h-10 shrink-0 bg-[#E1BB33] font-semibold text-[#3d3e5c] hover:bg-[#d4ae2a]"
          onClick={() => router.push(`${basePath}/create-branch`)}
        >
          + Add Branch
        </Button>
      ) : null}
    </>
  )


  return (
    <AdminPageShell className="overflow-x-hidden">
      <AdminPageHeader
        icon={Store}
        title="Academies"
        subtitle="Manage all training academies and their information"
        actions={
          !BranchManagerAuth.isAuthenticated() ? (
            <>
              <div className="flex w-full min-w-0 items-center gap-1 sm:hidden">
                <button
                  type="button"
                  aria-label="Scroll actions left"
                  onClick={() => scrollActionsToFullyVisible(-1)}
                  disabled={!canScrollActionsLeft}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition-opacity ${
                    canScrollActionsLeft ? "opacity-100" : "opacity-0 pointer-events-none"
                  }`}
                >
                  <ChevronLeft className="h-4 w-4 text-gray-700" />
                </button>
                <div
                  ref={actionScrollRef}
                  className="admin-actions flex min-w-0 flex-1 flex-nowrap overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                >
                  {renderHeaderActions()}
                </div>
                <button
                  type="button"
                  aria-label="Scroll actions right"
                  onClick={() => scrollActionsToFullyVisible(1)}
                  disabled={!canScrollActionsRight}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition-opacity ${
                    canScrollActionsRight ? "opacity-100" : "opacity-0 pointer-events-none"
                  }`}
                >
                  <ChevronRight className="h-4 w-4 text-gray-700" />
                </button>
              </div>
              <div className="admin-actions hidden sm:flex">{renderHeaderActions()}</div>
            </>
          ) : undefined
        }
      />

      <AdminKpiGrid>
        <AdminKpiCard
          icon={Building2}
          tone="blue"
          label="Total Academies"
          value={loading ? "—" : kpiTotals.total}
        />
        <AdminKpiCard
          icon={Users}
          tone="green"
          label="Active Students"
          value={loading || loadingStats ? "—" : kpiTotals.students}
        />
        <AdminKpiCard
          icon={BookOpen}
          tone="purple"
          label="Courses Offered"
          value={loading || loadingStats ? "—" : kpiTotals.courses}
        />
        <AdminKpiCard
          icon={UserCheck}
          tone="amber"
          label="Assigned Coaches"
          value={loading || loadingStats ? "—" : kpiTotals.coaches}
        />
      </AdminKpiGrid>

      <AdminFilterBar>
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7A99]" />
          <Input
            placeholder="Search academy by name, location or manager…"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={locationFilter}
          onValueChange={(v) => {
            setLocationFilter(v)
            setCurrentPage(1)
          }}
        >
          <SelectTrigger className="h-11 w-full sm:w-[160px]">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locationOptions.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={managerFilter}
          onValueChange={(v) => {
            setManagerFilter(v)
            setCurrentPage(1)
          }}
        >
          <SelectTrigger className="h-11 w-full sm:w-[180px]">
            <SelectValue placeholder="Manager" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Managers</SelectItem>
            {managerFilterOptions.map(([id, name]) => (
              <SelectItem key={id} value={id}>
                {name}
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
          <SelectTrigger className="h-11 w-full sm:w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Status: All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          className="btn-admin-outline h-11"
          onClick={resetFilters}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
      </AdminFilterBar>

      <AdminTableShell
        className="admin-table-fit-wrap"
        footer={
          filteredBranches.length > 0 ? (
            <>
              <span>
                Showing {pageStart} – {pageEnd} of {filteredBranches.length} branch
                {filteredBranches.length === 1 ? "" : "es"}
              </span>
              <div className="admin-pagination flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    type="button"
                    size="sm"
                    variant={currentPage === page ? "default" : "outline"}
                    className={`h-9 min-w-9 px-2 ${
                      currentPage === page
                        ? "bg-[#E1BB33] font-semibold text-[#3d3e5c] hover:bg-[#d4ae2a]"
                        : ""
                    }`}
                    aria-current={currentPage === page ? "page" : undefined}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0"
                  disabled={currentPage === totalPages || filteredBranches.length === 0}
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : undefined
        }
      >
        <table className="w-full min-w-[900px] lg:min-w-0 lg:table-fixed admin-table-fit">
          <thead>
            <tr>
              <th className="text-left lg:w-[12.5%]">Academy</th>
              <th className="text-left lg:w-[13.5%]">Location</th>
              <th className="text-center lg:w-[8.5%]">Active Students</th>
              <th className="text-center lg:w-[8.5%]">Courses</th>
              <th className="text-center lg:w-[8.5%]">Coaches</th>
              <th className="text-left lg:w-[11%]">Academy Manager</th>
              <th className="text-center lg:w-[10.5%]">Contact</th>
              <th className="text-center lg:w-[9%]">Status</th>
              <th className="text-right lg:w-[18%]">Actions</th>
            </tr>
          </thead>
          <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-[#6B7A99]">
                    Loading branches…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-red-600">
                    Error: {error}
                  </td>
                </tr>
              ) : filteredBranches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-[#6B7A99]">
                    {searchTerm ? `No academies found matching "${searchTerm}"` : "No academies found"}
                  </td>
                </tr>
              ) : (
                paginatedBranches.map((branch) => {
                  const managerName = getManagerDisplayName(branch)
                  const isActive = branch.is_active !== false
                  return (
                  <tr
                    key={branch.id}
                    className={!isActive ? "bg-gray-50/60" : undefined}
                  >
                    <td>
                      <div className="flex min-w-0 items-center gap-1.5 xl:gap-2.5">
                        <div className="hidden xl:inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F1EBFF] text-[#6D28D9]">
                          <Store className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="block min-w-0 break-words text-xs xl:text-sm font-semibold leading-tight text-[#2F3158]">
                            {branch.branch?.name || "N/A"}
                          </span>
                          {isPartnerAssigned(branch) ? (
                            <span
                              className="mt-0.5 inline-flex max-w-full items-center gap-1 rounded-md bg-[#FFF8E1] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#9A6B00]"
                              title={
                                branch.partner_org_name
                                  ? `Partner: ${branch.partner_org_name}`
                                  : "Partner academy"
                              }
                            >
                              Partner
                              {branch.partner_org_name ? (
                                <span className="truncate font-medium normal-case tracking-normal text-[#7A5A10]">
                                  · {branch.partner_org_name}
                                </span>
                              ) : null}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="text-[11px] xl:text-xs leading-tight break-words text-[#6B7A99]">
                      {branch.branch?.address
                        ? `${branch.branch.address.line1}, ${branch.branch.address.city}, ${branch.branch.address.state}`
                        : "Address not available"}
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center">
                        {loadingStats && !branch.statistics ? (
                          <span className="inline-block h-6 w-10 animate-pulse rounded-lg bg-gray-200" />
                        ) : (
                          <span className="inline-flex min-w-[2rem] items-center justify-center gap-1 rounded-lg bg-[#E8F1FF] px-1.5 py-0.5 text-[11px] xl:px-2 xl:py-1 xl:text-xs font-semibold text-[#2563EB]">
                            <Users className="h-3 w-3 shrink-0" />
                            {branch.statistics?.student_count ?? 0}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center">
                        {loadingStats && !branch.statistics ? (
                          <span className="inline-block h-6 w-10 animate-pulse rounded-lg bg-gray-200" />
                        ) : (
                          <span className="inline-flex min-w-[2rem] items-center justify-center gap-1 rounded-lg bg-[#EAF8F0] px-1.5 py-0.5 text-[11px] xl:px-2 xl:py-1 xl:text-xs font-semibold text-[#1F9D57]">
                            <BookOpen className="h-3 w-3 shrink-0" />
                            {branch.statistics?.course_count ??
                              branch.operational_details?.courses_offered?.length ??
                              0}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center">
                        {loadingStats && !branch.statistics ? (
                          <span className="inline-block h-6 w-10 animate-pulse rounded-lg bg-gray-200" />
                        ) : (
                          <span className="inline-flex min-w-[2rem] items-center justify-center gap-1 rounded-lg bg-[#F1EBFF] px-1.5 py-0.5 text-[11px] xl:px-2 xl:py-1 xl:text-xs font-semibold text-[#6D28D9]">
                            <UserCheck className="h-3 w-3 shrink-0" />
                            {branch.statistics?.coach_count ?? 0}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="block min-w-0 break-words text-xs xl:text-sm leading-tight text-[#2F3158]">{managerName}</span>
                    </td>
                    <td className="text-center text-[11px] xl:text-xs leading-tight break-all text-[#6B7A99]">
                      {getBranchContactDisplay(branch)}
                    </td>
                    <td className="text-center">
                      <AdminStatusPill status={isActive ? "active" : "inactive"}>
                        {isActive ? "Active" : "Inactive"}
                      </AdminStatusPill>
                    </td>
                    <td>
                      <div className="flex flex-wrap items-center justify-end gap-0.5 xl:gap-1">
                        <button
                          type="button"
                          className="inline-flex h-6 w-6 xl:h-8 xl:w-8 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#4F5077] hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleEditClick(branch)}
                          title="Edit Academy"
                        >
                          <Edit className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
                        </button>
                        {canCreateBranch && isPartnerAssigned(branch) ? (
                          <button
                            type="button"
                            className="inline-flex h-6 w-6 xl:h-8 xl:w-8 shrink-0 items-center justify-center rounded-lg border border-[#F5E6B8] bg-[#FFF9EB] text-[#9A6B00] hover:bg-[#FFF3D1] cursor-pointer"
                            onClick={() => setUnassignTarget(branch)}
                            title="Unassign partner (make Rock-owned)"
                            disabled={unassigning}
                          >
                            <RotateCcw className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="inline-flex h-6 w-6 xl:h-8 xl:w-8 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#4F5077] hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleViewClick(branch)}
                          title="View Details"
                        >
                          <Eye className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
                        </button>
                        <button
                          type="button"
                          className="inline-flex h-6 w-6 xl:h-8 xl:w-8 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#4F5077] hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleViewClick(branch)}
                          title="More actions"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
                        </button>
                        {(branch.is_collaboration_partner || branch.allows_collaboration) && (
                          <button
                            className="text-amber-600 hover:text-amber-800"
                            onClick={() =>
                              router.push(
                                `${basePath}/partner-profiles?branchId=${encodeURIComponent(branch.id)}`
                              )
                            }
                            title="Partner Profile"
                          >
                            <Handshake className="w-4 h-4" />
                          </button>
                        )}
                        {(branch.is_collaboration_partner || branch.allows_collaboration) && (
                          <button
                            className="text-amber-600 hover:text-amber-800"
                            onClick={() =>
                              router.push(
                                `${basePath}/partner-branding?branchId=${encodeURIComponent(branch.id)}`
                              )
                            }
                            title="Partner Branding"
                          >
                            <ImageIcon className="w-4 h-4" />
                          </button>
                        )}
                        {(branch.is_collaboration_partner || branch.allows_collaboration) && (
                          <button
                            className="text-amber-600 hover:text-amber-800"
                            onClick={() =>
                              router.push(
                                `${basePath}/partner-masters?branchId=${encodeURIComponent(branch.id)}`
                              )
                            }
                            title="Partner Masters"
                          >
                            <Award className="w-4 h-4" />
                          </button>
                        )}
                        {(branch.is_collaboration_partner || branch.allows_collaboration) && (
                          <button
                            className="text-amber-600 hover:text-amber-800"
                            onClick={() =>
                              router.push(
                                `${basePath}/partner-gallery?branchId=${encodeURIComponent(branch.id)}`
                              )
                            }
                            title="Partner Gallery"
                          >
                            <Images className="w-4 h-4" />
                          </button>
                        )}
                        {(branch.is_collaboration_partner || branch.allows_collaboration) && (
                          <button
                            className="text-amber-600 hover:text-amber-800"
                            onClick={() =>
                              router.push(
                                `${basePath}/partner-testimonials?branchId=${encodeURIComponent(branch.id)}`
                              )
                            }
                            title="Partner Testimonials"
                          >
                            <MessageSquareQuote className="w-4 h-4" />
                          </button>
                        )}
                        {(branch.is_collaboration_partner || branch.allows_collaboration) && (
                          <button
                            className="text-amber-600 hover:text-amber-800"
                            onClick={() =>
                              router.push(
                                `${basePath}/partner-team?branchId=${encodeURIComponent(branch.id)}`
                              )
                            }
                            title="Partner Team"
                          >
                            <UserCog className="w-4 h-4" />
                          </button>
                        )}
                        {(branch.is_collaboration_partner || branch.allows_collaboration) && (
                          <button
                            className="text-amber-600 hover:text-amber-800"
                            onClick={() =>
                              router.push(
                                `${basePath}/partner-seo?branchId=${encodeURIComponent(branch.id)}`
                              )
                            }
                            title="Partner SEO"
                          >
                            <SearchCode className="w-4 h-4" />
                          </button>
                        )}
                        <Switch
                          checked={branch.is_active ?? true}
                          disabled={statusUpdating}
                          className="shrink-0 origin-right scale-[0.80] -ml-2 xl:ml-0 xl:scale-90 2xl:scale-100 data-[state=checked]:bg-yellow-400"
                          onCheckedChange={(checked) =>
                            handleBranchActiveToggle(branch, checked)
                          }
                        />
                      </div>
                    </td>
                  </tr>
                  )
                })
              )}
            </tbody>
          </table>
      </AdminTableShell>

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
              disabled={!selectedBranch || !selectedManagerId || assignmentLoading || loadingBranchManagers}
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
                    {listBranches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.branch?.name || 'Unknown Academy'} ({branch.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Branch manager selection (manager_id references branch_managers collection) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select branch manager <span className="text-red-500">*</span>
                </label>
                {loadingBranchManagers ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-gray-500">Loading branch managers...</div>
                  </div>
                ) : (
                  <Select value={selectedManagerId} onValueChange={setSelectedManagerId} disabled={assignmentLoading}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose an academy manager to assign" />
                    </SelectTrigger>
                    <SelectContent>
                      {branchManagersForAssign.length > 0 ? (
                        branchManagersForAssign.map((bm) => (
                          <SelectItem key={bm.id} value={bm.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{bm.full_name}</span>
                              <span className="text-xs text-gray-500">
                                {bm.contact_info?.email}
                                {bm.contact_info?.phone ? ` • ${bm.contact_info.phone}` : ""}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          No active branch managers available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
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
                  The assigned Branch Manager
                  {deactivateTarget && getManagerDisplayName(deactivateTarget) !== "—"
                    ? ` (${getManagerDisplayName(deactivateTarget)})`
                    : ""}{" "}
                  will not be able to use this branch until it is reactivated.
                  {deactivateTarget?.manager_id
                    ? " If they manage other active academies, they can switch to those."
                    : ""}
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

      <AlertDialog
        open={!!unassignTarget}
        onOpenChange={(open) => {
          if (!open && !unassigning) setUnassignTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unassign partner from this branch?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">
                    {unassignTarget?.branch?.name || "This academy"}
                  </span>{" "}
                  will become Rock-owned again
                  {unassignTarget?.partner_org_name
                    ? ` (currently assigned to ${unassignTarget.partner_org_name})`
                    : ""}
                  .
                </p>
                <p>You can reassign it to a partner later from Edit Academy.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unassigning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={unassigning || !unassignTarget}
              onClick={(e) => {
                e.preventDefault()
                if (unassignTarget) void unassignPartnerFromBranch(unassignTarget)
              }}
            >
              {unassigning ? "Unassigning…" : "Unassign partner"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPageShell>
  )
}
