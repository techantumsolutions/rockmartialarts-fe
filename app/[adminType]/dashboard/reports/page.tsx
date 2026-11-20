"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  FileText,
  TrendingUp,
  AlertCircle,
  Loader2,
  RefreshCw,
  Building2,
  CalendarDays,
  Users,
  BookOpen,
  UserCheck,
  Wallet,
  RefreshCcw,
  Megaphone,
  Ticket,
  ClipboardCheck,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import { reportsAPI } from "@/lib/reportsAPI"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import ErrorBoundary from "@/components/error-boundary"
import { useReportsApi } from "@/hooks/useApiWithRetry"
import {
  ReportCategoriesGridSkeleton,
  PageHeaderSkeleton,
  SearchBarSkeleton,
  InlineLoader,
} from "@/components/skeleton-loaders"
import { useDebounce, usePerformanceMonitor, useStableCallback } from "@/hooks/usePerformance"
import { getBackendApiUrl } from "@/lib/config"
import { TokenManager } from "@/lib/tokenManager"
import {
  REPORT_DURATION_OPTIONS,
  readReportHubFilters,
  writeReportHubFilters,
  reportHubQueryString,
  academySlugFromBranch,
  type ReportHubFilters,
} from "@/lib/reportHubFilters"

type ReportGroup = "all" | "academic" | "operations" | "financial" | "crm"

type ReportCategory = {
  id: string
  name: string
  description: string
  group: ReportGroup
  icon: typeof FileText
  tags: string[]
  tone: string
  iconWrap: string
  button: string
}

