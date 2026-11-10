"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Loader2,
  Mail,
  MapPin,
  MoreVertical,
  Phone,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
  Users,
  XCircle,
  Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import CoachAvailabilityEditor from "@/components/coaches/CoachAvailabilityEditor"
import {
  AdminPageShell,
  AdminPageHeader,
  AdminCard,
  AdminFilterBar,
  AdminTableShell,
} from "@/components/dashboard/AdminPageShell"
import { TokenManager } from "@/lib/tokenManager"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { fetchAllCoaches, coachDisplayInfo } from "@/lib/coachFetch"
import { coachAvailabilityAPI } from "@/lib/coachAvailabilityAPI"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"

const BRAND_YELLOW = "bg-[#E1BB33] hover:bg-[#c9a82e] text-gray-900"
const ITEMS_PER_PAGE = 8
const AVAIL_CONCURRENCY = 6

type CoachRow = {
  id: string
  full_name: string
  email: string
  phone: string
  branch_name: string
  approval_status: string
  is_active: boolean
  profile_image_url?: string
  coach_code: string
}

type AvailMeta = {
  slotCount: number
  updatedAt: string | null
  loaded: boolean
}

function normalizeApprovalStatus(coach: { approval_status?: string | null; is_active?: boolean }) {
  if (coach.is_active === false) return "inactive"
  return (coach.approval_status || "approved").toLowerCase()
}

function coachTableStatus(
  coach: { approval_status?: string | null; is_active?: boolean }
): "Approved" | "Pending" | "Rejected" | "Inactive" {
  if (coach.is_active === false) return "Inactive"
  const st = normalizeApprovalStatus(coach)
  if (st === "pending") return "Pending"
  if (st === "rejected") return "Rejected"
  return "Approved"
}

function getCoachBranchName(coach: any): string {
  const fromName = (coach?.branch_name || "").trim()
  if (fromName) return fromName
  if (coach?.branches?.length) {
    const b = coach.branches[0]
    return (b?.branch?.name || b?.name || "").trim()
  }
  if (coach?.branch_assignments?.length) {
    const a = coach.branch_assignments[0]
    if (typeof a === "string") return a.trim()
    return (a?.branch_name || a?.name || "").trim()
  }
  return "—"
}

function formatCoachCode(coach: any): string {
  const explicit =
    coach?.coach_code || coach?.code || coach?.employee_code || coach?.coach_number
  if (explicit) return String(explicit).toUpperCase()
  const id = String(coach?.id || "")
  const tail = id.replace(/-/g, "").slice(-4).toUpperCase()
  return tail ? `COA-${tail}` : "—"
}

function coachInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function formatPhone(coach: any): string {
  const cc = coach?.contact_info?.country_code || ""
  const local = coachDisplayInfo(coach).phone || coach?.contact_info?.phone || ""
  const combined = `${cc} ${local}`.trim()
  return combined || "—"
}

function formatUpdatedAt(iso: string | null | undefined): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

async function loadAvailabilityMeta(
  coachIds: string[],
  onChunk: (patch: Record<string, AvailMeta>) => void
) {
  for (let i = 0; i < coachIds.length; i += AVAIL_CONCURRENCY) {
    const chunk = coachIds.slice(i, i + AVAIL_CONCURRENCY)
    const patch: Record<string, AvailMeta> = {}
    await Promise.all(
      chunk.map(async (id) => {
        try {
          const avail = await coachAvailabilityAPI.getForCoach(id)
          patch[id] = {
            slotCount: avail.weekly_slots?.length ?? 0,
            updatedAt: avail.updated_at || null,
            loaded: true,
          }
        } catch {
          patch[id] = { slotCount: 0, updatedAt: null, loaded: true }
        }
      })
    )
    onChunk(patch)
  }
}

const STATUS_BADGE: Record<string, string> = {
  Approved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  Pending: "border-amber-200 bg-amber-50 text-amber-900",
  Rejected: "border-red-200 bg-red-50 text-red-800",
  Inactive: "border-gray-200 bg-gray-50 text-gray-600",
}

export default function AdminCoachAvailabilityPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const editorCoachId = searchParams.get("coachId")

  const [coaches, setCoaches] = useState<CoachRow[]>([])
  const [availByCoach, setAvailByCoach] = useState<Record<string, AvailMeta>>({})
  const [loading, setLoading] = useState(true)
  const [availLoading, setAvailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [branchFilter, setBranchFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)

  const openEditor = (coachId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("coachId", coachId)
    router.push(`${pathname}?${params.toString()}`)
  }

  const closeEditor = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("coachId")
    const q = params.toString()
    router.push(q ? `${pathname}?${q}` : pathname)
  }

  const loadCoaches = useCallback(async () => {
    const token = BranchManagerAuth.getToken() || TokenManager.getToken()
    if (!token) {
      setError("Not authenticated")
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      // Online Coaches only — in-house coaches are managed under Coaches
      const rows = await fetchAllCoaches(token, {
        activeOnly: false,
        registrationSource: "self",
      })
      const mapped: CoachRow[] = (rows || []).map((c: any) => {
        const info = coachDisplayInfo(c)
        return {
          id: c.id,
          full_name: info.full_name || c.id,
          email: c.contact_info?.email || c.email || "—",
          phone: formatPhone(c),
          branch_name: getCoachBranchName(c),
          approval_status: normalizeApprovalStatus(c),
          is_active: c.is_active !== false,
          profile_image_url: c.profile_image_url,
          coach_code: formatCoachCode(c),
        }
      })
      mapped.sort((a, b) => a.full_name.localeCompare(b.full_name))
      setCoaches(mapped)
      setAvailByCoach({})
      setAvailLoading(true)
      void loadAvailabilityMeta(
        mapped.map((c) => c.id),
        (patch) => setAvailByCoach((prev) => ({ ...prev, ...patch }))
      ).finally(() => setAvailLoading(false))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load coaches")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCoaches()
  }, [loadCoaches])

  const branchOptions = useMemo(() => {
    const set = new Set<string>()
    for (const c of coaches) {
      if (c.branch_name && c.branch_name !== "—") set.add(c.branch_name)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [coaches])

  const kpi = useMemo(() => {
    let approved = 0
    let pending = 0
    let rejected = 0
    for (const c of coaches) {
      const st = coachTableStatus(c)
      if (st === "Pending") pending++
      else if (st === "Rejected") rejected++
      else if (st === "Approved") approved++
    }
    return { total: coaches.length, approved, pending, rejected }
  }, [coaches])

  const filtered = useMemo(() => {
    return coaches.filter((coach) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const match =
          coach.full_name.toLowerCase().includes(q) ||
          coach.email.toLowerCase().includes(q) ||
          coach.phone.toLowerCase().includes(q) ||
          coach.coach_code.toLowerCase().includes(q) ||
          coach.id.toLowerCase().includes(q)
        if (!match) return false
      }
      if (branchFilter !== "all" && coach.branch_name !== branchFilter) return false
      if (statusFilter !== "all") {
        const st = coachTableStatus(coach).toLowerCase()
        if (st !== statusFilter) return false
      }
      return true
    })
  }, [coaches, searchTerm, branchFilter, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages))
  }, [totalPages])

  const pageRows = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const showingFrom = filtered.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1
  const showingTo = Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)

  const selectedCoach = editorCoachId
    ? coaches.find((c) => c.id === editorCoachId)
    : undefined

  if (editorCoachId) {
    return (
      <AdminPageShell className="admin-stack">
        <AdminPageHeader
          icon={CalendarClock}
          title="Online Coach Availability"
          subtitle="Weekly slots for online-enrolled coaches only. In-house coaches are under Coaches."
          actions={
            <Button
              type="button"
              variant="outline"
              className="btn-admin-outline h-10"
              onClick={closeEditor}
            >
              Back to list
            </Button>
          }
        />

          {selectedCoach ? (
            <AdminCard className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-4">
                <Avatar className="h-14 w-14 border border-gray-100">
                  {selectedCoach.profile_image_url ? (
                    <AvatarImage
                      src={resolvePublicAssetUrl(selectedCoach.profile_image_url)}
                      alt={selectedCoach.full_name}
                    />
                  ) : null}
                  <AvatarFallback className="bg-violet-50 text-sm font-semibold text-violet-700">
                    {coachInitials(selectedCoach.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold text-[#4F5077]">{selectedCoach.full_name}</p>
                  <span className="mt-1 inline-flex rounded-md border border-violet-100 bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
                    {selectedCoach.coach_code}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#4F5077]">
                  <MapPin className="h-4 w-4 text-violet-500" />
                  <div>
                    <p className="text-xs text-gray-500">Home Branch</p>
                    <p className="font-medium">{selectedCoach.branch_name}</p>
                  </div>
                </div>
              </div>
            </AdminCard>
          ) : null}

          <CoachAvailabilityEditor
            key={editorCoachId}
            coachId={editorCoachId}
            showHeader={false}
            onDiscard={closeEditor}
          />
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell className="admin-stack">
        <AdminPageHeader
          icon={CalendarClock}
          title="Online Coach Availability"
          subtitle="Manage availability for online-enrolled coaches. In-house coaches are under Coaches."
          actions={
            <div className="admin-actions">
              <Button
                type="button"
                variant="outline"
                className="btn-admin-outline h-10"
                onClick={() => void loadCoaches()}
                disabled={loading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                type="button"
                className={`btn-admin-primary h-10 ${BRAND_YELLOW}`}
                disabled={coaches.length === 0}
                onClick={() => {
                  const first = filtered[0] || coaches[0]
                  if (first) openEditor(first.id)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Set Availability
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total Coaches",
              value: kpi.total,
              icon: Users,
              tone: "from-violet-50 to-white",
              iconTone: "bg-violet-100 text-violet-700",
              wave: "bg-violet-100/70",
            },
            {
              label: "Approved",
              value: kpi.approved,
              icon: UserCheck,
              tone: "from-emerald-50 to-white",
              iconTone: "bg-emerald-100 text-emerald-700",
              wave: "bg-emerald-100/70",
            },
            {
              label: "Pending",
              value: kpi.pending,
              icon: Clock,
              tone: "from-amber-50 to-white",
              iconTone: "bg-amber-100 text-amber-700",
              wave: "bg-amber-100/70",
            },
            {
              label: "Rejected",
              value: kpi.rejected,
              icon: XCircle,
              tone: "from-rose-50 to-white",
              iconTone: "bg-rose-100 text-rose-700",
              wave: "bg-rose-100/70",
            },
          ].map((card) => (
            <div
              key={card.label}
              className={`relative overflow-hidden rounded-2xl border border-gray-200/80 bg-gradient-to-br ${card.tone} p-5 shadow-sm`}
            >
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="mt-2 text-3xl font-bold text-[#4F5077]">{card.value}</p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.iconTone}`}>
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
              <div
                className={`pointer-events-none absolute -bottom-6 -right-6 h-24 w-24 rounded-full ${card.wave}`}
              />
            </div>
          ))}
        </div>

        <AdminFilterBar>
          <div className="relative min-w-0 flex-1 lg:min-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by coach name, email or phone…"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="h-11 pl-10"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v)
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="h-11 w-full bg-white sm:w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={branchFilter}
            onValueChange={(v) => {
              setBranchFilter(v)
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="h-11 w-full bg-white sm:w-[180px]">
              <SelectValue placeholder="Branch" />
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
        </AdminFilterBar>

        <AdminCard padding={false}>
          <AdminTableShell
            className="border-0 shadow-none"
            footer={
              <>
                <p className="text-sm text-[#6B7A99]">
                  Showing {showingFrom} – {showingTo} of {filtered.length} coach
                  {filtered.length === 1 ? "" : "es"}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      type="button"
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className={`h-9 w-9 p-0 ${
                        page === currentPage ? `${BRAND_YELLOW} border-transparent` : ""
                      }`}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            }
          >
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Coach</th>
                  <th>Contact</th>
                  <th>Branch</th>
                  <th>Approval Status</th>
                  <th>Availability</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      <Loader2 className="mr-2 inline h-5 w-5 animate-spin" />
                      Loading coaches…
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-red-600">
                      {error}
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      No coaches match your filters.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((coach, idx) => {
                    const rowNum = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1
                    const status = coachTableStatus(coach)
                    const meta = availByCoach[coach.id]
                    const slots = meta?.slotCount ?? 0

                    return (
                      <tr key={coach.id} className="border-b last:border-0 hover:bg-[#FAFBFC]">
                        <td className="px-5 py-4 text-gray-500">{rowNum}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border border-gray-100">
                              {coach.profile_image_url ? (
                                <AvatarImage
                                  src={resolvePublicAssetUrl(coach.profile_image_url)}
                                  alt={coach.full_name}
                                />
                              ) : null}
                              <AvatarFallback className="bg-violet-50 text-xs font-semibold text-violet-700">
                                {coachInitials(coach.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-[#4F5077]">{coach.full_name}</p>
                              <span className="mt-0.5 inline-flex rounded border border-violet-100 bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
                                {coach.coach_code}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-1 text-[#4F5077]">
                            <span className="flex items-center gap-1.5 text-xs">
                              <Mail className="h-3.5 w-3.5 text-sky-500" />
                              {coach.email}
                            </span>
                            <span className="flex items-center gap-1.5 text-xs">
                              <Phone className="h-3.5 w-3.5 text-emerald-500" />
                              {coach.phone}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="flex items-center gap-1.5 text-[#4F5077]">
                            <MapPin className="h-4 w-4 shrink-0 text-violet-400" />
                            {coach.branch_name}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[status]}`}
                          >
                            {status === "Approved" && <CheckCircle2 className="h-3 w-3" />}
                            {status === "Pending" && <Clock className="h-3 w-3" />}
                            {status === "Rejected" && <XCircle className="h-3 w-3" />}
                            {status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {!meta?.loaded && availLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                          ) : slots > 0 ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                              <Calendar className="h-3 w-3" />
                              {slots} Slot{slots === 1 ? "" : "s"} / Week
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-[#4F5077]">
                          {formatUpdatedAt(meta?.updatedAt)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 gap-1.5 rounded-lg border-gray-200"
                              onClick={() => openEditor(coach.id)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Manage
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-9 w-9 rounded-lg p-0">
                                  <MoreVertical className="h-4 w-4 text-gray-500" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditor(coach.id)}>
                                  Set availability
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
        </AdminCard>
    </AdminPageShell>
  )
}
