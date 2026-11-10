"use client"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Users,
  AlertCircle,
  CreditCard,
  CalendarDays,
  IndianRupee,
  UserCheck,
  BookOpen,
  UserX,
  ClipboardList,
  RefreshCw,
  Target,
  UserCog,
  Presentation,
  Dumbbell,
  PartyPopper,
  ArrowRight,
  Building2,
  Calendar,
  TrendingUp,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Header from "@/components/layout/Header"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback, useMemo } from "react"
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { useDashboardBasePath, useDashboardRole } from "@/lib/useDashboardBasePath"
import { dashboardAPI, DashboardStats, Coach } from "@/lib/api"
import { paymentAPI, PaymentStats, Payment } from "@/lib/paymentAPI"
import { branchAPI } from "@/lib/branchAPI"
import { TokenManager } from "@/lib/tokenManager"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { getActiveBranchId } from "@/lib/activeBranch"

interface CourseCoachReference {
  id?: string
  instructor_id?: string
  coach_id?: string
  instructor_name?: string
  coach_name?: string
  full_name?: string
  name?: string
}

interface DashboardCourse {
  id?: string
  title?: string
  name?: string
  course_name?: string
  instructor_assignments?: CourseCoachReference[]
  instructors?: CourseCoachReference[]
  assigned_coaches?: CourseCoachReference[]
}

interface CoachCourseAssignment {
  course_id?: string
  course_name?: string
  id?: string
  title?: string
}

type DashboardCoach = Coach & {
  assigned_courses?: CoachCourseAssignment[]
}

interface CoachCourseOption {
  id: string
  name: string
  coachIds: string[]
  coachNames: string[]
}

