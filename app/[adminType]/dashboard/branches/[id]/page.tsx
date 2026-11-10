"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AdminPageShell,
  AdminCard,
  AdminKpiGrid,
  AdminKpiCard,
  AdminDetailLayout,
  AdminStatusPill,
} from "@/components/dashboard/AdminPageShell"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  Home,
  MapPin,
  Phone,
  Mail,
  Clock,
  Users,
  BookOpen,
  Building2,
  Edit,
  Calendar,
  TrendingUp,
  Store,
  ChevronRight,
  GraduationCap,
  UserCheck,
  ImagePlus,
  Upload,
  X,
  ExternalLink,
  Loader2,
  Save,
} from "lucide-react"
import { TokenManager } from "@/lib/tokenManager"
import { getBackendApiUrl } from "@/lib/config"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import { uploadFile } from "@/lib/upload"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import { formatOperationalTimingsForDisplay } from "@/components/branch/types"

interface BranchAddressFields {
  street?: string
  line1?: string
  area?: string
  city?: string
  state?: string
  postal_code?: string
  pincode?: string
  country?: string
}

interface BranchDetails {
  id: string
  branch: {
    name: string
    address: BranchAddressFields & {
      street?: string
      city: string
      state: string
      postal_code: string
      country: string
    }
    phone: string
    email?: string
    operating_hours?: {
      monday?: string
      tuesday?: string
      wednesday?: string
      thursday?: string
      friday?: string
      saturday?: string
      sunday?: string
    }
  }
  is_active: boolean
  created_at: string
  updated_at: string
  total_students?: number
  total_coaches?: number
  active_courses?: number
  monthly_revenue?: number
  cover_image_url?: string
  description?: string
  map_link?: string
  gallery_images?: string[]
  manager_id?: string
  coordinates?: { lat: number; lng: number }
  operational_details?: {
    timings?: Array<{ day?: string; open?: string; close?: string }>
  }
}

interface BranchStatistics {
  coach_count?: number
  student_count?: number
  course_count?: number
  active_courses?: number
  completion_rate?: number
  course_completion_rate?: number
}

interface Course {
  id: string
  name: string
  difficulty_level: string
  enrolled_students: number
  instructor_name?: string
}

interface Coach {
  id: string
  full_name?: string
  personal_info?: {
    first_name?: string
    last_name?: string
  }
  contact_info?: {
    email?: string
    phone?: string
  }
  areas_of_expertise?: string[]
  is_active?: boolean
}

function coachDisplayName(coach: Coach) {
  const fromParts = [coach.personal_info?.first_name, coach.personal_info?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim()
  const name = (coach.full_name || "").trim()
  if (name && name !== coach.id) return name
  return fromParts || "Coach"
}

function isIdLike(value: string) {
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ||
    /^[0-9a-f]{24}$/i.test(value)
  )
}

function formatDate(value?: string) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function managerInitials(name: string) {
  if (!name || name === "—") return "?"
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase()
}

function sectionTitle(label: string) {
  return (
    <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#2F3158]">
      <span className="h-5 w-1 shrink-0 rounded-full bg-[#E1BB33]" aria-hidden />
      {label}
    </h2>
  )
}

function getAddressLines(address: BranchAddressFields | undefined) {
  if (!address) return { line1: "", line2: "", location: "—" }
  const street = (address.street || address.line1 || "").trim()
  const city = (address.city || "").trim()
  const state = (address.state || "").trim()
  const postal = (address.postal_code || address.pincode || "").trim()
  const country = (address.country || "").trim()
  const area = (address.area || "").trim()
  const line1 = [street, area].filter(Boolean).join(", ")
  const line2 = [city, state, postal].filter(Boolean).join(", ")
  const location = [city, state].filter(Boolean).join(", ") || line2 || line1 || "—"
  return {
    line1,
    line2,
    line3: country,
    location,
  }
}

function formatOperatingHours(hours: BranchDetails["branch"]["operating_hours"]) {
  if (!hours) return null
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const parts = days
    .map((day, index) => {
      const time = hours[day]
      return time ? `${dayNames[index]}: ${time}` : null
    })
    .filter(Boolean)
  return parts.length ? parts.join(", ") : null
}

