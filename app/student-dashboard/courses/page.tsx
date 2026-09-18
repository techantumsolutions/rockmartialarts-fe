"use client"

import { useState, useEffect } from "react"
import { useRazorpay } from "@/hooks/use-razorpay"
import { useRouter, usePathname } from "next/navigation"
import StudentDashboardLayout from "@/components/student-dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  BookOpen,
  Calendar,
  MapPin,
  Clock,
  Award,
  TrendingUp,
  AlertCircle,
  Plus,
  RefreshCw,
  Star,
  Users,
  CreditCard,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowRight
} from "lucide-react"
import { studentProfileAPI } from "@/lib/studentProfileAPI"
import { courseAPI } from "@/lib/courseAPI"
import { branchAPI } from "@/lib/branchAPI"
import { getBackendApiUrl } from "@/lib/config"
import { isEnrollmentActivePaid, isEnrollmentExpiredByDate } from "@/lib/student-enrollment-status"
import { mergeEnrollmentsByCourseBranch } from "@/lib/merge-enrollment-groups"
import { TokenManager } from "@/lib/tokenManager"
import {
  getSessionErrorMessage,
  isSessionExpiredError,
  requireStudentSession,
  SESSION_EXPIRED_PAYMENT_MESSAGE,
} from "@/lib/sessionAuth"

const fetchOpts = (token: string) => ({
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  cache: "no-store" as RequestCache,
})

function pickDisplayDurationKey(availableDurations?: CourseDurationRef[]): string {
  if (!availableDurations?.length) return "1-month"
  const keyOf = (d: CourseDurationRef) => String(d.code || d.id || "").trim()
  const oneMonth = availableDurations.find((d) => {
    const k = keyOf(d).toLowerCase()
    const n = String(d.name || "").toLowerCase()
    return (
      d.duration_months === 1 ||
      /1\s*(-)?\s*month/.test(k) ||
      /1\s*(-)?\s*month/.test(n)
    )
  })
  if (oneMonth) return keyOf(oneMonth) || "1-month"
  const sorted = [...availableDurations].sort(
    (a, b) => (a.duration_months ?? 99) - (b.duration_months ?? 99)
  )
  return keyOf(sorted[0]) || "1-month"
}

function durationKeysForPricing(
  primary: string,
  availableDurations?: CourseDurationRef[]
): string[] {
  const keys = [primary, "1-month", "1 month", "1month"]
  for (const d of availableDurations || []) {
    const k = String(d.code || d.id || "").trim()
    if (k) keys.push(k)
  }
  return [...new Set(keys.map((k) => k.trim()).filter(Boolean))]
}

function parsePricingTotal(pricing: Record<string, unknown> | undefined): number | null {
  if (!pricing) return null
  const total = pricing.total_amount
  if (typeof total === "number" && total > 0 && !Number.isNaN(total)) return total
  const courseFee = pricing.course_fee
  const admission = pricing.admission_fee
  if (typeof courseFee === "number" && courseFee > 0) {
    const adm = typeof admission === "number" ? admission : 0
    return courseFee + adm
  }
  return null
}

/** Live fee from payment-info / quote (same rules as checkout), not branch list cache. */
async function fetchLiveCoursePrice(
  courseId: string,
  branchId: string,
  token: string,
  durationKeys: string[]
): Promise<number | null> {
  for (const durKey of durationKeys) {
    try {
      const qs = new URLSearchParams({ branch_id: branchId, duration: durKey })
      const piRes = await fetch(
        getBackendApiUrl(`courses/${courseId}/payment-info?${qs.toString()}`),
        fetchOpts(token)
      )
      if (piRes.ok) {
        const pi = await piRes.json().catch(() => ({}))
        const total = parsePricingTotal(pi?.pricing as Record<string, unknown>)
        if (total != null) return total
      }
      const quoteRes = await fetch(getBackendApiUrl("payments/student-checkout-quote"), {
        method: "POST",
        ...fetchOpts(token),
        body: JSON.stringify({
          course_id: courseId,
          branch_id: branchId,
          duration: durKey,
        }),
      })
      if (quoteRes.ok) {
        const q = await quoteRes.json().catch(() => ({}))
        const total = parsePricingTotal(q?.pricing as Record<string, unknown>)
        if (total != null) return total
      }
    } catch {
      /* try next duration key */
    }
  }
  return null
}