export default function SuperAdminDashboard() {
  const router = useRouter()
  const basePath = useDashboardBasePath()
  // State management
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [coaches, setCoaches] = useState<DashboardCoach[]>([])
  const [courses, setCourses] = useState<CoachCourseOption[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState("")
  const [coursesLoading, setCoursesLoading] = useState(false)
  const [coursesError, setCoursesError] = useState<string | null>(null)
  const [courseNameById, setCourseNameById] = useState<Record<string, string>>({})
  const [coachBranchFilter, setCoachBranchFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [coachesLoading, setCoachesLoading] = useState(true)
  const [coachesError, setCoachesError] = useState<string | null>(null)

  // Payment data state
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null)
  const [recentPayments, setRecentPayments] = useState<Payment[]>([])
  const [monthlyRevenue, setMonthlyRevenue] = useState<Array<{ month: string; revenue: number }>>([])
  const [paymentsLoading, setPaymentsLoading] = useState(true)
  const [paymentsError, setPaymentsError] = useState<string | null>(null)

  // Branch filter state
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string>("all-branches")

  // Time period filter
  const [timePeriod, setTimePeriod] = useState<string>("this-month")
  const role = useDashboardRole()

  useEffect(() => {
    if (role !== "branch_admin") return
    const branchId = getActiveBranchId()
    if (branchId) setSelectedBranch(branchId)
  }, [role])

  // Get token from either TokenManager (superadmin) or BranchManagerAuth (branch admin)
  const getAuthToken = useCallback(() => {
    return TokenManager.getToken() || BranchManagerAuth.getToken() || null
  }, [])

  const toLocalYMD = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  // Compute date range from time period (local calendar; week = last 7 days including today)
  const dateRange = useMemo(() => {
    const now = new Date()
    const end_date = toLocalYMD(now)
    let start: Date

    switch (timePeriod) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'this-week': {
        const s = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        s.setDate(s.getDate() - 6)
        start = s
        break
      }
      case 'this-year':
        start = new Date(now.getFullYear(), 0, 1)
        break
      case 'this-month':
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        break
    }

    return {
      start_date: toLocalYMD(start),
      end_date,
      period: timePeriod
    }
  }, [timePeriod])

  const branchFilterId = selectedBranch !== "all-branches" ? selectedBranch : undefined
  const selectedBranchName =
    branchFilterId ? branches.find((b) => b.id === branchFilterId)?.name : null

  // Fetch dashboard statistics — re-runs when timePeriod changes
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true)
        setError(null)

        const token = getAuthToken()
        if (!token) {
          setError("Authentication required. Please login again.")
          return
        }

        const response = await dashboardAPI.getDashboardStats(token, branchFilterId, dateRange)
        setDashboardStats(response.dashboard_stats)
      } catch (err: any) {
        console.error("Error fetching dashboard stats:", err)
        setError(err.message || "Failed to fetch dashboard statistics")
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardStats()
  }, [dateRange, branchFilterId, getAuthToken])

  // Fetch branches (only on mount)
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const token = getAuthToken()
        if (!token) return

        const response = await branchAPI.getBranches(token)
        const allBranches = (response.branches || []).map((b: any) => ({
          id: b.id,
          name: b.branch?.name || b.name || 'Unknown Branch',
        }))
        setBranches(allBranches)
      } catch (err) {
        console.error("Error fetching branches:", err)
      }
    }

    fetchBranches()
  }, [getAuthToken])

  const getCoachCourseNames = useCallback(
    (coach: Coach): string[] => {
      const assigned = Array.isArray(coach.assignment_details?.courses)
        ? coach.assignment_details.courses
        : []
      const expertise = Array.isArray(coach.areas_of_expertise)
        ? coach.areas_of_expertise
        : []
      const source: unknown[] = assigned.length > 0 ? assigned : expertise
      const rawIds: string[] = source.map((item) => {
        if (typeof item === "string" || typeof item === "number") return String(item).trim()
        if (item && typeof item === "object") {
          const obj = item as { course_id?: string; id?: string }
          return String(obj.course_id || obj.id || "").trim()
        }
        return ""
      })
      const ids = Array.from(new Set(rawIds.filter((id) => id.length > 0)))
      if (ids.length === 0) return []
      const names = ids
        .map((id) => courseNameById[id])
        .filter((name): name is string => Boolean(name))
      if (names.length > 0) return names
      return [`${ids.length} course${ids.length === 1 ? "" : "s"}`]
    },
    [courseNameById]
  )

  // Fetch coaches list — re-runs when branch filter changes
  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        setCoachesLoading(true)
        setCoachesError(null)

        const token = getAuthToken()
        if (!token) {
          setCoachesError("Authentication required. Please login again.")
          return
        }

        if (role === "branch_admin") {
          const pageSize = 100
          const allCoaches: DashboardCoach[] = []
          let skip = 0
          let pageSizeReturned: number

          do {
            const response = await dashboardAPI.getCoaches(token, {
              skip,
              limit: pageSize,
              active_only: true,
              registration_source: "admin",
            })
            const page = (response.coaches || []).filter(
              (c) => String((c as { registration_source?: string }).registration_source || "admin") !== "self"
            )
            allCoaches.push(...page)
            pageSizeReturned = page.length
            skip += pageSizeReturned
          } while (pageSizeReturned === pageSize)

          setCoaches(allCoaches)
        } else {
          // Super-admin: branch filter + course name map (for courses display)
          const coachParams: {
            limit: number
            active_only: boolean
            branch_id?: string
            registration_source?: "admin" | "self"
          } = {
            limit: 5,
            active_only: true,
            registration_source: "admin",
          }
          if (coachBranchFilter && coachBranchFilter !== "all") {
            coachParams.branch_id = coachBranchFilter
          }

          const [response, coursesResponse] = await Promise.all([
            dashboardAPI.getCoaches(token, coachParams),
            Object.keys(courseNameById).length === 0
              ? dashboardAPI.getPublicCourses({ active_only: true, limit: 500 }).catch(() => null)
              : Promise.resolve(null),
          ])
          setCoaches(
            (response.coaches || []).filter(
              (c) =>
                String((c as { registration_source?: string }).registration_source || "admin") !==
                "self"
            )
          )

          if (coursesResponse) {
            const map: Record<string, string> = {}
            const courseList =
              coursesResponse?.courses ||
              (Array.isArray(coursesResponse) ? coursesResponse : [])
            for (const course of courseList) {
              const id = String(course?.id || "").trim()
              if (!id) continue
              map[id] = String(course.title || course.name || id)
            }
            setCourseNameById(map)
          }
        }
      } catch (err: any) {
        console.error("Error fetching coaches:", err)
        setCoachesError(err.message || "Failed to fetch coaches")
      } finally {
        setCoachesLoading(false)
      }
    }

    fetchCoaches()
    // courseNameById intentionally omitted — only fetch courses once when empty
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getAuthToken, role, coachBranchFilter])

  useEffect(() => {
    if (role !== "branch_admin") return

    const fetchCourses = async () => {
      try {
        setCoursesLoading(true)
        setCoursesError(null)

        const token = getAuthToken()
        if (!token) {
          setCoursesError("Authentication required. Please login again.")
          return
        }

        const pageSize = 100
        const courseList: DashboardCourse[] = []
        let skip = 0
        let pageSizeReturned: number

        do {
          const response = await dashboardAPI.getCourses(token, {
            skip,
            limit: pageSize,
            active_only: true
          })
          const page = Array.isArray(response) ? response : response?.courses
          if (!Array.isArray(page)) {
            throw new Error("The courses response was invalid. Please try again.")
          }
          courseList.push(...page)
          pageSizeReturned = page.length
          skip += pageSizeReturned
        } while (pageSizeReturned === pageSize)

        const options: CoachCourseOption[] = courseList
          .filter((course): course is DashboardCourse & { id: string } =>
            typeof course.id === "string" &&
            Boolean(course.title || course.name || course.course_name)
          )
          .map((course) => {
            const references = [
              ...(course.instructor_assignments || []),
              ...(course.instructors || []),
              ...(course.assigned_coaches || [])
            ]

            return {
              id: course.id,
              name: course.title || course.name || course.course_name || "",
              coachIds: references
                .map((reference) => reference.instructor_id || reference.coach_id || reference.id)
                .filter((id): id is string => Boolean(id)),
              coachNames: references
                .map((reference) => reference.instructor_name || reference.coach_name || reference.full_name || reference.name)
                .filter((name): name is string => Boolean(name))
                .map((name) => name.trim().toLowerCase())
            }
          })

        setCourses(options)
        setSelectedCourseId((current) =>
          options.some((course) => course.id === current) ? current : ""
        )
      } catch (err) {
        console.error("Error fetching dashboard courses:", err)
        setCoursesError(err instanceof Error ? err.message : "Failed to fetch courses.")
      } finally {
        setCoursesLoading(false)
      }
    }

    void fetchCourses()
  }, [getAuthToken, role])

  const selectedCourse = courses.find((course) => course.id === selectedCourseId)
  const visibleCoaches = role === "branch_admin" && selectedCourse
    ? coaches.filter((coach) =>
        selectedCourse.coachIds.includes(coach.id) ||
        selectedCourse.coachNames.includes(coach.full_name.trim().toLowerCase()) ||
        coach.assigned_courses?.some((assignment) =>
          assignment.course_id === selectedCourse.id ||
          assignment.id === selectedCourse.id ||
          assignment.course_name?.trim().toLowerCase() === selectedCourse.name.trim().toLowerCase() ||
          assignment.title?.trim().toLowerCase() === selectedCourse.name.trim().toLowerCase()
        ) ||
        coach.assignment_details?.courses?.includes(selectedCourse.id)
      )
    : coaches

  // Fetch payment data — re-runs when timePeriod changes
  useEffect(() => {
    const fetchPaymentData = async () => {
      try {
        setPaymentsLoading(true)
        setPaymentsError(null)

        const token = getAuthToken()
        if (!token) {
          setPaymentsError("Authentication required. Please login again.")
          return
        }

        // Fetch payment stats and recent payments filtered by date range and branch
        const [statsResponse, paymentsResponse, monthSeries] = await Promise.all([
          paymentAPI.getPaymentStats(token, {
            ...dateRange,
            ...(branchFilterId ? { branch_id: branchFilterId } : {}),
          }),
          paymentAPI.getPayments(
            {
              limit: 5,
              skip: 0,
              start_date: dateRange.start_date,
              end_date: dateRange.end_date,
              status: 'paid',
              ...(branchFilterId ? { branch_id: branchFilterId } : {}),
            },
            token
          ),
          paymentAPI.getMonthlyRevenue(8, token).catch(() => []),
        ])

        setPaymentStats(statsResponse)
        setRecentPayments(paymentsResponse.payments || [])
        const fromStats = statsResponse.revenue_by_month || []
        setMonthlyRevenue(
          (fromStats.length > 0 ? fromStats : monthSeries).map((row) => ({
            month: String(row.month || "").replace(/^\d{4}-/, "").slice(0, 3) || String(row.month),
            revenue: Number(row.revenue || 0),
          }))
        )
      } catch (err: any) {
        console.error("Error fetching payment data:", err)
        setPaymentsError(err.message || "Failed to fetch payment data")
      } finally {
        setPaymentsLoading(false)
      }
    }

    fetchPaymentData()
  }, [dateRange, branchFilterId, getAuthToken])

  const formatNumber = (num: number | undefined | null) => {
    const n = num ?? 0
    if (n >= 1000) {
      return (n / 1000).toFixed(1) + 'k'
    }
    return n.toString()
  }

  const timePeriodLabel = {
    "today": "Today",
    "this-week": "This Week",
    "this-month": "This Month",
    "this-year": "This Year"
  }[timePeriod] || "This Month"

  const heroCards = [
    {
      label: `${timePeriodLabel} Collection`,
      value: paymentStats
        ? paymentAPI.formatCurrency(paymentStats.this_month_collection || 0)
        : "₹0",
      trend: "+12% vs last month",
      icon: IndianRupee,
      tone: "bg-[#FFF8E1] border-[#F5E6B8]",
      iconWrap: "bg-[#F5E0A0] text-[#9A7B1A]",
    },
    {
      label: "Active Students",
      value: dashboardStats?.active_students ?? 0,
      trend: dashboardStats?.students_registered_in_period
        ? `+${dashboardStats.students_registered_in_period} new`
        : "Active now",
      icon: UserCheck,
      tone: "bg-[#EAF8F0] border-[#CDEAD8]",
      iconWrap: "bg-[#C6EBD5] text-[#1F9D57]",
    },
    {
      label: "Active Coaches",
      value: dashboardStats?.active_coaches ?? dashboardStats?.total_coaches ?? 0,
      trend: "On roster",
      icon: UserCog,
      tone: "bg-[#EAF1FF] border-[#D0DFFF]",
      iconWrap: "bg-[#C9DAFF] text-[#2563EB]",
    },
    {
      label: "Branches",
      value: dashboardStats?.active_branches ?? dashboardStats?.total_branches ?? branches.length,
      trend: "Locations",
      icon: Building2,
      tone: "bg-[#F1EBFF] border-[#DDD2FF]",
      iconWrap: "bg-[#DDD0FF] text-[#6D28D9]",
    },
  ]

  const secondaryCards = [
    {
      label: "Inactive Students",
      value: dashboardStats?.inactive_students ?? 0,
      icon: UserX,
      iconWrap: "bg-[#FFE8E8] text-[#E11D48]",
    },
    {
      label: "Enrollments",
      value: dashboardStats?.enrollments_count ?? dashboardStats?.active_enrollments ?? 0,
      icon: ClipboardList,
      iconWrap: "bg-[#E6FAF7] text-[#0D9488]",
    },
    {
      label: "Renewals",
      value: dashboardStats?.renewals_count ?? 0,
      icon: RefreshCw,
      iconWrap: "bg-[#FFF0E6] text-[#EA580C]",
    },
    {
      label: "Leads",
      value: dashboardStats?.leads_count ?? 0,
      icon: Target,
      iconWrap: "bg-[#E8EEFF] text-[#3730A3]",
    },
    {
      label: "Active Courses",
      value: dashboardStats?.courses_with_enrollments_in_period ?? dashboardStats?.active_courses ?? 0,
      icon: BookOpen,
      iconWrap: "bg-[#E8F1FF] text-[#3B82F6]",
    },
    {
      label: "Demo Bookings",
      value: dashboardStats?.demo_bookings_count ?? 0,
      icon: Presentation,
      iconWrap: "bg-[#F8E9FF] text-[#A21CAF]",
    },
    {
      label: "Training Requests",
      value: dashboardStats?.training_requests_count ?? 0,
      icon: Dumbbell,
      iconWrap: "bg-[#E6F7F5] text-[#0F766E]",
    },
    {
      label: "Events",
      value: dashboardStats?.events_count ?? dashboardStats?.events_registrations_count ?? 0,
      icon: PartyPopper,
      iconWrap: "bg-[#FFE9EC] text-[#BE123C]",
    },
  ]

  const avatarPalette = [
    "bg-[#E8F1FF] text-[#2563EB]",
    "bg-[#FFF4D6] text-[#C9971A]",
    "bg-[#E8F8EF] text-[#1F9D57]",
    "bg-[#F1E9FF] text-[#7C3AED]",
    "bg-[#FFE8E8] text-[#E11D48]",
  ]

  const revenueTiles = [
    {
      label: `${timePeriodLabel} Collection`,
      value: paymentAPI.formatCurrency(paymentStats?.this_month_collection || 0),
      valueClass: "text-[#1F9D57]",
      cardClass: "bg-[#F3FBF6] border-[#D9F2E4]",
    },
    {
      label: "Total Revenue",
      value: paymentAPI.formatCurrency(paymentStats?.total_collected || 0),
      valueClass: "text-[#2563EB]",
      cardClass: "bg-[#F3F7FF] border-[#D9E6FF]",
    },
    {
      label: "Physical Hand Cash (Total)",
      value: paymentAPI.formatCurrency(paymentStats?.hand_cash_revenue || 0),
      valueClass: "text-[#B45309]",
      cardClass: "bg-[#FFF8EB] border-[#F5E4C0]",
    },
    {
      label: `Hand Cash (${timePeriodLabel})`,
      value: paymentAPI.formatCurrency(paymentStats?.period_hand_cash_revenue || 0),
      valueClass: "text-[#0F766E]",
      cardClass: "bg-[#F0FBFA] border-[#CDEFEB]",
    },
  ]

  const periodOnline =
    Number(paymentStats?.period_online_revenue ?? 0) ||
    Math.max(
      0,
      Number(paymentStats?.this_month_collection || 0) -
        Number(paymentStats?.period_hand_cash_revenue || 0)
    )
  const periodHandCash = Number(paymentStats?.period_hand_cash_revenue || 0)
  const totalOnline =
    Number(paymentStats?.online_revenue ?? 0) ||
    Math.max(
      0,
      Number(paymentStats?.total_collected || 0) - Number(paymentStats?.hand_cash_revenue || 0)
    )
  const totalHandCash = Number(paymentStats?.hand_cash_revenue || 0)

  const revenuePieData = [
    { name: `${timePeriodLabel} Online`, value: periodOnline, color: "#2563EB" },
    { name: `${timePeriodLabel} Hand Cash`, value: periodHandCash, color: "#1F9D57" },
    { name: "All-time Online", value: Math.max(0, totalOnline - periodOnline), color: "#7C3AED" },
    { name: "All-time Hand Cash", value: Math.max(0, totalHandCash - periodHandCash), color: "#B45309" },
  ].filter((d) => d.value > 0)

  const revenuePieTotal = revenuePieData.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="space-y-5 pb-8">
      <Header
        title="Dashboard"
        role={role}
        subtitle="Welcome back! Here's an overview of your academy network."
      >
        <Select value={timePeriod} onValueChange={setTimePeriod}>
          <SelectTrigger
            data-no-action-overlay
            className="h-10 w-[168px] rounded-xl border border-gray-200 bg-white text-sm font-medium text-[#4F5077]"
          >
            <Calendar className="mr-2 h-4 w-4 text-[#6B7A99]" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="this-week">This Week</SelectItem>
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="this-year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </Header>

      {error ? (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-100 bg-white p-5 text-rose-600">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* Hero KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading || paymentsLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`hero-skel-${i}`}
                className="h-[132px] animate-pulse rounded-2xl border border-gray-100 bg-white"
              />
            ))
          : heroCards.map((card) => {
              const Icon = card.icon
              return (
                <div
                  key={card.label}
                  className={`rounded-2xl border p-5 shadow-sm ${card.tone}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${card.iconWrap}`}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2.2} />
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-medium text-[#1F9D57]">
                      <TrendingUp className="h-3 w-3" />
                      {card.trend}
                    </span>
                  </div>
                  <p className="mt-4 text-sm font-medium text-[#6B7A99]">{card.label}</p>
                  <p className="mt-1 text-3xl font-bold tracking-tight text-[#2F3158]">
                    {typeof card.value === "number" ? formatNumber(card.value) : card.value}
                  </p>
                </div>
              )
            })}
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div
                key={`sec-skel-${i}`}
                className="h-[104px] animate-pulse rounded-2xl border border-gray-100 bg-white"
              />
            ))
          : secondaryCards.map((card) => {
              const Icon = card.icon
              return (
                <div
                  key={card.label}
                  className="rounded-2xl border border-[#EEF0F4] bg-white px-3.5 py-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
                >
                  <div
                    className={`mb-2.5 inline-flex h-9 w-9 items-center justify-center rounded-full ${card.iconWrap}`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.25} />
                  </div>
                  <p className="text-[11px] font-medium leading-tight text-[#9593A8]">{card.label}</p>
                  <p className="mt-1.5 text-xl font-bold tracking-tight text-[#2F3158]">
                    {formatNumber(Number(card.value) || 0)}
                  </p>
                </div>
              )
            })}
      </div>

      {/* Revenue + Coaches */}
      <div className="grid grid-cols-1 items-stretch gap-5 xl:grid-cols-12">
        <div className="rounded-2xl border border-[#EEF0F4] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] xl:col-span-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-[15px] font-semibold text-[#2F3158]">Revenue Overview</h3>
            {role === "super_admin" ? (
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger
                  data-no-action-overlay
                  className="h-9 w-44 rounded-xl border-gray-200 bg-[#F7F7F9] text-xs"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-branches">All Branches</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>

          {paymentsLoading ? (
            <div className="py-16 text-center text-sm text-[#9593A8]">Loading revenue…</div>
          ) : paymentsError ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-rose-600">
              <AlertCircle className="h-4 w-4" />
              Failed to load revenue data
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              <div className="grid grid-cols-1 content-start gap-3 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1">
                {revenueTiles.map((tile) => (
                  <div
                    key={tile.label}
                    className={`rounded-xl border px-4 py-3.5 ${tile.cardClass}`}
                  >
                    <p className="text-[11px] text-[#6B7A99]">{tile.label}</p>
                    <p className={`mt-1 text-[22px] font-bold tracking-tight ${tile.valueClass}`}>
                      {tile.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="relative h-[300px] w-full lg:col-span-8">
                {revenuePieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={revenuePieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="44%"
                          innerRadius={58}
                          outerRadius={96}
                          paddingAngle={2}
                          stroke="#fff"
                          strokeWidth={2}
                        >
                          {revenuePieData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) =>
                            paymentAPI.formatCurrency(Number(value || 0))
                          }
                          contentStyle={{
                            borderRadius: 10,
                            borderColor: "#E5E7EB",
                            fontSize: 12,
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={48}
                          formatter={(value) => (
                            <span className="text-[11px] text-[#4F5077]">{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 text-center">
                      <p className="text-[11px] text-[#9593A8]">Total</p>
                      <p className="text-sm font-bold text-[#2F3158]">
                        {paymentAPI.formatCurrency(revenuePieTotal)}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[#9593A8]">
                    No revenue data yet
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex min-h-[400px] flex-col rounded-2xl border border-[#EEF0F4] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] xl:col-span-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="text-[15px] font-semibold text-[#2F3158]">List of in-house coaches</h3>
            {role === "branch_admin" ? (
              <Select
                value={selectedCourseId}
                onValueChange={setSelectedCourseId}
                disabled={coursesLoading || Boolean(coursesError) || courses.length === 0}
              >
                <SelectTrigger
                  data-no-action-overlay
                  className="h-8 w-[148px] rounded-lg border-[#E8E8EE] bg-[#F7F7F9] text-xs"
                >
                  <SelectValue placeholder={coursesLoading ? "Loading…" : "Course"} />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select value={coachBranchFilter} onValueChange={setCoachBranchFilter}>
                <SelectTrigger
                  data-no-action-overlay
                  className="h-8 w-[132px] rounded-lg border-[#E8E8EE] bg-[#F7F7F9] text-xs"
                >
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex-1 overflow-hidden">
            {coachesLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 border-b border-[#F3F4F6] py-3">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-gray-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-28 animate-pulse rounded bg-gray-100" />
                    <div className="h-2.5 w-20 animate-pulse rounded bg-gray-100" />
                  </div>
                </div>
              ))
            ) : coachesError ? (
              <div className="flex items-center gap-2 py-6 text-sm text-rose-600">
                <AlertCircle className="h-4 w-4" />
                {coachesError}
              </div>
            ) : visibleCoaches.length === 0 ? (
              <p className="py-10 text-center text-sm text-[#9593A8]">No coaches found</p>
            ) : (
              visibleCoaches.slice(0, 5).map((coach, idx) => {
                const courseNames = getCoachCourseNames(coach)
                const branchName = coach.branch_id
                  ? branches.find((b) => b.id === coach.branch_id)?.name
                  : null
                const initials = coach.full_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                return (
                  <div
                    key={coach.id}
                    className="flex items-center justify-between gap-3 border-b border-[#F3F4F6] py-3 last:border-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src="" />
                        <AvatarFallback
                          className={`text-xs font-semibold ${avatarPalette[idx % avatarPalette.length]}`}
                        >
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-[#2F3158]">
                          {coach.full_name}
                        </p>
                        <p className="truncate text-[11px] text-[#9593A8]">
                          {branchName || (coach.branch_id ? "Assigned branch" : "Unassigned")}
                        </p>
                      </div>
                    </div>
                    <p
                      className="line-clamp-2 max-w-[42%] text-right text-[11px] text-[#6B7A99]"
                      title={courseNames.join(", ")}
                    >
                      {courseNames.length > 0 ? courseNames.join(", ") : "No courses"}
                    </p>
                  </div>
                )
              })
            )}
          </div>

          <Button
            className="mt-4 h-11 w-full rounded-xl border-0 bg-[#FFF1C2] font-semibold text-[#8A6416] shadow-none hover:bg-[#F5E0A0]"
            onClick={() => router.push(`${basePath}/coaches`)}
          >
            View All Coaches
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Attendance + Recent payments */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="relative flex min-h-[260px] flex-col justify-between overflow-hidden rounded-2xl border border-[#EEF0F4] bg-gradient-to-br from-[#F4F1FF] via-[#FFF9EF] to-[#F3F7FF] p-6 lg:col-span-5">
          <div className="pointer-events-none absolute right-4 top-6 opacity-90">
            <div className="flex h-28 w-28 items-center justify-center rounded-2xl border border-[#E4D9FF] bg-white/85 shadow-sm">
              <CalendarDays className="h-14 w-14 text-[#7C3AED]" strokeWidth={1.5} />
            </div>
          </div>
          <div className="relative z-10 max-w-[70%]">
            <h3 className="text-[16px] font-semibold text-[#2F3158]">Attendance Overview</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-[#6B7A99]">
              View detailed student and coach attendance from the Attendance page.
            </p>
          </div>
          <Button
            variant="outline"
            className="relative z-10 mt-6 h-10 w-fit rounded-xl border-[#D7DBE7] bg-white font-medium text-[#2F3158] hover:bg-[#F8F9FC]"
            onClick={() => router.push(`${basePath}/attendance`)}
          >
            Go to Attendance
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="rounded-2xl border border-[#EEF0F4] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:col-span-7">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-[15px] font-semibold text-[#2F3158]">Recent payments</h3>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg border-gray-200 text-[#4F5077]"
              onClick={() => router.push(`${basePath}/payment-tracking`)}
            >
              View Payments
            </Button>
          </div>

          <div>
            {paymentsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex justify-between gap-3 border-b border-[#F3F4F6] py-3">
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-36 animate-pulse rounded bg-gray-100" />
                    <div className="h-2.5 w-24 animate-pulse rounded bg-gray-100" />
                  </div>
                  <div className="h-6 w-16 animate-pulse rounded bg-gray-100" />
                </div>
              ))
            ) : paymentsError ? (
              <div className="flex items-center gap-2 py-6 text-sm text-rose-600">
                <AlertCircle className="h-4 w-4" />
                {paymentsError}
              </div>
            ) : recentPayments.length === 0 ? (
              <p className="py-10 text-center text-sm text-[#9593A8]">No recent payments found</p>
            ) : (
              recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between gap-3 border-b border-[#F3F4F6] py-3 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[13px] font-semibold text-[#2F3158]">
                      {payment.transaction_id || payment.id.slice(0, 14)}
                    </p>
                    <p className="text-[11px] text-[#9593A8]">
                      {new Date(payment.payment_date || payment.created_at).toLocaleDateString()}
                      {payment.student_name ? ` · ${payment.student_name}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[13px] font-bold text-[#2F3158]">
                      {paymentAPI.formatCurrency(payment.amount)}
                    </p>
                    <span className="mt-1 inline-flex items-center rounded-full bg-[#EAF2FF] px-2 py-0.5 text-[10px] font-medium text-[#2E85E8]">
                      {paymentAPI.formatPaymentMethod(payment.payment_method)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