const REPORT_CATEGORIES: ReportCategory[] = [
  {
    id: "student",
    name: "Student Reports",
    description: "Enrollment, attendance, performance",
    group: "academic",
    icon: Users,
    tags: ["Enrollment", "Attendance", "Performance"],
    tone: "from-violet-100 via-fuchsia-50 to-pink-100 border-violet-300/70",
    iconWrap: "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-violet-400/40",
    button: "bg-violet-600 hover:bg-violet-700 text-white",
  },
  {
    id: "course",
    name: "Course Reports",
    description: "Enrollment, completion, popularity",
    group: "academic",
    icon: BookOpen,
    tags: ["Enrollment", "Completion", "Performance"],
    tone: "from-sky-100 via-cyan-50 to-blue-100 border-sky-300/70",
    iconWrap: "bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-sky-400/40",
    button: "bg-sky-600 hover:bg-sky-700 text-white",
  },
  {
    id: "coach",
    name: "Coach Reports",
    description: "Assignments, ratings, workload",
    group: "operations",
    icon: UserCheck,
    tags: ["Assignments", "Ratings"],
    tone: "from-emerald-100 via-teal-50 to-green-100 border-emerald-300/70",
    iconWrap: "bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-emerald-400/40",
    button: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
  {
    id: "branch",
    name: "Academy Reports",
    description: "Students, revenue, capacity",
    group: "operations",
    icon: Building2,
    tags: ["Academy", "Students", "Revenue"],
    tone: "from-amber-100 via-orange-50 to-yellow-100 border-amber-300/70",
    iconWrap: "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-amber-400/40",
    button: "bg-amber-600 hover:bg-amber-700 text-white",
  },
  {
    id: "financial",
    name: "Financial Reports",
    description: "Payments, revenue, and dues",
    group: "financial",
    icon: Wallet,
    tags: ["Payments", "Revenue", "Dues"],
    tone: "from-rose-100 via-pink-50 to-red-100 border-rose-300/70",
    iconWrap: "bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-rose-400/40",
    button: "bg-rose-600 hover:bg-rose-700 text-white",
  },
  {
    id: "enrollments",
    name: "Enrollment Reports",
    description: "Plans, status, listings",
    group: "operations",
    icon: ClipboardCheck,
    tags: ["Enrollments", "Plans", "Status"],
    tone: "from-blue-100 via-indigo-50 to-sky-100 border-blue-300/70",
    iconWrap: "bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-blue-400/40",
    button: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  {
    id: "renewals",
    name: "Renewal Reports",
    description: "Renewals, expiry, revenue",
    group: "financial",
    icon: RefreshCcw,
    tags: ["Renewals", "Expiry", "Revenue"],
    tone: "from-indigo-100 via-violet-50 to-purple-100 border-indigo-300/70",
    iconWrap: "bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-indigo-400/40",
    button: "bg-indigo-600 hover:bg-indigo-700 text-white",
  },
  {
    id: "leads",
    name: "Lead Reports",
    description: "Leads, conversion, source",
    group: "crm",
    icon: Megaphone,
    tags: ["Leads", "Conversion", "Source"],
    tone: "from-teal-100 via-cyan-50 to-emerald-100 border-teal-300/70",
    iconWrap: "bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-teal-400/40",
    button: "bg-teal-600 hover:bg-teal-700 text-white",
  },
  {
    id: "events",
    name: "Event Reports",
    description: "Registrations & attendance",
    group: "crm",
    icon: Ticket,
    tags: ["Registrations", "Attendance"],
    tone: "from-purple-100 via-fuchsia-50 to-violet-100 border-purple-300/70",
    iconWrap: "bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white shadow-purple-400/40",
    button: "bg-purple-600 hover:bg-purple-700 text-white",
  },
  {
    id: "attendance",
    name: "Attendance Reports",
    description: "Listings and exports",
    group: "operations",
    icon: TrendingUp,
    tags: ["Attendance", "Students"],
    tone: "from-lime-100 via-green-50 to-emerald-100 border-lime-300/70",
    iconWrap: "bg-gradient-to-br from-lime-500 to-green-500 text-white shadow-lime-400/40",
    button: "bg-lime-600 hover:bg-lime-700 text-white",
  },
]

const GROUP_TABS: Array<{ id: ReportGroup; label: string }> = [
  { id: "all", label: "All Reports" },
  { id: "academic", label: "Academic" },
  { id: "operations", label: "Operations" },
  { id: "financial", label: "Financial" },
  { id: "crm", label: "CRM & Growth" },
]

function ReportsPageContent() {
  const router = useRouter()
  const basePath = useDashboardBasePath()
  const { token } = useAuth()

  const [searchTerm, setSearchTerm] = useState("")
  const [groupFilter, setGroupFilter] = useState<ReportGroup>("all")
  const [categoryLoading, setCategoryLoading] = useState<string | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const [hubFilters, setHubFilters] = useState<ReportHubFilters>({
    branch_id: "all",
    academy: "all",
    date_range: "last-30-days",
  })
  const [branches, setBranches] = useState<Array<{ id: string; name: string; slug?: string }>>([])
  const [branchesLoading, setBranchesLoading] = useState(false)

  const { logPerformance } = usePerformanceMonitor("ReportsPage")
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const {
    data: filterOptions,
    loading,
    error,
    retry: retryLoadOptions,
    reset: resetApiState,
  } = useReportsApi(
    useCallback(() => {
      if (!token) throw new Error("Authentication token not available")
      return reportsAPI.getReportFilters(token)
    }, [token]),
    {
      maxRetries: 2,
      retryDelay: 1500,
      showErrorToast: true,
      errorMessage: "Failed to load filter options. Please try again.",
    }
  )

  useEffect(() => {
    setHubFilters(readReportHubFilters())
  }, [])

  useEffect(() => {
    writeReportHubFilters(hubFilters)
  }, [hubFilters])

  useEffect(() => {
    if (token) resetApiState()
  }, [token, resetApiState])

  useEffect(() => {
    if (error && error !== lastError) {
      setLastError(error)
      console.error("Reports page error:", error)
    }
  }, [error, lastError])

  useEffect(() => {
    let cancelled = false
    const loadBranches = async () => {
      setBranchesLoading(true)
      try {
        const authToken = token || TokenManager.getToken()
        const res = await fetch(getBackendApiUrl("branches"), {
          headers: {
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            "Content-Type": "application/json",
          },
          cache: "no-store",
        })
        if (!res.ok) throw new Error("Failed to load academies")
        const data = await res.json()
        const list = (data.branches || data || []).map((b: any) => {
          const name = String(b.branch?.name || b.name || "Academy")
          return {
            id: String(b.id),
            name,
            slug: String(b.slug || academySlugFromBranch({ id: b.id, name, slug: b.slug })),
          }
        })
        if (!cancelled) setBranches(list.filter((b: { id: string }) => b.id))
      } catch {
        // Fallback to filter options if present
        const fromFilters = (filterOptions as any)?.filters?.branches || (filterOptions as any)?.branches || []
        if (!cancelled && Array.isArray(fromFilters)) {
          setBranches(
            fromFilters.map((b: any) => {
              const name = String(b.name || b.branch_name || "Academy")
              return {
                id: String(b.id),
                name,
                slug: String(b.slug || academySlugFromBranch({ id: b.id, name, slug: b.slug })),
              }
            })
          )
        }
      } finally {
        if (!cancelled) setBranchesLoading(false)
      }
    }
    void loadBranches()
    return () => {
      cancelled = true
    }
  }, [token, filterOptions])

  const openCategory = useStableCallback((categoryId: string) => {
    if (!categoryId || categoryLoading) return
    const category = REPORT_CATEGORIES.find((cat) => cat.id === categoryId)
    if (!category) {
      toast.error("Category not found")
      return
    }
    setCategoryLoading(categoryId)
    writeReportHubFilters(hubFilters)
    const qs = reportHubQueryString(hubFilters)
    const navigationTimeout = setTimeout(() => {
      try {
        setCategoryLoading(null)
        router.push(`${basePath}/reports/${categoryId}${qs}`)
        toast.success(`Opening ${category.name}…`)
        logPerformance(`Navigation completed: ${categoryId}`)
      } catch (navError) {
        console.error("Navigation error:", navError)
        setCategoryLoading(null)
        toast.error("Failed to navigate to category page")
      }
    }, 200)
    return () => clearTimeout(navigationTimeout)
  }, [categoryLoading, router, logPerformance, basePath, hubFilters])

  const filteredCategories = useMemo(() => {
    const searchLower = debouncedSearchTerm.toLowerCase().trim()
    return REPORT_CATEGORIES.filter((category) => {
      if (groupFilter !== "all" && category.group !== groupFilter) return false
      if (!searchLower) return true
      return (
        category.name.toLowerCase().includes(searchLower) ||
        category.description.toLowerCase().includes(searchLower) ||
        category.tags.some((t) => t.toLowerCase().includes(searchLower))
      )
    })
  }, [debouncedSearchTerm, groupFilter])

  if (loading && !filterOptions) {
    return (
      <div className="w-full min-w-0">
        <PageHeaderSkeleton />
        <SearchBarSkeleton />
        <ReportCategoriesGridSkeleton />
      </div>
    )
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#4F5077]">Reports & Analytics</h1>
        <p className="text-gray-600">
          Generate, analyze, and download reports for your academy.
          {loading ? <InlineLoader size="sm" className="ml-2" /> : null}
        </p>
      </div>

      {/* Hub filters: academy + duration only (no categories/courses) */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Building2 className="h-3.5 w-3.5 text-violet-500" />
              Select Academy
            </label>
            <Select
              value={hubFilters.branch_id || "all"}
              onValueChange={(value) => {
                if (value === "all") {
                  setHubFilters((prev) => ({ ...prev, branch_id: "all", academy: "all" }))
                  return
                }
                const match = branches.find((b) => b.id === value)
                setHubFilters((prev) => ({
                  ...prev,
                  branch_id: value,
                  academy: match
                    ? academySlugFromBranch(match)
                    : academySlugFromBranch({ id: value, name: value }),
                }))
              }}
              disabled={branchesLoading}
            >
              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50/80">
                <SelectValue
                  placeholder={branchesLoading ? "Loading academies…" : "Select Academy"}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Academies</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <CalendarDays className="h-3.5 w-3.5 text-amber-500" />
              Duration
            </label>
            <Select
              value={hubFilters.date_range || "last-30-days"}
              onValueChange={(value) =>
                setHubFilters((prev) => ({ ...prev, date_range: value }))
              }
            >
              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50/80">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_DURATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {GROUP_TABS.map((tab) => {
            const active = groupFilter === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setGroupFilter(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-[#E1BB33] text-[#171A26] shadow-sm"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search reports…"
            className="h-11 rounded-xl border-slate-200 bg-white pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {filteredCategories.map((category) => {
          const Icon = category.icon
          const isLoading = categoryLoading === category.id
          return (
            <Card
              key={category.id}
              className={`overflow-hidden border bg-gradient-to-br shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${category.tone}`}
            >
              <CardContent className="flex h-full flex-col gap-2.5 p-3.5 sm:p-4">
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-md ${category.iconWrap}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" /> : null}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold leading-snug text-slate-900 sm:text-[15px]">
                    {category.name}
                  </h3>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-600 sm:text-xs">
                    {category.description}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {category.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-black/5"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <Button
                  size="sm"
                  className={`mt-auto h-8 rounded-lg px-2.5 text-xs font-semibold shadow-sm ${category.button}`}
                  onClick={() => openCategory(category.id)}
                  disabled={isLoading}
                >
                  {isLoading ? "Opening…" : "Generate"}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {debouncedSearchTerm && filteredCategories.length === 0 ? (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-6 text-center">
            <Search className="mx-auto mb-3 h-10 w-10 text-yellow-500" />
            <p className="font-medium text-gray-900">No reports found</p>
            <p className="mt-1 text-sm text-gray-600">
              Nothing matches “{debouncedSearchTerm}”.
            </p>
            <Button onClick={() => setSearchTerm("")} variant="outline" className="mt-4">
              Clear Search
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
            <p className="font-medium text-gray-900">Unable to load report filters</p>
            <p className="mt-1 text-sm text-gray-600">{error}</p>
            <Button onClick={retryLoadOptions} className="mt-4" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Retrying…
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

export default function ReportsPage() {
  return (
    <ErrorBoundary
      title="Reports Dashboard Error"
      description="The reports dashboard encountered an unexpected error. Please try refreshing the page or contact support if the problem persists."
      showRetry={true}
      showHome={true}
      showBack={true}
      onError={(error, errorInfo) => {
        console.error("Reports dashboard error:", error, errorInfo)
      }}
    >
      <ReportsPageContent />
    </ErrorBoundary>
  )
}