async function loadCourseDurations(
  courseId: string,
  token: string,
  existing?: CourseDurationRef[]
): Promise<CourseDurationRef[]> {
  if (existing?.length) return existing
  try {
    const durRes = await fetch(
      getBackendApiUrl(`durations/public/by-course/${courseId}?active_only=true`),
      fetchOpts(token)
    )
    if (!durRes.ok) return []
    const durData = await durRes.json().catch(() => ({}))
    const list = (durData as { durations?: CourseDurationRef[] }).durations
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

/** Current admin-configured fee for list display (1-month / primary tenure via payment-info). */
async function enrichAvailableCoursePricing(
  courses: AvailableCourse[],
  branchIds: string[],
  token: string
): Promise<AvailableCourse[]> {
  return Promise.all(
    courses.map(async (c) => {
      const branchId = c.branch_id || branchIds[0]
      if (!branchId) return c
      try {
        const durations = await loadCourseDurations(c.id, token, c.available_durations)
        const displayKey = pickDisplayDurationKey(durations)
        const keysToTry = durationKeysForPricing(displayKey, durations)
        const liveAmount = await fetchLiveCoursePrice(c.id, branchId, token, keysToTry)
        if (liveAmount != null) {
          return {
            ...c,
            available_durations: durations.length ? durations : c.available_durations,
            pricing: { amount: liveAmount, currency: "INR" },
          }
        }
      } catch {
        /* fall through */
      }
      return { ...c, pricing: { amount: 0, currency: c.pricing?.currency || "INR" } }
    })
  )
}

/** Stable id for Select when the same course exists at multiple branches. */
function courseRowKey(c: Pick<AvailableCourse, "id" | "branch_id">) {
  return `${c.id}::${c.branch_id ?? ""}`
}

function parseCourseRowKey(v: string): { id: string; branch_id: string } {
  const i = v.indexOf("::")
  if (i < 0) return { id: v, branch_id: "" }
  return { id: v.slice(0, i), branch_id: v.slice(i + 2) }
}

interface EnrolledCourse {
  enrollment_id: string
  course_id: string
  course_name: string
  branch_id: string
  branch_name: string
  start_date: string
  end_date: string
  enrollment_date: string
  is_active: boolean
  payment_status: string
  progress?: number
}

type CourseDurationRef = {
  id?: string
  code?: string
  name?: string
  duration_months?: number
}

interface AvailableCourse {
  id: string
  title: string
  description: string
  difficulty_level: string
  category_id: string
  branch_id?: string
  branch_name?: string
  available_durations?: CourseDurationRef[]
  pricing: {
    amount: number
    currency: string
  }
  /** True if the student already has an enrollment for this course (at any of their branches). */
  is_enrolled?: boolean
  /** Matching enrollment when enrolled (for renew / context). */
  enrollment?: EnrolledCourse | null
}

interface Branch {
  id: string
  name: string
  address: string
  code?: string
  assignments?: {
    course_schedule?: Array<{
      course_id?: string
      batches?: unknown[]
    }>
  }
}

interface BranchBatchOption {
  batch_ref: string
  name?: string | null
  label: string
  enabled_per_duration?: Record<string, boolean>
  fee_per_duration?: Record<string, string | number | null>
}

interface AdminDurationOption {
  id: string
  label: string
  months: number
  code: string
}

function durationKeyVariants(duration: AdminDurationOption): string[] {
  const normalizedLabel = duration.label.trim().toLowerCase()
  return Array.from(
    new Set(
      [
        duration.id,
        duration.code,
        normalizedLabel,
      ]
        .map((v) => String(v || "").trim())
        .filter(Boolean)
    )
  )
}

function parseEnabledFlag(value: unknown): boolean {
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value !== 0
  if (typeof value === "string") {
    const s = value.trim().toLowerCase()
    if (["false", "0", "no", "off", "disabled"].includes(s)) return false
    if (["true", "1", "yes", "on", "enabled"].includes(s)) return true
  }
  return value !== false
}

function hasDurationFeeConfigured(duration: AdminDurationOption, batch?: BranchBatchOption): boolean {
  const feeMap = batch?.fee_per_duration
  if (!feeMap || Object.keys(feeMap).length === 0) return true
  const normalizedFeeMap: Record<string, string | number | null> = {}
  for (const [k, v] of Object.entries(feeMap)) {
    normalizedFeeMap[String(k).trim().toLowerCase()] = v
  }
  for (const key of durationKeyVariants(duration)) {
    const raw = normalizedFeeMap[key.toLowerCase()]
    if (raw == null) continue
    const n =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? parseFloat(raw.trim())
          : NaN
    if (Number.isFinite(n) && n >= 0) return true
  }
  return false
}

function isDurationEnabledForBatch(duration: AdminDurationOption, batch?: BranchBatchOption): boolean {
  const enabledMap = batch?.enabled_per_duration
  if (!enabledMap || Object.keys(enabledMap).length === 0) {
    // Fallback for payloads that expose only per-duration fee maps.
    return hasDurationFeeConfigured(duration, batch)
  }
  const normalizedEnabledMap: Record<string, boolean> = {}
  for (const [k, v] of Object.entries(enabledMap)) {
    normalizedEnabledMap[String(k).trim().toLowerCase()] = parseEnabledFlag(v)
  }
  for (const key of durationKeyVariants(duration)) {
    const mapValue = normalizedEnabledMap[key.toLowerCase()]
    if (mapValue === false) return false
    if (mapValue === true) return true
  }
  // If enabled map exists but doesn't include this duration key, use fee-map fallback.
  return hasDurationFeeConfigured(duration, batch)
}

async function isDurationCheckoutEnabled(args: {
  token: string
  courseId: string
  branchId: string
  durationKeys: string[]
  batchRef?: string
}): Promise<boolean> {
  try {
    const uniqueKeys = Array.from(
      new Set(args.durationKeys.map((k) => String(k || "").trim()).filter(Boolean))
    )
    for (const key of uniqueKeys) {
      const body: Record<string, unknown> = {
        course_id: args.courseId,
        branch_id: args.branchId,
        duration: key,
      }
      if (args.batchRef && args.batchRef.trim()) {
        body.batch_ref = args.batchRef.trim()
      }
      const res = await fetch(getBackendApiUrl("payments/student-checkout-quote"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${args.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) continue
      const json = await res.json().catch(() => ({}))
      const total = json?.pricing?.total_amount
      if (typeof total === "number" && Number.isFinite(total) && total > 0) {
        return true
      }
    }
    return false
  } catch {
    return false
  }
}

function parseTimeSafe(value?: string): number {
  if (!value) return 0
  const ts = new Date(value).getTime()
  return Number.isFinite(ts) ? ts : 0
}

function mergeDuplicateEnrollments(items: EnrolledCourse[]): EnrolledCourse[] {
  return mergeEnrollmentsByCourseBranch(items) as EnrolledCourse[]
}

export default function StudentCoursesPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { initiatePayment, loading: paymentLoading } = useRazorpay()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [studentData, setStudentData] = useState<any>(null)
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([])
  const [availableCourses, setAvailableCourses] = useState<AvailableCourse[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  
  // Enrollment dialog state
  const [showEnrollDialog, setShowEnrollDialog] = useState(false)
  const [isRenewalDialog, setIsRenewalDialog] = useState(false)
  /** Existing student's assigned branch — locked during renewal / additional enrollment */
  const [lockedBranchId, setLockedBranchId] = useState<string | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<AvailableCourse | null>(null)
  const [selectedBranch, setSelectedBranch] = useState("")
  const [batchOptions, setBatchOptions] = useState<BranchBatchOption[]>([])
  const [selectedBatchRef, setSelectedBatchRef] = useState("")
  const [adminDurationOptions, setAdminDurationOptions] = useState<AdminDurationOption[]>([])
  const [durationOptions, setDurationOptions] = useState<
    { id: string; label: string; months: number; code: string }[]
  >([])
  const [selectedDurationKey, setSelectedDurationKey] = useState("")
  const [enrollAmount, setEnrollAmount] = useState<number | null>(null)
  const [enrollPricingLoading, setEnrollPricingLoading] = useState(false)
  const [enrolling, setEnrolling] = useState(false)

  // Beneficiary state (subscribe for others)
  const [beneficiaryType, setBeneficiaryType] = useState("self")
  const [beneficiaryName, setBeneficiaryName] = useState("")
  const [beneficiaryPhone, setBeneficiaryPhone] = useState("")
  const [beneficiaryRelationship, setBeneficiaryRelationship] = useState("")

  // Branch change request dialog
  const [showBranchChangeDialog, setShowBranchChangeDialog] = useState(false)
  const [changingEnrollment, setChangingEnrollment] = useState<EnrolledCourse | null>(null)
  const [newBranchId, setNewBranchId] = useState("")
  const [requestingChange, setRequestingChange] = useState(false)

  useEffect(() => {
    const token = requireStudentSession(router, pathname || "/student-dashboard/courses")
    if (!token) return

    const user = TokenManager.getUser()
    if (!user) {
      router.push("/login")
      return
    }

    if (user.role !== "student") {
      if (user.role === "coach") {
        router.push("/coach-dashboard")
      } else {
        router.push("/dashboard")
      }
      return
    }

    setStudentData({
      name: user.full_name || user.name || "Student",
      email: user.email || "",
    })

    loadData(token)
  }, [router, pathname])

  const loadData = async (token: string) => {
    try {
      setLoading(true)
      setError(null)

      // Load all branches first
      try {
        const branchesResponse = await branchAPI.getBranches(token)
        console.log("🔍 Branch API Response:", branchesResponse)
        const allBranches = branchesResponse.branches || []
        
        // Transform branches to flatten nested structure
        const transformedBranches = allBranches.map((b: any) => ({
          id: b.id,
          name: b.branch?.name || b.name || 'Unknown Branch',
          code: b.branch?.code || b.code,
          email: b.branch?.email || b.email,
          phone: b.branch?.phone || b.phone,
          is_active: b.is_active,
          assignments: b.assignments || b.branch?.assignments,
        }))
        
        console.log("✅ Transformed branches:", transformedBranches.length, transformedBranches)
        
        // Ensure branches are set even if empty
        if (Array.isArray(transformedBranches) && transformedBranches.length > 0) {
          setBranches(transformedBranches)
          console.log("✅ Branches state updated with:", transformedBranches.length, "branches")
        } else {
          console.warn("⚠️ No branches found in API response")
          setBranches([])
        }
      } catch (err) {
        console.error("❌ Error loading branches:", err)
        setBranches([])
      }
      // Load enrolled courses from profile
      const profileResponse = await studentProfileAPI.getProfile(token)
      const enrollments = profileResponse.profile.enrollments || []
      
      const enrolledRaw: EnrolledCourse[] = enrollments.map((e: any) => ({
        enrollment_id: e.id,
        course_id: e.course_id,
        course_name: e.course_name,
        branch_id: e.branch_id,
        branch_name: e.branch_name || "Unknown Branch",
        start_date: e.start_date,
        end_date: e.end_date,
        enrollment_date: e.enrollment_date || e.start_date,
        is_active: e.is_active,
        payment_status: e.payment_status,
        // Progress should come from backend once available; keep stable (0) instead of random.
        progress: typeof e.progress === "number" ? Math.round(e.progress) : 0
      }))
      const enrolledData = mergeDuplicateEnrollments(enrolledRaw)
      
      console.log("✅ Loaded enrolled courses:", enrolledData.length)
      setEnrolledCourses(enrolledData)

      const profileBranchId =
        profileResponse.profile?.branch_id ||
        profileResponse.profile?.branch?.branch_id ||
        null
      const enrollmentBranchId = enrolledData[0]?.branch_id || null
      const assignedBranch = profileBranchId || enrollmentBranchId
      setLockedBranchId(assignedBranch ? String(assignedBranch) : null)

      // Get student's branch IDs
      const studentBranchIds = Array.from(
        new Set(
          enrolledData.map((e) => e.branch_id).filter(Boolean).concat(
            assignedBranch ? [String(assignedBranch)] : []
          )
        )
      )
      console.log("📍 Student branches:", studentBranchIds)

      // Load available courses
      try {
        let availableCoursesList: any[] = []

        if (studentBranchIds.length > 0) {
          // Load courses for each of student's branches
          for (const branchId of studentBranchIds) {
            try {
              const branchCoursesResponse = await fetch(
                getBackendApiUrl(`courses/public/by-branch/${encodeURIComponent(branchId)}`),
                fetchOpts(token)
              )
              
              if (branchCoursesResponse.ok) {
                const branchData = await branchCoursesResponse.json()
                const branchCourses = branchData.courses || []
                console.log(`✅ Loaded ${branchCourses.length} courses for branch ${branchId}`)
                
                // Add branch info and normalize fields for each course
                const coursesWithBranch = branchCourses.map((c: any) => ({
                  id: c.id,
                  title: c.title || c.name || c.course_name || "Untitled Course",
                  description: c.description || "",
                  difficulty_level: c.difficulty_level || c.level || "Beginner",
                  category_id: c.category_id || "",
                  branch_id: branchId,
                  branch_name: enrolledData.find((e) => e.branch_id === branchId)?.branch_name,
                  available_durations: c.available_durations || [],
                  pricing: {
                    amount: 0,
                    currency: c.pricing?.currency || "INR",
                  },
                }))
                
                availableCoursesList.push(...coursesWithBranch)
              }
            } catch (err) {
              console.error(`Error loading courses for branch ${branchId}:`, err)
            }
          }
        }
        
        // If no branch-specific courses loaded, load all courses
        if (availableCoursesList.length === 0) {
          console.log("⚠️ No branch-specific courses found, loading all courses")
          const allCoursesResponse = await courseAPI.getCourses(token)
          const rawCourses = allCoursesResponse.courses || []
          availableCoursesList = rawCourses.map((c: any) => ({
            ...c,
            title: c.title || c.name || c.course_name || 'Untitled Course',
            description: c.description || '',
            difficulty_level: c.difficulty_level || c.level || 'Beginner',
            category_id: c.category_id || '',
            pricing: {
              amount: c.pricing?.amount || c.price || c.fee || 0,
              currency: c.pricing?.currency || 'INR'
            }
          }))
        }

        // Keep inactive filter; include enrolled courses so we can show "Already enrolled" + Renew
        const filteredCourses = availableCoursesList.filter(
          (c: any) => c.settings?.active !== false
        )

        // One row per (course, branch) so branch-specific fees and enrollments stay correct
        const uniqueCourses = Array.from(
          new Map(
            filteredCourses.map((c: any) => [`${c.id}::${c.branch_id || ""}`, c])
          ).values()
        )

        const withEnrollment: AvailableCourse[] = uniqueCourses.map((c: any) => {
          const enrollment =
            enrolledData.find(
              (e) => e.course_id === c.id && e.branch_id === c.branch_id
            ) ?? null
          return {
            ...c,
            is_enrolled: !!enrollment,
            enrollment: enrollment ?? null,
          }
        })

        console.log("✅ Branch courses (including enrolled):", withEnrollment.length)
        const priced = await enrichAvailableCoursePricing(withEnrollment, studentBranchIds, token)
        setAvailableCourses(priced)
      } catch (err) {
        console.error("Error loading available courses:", err)
      }

    } catch (error: any) {
      console.error("❌ Error loading course data:", error)
      setError(`Failed to load course data: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    const token = requireStudentSession(router, pathname || "/student-dashboard/courses")
    if (token) {
      await loadData(token)
    }
    setRefreshing(false)
  }

  const handleLogout = () => {
    TokenManager.clearAuthData()
    router.push("/login")
  }

  const handleRenewEnrollment = (enrollment: EnrolledCourse) => {
    // M07-S04: unify renew funnel on Payments (quote + grace-aware checkout).
    router.push("/student-dashboard/payments")
  }

  const handleEnrollClick = (course: AvailableCourse) => {
    const branchId =
      lockedBranchId || course.branch_id || branches[0]?.id || ""
    if (course.is_enrolled) {
      if (
        !isEnrollmentExpiredByDate({
          endDate: course.enrollment?.end_date,
          paymentStatus: course.enrollment?.payment_status,
        })
      ) {
        return
      }
      if (course.enrollment) {
        handleRenewEnrollment(course.enrollment)
      } else {
        setIsRenewalDialog(true)
        setSelectedCourse(course)
        setSelectedBranch(branchId)
        setBatchOptions([])
        setSelectedBatchRef("")
        setAdminDurationOptions([])
        setDurationOptions([])
        setSelectedDurationKey("")
        setEnrollAmount(null)
        setShowEnrollDialog(true)
      }
      return
    }
    console.log("📋 Opening enrollment dialog. Branches available:", branches.length, branches)
    setIsRenewalDialog(false)
    setSelectedCourse(course)
    setSelectedBranch(branchId)
    setBatchOptions([])
    setSelectedBatchRef("")
    setAdminDurationOptions([])
    setDurationOptions([])
    setSelectedDurationKey("")
    setEnrollAmount(null)
    setShowEnrollDialog(true)
  }

  const openBrowseNewEnrollment = () => {
    const next = availableCourses.find((c) => !c.is_enrolled)
    if (next) handleEnrollClick(next)
    else router.push("/student-dashboard/payments")
  }

  // Load admin-configured batch + duration options for selected branch/course
  useEffect(() => {
    if (!showEnrollDialog || !selectedCourse || !selectedBranch) {
      setBatchOptions([])
      setSelectedBatchRef("")
      setAdminDurationOptions([])
      setDurationOptions([])
      setSelectedDurationKey("")
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const token = localStorage.getItem("token")
        const normalizeEnabledMap = (raw: unknown): Record<string, boolean> | undefined => {
          if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined
          return Object.fromEntries(
            Object.entries(raw as Record<string, unknown>).map(([k, v]) => [
              String(k),
              parseEnabledFlag(v),
            ])
          )
        }
        const normalizeFeeMap = (raw: unknown): Record<string, string | number | null> | undefined => {
          if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined
          return Object.fromEntries(
            Object.entries(raw as Record<string, unknown>).map(([k, v]) => [
              String(k),
              v as string | number | null,
            ])
          )
        }
        const pickCourseBatches = (courseRaw: any): any[] => {
          if (!courseRaw || typeof courseRaw !== "object") return []
          if (Array.isArray(courseRaw.branch_batches)) return courseRaw.branch_batches
          if (Array.isArray(courseRaw.batches)) return courseRaw.batches
          if (Array.isArray(courseRaw.course_schedule)) {
            const schedMatch = courseRaw.course_schedule.find(
              (row: any) => String(row?.course_id || "") === String(selectedCourse.id)
            )
            if (Array.isArray(schedMatch?.batches)) return schedMatch.batches
          }
          return []
        }

        let branchCourse: any = selectedCourse
        let batchesRaw: any[] = []

        // Source of truth for admin batch-duration enable flags: branch assignments course_schedule.
        const branchFromState = branches.find((b) => String(b.id) === String(selectedBranch))
        const scheduleRows = branchFromState?.assignments?.course_schedule
        if (Array.isArray(scheduleRows)) {
          const row = scheduleRows.find(
            (s) => String(s?.course_id || "") === String(selectedCourse.id)
          )
          if (Array.isArray(row?.batches)) {
            batchesRaw = row.batches
          }
        }

        if (batchesRaw.length === 0) {
          batchesRaw = pickCourseBatches(branchCourse)
        }

        // Fallback to authenticated branch-courses API (same source used on this page),
        // not the public by-branch API, so admin batch enable flags are preserved.
        if (batchesRaw.length === 0 && token) {
          const authRes = await fetch(getBackendApiUrl(`branches/${selectedBranch}/courses`), {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          })
          const authData = await authRes.json().catch(() => ({}))
          const courses: any[] = Array.isArray(authData?.courses) ? authData.courses : []
          const found = courses.find((c) => String(c?.id || "") === String(selectedCourse.id))
          if (found) {
            branchCourse = found
            batchesRaw = pickCourseBatches(found)
          }
        }

        const batches = batchesRaw
          .map((b: any) => ({
            batch_ref: String(b.batch_ref || b.batch_id || b.id || "").trim(),
            name: typeof b.name === "string" ? b.name : null,
            label: String(
              (typeof b.label === "string" && b.label.trim()) ||
              (typeof b.batch_name === "string" && b.batch_name.trim()) ||
              (typeof b.name === "string" && b.name.trim()) ||
              (b.start_time && b.end_time ? `${b.start_time} - ${b.end_time}` : "") ||
              ""
            ),
            enabled_per_duration: normalizeEnabledMap(b.enabled_per_duration ?? b.enabledPerDuration),
            fee_per_duration: normalizeFeeMap(b.fee_per_duration ?? b.feePerDuration),
          }))
          .filter((b: BranchBatchOption) => b.batch_ref && b.label)

        let durationsRaw: any[] = Array.isArray(branchCourse?.available_durations)
          ? branchCourse.available_durations
          : []

        // Fallback: if branch course payload does not expose durations, load the
        // course duration catalog directly and still apply batch-level filtering later.
        if (durationsRaw.length === 0) {
          const headers: Record<string, string> = {}
          if (token) headers.Authorization = `Bearer ${token}`
          const dRes = await fetch(
            getBackendApiUrl(
              `durations/public/by-course/${selectedCourse.id}?active_only=true&include_pricing=true&branch_id=${selectedBranch}`
            ),
            { headers }
          )
          const dData = await dRes.json().catch(() => ({}))
          durationsRaw = Array.isArray(dData?.durations) ? dData.durations : []
        }

        const durations = durationsRaw
          .map((d: any) => ({
            id: String(d.id || d.duration_id || ""),
            label: String(d.name || d.label || d.code || ""),
            months:
              typeof d.duration_months === "number"
                ? d.duration_months
                : parseInt(String(d.duration_months), 10) || 0,
            code: String(d.code || d.id || d.duration_id || ""),
          }))
          .filter((o: AdminDurationOption) => o.id && o.label && o.months > 0)

        if (!cancelled) {
          setBatchOptions(batches)
          setSelectedBatchRef((prev) => {
            const currentBatchStillValid = batches.some((b) => b.batch_ref === prev)
            if (currentBatchStillValid) return prev
            return batches.length === 1 ? batches[0].batch_ref : ""
          })

          setAdminDurationOptions(durations)
        }
      } catch {
        if (!cancelled) {
          setBatchOptions([])
          setSelectedBatchRef("")
          setAdminDurationOptions([])
          setDurationOptions([])
          setSelectedDurationKey("")
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [showEnrollDialog, selectedCourse?.id, selectedBranch, branches])

  // Duration becomes selectable only after batch selection (when batches exist).
  // Final allow-list comes from checkout quote API (source of truth for enabled durations).
  useEffect(() => {
    if (!showEnrollDialog || !selectedCourse || !selectedBranch) {
      setDurationOptions([])
      setSelectedDurationKey("")
      return
    }
    if (batchOptions.length > 0 && !selectedBatchRef) {
      setDurationOptions([])
      setSelectedDurationKey("")
      return
    }
    const token = localStorage.getItem("token")
    const selectedBatch = batchOptions.find((b) => b.batch_ref === selectedBatchRef)
    const filteredDurations =
      batchOptions.length > 0
        ? adminDurationOptions.filter((d) => isDurationEnabledForBatch(d, selectedBatch))
        : adminDurationOptions
    if (!token) {
      setDurationOptions(filteredDurations)
      setSelectedDurationKey((prev) => {
        if (!filteredDurations.length) return ""
        if (filteredDurations.some((d) => d.id === prev || d.code === prev)) return prev
        return filteredDurations[0].id
      })
      return
    }

    let cancelled = false
    ;(async () => {
      const checks = await Promise.all(
        filteredDurations.map(async (d) => {
          const ok = await isDurationCheckoutEnabled({
            token,
            courseId: selectedCourse.id,
            branchId: selectedBranch,
            durationKeys: [d.id, d.code, d.label],
            batchRef: selectedBatchRef || undefined,
          })
          return ok ? d : null
        })
      )
      if (cancelled) return
      const quoteEnabled = checks.filter((d): d is AdminDurationOption => !!d)
      // If quote API key matching fails for all options, keep admin-enabled durations
      // so valid plans are still selectable.
      const finalDurations =
        quoteEnabled.length > 0 ? quoteEnabled : filteredDurations
      setDurationOptions(finalDurations)
      setSelectedDurationKey((prev) => {
        if (!finalDurations.length) return ""
        if (finalDurations.some((d) => d.id === prev || d.code === prev)) return prev
        return finalDurations[0].id
      })
    })()
    return () => {
      cancelled = true
    }
  }, [
    showEnrollDialog,
    selectedCourse?.id,
    selectedBranch,
    batchOptions,
    selectedBatchRef,
    adminDurationOptions,
  ])

  // Total from payment-info (must run after durations exist; matches prepare-student-checkout)
  useEffect(() => {
    if (!showEnrollDialog || !selectedCourse || !selectedBranch || !selectedDurationKey) {
      setEnrollAmount(null)
      setEnrollPricingLoading(false)
      return
    }
    if (durationOptions.length === 0) {
      setEnrollAmount(null)
      return
    }
    const token = localStorage.getItem("token")
    if (!token) {
      setEnrollPricingLoading(false)
      return
    }
    let cancelled = false
    setEnrollPricingLoading(true)
    ;(async () => {
      try {
        const opt = durationOptions.find(
          (o) => o.id === selectedDurationKey || o.code === selectedDurationKey
        )
        const durParam = opt?.code || opt?.id || selectedDurationKey
        const quoteBody: any = {
          course_id: selectedCourse.id,
          branch_id: selectedBranch,
          duration: durParam,
          ...(selectedBatchRef.trim() ? { batch_ref: selectedBatchRef.trim() } : {}),
        }
        if (beneficiaryType !== "self") {
          quoteBody.beneficiary = {
            beneficiary_type: beneficiaryType,
            beneficiary_name: beneficiaryName.trim() || undefined,
            beneficiary_phone: beneficiaryPhone.trim() || undefined,
            beneficiary_relationship: beneficiaryRelationship.trim() || undefined,
          }
        }
        const res = await fetch(getBackendApiUrl("payments/student-checkout-quote"), {
          method: "POST",
          ...fetchOpts(token),
          body: JSON.stringify(quoteBody),
        })
        if (!res.ok || cancelled) {
          if (!cancelled) setEnrollAmount(null)
          return
        }
        const data = await res.json().catch(() => ({}))
        const p = data?.pricing
        const total = typeof p?.total_amount === "number" ? p.total_amount : null
        if (!cancelled && typeof total === "number" && total > 0 && !Number.isNaN(total)) {
          setEnrollAmount(total)
        } else if (!cancelled) setEnrollAmount(null)
      } catch {
        if (!cancelled) setEnrollAmount(null)
      } finally {
        if (!cancelled) setEnrollPricingLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    showEnrollDialog,
    selectedCourse?.id,
    selectedBranch,
    selectedDurationKey,
    durationOptions,
    beneficiaryType,
    beneficiaryName,
    beneficiaryPhone,
    beneficiaryRelationship,
    selectedBatchRef,
  ])

  const handleEnrollSubmit = async () => {
    if (!selectedCourse || !selectedBranch || !selectedDurationKey) {
      alert("Please select course, branch, and duration")
      return
    }
    if (lockedBranchId && selectedBranch !== lockedBranchId) {
      alert("You must enroll at your assigned branch. Contact admin to change branch.")
      return
    }
    if (batchOptions.length > 0 && !selectedBatchRef.trim()) {
      alert("Please select a batch before choosing duration")
      return
    }
    if (enrollAmount == null || enrollAmount <= 0) {
      alert("Price could not be loaded for this selection. Please try again or contact support.")
      return
    }

    setEnrolling(true)

    try {
      const token = requireStudentSession(router, pathname || "/student-dashboard/courses")
      if (!token) {
        setEnrolling(false)
        return
      }

      // Get student profile for prefill data
      const profileResponse = await studentProfileAPI.getProfile(token)
      const profile = profileResponse.profile

      // Find selected branch details
      const selectedBranchData = branches.find(b => b.id === selectedBranch)

      const opt = durationOptions.find(
        (o) => o.id === selectedDurationKey || o.code === selectedDurationKey
      )
      const durationForApi = opt?.code || opt?.id || selectedDurationKey

      const prepRes = await fetch(getBackendApiUrl("payments/prepare-student-checkout"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          course_id: selectedCourse.id,
          branch_id: selectedBranch,
          duration: durationForApi,
          ...(selectedBatchRef.trim() ? { batch_ref: selectedBatchRef.trim() } : {}),
          ...(beneficiaryType !== "self" && beneficiaryName.trim() ? {
            beneficiary: {
              beneficiary_type: beneficiaryType,
              beneficiary_name: beneficiaryName.trim(),
              beneficiary_phone: beneficiaryPhone.trim() || undefined,
              beneficiary_relationship: beneficiaryRelationship.trim() || undefined,
            }
          } : {}),
        }),
      })
      const prepJson = await prepRes.json().catch(() => ({}))
      if (!prepRes.ok) {
        const msg =
          typeof prepJson?.detail === "string"
            ? prepJson.detail
            : prepJson?.detail?.[0]?.msg || prepJson?.message || "Could not start checkout"
        if (prepRes.status === 401 || isSessionExpiredError(msg)) {
          TokenManager.clearAuthData()
          throw new Error(SESSION_EXPIRED_PAYMENT_MESSAGE)
        }
        throw new Error(msg)
      }

      const prepAmount = typeof prepJson.amount === "number" ? prepJson.amount : enrollAmount
      const enrollmentData = {
        enrollment_id: prepJson.enrollment_id as string,
        course_id: selectedCourse.id,
        course_name: (prepJson.course_name as string) || selectedCourse.title,
        branch_id: selectedBranch,
        branch_name: (prepJson.branch_name as string) || selectedBranchData?.name || "Unknown Branch",
        amount: prepAmount,
        student_name: profile.full_name || `${profile.first_name} ${profile.last_name}`,
        student_email: profile.email,
        student_phone: profile.phone,
      }

      // Initiate Razorpay payment
      await initiatePayment({
        currency: 'INR',
        enrollmentData,
        onSuccess: (result: any) => {
          console.log('Payment successful:', result)
          setShowEnrollDialog(false)
          setEnrolling(false)
          const pid = result?.payment_id ?? result?.receipt?.payment_id ?? ""
          router.replace(
            `/student-dashboard/payment-success?payment_id=${encodeURIComponent(String(pid))}&amount=${encodeURIComponent(String(prepAmount))}&course_name=${encodeURIComponent(enrollmentData.course_name)}&branch_name=${encodeURIComponent(enrollmentData.branch_name)}`
          )
        },
        onFailure: (error: any) => {
          console.error('Payment failed:', error)
          setEnrolling(false)
          const message = getSessionErrorMessage(error, true)
          if (message === SESSION_EXPIRED_PAYMENT_MESSAGE) {
            TokenManager.clearAuthData()
            router.push(`/login?session=expired&returnUrl=${encodeURIComponent(pathname || "/student-dashboard/courses")}`)
            return
          }
          alert(`Payment failed: ${message}`)
        }
      })
    } catch (error: any) {
      console.error('Enrollment failed:', error)
      const message = getSessionErrorMessage(error, true)
      if (message === SESSION_EXPIRED_PAYMENT_MESSAGE) {
        TokenManager.clearAuthData()
        router.push(`/login?session=expired&returnUrl=${encodeURIComponent(pathname || "/student-dashboard/courses")}`)
      } else {
        alert(`Enrollment failed: ${message}`)
      }
      setEnrolling(false)
    }
  }

  const handleBranchChangeRequest = (enrollment: EnrolledCourse) => {
    setChangingEnrollment(enrollment)
    setNewBranchId("")
    setShowBranchChangeDialog(true)
  }

  const handleBranchChangeSubmit = async () => {
    if (!changingEnrollment || !newBranchId) {
      alert("Please select a new branch")
      return
    }

    setRequestingChange(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) return

      // Submit branch transfer request (existing backend endpoint: /api/requests/transfer)
      const response = await fetch(
        getBackendApiUrl('requests/transfer'),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            enrollment_id: changingEnrollment.enrollment_id,
            current_branch_id: changingEnrollment.branch_id,
            new_branch_id: newBranchId,
            reason: "Student requested branch change"
          })
        }
      )

      if (response.ok) {
        const data = await response.json().catch(() => ({}))
        alert(
          data.message ||
            "Branch change request submitted successfully! Your request will be sent to the super admin for approval. Once approved, your branch will be updated."
        )
        setShowBranchChangeDialog(false)
        setChangingEnrollment(null)
        setNewBranchId("")
        handleRefresh()
      } else {
        const errorData = await response.json().catch(() => ({}))
        const message = errorData.detail || errorData.error || errorData.message || "Request failed"
        throw new Error(Array.isArray(message) ? message[0] : message)
      }
    } catch (error: any) {
      alert(error?.message || "Request failed. Please try again.")
    } finally {
      setRequestingChange(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const enrollDialogCourses = lockedBranchId
    ? availableCourses.filter((c) => (c.branch_id || "") === lockedBranchId)
    : availableCourses

  const getStatusBadge = (isActive: boolean, paymentStatus: string, endDate: string) => {
    if (isEnrollmentExpiredByDate({ paymentStatus, endDate })) {
      return <Badge variant="destructive">Expired</Badge>
    }
    if (!isActive) {
      return <Badge variant="outline">Inactive</Badge>
    }
    if (paymentStatus === 'pending') {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending Payment</Badge>
    }
    if (paymentStatus === 'paid') {
      return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
    }
    return <Badge variant="outline">Inactive</Badge>
  }

  if (loading) {
    return (
      <StudentDashboardLayout
        studentName={studentData?.name}
        onLogout={handleLogout}
        isLoading={true}
      >
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </StudentDashboardLayout>
    )
  }

  return (
    <StudentDashboardLayout
      studentName={studentData?.name}
      onLogout={handleLogout}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <BookOpen className="h-8 w-8" />
              My Courses
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your enrolled courses and browse new courses
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {availableCourses.some((c) => !c.is_enrolled) && (
              <Button
                size="sm"
                onClick={openBrowseNewEnrollment}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Browse Courses
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{enrolledCourses.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {enrolledCourses.filter(
                  c => isEnrollmentActivePaid({
                    isActive: c.is_active,
                    paymentStatus: c.payment_status,
                    endDate: c.end_date
                  })
                ).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {enrolledCourses.filter(c => c.payment_status === 'pending').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {enrolledCourses.length > 0
                  ? Math.round(enrolledCourses.reduce((sum, c) => sum + (c.progress || 0), 0) / enrolledCourses.length)
                  : 0}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enrolled Courses */}
        {enrolledCourses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No courses enrolled</h3>
              <p className="text-muted-foreground mb-6 text-center">
                You haven't enrolled in any courses yet. Start your martial arts journey today!
              </p>
              <div className="flex gap-3">
                {availableCourses.some((c) => !c.is_enrolled) && (
                  <Button 
                    onClick={openBrowseNewEnrollment}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Browse Courses
                  </Button>
                )}
                <Button variant="outline" onClick={handleRefresh}>
                  Retry Loading
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {enrolledCourses.map((course) => (
              <Card key={course.enrollment_id}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-xl font-semibold mb-1">{course.course_name}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{course.branch_name}</span>
                          </div>
                        </div>
                        {getStatusBadge(course.is_active, course.payment_status, course.end_date)}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <div>
                            <div className="font-medium">Enrolled</div>
                            <div className="text-muted-foreground">{formatDate(course.enrollment_date)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <div>
                            <div className="font-medium">Expires</div>
                            <div className="text-muted-foreground">{formatDate(course.end_date)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <TrendingUp className="h-4 w-4 text-gray-500" />
                          <div>
                            <div className="font-medium">Progress</div>
                            <div className="text-muted-foreground">{course.progress || 0}%</div>
                          </div>
                        </div>
                      </div>

                      {course.progress !== undefined && (
                        <div className="mb-4">
                          <Progress value={course.progress} className="h-2" />
                        </div>
                      )}

                      <div className="flex gap-2 flex-wrap">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleBranchChangeRequest(course)}
                          disabled={!course.is_active}
                        >
                          <MapPin className="h-4 w-4 mr-2" />
                          Change Branch
                        </Button>
                        {course.payment_status === 'pending' && (
                          <Button 
                            size="sm"
                            onClick={() => router.push('/student-dashboard/payments')}
                            className="bg-yellow-600 hover:bg-yellow-700"
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Complete Payment
                          </Button>
                        )}
                        {isEnrollmentExpiredByDate({
                          endDate: course.end_date,
                          paymentStatus: course.payment_status,
                        }) && (
                          <Button
                            size="sm"
                            onClick={() => handleRenewEnrollment(course)}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Renew Subscription
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Available Courses */}
        {availableCourses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Available Courses at Your Branch{enrolledCourses.length > 0 ? '(es)' : ''}</CardTitle>
              <CardDescription>
                {enrolledCourses.length > 0
                  ? "Courses at your branches. Already enrolled courses show Renew; new courses show Enroll."
                  : "Browse and enroll in available courses."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {availableCourses.map((course) => (
                  <Card
                    key={course.branch_id ? `${course.id}-${course.branch_id}` : course.id}
                    className={`border-2 ${course.is_enrolled ? "border-emerald-200/80 bg-emerald-50/40" : ""}`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg">{course.title}</CardTitle>
                        {course.is_enrolled && (
                          <Badge className="shrink-0 bg-emerald-100 text-emerald-900 border-emerald-200">
                            Already enrolled
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="line-clamp-2">
                        {course.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {course.branch_name && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{course.branch_name}</span>
                          </div>
                        )}
                        {course.is_enrolled && course.enrollment?.end_date && (
                          <p className="text-xs text-muted-foreground">
                            Current period ends {formatDate(course.enrollment.end_date)}
                          </p>
                        )}
                        {course.is_enrolled ? (
                          <Button
                            className="w-full bg-emerald-700 hover:bg-emerald-800"
                            disabled={
                              !isEnrollmentExpiredByDate({
                                endDate: course.enrollment?.end_date,
                                paymentStatus: course.enrollment?.payment_status,
                              })
                            }
                            onClick={() => handleEnrollClick(course)}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Renew
                          </Button>
                        ) : (
                          <Button className="w-full" onClick={() => handleEnrollClick(course)}>
                            Enroll Now
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Enrollment Dialog */}
      <Dialog
        open={showEnrollDialog}
        onOpenChange={(open) => {
          setShowEnrollDialog(open)
          if (!open) {
            setIsRenewalDialog(false)
            setDurationOptions([])
            setSelectedDurationKey("")
            setBatchOptions([])
            setSelectedBatchRef("")
            setAdminDurationOptions([])
            setEnrollAmount(null)
            setBeneficiaryType("self")
            setBeneficiaryName("")
            setBeneficiaryPhone("")
            setBeneficiaryRelationship("")
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle>
              {selectedCourse ? `Enroll in ${selectedCourse.title}` : "Enroll in a course"}
            </DialogTitle>
            <DialogDescription>
              {lockedBranchId
                ? "Your branch is fixed to your current assignment. You may choose any course, package, and duration available at this branch. Contact admin to change branch."
                : "Choose course, branch, and duration. Pricing comes from your branch and admin fee settings."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 px-6 overflow-y-auto min-h-0">
            <div className="space-y-2">
              <Label htmlFor="course">Select course</Label>
              <Select
                value={selectedCourse ? courseRowKey(selectedCourse) : ""}
                onValueChange={(v) => {
                  const { id, branch_id } = parseCourseRowKey(v)
                  const c = enrollDialogCourses.find(
                    (x) => x.id === id && (x.branch_id || "") === branch_id
                  )
                  if (c) {
                    setSelectedCourse(c)
                    setSelectedBranch(lockedBranchId || c.branch_id || branches[0]?.id || "")
                    setBatchOptions([])
                    setSelectedBatchRef("")
                    setAdminDurationOptions([])
                    setDurationOptions([])
                    setSelectedDurationKey("")
                  }
                }}
                disabled={isRenewalDialog}
              >
                <SelectTrigger className="text-gray-900 dark:text-gray-100">
                  <SelectValue placeholder="Choose a course" />
                </SelectTrigger>
                <SelectContent>
                  {enrollDialogCourses.map((course) => (
                    <SelectItem
                      key={courseRowKey(course)}
                      value={courseRowKey(course)}
                    >
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch">
                Select Branch{" "}
                {lockedBranchId && (
                  <span className="text-xs text-muted-foreground">(your assigned branch)</span>
                )}
              </Label>
              <Select
                value={selectedBranch}
                onValueChange={(v) => {
                  if (lockedBranchId) return
                  setSelectedBranch(v)
                  setBatchOptions([])
                  setSelectedBatchRef("")
                  setAdminDurationOptions([])
                  setDurationOptions([])
                  setSelectedDurationKey("")
                }}
                disabled={!!lockedBranchId}
              >
                <SelectTrigger className="text-gray-900 dark:text-gray-100">
                  <SelectValue placeholder={branches.length === 0 ? "Loading branches..." : "Choose a branch"} />
                </SelectTrigger>
                <SelectContent>
                  {branches.length === 0 ? (
                    <SelectItem value="none" disabled>No branches available</SelectItem>
                  ) : (
                    (lockedBranchId
                      ? branches.filter((b) => b.id === lockedBranchId)
                      : branches
                    ).map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {branches.length === 0 && (
                <p className="text-sm text-yellow-600">
                  No branches loaded. Please refresh the page.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch">Select batch</Label>
              {batchOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No batch selection required for this course.
                </p>
              ) : (
                <Select value={selectedBatchRef} onValueChange={setSelectedBatchRef}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {batchOptions.map((b) => (
                      <SelectItem key={b.batch_ref} value={b.batch_ref}>
                        {(b.name && b.name.trim()) || b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Course duration</Label>
              {durationOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  {batchOptions.length > 0 && !selectedBatchRef
                    ? "Please select a batch to view available durations."
                    : "No admin-enabled durations configured for this course. Please contact support."}
                </p>
              ) : (
                <Select value={selectedDurationKey} onValueChange={setSelectedDurationKey}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {durationOptions.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Who is this for?</Label>
              <Select value={beneficiaryType} onValueChange={(v) => { setBeneficiaryType(v); if (v === "self") { setBeneficiaryName(""); setBeneficiaryPhone(""); setBeneficiaryRelationship(""); } }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Self</SelectItem>
                  <SelectItem value="family">Family</SelectItem>
                  <SelectItem value="friend">Friend</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {beneficiaryType !== "self" && (
              <div className="space-y-2 rounded-lg border p-3">
                <div className="space-y-2">
                  <Label>Beneficiary Name *</Label>
                  <input
                    type="text"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={beneficiaryName}
                    onChange={(e) => setBeneficiaryName(e.target.value)}
                    placeholder="Full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone (optional)</Label>
                  <input
                    type="tel"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={beneficiaryPhone}
                    onChange={(e) => setBeneficiaryPhone(e.target.value)}
                    placeholder="Phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Relationship</Label>
                  <input
                    type="text"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={beneficiaryRelationship}
                    onChange={(e) => setBeneficiaryRelationship(e.target.value)}
                    placeholder="e.g., Son, Daughter, Friend"
                  />
                </div>
              </div>
            )}

            {selectedCourse && (
              <div className="rounded-lg bg-blue-50 p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Total amount</span>
                  <span className="text-xl font-bold flex items-center gap-2">
                    {enrollPricingLoading && <Loader2 className="h-5 w-5 animate-spin" />}
                    {!enrollPricingLoading &&
                      (enrollAmount != null && enrollAmount > 0
                        ? formatCurrency(enrollAmount)
                        : "—")}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  You will complete payment securely via Razorpay after continuing.
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="px-6 pb-6 pt-3 border-t shrink-0">
            <Button variant="outline" onClick={() => setShowEnrollDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleEnrollSubmit} 
              disabled={
                enrolling ||
                !selectedCourse ||
                !selectedBranch ||
                branches.length === 0 ||
                (batchOptions.length > 0 && !selectedBatchRef.trim()) ||
                enrollPricingLoading ||
                enrollAmount == null ||
                enrollAmount <= 0 ||
                !selectedDurationKey ||
                durationOptions.length === 0
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {enrolling ? "Enrolling..." : "Proceed to Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Branch Change Dialog */}
      <Dialog open={showBranchChangeDialog} onOpenChange={setShowBranchChangeDialog}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle>Request Branch Change</DialogTitle>
            <DialogDescription>
              Request to change branch for {changingEnrollment?.course_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 px-6 overflow-y-auto min-h-0">
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="text-sm">
                <span className="font-medium">Current Branch: </span>
                <span>{changingEnrollment?.branch_name}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newBranch">Select New Branch</Label>
              <Select value={newBranchId} onValueChange={setNewBranchId}>
                <SelectTrigger className="text-gray-900 dark:text-gray-100">
                  <SelectValue placeholder="Choose a new branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches
                    .filter(b => b.id !== changingEnrollment?.branch_id)
                    .map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your request will be sent to the super admin for approval. Once approved, your enrollment branch
                will be updated.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter className="px-6 pb-6 pt-3 border-t shrink-0">
            <Button variant="outline" onClick={() => setShowBranchChangeDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBranchChangeSubmit}
              disabled={requestingChange || !newBranchId}
            >
              {requestingChange ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StudentDashboardLayout>
  )
}