function buildMapEmbedUrl(branch: BranchDetails): string {
  if (branch.map_link?.includes("embed") || branch.map_link?.includes("output=embed")) {
    return branch.map_link
  }
  if (branch.coordinates?.lat != null && branch.coordinates?.lng != null) {
    return `https://maps.google.com/maps?q=${branch.coordinates.lat},${branch.coordinates.lng}&output=embed`
  }
  const addr = branch.branch?.address
  if (!addr) return ""
  const street = addr.street || addr.line1
  const q = [street, addr.city, addr.state, addr.country].filter(Boolean).join(", ")
  if (!q) return ""
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&output=embed`
}

export default function BranchDetailPage() {
  const params = useParams()
  const router = useRouter()
  const basePath = useDashboardBasePath()
  const branchId = params.id as string
  const coverInputRef = useRef<HTMLInputElement>(null)

  const [branch, setBranch] = useState<BranchDetails | null>(null)
  const [branchStats, setBranchStats] = useState<BranchStatistics | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [expertiseNames, setExpertiseNames] = useState<Record<string, string>>({})
  const lookedUpExpertise = useRef<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [coverUploading, setCoverUploading] = useState(false)
  const [coverError, setCoverError] = useState<string | null>(null)
  const [managerName, setManagerName] = useState<string>("—")
  const [descriptionDraft, setDescriptionDraft] = useState("")
  const [editingDescription, setEditingDescription] = useState(false)
  const [savingDescription, setSavingDescription] = useState(false)
  const [descriptionError, setDescriptionError] = useState<string | null>(null)

  useEffect(() => {
    fetchBranchDetails()
  }, [branchId])

  const fetchBranchDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = TokenManager.getToken()
      if (!token) {
        setError("Authentication required. Please login again.")
        return
      }

      const branchResponse = await fetch(`/api/backend/branches/${branchId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!branchResponse.ok) {
        if (branchResponse.status === 404) {
          setError("Branch not found")
          return
        }
        throw new Error(`Failed to fetch branch: ${branchResponse.status}`)
      }

      const branchData = await branchResponse.json()
      setBranch(branchData)
      setDescriptionDraft(branchData.description || "")

      await Promise.all([
        fetchBranchCourses(token),
        fetchBranchCoaches(token),
        fetchBranchStats(token),
      ])
    } catch (err: unknown) {
      console.error("Error fetching branch details:", err)
      setError(err instanceof Error ? err.message : "Failed to load branch details")
    } finally {
      setLoading(false)
    }
  }

  const fetchBranchStats = async (token: string) => {
    try {
      const response = await fetch(getBackendApiUrl(`branches/${branchId}/stats`), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      if (response.ok) {
        const data = await response.json()
        setBranchStats(data.statistics ?? null)
      }
    } catch (err) {
      console.error("Error fetching branch stats:", err)
    }
  }

  const fetchBranchCourses = async (token: string) => {
    try {
      const response = await fetch(`/api/backend/courses/by-branch/${branchId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setCourses(data.courses || [])
      } else {
        console.error("Failed to fetch branch courses:", response.status, response.statusText)
      }
    } catch (err) {
      console.error("Error fetching branch courses:", err)
    }
  }

  const fetchBranchCoaches = async (token: string) => {
    try {
      const pageSize = 100
      const collected: Coach[] = []
      for (let skip = 0; skip < 1000; skip += pageSize) {
        const response = await fetch(
          `/api/backend/coaches?branch_id=${encodeURIComponent(branchId)}&active_only=false&skip=${skip}&limit=${pageSize}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        )
        if (!response.ok) break
        const data = await response.json()
        const batch: Coach[] = data.coaches || []
        collected.push(...batch)
        const total = typeof data.total === "number" ? data.total : collected.length
        if (batch.length === 0 || collected.length >= total) break
      }
      setCoaches(collected)
    } catch (err) {
      console.error("Error fetching branch coaches:", err)
    }
  }

  useEffect(() => {
    const token = TokenManager.getToken()
    if (!token) return
    const known: Record<string, string> = {}
    courses.forEach((course) => {
      if (course.id && course.name) known[course.id] = course.name
    })
    if (Object.keys(known).length > 0) {
      setExpertiseNames((prev) => ({ ...known, ...prev }))
    }
    const missing = Array.from(
      new Set(coaches.flatMap((coach) => coach.areas_of_expertise || []))
    ).filter(
      (value) =>
        value &&
        isIdLike(value) &&
        !known[value] &&
        !lookedUpExpertise.current.has(value)
    )
    if (missing.length === 0) return
    missing.forEach((id) => lookedUpExpertise.current.add(id))
    Promise.all(
      missing.map(async (id) => {
        try {
          const res = await fetch(`/api/backend/courses/${encodeURIComponent(id)}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          })
          if (!res.ok) return null
          const data = await res.json()
          const name = data?.title || data?.name
          return name ? ([id, String(name)] as const) : null
        } catch {
          return null
        }
      })
    ).then((pairs) => {
      const resolved = pairs.filter((pair): pair is readonly [string, string] => !!pair)
      if (resolved.length === 0) return
      setExpertiseNames((prev) => {
        const next = { ...prev }
        resolved.forEach(([id, name]) => {
          next[id] = name
        })
        return next
      })
    })
  }, [coaches, courses])

  useEffect(() => {
    const mid = branch?.manager_id
    if (!mid) {
      setManagerName("—")
      return
    }
    const token = TokenManager.getToken()
    if (!token) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(getBackendApiUrl(`branch-managers/${encodeURIComponent(mid)}`), {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
        if (!res.ok) {
          if (!cancelled) setManagerName("—")
          return
        }
        const data = await res.json()
        const name =
          data.full_name?.trim() ||
          [data.personal_info?.first_name, data.personal_info?.last_name].filter(Boolean).join(" ").trim()
        if (!cancelled) setManagerName(name || "—")
      } catch {
        if (!cancelled) setManagerName("—")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [branch?.manager_id])

  const patchBranch = async (body: Record<string, unknown>) => {
    const token = TokenManager.getToken()
    if (!token) throw new Error("Authentication required. Please login again.")
    const res = await fetch(getBackendApiUrl(`branches/${branchId}`), {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(
        (err as { detail?: string; message?: string }).detail ||
          (err as { message?: string }).message ||
          `Update failed (${res.status})`
      )
    }
    return res.json().catch(() => ({}))
  }

  const handleCoverFile = async (file: File | undefined) => {
    if (!file || !branch) return
    setCoverError(null)
    try {
      setCoverUploading(true)
      const result = await uploadFile(file)
      await patchBranch({ cover_image_url: result.file_url })
      setBranch({ ...branch, cover_image_url: result.file_url })
    } catch (err: unknown) {
      setCoverError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setCoverUploading(false)
      if (coverInputRef.current) coverInputRef.current.value = ""
    }
  }

  const handleRemoveCover = async () => {
    if (!branch) return
    setCoverError(null)
    try {
      setCoverUploading(true)
      await patchBranch({ cover_image_url: "" })
      setBranch({ ...branch, cover_image_url: "" })
    } catch (err: unknown) {
      setCoverError(err instanceof Error ? err.message : "Could not remove cover")
    } finally {
      setCoverUploading(false)
    }
  }

  const handleSaveDescription = async () => {
    if (!branch) return
    setDescriptionError(null)
    try {
      setSavingDescription(true)
      await patchBranch({ description: descriptionDraft.trim() })
      setBranch({ ...branch, description: descriptionDraft.trim() })
      setEditingDescription(false)
    } catch (err: unknown) {
      setDescriptionError(err instanceof Error ? err.message : "Could not save description")
    } finally {
      setSavingDescription(false)
    }
  }

  const handleEdit = () => {
    router.push(`${basePath}/branches/edit/${branchId}`)
  }

  const handleBack = () => {
    router.push(`${basePath}/branches`)
  }

  const activeCoachesCount = coaches.filter((c) => c.is_active).length
  const studentCount = branchStats?.student_count ?? branch?.total_students ?? 0
  const courseCount = courses.length
  const completionRateRaw =
    branchStats?.completion_rate ??
    branchStats?.course_completion_rate ??
    undefined
  const completionDisplay =
    completionRateRaw != null && Number.isFinite(Number(completionRateRaw))
      ? `${Math.round(Number(completionRateRaw))}%`
      : "—"

  const renderCoursesList = () => (
    <>
      {courses.length === 0 ? (
        <div className="py-12 text-center text-sm text-[#7D8592]">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p>No courses assigned to this branch yet</p>
        </div>
      ) : (
        <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
          {courses.map((course) => (
            <div
              key={course.id}
              className="flex items-center justify-between rounded-xl border border-gray-100 bg-[#FAFBFC] p-3"
            >
              <div>
                <h4 className="font-medium text-[#2F3153]">{course.name}</h4>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <Badge variant="secondary" className="rounded-full text-xs">
                    {course.difficulty_level}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {course.enrolled_students || 0} students
                  </span>
                  {course.instructor_name && (
                    <span className="text-sm text-gray-600">
                      Instructor: {course.instructor_name}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`${basePath}/courses/${course.id}`)}
                className="rounded-lg border border-gray-200"
              >
                View
              </Button>
            </div>
          ))}
        </div>
      )}
    </>
  )

  const renderCoachesList = () => (
    <>
      {coaches.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500">
          <Users className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p>No coaches assigned to this branch yet</p>
        </div>
      ) : (
        <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
          {coaches.map((coach) => {
            const expertiseLabels = (coach.areas_of_expertise || [])
              .map((expertise) => expertiseNames[expertise] || (isIdLike(expertise) ? "" : expertise))
              .filter(Boolean)
            return (
              <div
                key={coach.id}
                className="flex items-center justify-between rounded-xl border border-gray-100 bg-[#FAFBFC] p-3 text-[#7D8592]"
              >
                <div>
                  <h4 className="font-medium text-[#2F3153]">{coachDisplayName(coach)}</h4>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <span className="text-sm">{coach.contact_info?.email || "—"}</span>
                    <Badge
                      variant={coach.is_active ? "default" : "secondary"}
                      className={`rounded-full text-xs ${
                        coach.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {coach.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {expertiseLabels.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {expertiseLabels.slice(0, 3).map((expertise, index) => (
                        <Badge key={index} variant="outline" className="rounded-full bg-gray-100 text-xs">
                          {expertise}
                        </Badge>
                      ))}
                      {expertiseLabels.length > 3 && (
                        <Badge variant="outline" className="rounded-full text-xs">
                          +{expertiseLabels.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`${basePath}/coaches/${coach.id}`)}
                  className="rounded-lg border border-gray-200"
                >
                  View
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </>
  )

  if (loading) {
    return (
      <AdminPageShell>
        <Skeleton className="mb-4 h-6 w-72" />
        <Skeleton className="mb-6 h-40 w-full rounded-2xl" />
        <div className="admin-kpi-grid mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="admin-detail-grid">
          <Skeleton className="h-96 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </AdminPageShell>
    )
  }

  if (error) {
    return (
      <AdminPageShell>
        <div className="py-12 text-center">
          <Building2 className="mx-auto mb-4 h-16 w-16 text-gray-400" />
          <h2 className="mb-2 text-2xl font-semibold text-[#2F3158]">Branch Not Found</h2>
          <p className="mb-6 text-[#6B7A99]">{error}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={handleBack} variant="outline" className="btn-admin-outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Branches
            </Button>
            <Button
              onClick={() => window.location.reload()}
              className="bg-[#E1BB33] font-semibold text-[#3d3e5c] hover:bg-[#d4ae2a]"
            >
              Try Again
            </Button>
          </div>
        </div>
      </AdminPageShell>
    )
  }

  if (!branch) {
    return null
  }

  const address = getAddressLines(branch.branch?.address)
  const legacyHours = formatOperatingHours(branch.branch.operating_hours)
  const timingHours = formatOperationalTimingsForDisplay(branch.operational_details?.timings)
  const hoursDisplay = legacyHours || timingHours || "Not specified"
  const coverSrc = branch.cover_image_url ? resolvePublicAssetUrl(branch.cover_image_url) : ""
  const mapEmbed = buildMapEmbedUrl(branch)
  const mapLink =
    branch.map_link ||
    (branch.coordinates
      ? `https://www.google.com/maps/search/?api=1&query=${branch.coordinates.lat},${branch.coordinates.lng}`
      : "")

  const fullLocation = [address.line1, address.line2, address.line3].filter(Boolean).join(", ") || address.location

  return (
    <AdminPageShell>
      <nav className="admin-breadcrumb" aria-label="Breadcrumb">
        <button type="button" onClick={handleBack} className="inline-flex items-center gap-1">
          <Home className="h-3.5 w-3.5" />
          Branches
        </button>
        <ChevronRight className="admin-breadcrumb-sep h-3.5 w-3.5" />
        <span className="truncate text-[#2F3158]">{branch.branch.name}</span>
      </nav>

      <div className="mb-2 flex flex-wrap items-center justify-end gap-3">
        <Button
          type="button"
          onClick={handleEdit}
          className="btn-admin-primary h-11 px-5"
        >
          <Edit className="mr-2 h-4 w-4" />
          Edit Branch
        </Button>
      </div>

      <AdminCard padding={false} className="mb-0 overflow-hidden">
          <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-stretch">
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-3">
              <div className="flex flex-wrap items-start gap-3">
                <div className="admin-icon-tile admin-icon-tile--violet !h-14 !w-14 !rounded-2xl">
                  <Store className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-[#2F3158] sm:text-3xl">
                      {branch.branch.name}
                    </h1>
                    <AdminStatusPill status={branch.is_active ? "active" : "inactive"}>
                      {branch.is_active ? "Active" : "Inactive"}
                    </AdminStatusPill>
                  </div>
                  <p className="mt-2 flex items-start gap-1.5 text-sm text-[#6B7A99]">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#6D28D9]" />
                    <span>{fullLocation}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="relative w-full shrink-0 overflow-hidden rounded-xl border border-dashed border-gray-200 bg-[#FAFBFC] lg:w-72 xl:w-80">
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleCoverFile(e.target.files?.[0])}
              />
              {coverSrc ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverSrc}
                    alt={`${branch.branch.name} cover`}
                    className="h-44 w-full object-cover lg:h-full lg:min-h-[168px]"
                  />
                  <div className="absolute inset-0 flex items-end justify-end gap-2 bg-gradient-to-t from-black/50 to-transparent p-3 opacity-0 transition-opacity hover:opacity-100">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-8 rounded-lg"
                      disabled={coverUploading}
                      onClick={() => coverInputRef.current?.click()}
                    >
                      {coverUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Replace"
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="h-8 rounded-lg"
                      disabled={coverUploading}
                      onClick={handleRemoveCover}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex h-44 flex-col items-center justify-center gap-3 p-4 lg:min-h-[168px]">
                  <ImagePlus className="h-10 w-10 text-gray-300" />
                  <p className="text-center text-xs text-gray-500">Branch cover image</p>
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-lg bg-violet-600 text-white hover:bg-violet-700"
                    disabled={coverUploading}
                    onClick={() => coverInputRef.current?.click()}
                  >
                    {coverUploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Upload cover
                  </Button>
                </div>
              )}
            </div>
          </div>
          {coverError ? <p className="px-5 pb-3 text-sm text-red-600 sm:px-6">{coverError}</p> : null}
      </AdminCard>

      <AdminKpiGrid>
        <AdminKpiCard icon={GraduationCap} tone="blue" label="Total Students" value={studentCount} />
        <AdminKpiCard icon={BookOpen} tone="purple" label="Courses Offered" value={courseCount} />
        <AdminKpiCard icon={UserCheck} tone="green" label="Active Coaches" value={activeCoachesCount} />
        <AdminKpiCard icon={TrendingUp} tone="amber" label="Course Completion" value={completionDisplay} />
      </AdminKpiGrid>

      <AdminDetailLayout
        main={
            <Tabs value={activeTab} onValueChange={setActiveTab} className="admin-tabs gap-4">
              <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl border border-gray-200/80 bg-white p-1 shadow-sm">
                <TabsTrigger value="overview" className="rounded-lg px-4 py-2">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="courses" className="rounded-lg px-4 py-2">
                  Courses ({courses.length})
                </TabsTrigger>
                <TabsTrigger value="coaches" className="rounded-lg px-4 py-2">
                  Coaches ({coaches.length})
                </TabsTrigger>
                <TabsTrigger value="students" className="rounded-lg px-4 py-2">
                  Students ({studentCount})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-0 space-y-6">
                <AdminCard>
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="space-y-5">
                      {sectionTitle("Branch Information")}
                      <div className="space-y-5 text-sm text-[#6B7A99]">
                        <div>
                          <h3 className="mb-1.5 flex items-center text-sm font-medium text-[#2F3158]">
                            <MapPin className="mr-2 h-4 w-4 text-[#6D28D9]" />
                            Address
                          </h3>
                          <div>
                            {address.line1 ? <p>{address.line1}</p> : null}
                            {address.line2 ? <p>{address.line2}</p> : null}
                            {address.line3 ? <p>{address.line3}</p> : null}
                            {!address.line1 && !address.line2 ? <p>Not provided</p> : null}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <h3 className="mb-1.5 flex items-center text-sm font-medium text-[#2F3158]">
                              <Phone className="mr-2 h-4 w-4 text-[#2563EB]" />
                              Phone
                            </h3>
                            <p>{branch.branch.phone || "Not provided"}</p>
                          </div>
                          <div>
                            <h3 className="mb-1.5 flex items-center text-sm font-medium text-[#2F3158]">
                              <Mail className="mr-2 h-4 w-4 text-[#6D28D9]" />
                              Email
                            </h3>
                            <p>{branch.branch.email || "Not provided"}</p>
                          </div>
                        </div>
                        <div>
                          <h3 className="mb-1.5 flex items-center text-sm font-medium text-[#2F3158]">
                            <Clock className="mr-2 h-4 w-4 text-[#C9971A]" />
                            Operating Hours
                          </h3>
                          <p>{hoursDisplay}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {sectionTitle("Map Preview")}
                      {mapEmbed ? (
                        <div className="overflow-hidden rounded-xl border border-gray-100">
                          <iframe
                            title="Branch location map"
                            src={mapEmbed}
                            className="h-56 w-full"
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                          />
                          {mapLink ? (
                            <div className="border-t border-gray-100 bg-[#FAFBFC] px-4 py-2">
                              <a
                                href={mapLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm font-medium text-[#2F3158] hover:underline"
                              >
                                View on Map
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-[#FAFBFC] text-center text-sm text-[#6B7A99]">
                          <MapPin className="mb-2 h-8 w-8 text-gray-300" />
                          <p>No map link or coordinates for this branch yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </AdminCard>

                <AdminCard>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    {sectionTitle("About this Branch")}
                    {!editingDescription ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-[#6B7A99]"
                        onClick={() => {
                          setDescriptionDraft(branch.description || "")
                          setEditingDescription(true)
                        }}
                      >
                        <Edit className="mr-1 h-3.5 w-3.5" />
                        Edit
                      </Button>
                    ) : null}
                  </div>
                  {editingDescription ? (
                    <div className="space-y-3">
                      <Textarea
                        value={descriptionDraft}
                        onChange={(e) => setDescriptionDraft(e.target.value)}
                        rows={5}
                        placeholder="Describe this branch, facilities, and what makes it unique…"
                        className="rounded-xl"
                      />
                      {descriptionError ? (
                        <p className="text-sm text-red-600">{descriptionError}</p>
                      ) : null}
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="bg-[#E1BB33] font-semibold text-[#3d3e5c] hover:bg-[#d4ae2a]"
                          disabled={savingDescription}
                          onClick={handleSaveDescription}
                        >
                          {savingDescription ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="mr-2 h-4 w-4" />
                          )}
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="btn-admin-outline"
                          disabled={savingDescription}
                          onClick={() => {
                            setEditingDescription(false)
                            setDescriptionDraft(branch.description || "")
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="rounded-xl border border-gray-100 bg-[#FAFBFC] p-4 text-sm leading-relaxed text-[#6B7A99]">
                      {branch.description?.trim() ||
                        "No description has been added for this branch yet. Use Edit to share more about the location, programs, and community."}
                    </p>
                  )}
                </AdminCard>
              </TabsContent>

              <TabsContent value="courses">
                <AdminCard>
                  <h3 className="mb-4 text-[15px] font-semibold text-[#2F3158]">Courses at this Branch</h3>
                  {renderCoursesList()}
                </AdminCard>
              </TabsContent>

              <TabsContent value="coaches">
                <AdminCard>
                  <h3 className="mb-4 text-[15px] font-semibold text-[#2F3158]">Coaches at this Branch</h3>
                  {renderCoachesList()}
                </AdminCard>
              </TabsContent>

              <TabsContent value="students">
                <AdminCard className="py-10 text-center">
                  <GraduationCap className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                  <p className="mb-4 text-sm text-[#6B7A99]">
                    View and manage students enrolled at {branch.branch.name}.
                  </p>
                  <Button
                    className="bg-[#E1BB33] font-semibold text-[#3d3e5c] hover:bg-[#d4ae2a]"
                    onClick={() =>
                      router.push(`${basePath}/students?branch=${encodeURIComponent(branchId)}`)
                    }
                  >
                    <Users className="mr-2 h-4 w-4" />
                    View Branch Students
                  </Button>
                </AdminCard>
              </TabsContent>
            </Tabs>
        }
        side={
          <>
            <AdminCard>
              <h3 className="mb-4 text-[15px] font-semibold text-[#2F3158]">Branch Status</h3>
              <div className="space-y-3 text-sm text-[#6B7A99]">
                <div className="flex items-center justify-between gap-2">
                  <span>Status</span>
                  <AdminStatusPill status={branch.is_active ? "active" : "inactive"}>
                    {branch.is_active ? "Active" : "Inactive"}
                  </AdminStatusPill>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="shrink-0">Branch ID</span>
                  <span className="truncate font-mono text-xs text-[#2F3158]">{branch.id}</span>
                </div>
              </div>
            </AdminCard>

            <AdminCard>
              <h3 className="mb-4 text-[15px] font-semibold text-[#2F3158]">Branch Manager</h3>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF8E1] text-sm font-semibold text-[#B8860B]">
                    {managerInitials(managerName)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#2F3158]">{managerName}</p>
                    <p className="text-xs text-[#6B7A99]">
                      {branch.manager_id ? "Branch Manager" : "Not assigned"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  {branch.branch.phone ? (
                    <a
                      href={`tel:${branch.branch.phone}`}
                      className="btn-admin-outline !h-9 !w-9 !p-0"
                      title="Call branch"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                  ) : null}
                  {branch.branch.email ? (
                    <a
                      href={`mailto:${branch.branch.email}`}
                      className="btn-admin-outline !h-9 !w-9 !p-0"
                      title="Email branch"
                    >
                      <Mail className="h-4 w-4" />
                    </a>
                  ) : null}
                </div>
              </div>
            </AdminCard>

            <AdminCard>
              <h3 className="mb-4 text-[15px] font-semibold text-[#2F3158]">Branch Details</h3>
              <div className="space-y-4 text-sm text-[#6B7A99]">
                <div>
                  <p className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-[#9593A8]">
                    <Calendar className="h-3.5 w-3.5" />
                    Created
                  </p>
                  <p className="text-[#2F3158]">{formatDate(branch.created_at)}</p>
                </div>
                <div>
                  <p className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-[#9593A8]">
                    <Calendar className="h-3.5 w-3.5" />
                    Last Updated
                  </p>
                  <p className="text-[#2F3158]">{formatDate(branch.updated_at)}</p>
                </div>
              </div>
            </AdminCard>

            <AdminCard>
              <h3 className="mb-4 text-[15px] font-semibold text-[#2F3158]">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  type="button"
                  className="admin-quick-action"
                  onClick={() =>
                    router.push(`${basePath}/students?branch=${encodeURIComponent(branchId)}`)
                  }
                >
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#2563EB]" />
                    View Branch Students
                  </span>
                  <ChevronRight className="h-4 w-4 text-[#6B7A99]" />
                </button>
                <button
                  type="button"
                  className="admin-quick-action"
                  onClick={() =>
                    router.push(`${basePath}/branch-courses?branch_id=${encodeURIComponent(branchId)}`)
                  }
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-[#6D28D9]" />
                    Manage Branch Courses
                  </span>
                  <ChevronRight className="h-4 w-4 text-[#6B7A99]" />
                </button>
                <button
                  type="button"
                  className="admin-quick-action"
                  onClick={() => router.push(`${basePath}/branches`)}
                >
                  <span className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-[#1F9D57]" />
                    Assign Manager
                  </span>
                  <ChevronRight className="h-4 w-4 text-[#6B7A99]" />
                </button>
              </div>
            </AdminCard>
          </>
        }
      />
    </AdminPageShell>
  )
}
