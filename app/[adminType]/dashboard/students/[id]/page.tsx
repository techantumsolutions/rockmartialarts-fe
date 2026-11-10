"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { formatPlanCalendarDate, formatRegisteredDateTime } from "@/lib/formatRegisteredDate"
import {
  getEnrollmentUiStatus,
  type EnrollmentUiStatus,
} from "@/lib/student-enrollment-status"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  BookOpen, 
  TrendingUp,
  CreditCard,
  Clock,
  Award,
  Edit,
  UserCheck,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronRight,
  Home,
  IdCard,
  History,
  LayoutDashboard,
  Fingerprint,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { AchievementList, type AchievementItem } from "@/components/achievements"
import { TokenManager } from "@/lib/tokenManager"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { getBackendApiUrl } from "@/lib/config"
import { formatPaymentSourceLabel } from "@/lib/formatPaymentSourceLabel"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { StudentIdCardSection } from "@/components/students/StudentIdCardSection"
import { StudentPlanRenewalSection } from "@/components/students/StudentPlanRenewalSection"
import {
  AdminPageShell,
  AdminCard,
  AdminDetailLayout,
  AdminStatusPill,
} from "@/components/dashboard/AdminPageShell"
interface StudentDetails {
  id: string
  student_id?: string
  full_name: string
  email: string
  phone: string
  date_of_birth?: string
  gender?: string
  biometric_id?: string | null
  essl_user_id?: string | null
  student_level?: string | null
  address?: {
    line1?: string
    area?: string
    city?: string
    state?: string
    pincode?: string
    country?: string
    street?: string
    postal_code?: string
  }
  emergency_contact?: {
    name?: string
    phone?: string
    relationship?: string
  }
  is_active: boolean
  role: string
  created_at: string
  updated_at: string
  // Course enrollment data
  courses?: Array<{
    course_id: string
    course_name: string
    level: string
    duration: string
    enrollment_date: string
    completion_date?: string
    progress?: number
    status: 'active' | 'completed' | 'paused' | 'cancelled'
  }>
  // Additional computed data
  total_courses?: number
  completed_courses?: number
  attendance_percentage?: number
  outstanding_balance?: number
}

interface EnrollmentHistory {
  id: string
  course_name: string
  enrollment_date: string
  start_date?: string
  end_date?: string
  next_due_date?: string
  completion_date?: string
  status: string
  progress: number
  grade?: string
  is_active?: boolean
  payment_status?: string
  fee_amount?: number
  batch_ref?: string
  course_id?: string
  branch_id?: string
  branch_name?: string
  duration_id?: string
  duration_label?: string
  include_in_history?: boolean
  updated_at?: string
  created_at?: string
  registered_at?: string
}

interface PaymentRecord {
  id: string
  amount: number
  payment_date: string
  payment_method: string
  status: 'completed' | 'pending' | 'failed'
  description: string
  notes?: string
  transaction_id?: string
  gateway_payment_label?: string
  updated_at?: string
  created_at?: string
}

interface AttendanceRecord {
  date: string
  course_name: string
  status: 'present' | 'absent' | 'late'
  duration_minutes?: number
}

/** Account status history timestamps are UTC naive from the API — show in IST. */
function formatAccountStatusHistoryAt(iso: string | null | undefined): string {
  if (iso == null || iso === "") return ""
  const raw = String(iso).trim()
  const hasTz = /([zZ]|[+-]\d{2}:?\d{2})$/.test(raw)
  const utcIso = hasTz ? raw : `${raw.includes("T") ? raw : raw.replace(" ", "T")}Z`
  return formatRegisteredDateTime(utcIso)
}

export default function StudentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const studentId = params.id as string
  const adminType = (params.adminType as string) || "super-admin"
  const basePath = `/${adminType}/dashboard`
  const studentsListUrl = searchParams.get("return") || `${basePath}/students`

  const [student, setStudent] = useState<StudentDetails | null>(null)
  const [enrollmentHistory, setEnrollmentHistory] = useState<EnrollmentHistory[]>([])
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [achievements, setAchievements] = useState<AchievementItem[]>([])
  const [achievementsLoading, setAchievementsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(true)
  const [paymentsLoading, setPaymentsLoading] = useState(true)
  const [attendanceLoading, setAttendanceLoading] = useState(true)
  const [paymentPeriodFilter, setPaymentPeriodFilter] = useState<"week" | "month" | "all">("all")
  const [error, setError] = useState<string | null>(null)
  const [statusHistory, setStatusHistory] = useState<
    Array<{
      id?: string
      previous_label?: string
      new_label?: string
      reason?: string | null
      actor_name?: string | null
      created_at?: string
    }>
  >([])
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [statusReason, setStatusReason] = useState("")
  const [statusSaving, setStatusSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const idCardSectionRef = useRef<HTMLDivElement>(null)
  const statusHistoryRef = useRef<HTMLDivElement>(null)

  const isBranchAdmin =
    adminType === "branch-admin" ||
    (typeof window !== "undefined" && window.location.pathname.startsWith("/branch-admin"))

  const getAuthToken = () => {
    let token = isBranchAdmin ? BranchManagerAuth.getToken() : TokenManager.getToken()
    if (!token && isBranchAdmin) token = TokenManager.getToken()
    return token
  }

  const filteredPaymentHistory = useMemo(() => {
    if (paymentPeriodFilter === "all") return paymentHistory
    const now = Date.now()
    const windowMs = paymentPeriodFilter === "week" ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000
    const cutoff = now - windowMs
    return paymentHistory.filter((payment) => {
      const ts = new Date(payment.payment_date || payment.created_at || "").getTime()
      return Number.isFinite(ts) && ts >= cutoff
    })
  }, [paymentHistory, paymentPeriodFilter])

  const deriveEnrollmentStatus = (enrollment: any): string => {
    const paymentStatus = String(enrollment?.payment_status || "").toLowerCase()
    if (paymentStatus === "cancelled" || paymentStatus === "canceled") return "cancelled"
    if (paymentStatus === "paused") return "paused"
    if (paymentStatus === "pending" || paymentStatus === "processing" || paymentStatus === "failed") {
      return "pending"
    }
    const ui: EnrollmentUiStatus = getEnrollmentUiStatus({
      isActive: enrollment?.is_active !== false,
      paymentStatus: enrollment?.payment_status,
      endDate: enrollment?.end_date,
      completionDate: enrollment?.completion_date,
    })
    if (ui === "expiring_soon") return "active"
    if (ui === "grace") return "expired"
    return ui
  }

  const mapEnrollmentRow = (enrollment: any, index: number): EnrollmentHistory => ({
    id: enrollment.id || enrollment.enrollment_id || `${studentId}-${index}`,
    course_name: enrollment.course_name || "Unknown Course",
    enrollment_date:
      enrollment.enrollment_date ||
      enrollment.registered_at ||
      enrollment.created_at ||
      new Date().toISOString(),
    start_date: enrollment.start_date,
    end_date: enrollment.end_date,
    next_due_date:
      enrollment.next_due_date ||
      (String(enrollment.payment_status || "").toLowerCase() === "paid"
        ? enrollment.end_date
        : undefined),
    completion_date: enrollment.completion_date,
    status: deriveEnrollmentStatus(enrollment),
    progress: Number(enrollment.progress) || 0,
    grade: enrollment.grade,
    is_active: enrollment.is_active,
    payment_status: enrollment.payment_status,
    fee_amount: enrollment.fee_amount,
    batch_ref: enrollment.batch_ref,
    course_id: enrollment.course_id,
    branch_id: enrollment.branch_id,
    branch_name: enrollment.branch_name,
    duration_id: enrollment.duration_id || enrollment.duration,
    duration_label: enrollment.duration_label,
    include_in_history:
      enrollment.include_in_history !== false &&
      !["pending", "processing", "failed"].includes(
        String(enrollment.payment_status || "").toLowerCase()
      ),
    updated_at: enrollment.updated_at,
    created_at: enrollment.created_at,
    registered_at: enrollment.registered_at || enrollment.created_at,
  })

  useEffect(() => {
    fetchStudentDetails()
  }, [studentId])

  const fetchStudentDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = getAuthToken()
      if (!token) {
        setError("Authentication required. Please login again.")
        return
      }

      // Fetch student details
      const studentResponse = await fetch(getBackendApiUrl(`users/${studentId}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!studentResponse.ok) {
        if (studentResponse.status === 404) {
          setError("Student not found")
          return
        }
        throw new Error(`Failed to fetch student: ${studentResponse.status}`)
      }

      const studentData = await studentResponse.json()
      setStudent(studentData.user || studentData)
      setLoading(false)

      void Promise.all([
        fetchEnrollmentHistory(token),
        fetchPaymentHistory(token),
        fetchAttendanceRecords(token),
        fetchAchievements(token),
        fetchStatusHistory(token),
      ])

    } catch (err: any) {
      console.error('Error fetching student details:', err)
      setError(err.message || 'Failed to load student details')
    } finally {
      setLoading(false)
    }
  }

  const fetchStatusHistory = async (token: string) => {
    try {
      const res = await fetch(
        getBackendApiUrl(`users/${studentId}/status-history?limit=20`),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )
      if (!res.ok) return
      const data = await res.json()
      setStatusHistory(Array.isArray(data.history) ? data.history : [])
    } catch {
      /* optional */
    }
  }

  const confirmDetailStatusChange = async () => {
    if (!student) return
    const nextActive = !student.is_active
    if (!nextActive && !statusReason.trim()) {
      setError("A reason is required when deactivating a student.")
      return
    }
    setStatusSaving(true)
    try {
      const token = getAuthToken()
      if (!token) throw new Error("Authentication required")
      const res = await fetch(getBackendApiUrl(`users/${studentId}/status`), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_active: nextActive,
          reason: statusReason.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.detail === "string" ? data.detail : data.message || "Status update failed"
        )
      }
      setStudent({ ...student, is_active: nextActive })
      setStatusDialogOpen(false)
      setStatusReason("")
      await fetchStatusHistory(token)
    } catch (err: any) {
      setError(err.message || "Failed to update status")
    } finally {
      setStatusSaving(false)
    }
  }

  const fetchEnrollmentHistory = async (token: string) => {
    try {
      setEnrollmentsLoading(true)
      if (isBranchAdmin) {
        // Confirm student is in managed branches, then load full enrollment records
        const studentsResponse = await fetch(getBackendApiUrl("users/students/details"), {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        })
        if (!studentsResponse.ok) {
          throw new Error(`Failed to load branch students (${studentsResponse.status})`)
        }
        const studentsData = await studentsResponse.json()
        const listedStudent = studentsData.students?.find(
          (candidate: any) => candidate.id === studentId || candidate.student_id === studentId
        )
        if (!listedStudent) {
          throw new Error("Student is not available in the branches assigned to this manager")
        }
      }

      const enrollmentResponse = await fetch(getBackendApiUrl(`users/${studentId}/enrollments`), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      })

      if (enrollmentResponse.ok) {
        const enrollmentData = await enrollmentResponse.json()
        const enrollments = enrollmentData.enrollments || []

        const history: EnrollmentHistory[] = enrollments
          .map((enrollment: any, index: number) => mapEnrollmentRow(enrollment, index))
          .filter((row) => row.include_in_history !== false)

        setEnrollmentHistory(history)
      } else {
        console.error(
          "Failed to fetch enrollment history:",
          enrollmentResponse.status,
          enrollmentResponse.statusText
        )
        setError("Failed to load enrollment history")
      }
    } catch (err) {
      console.error('Error fetching enrollment history:', err)
      setError('Error loading enrollment history')
    } finally {
      setEnrollmentsLoading(false)
    }
  }

  const fetchPaymentHistory = async (token: string) => {
    try {
      setPaymentsLoading(true)
      if (isBranchAdmin) {
        const payments: any[] = []
        let skip = 0
        let total = Number.POSITIVE_INFINITY

        while (skip < total) {
          const response = await fetch(
            getBackendApiUrl(`payments?skip=${skip}&limit=100`),
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          )
          if (!response.ok) {
            throw new Error(`Failed to fetch branch payments (${response.status})`)
          }

          const data = await response.json()
          const pagePayments = Array.isArray(data.payments) ? data.payments : []
          payments.push(...pagePayments.filter((payment: any) => payment.student_id === studentId))
          total = Number.isFinite(data.total) ? data.total : skip + pagePayments.length
          if (pagePayments.length === 0) break
          skip += pagePayments.length
        }

        const history: PaymentRecord[] = payments.map((payment: any) => ({
          id: payment.id || `payment-${Date.now()}`,
          amount: payment.amount || 0,
          payment_date: payment.payment_date || payment.created_at || new Date().toISOString(),
          payment_method: payment.payment_method || 'Unknown',
          status: payment.payment_status === 'paid' ? 'completed' as const :
                  payment.payment_status === 'pending' ? 'pending' as const : 'failed' as const,
          description: payment.description || `${payment.course_name || 'Course'} - ${payment.payment_type || 'Payment'}`,
          notes: payment.notes,
          transaction_id: payment.transaction_id,
          gateway_payment_label: payment.gateway_payment_label,
          updated_at: payment.updated_at,
          created_at: payment.created_at,
        }))
        setPaymentHistory(history)
        return
      }

      const paymentResponse = await fetch(getBackendApiUrl(`users/${studentId}/payments`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (paymentResponse.ok) {
        const paymentData = await paymentResponse.json()
        const payments = paymentData.payments || []

        // Transform API response to match frontend interface
        const history: PaymentRecord[] = payments.map((payment: any) => ({
          id: payment.id || `payment-${Date.now()}`,
          amount: payment.amount || 0,
          payment_date: payment.payment_date || payment.created_at || new Date().toISOString(),
          payment_method: payment.payment_method || 'Unknown',
          status: payment.payment_status === 'paid' ? 'completed' as const :
                  payment.payment_status === 'pending' ? 'pending' as const : 'failed' as const,
          description: payment.description || `${payment.course_name || 'Course'} - ${payment.payment_type || 'Payment'}`,
          notes: payment.notes,
          transaction_id: payment.transaction_id,
          gateway_payment_label: payment.gateway_payment_label,
          updated_at: payment.updated_at,
          created_at: payment.created_at,
        }))

        setPaymentHistory(history)
      } else {
        console.error('Failed to fetch payment history:', paymentResponse.status, paymentResponse.statusText)
        setError('Failed to load payment history')
      }
    } catch (err) {
      console.error('Error fetching payment history:', err)
      setError('Error loading payment history')
    } finally {
      setPaymentsLoading(false)
    }
  }

  const fetchAchievements = async (token: string) => {
    try {
      setAchievementsLoading(true)
      const res = await fetch(getBackendApiUrl(`achievements/student/${studentId}`), {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      })
      if (res.ok) {
        const data = await res.json()
        setAchievements(data.achievements || [])
      }
    } catch {
      setAchievements([])
    } finally {
      setAchievementsLoading(false)
    }
  }

  const fetchAttendanceRecords = async (token: string) => {
    try {
      setAttendanceLoading(true)
      const url = getBackendApiUrl(
        `attendance/reports?student_id=${encodeURIComponent(studentId)}&limit=20`
      )
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      if (!res.ok) {
        setAttendanceRecords([])
        return
      }
      const data = await res.json()
      const records = data.attendance_records || []
      const mapped: AttendanceRecord[] = records.map((r: Record<string, unknown>) => {
        const dateRaw = (r.attendance_date ?? r.created_at ?? "") as string
        const dateStr = typeof dateRaw === "string" ? dateRaw.split("T")[0] : ""
        let status: "present" | "absent" | "late" = "absent"
        if (r.is_present === true) status = "present"
        else if (r.status === "late") status = "late"
        let duration_minutes: number | undefined
        if (r.check_in_time && r.check_out_time) {
          try {
            const inT = new Date(String(r.check_in_time)).getTime()
            const outT = new Date(String(r.check_out_time)).getTime()
            if (!Number.isNaN(inT) && !Number.isNaN(outT) && outT > inT) {
              duration_minutes = Math.round((outT - inT) / 60000)
            }
          } catch {
            /* ignore */
          }
        }
        return {
          date: dateStr || "-",
          course_name: (r.course_name as string) || "Course",
          status,
          duration_minutes,
        }
      })
      setAttendanceRecords(mapped)
    } catch (err) {
      console.error("Error fetching attendance records:", err)
      setAttendanceRecords([])
    } finally {
      setAttendanceLoading(false)
    }
  }

  const handleEdit = () => {
    router.push(
      `${basePath}/students/edit/${studentId}?return=${encodeURIComponent(studentsListUrl)}`
    )
  }

  const handleBack = () => {
    router.push(studentsListUrl)
  }

  const calculateAge = (dateOfBirth: string) => {
    try {
      const birthDate = new Date(dateOfBirth)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
      return age > 0 ? age : null
    } catch {
      return null
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'active':
        return <Clock className="w-4 h-4 text-blue-600" />
      case 'paused':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />
      case 'inactive':
        return <Clock className="w-4 h-4 text-gray-500" />
      case 'expired':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getAttendanceIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'late':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />
      case 'absent':
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const studentInitials = (name: string) =>
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"

  const formatAddressLine = (s: StudentDetails) => {
    const a = s.address
    if (!a) return "Not provided"
    const parts = [
      a.line1 || a.street,
      a.area,
      [a.city, a.state, a.pincode || a.postal_code].filter(Boolean).join(", "),
      a.country,
    ].filter(Boolean)
    return parts.length ? parts.join(" · ") : "Not provided"
  }

  const scrollToOverviewSection = (ref: { current: HTMLDivElement | null }) => {
    setActiveTab("overview")
    window.setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 80)
  }

  if (loading) {
    return (
      <AdminPageShell>
        <div className="mb-2">
          <Skeleton className="mb-2 h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card className="rounded-2xl">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card className="rounded-2xl">
              <CardHeader>
                <Skeleton className="h-6 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </AdminPageShell>
    )
  }

  if (error && !student) {
    return (
      <AdminPageShell>
        <div className="py-12 text-center">
          <User className="mx-auto mb-4 h-16 w-16 text-gray-400" />
          <h2 className="mb-2 text-2xl font-semibold text-[#4F5077]">Student Not Found</h2>
          <p className="mb-6 text-[#6B7A99]">{error}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button type="button" onClick={handleBack} variant="outline" className="btn-admin-outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Students
            </Button>
            <Button type="button" onClick={() => window.location.reload()} className="btn-admin-primary">
              Try Again
            </Button>
          </div>
        </div>
      </AdminPageShell>
    )
  }

  if (!student) {
    return null
  }

  const parseTimestamp = (v?: string) => {
    if (!v) return Number.NaN
    const t = new Date(v).getTime()
    return Number.isNaN(t) ? Number.NaN : t
  }
  const latestTimestamp = [
    parseTimestamp(student.updated_at),
    ...enrollmentHistory.flatMap((e) => [
      parseTimestamp(e.updated_at),
      parseTimestamp(e.created_at),
      parseTimestamp(e.enrollment_date),
      parseTimestamp(e.end_date),
    ]),
    ...paymentHistory.flatMap((p) => [
      parseTimestamp(p.updated_at),
      parseTimestamp(p.created_at),
      parseTimestamp(p.payment_date),
    ]),
  ].reduce((max, current) => (Number.isFinite(current) && current > max ? current : max), Number.NEGATIVE_INFINITY)
  const latestUpdatedDate = Number.isFinite(latestTimestamp) ? new Date(latestTimestamp) : new Date(student.updated_at)

  const quickActions = [
    {
      label: "Manage Enrollments",
      icon: BookOpen,
      onClick: () =>
        router.push(`${basePath}/enrollments?student_id=${encodeURIComponent(studentId)}`),
    },
    {
      label: "View Payment History",
      icon: CreditCard,
      onClick: () =>
        router.push(`${basePath}/payment-tracking?student_id=${encodeURIComponent(studentId)}`),
    },
    {
      label: "View Attendance Records",
      icon: Clock,
      onClick: () =>
        router.push(`${basePath}/attendance?student_id=${encodeURIComponent(studentId)}`),
    },
    {
      label: "Generate ID Card",
      icon: IdCard,
      onClick: () => scrollToOverviewSection(idCardSectionRef),
    },
    {
      label: "Account Status History",
      icon: History,
      onClick: () => scrollToOverviewSection(statusHistoryRef),
    },
  ] as const

  const tabItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    {
      id: "enrollments",
      label: `Enrollments${enrollmentsLoading ? "" : ` (${enrollmentHistory.length})`}`,
      icon: BookOpen,
    },
    {
      id: "payments",
      label: `Payments${paymentsLoading ? "" : ` (${paymentHistory.length})`}`,
      icon: CreditCard,
    },
    { id: "attendance", label: "Attendance", icon: Clock },
    { id: "achievements", label: "Achievements", icon: Award },
  ] as const

  return (
    <AdminPageShell>
        {error && (
          <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav className="flex flex-wrap items-center gap-2 text-sm text-[#6B7A99]" aria-label="Breadcrumb">
            <button
              type="button"
              onClick={() => router.push(basePath)}
              className="inline-flex items-center gap-1 hover:text-[#4F5077]"
            >
              <Home className="h-3.5 w-3.5" />
              Home
            </button>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            <button type="button" onClick={handleBack} className="hover:text-[#4F5077]">
              Students
            </button>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            <span className="max-w-[min(100%,16rem)] truncate font-medium text-[#4F5077]">
              {student.full_name}
            </span>
          </nav>
          <div className="admin-actions">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`${basePath}/students/${studentId}/performance`)}
              className="btn-admin-outline h-10"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Performance
            </Button>
            <Button type="button" onClick={handleEdit} className="btn-admin-primary h-10">
              <Edit className="mr-2 h-4 w-4" />
              Edit Student
            </Button>
          </div>
        </div>

        <AdminCard className="relative overflow-hidden p-0" padding={false}>
          <div
            className="pointer-events-none absolute -bottom-6 right-0 h-32 w-[min(100%,420px)] opacity-90"
            aria-hidden
          >
            <svg viewBox="0 0 400 120" className="h-full w-full" preserveAspectRatio="none">
              <path
                d="M0 80 Q100 20 200 70 T400 40 L400 120 L0 120 Z"
                fill="#E1BB33"
                fillOpacity="0.22"
              />
              <path
                d="M0 95 Q120 55 240 85 T400 65 L400 120 L0 120 Z"
                fill="#E1BB33"
                fillOpacity="0.12"
              />
            </svg>
          </div>
          <div className="relative z-10 flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-start">
            <Avatar className="h-24 w-24 shrink-0 rounded-2xl border-4 border-white shadow-md">
              <AvatarFallback className="rounded-2xl bg-violet-100 text-xl font-semibold text-violet-700">
                {studentInitials(student.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-[#4F5077] sm:text-3xl">
                  {student.full_name}
                </h1>
                <AdminStatusPill status={student.is_active ? "active" : "inactive"}>
                  <span
                    className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${
                      student.is_active ? "bg-emerald-500" : "bg-red-500"
                    }`}
                  />
                  {student.is_active ? "Active" : "Inactive"}
                </AdminStatusPill>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-lg"
                  onClick={() => {
                    setStatusReason("")
                    setStatusDialogOpen(true)
                  }}
                >
                  {student.is_active ? "Deactivate" : "Activate"}
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline" className="rounded-full border-violet-200 bg-violet-50 font-mono text-xs text-[#4F5077]">
                  Student ID: {student.student_id || student.id}
                </Badge>
                <Badge variant="outline" className="rounded-full border-violet-200 bg-violet-50 capitalize text-xs text-[#4F5077]">
                  Role: {student.role}
                </Badge>
                {adminType === "super-admin" && student.student_level ? (
                  <Badge variant="outline" className="rounded-full border-[#4F5077]/40 text-[#4F5077] text-xs">
                    {student.student_level}
                  </Badge>
                ) : null}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: "Gender", value: student.gender ? String(student.gender) : "—", icon: User },
                  {
                    label: "Date of birth",
                    value: student.date_of_birth
                      ? `${new Date(student.date_of_birth).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}${calculateAge(student.date_of_birth) ? ` (${calculateAge(student.date_of_birth)}y)` : ""}`
                      : "—",
                    icon: Calendar,
                  },
                  { label: "Phone", value: student.phone || "Not provided", icon: Phone },
                  { label: "Email", value: student.email, icon: Mail },
                  { label: "Address", value: formatAddressLine(student), icon: MapPin },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-gray-100 bg-[#FAFBFC] px-3 py-2.5"
                  >
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                      <item.icon className="h-3.5 w-3.5" />
                      {item.label}
                    </div>
                    <p className="text-sm font-medium capitalize text-[#4F5077]">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminDetailLayout
          main={
            <Tabs value={activeTab} onValueChange={setActiveTab} className="admin-tabs gap-4">
              <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-2xl border border-gray-200/80 bg-white p-1.5 shadow-sm">
                {tabItems.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="gap-1.5 rounded-xl px-3 py-2 data-[state=active]:shadow-sm"
                  >
                    <tab.icon className="h-4 w-4 shrink-0" />
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="overview" className="mt-0 space-y-6">
            {/* Personal Information */}
            <Card className="relative overflow-hidden rounded-2xl border-gray-200/80 shadow-sm">
              <div
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
                aria-hidden="true"
              >
                <img
                  src="https://rockmartialartsacademy.com/api/uploads/images/1774001887_8110d145_Rock_martial_arts_logo_final.png"
                  alt=""
                  className="w-[65%] max-w-[280px] h-auto object-contain opacity-[0.07]"
                />
              </div>
              <CardHeader className="relative z-10">
                <CardTitle className="flex items-center gap-2 font-bold text-[#4F5077]">
                  <Fingerprint className="h-5 w-5 text-[#6B7A99]" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10 space-y-6 text-[#7F8592]">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </h3>
                    <p className="text-sm">{student.email}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center">
                      <Phone className="w-4 h-4 mr-2" />
                      Phone
                    </h3>
                    <p className="text-sm">{student.phone || 'Not provided'}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium mb-2">Biometric ID</h3>
                    <p className="text-sm font-mono">
                      {student.biometric_id || student.essl_user_id || (
                        <span className="font-sans text-slate-500">Not mapped</span>
                      )}
                    </p>
                  </div>

                  {student.date_of_birth && (
                    <div>
                      <h3 className="text-sm font-medium mb-2 flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        Date of Birth
                      </h3>
                      <p className="text-sm">
                        {new Date(student.date_of_birth).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                        {calculateAge(student.date_of_birth) && (
                          <span className="ml-2 text-gray-500">
                            (Age: {calculateAge(student.date_of_birth)})
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  {student.gender && (
                    <div>
                      <h3 className="text-sm font-medium mb-1">Gender</h3>
                      <p className="text-sm capitalize">{student.gender}</p>
                    </div>
                  )}

                  {adminType === "super-admin" && student.student_level ? (
                    <div>
                      <h3 className="text-sm font-medium mb-2">Student level</h3>
                      <Badge variant="outline" className="text-sm font-medium border-[#4F5077]/40 text-[#4F5077]">
                        {student.student_level}
                      </Badge>
                    </div>
                  ) : null}
                </div>

                {/* Address */}
                {student.address && (
                  <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      Address
                    </h3>
                    <div className="text-sm">
                      {(student.address.line1 || student.address.street) && (
                        <p>{student.address.line1 || student.address.street}</p>
                      )}
                      {student.address.area && <p>{student.address.area}</p>}
                      {(student.address.city || student.address.state || student.address.pincode || student.address.postal_code) && (
                        <p>
                          {[student.address.city, student.address.state, student.address.pincode || student.address.postal_code]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      )}
                      {student.address.country && <p>{student.address.country}</p>}
                    </div>
                  </div>
                )}

                {/* Emergency Contact */}
                {student.emergency_contact && (
                  <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center">
                      <UserCheck className="w-4 h-4 mr-2" />
                      Emergency Contact
                    </h3>
                    <div className="text-sm">
                      <p><strong>{student.emergency_contact.name}</strong></p>
                      {student.emergency_contact.phone && <p>Phone: {student.emergency_contact.phone}</p>}
                      {student.emergency_contact.relationship && (
                        <p>Relationship: {student.emergency_contact.relationship}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                  <div>
                    <h3 className="text-sm font-medium mb-1">Enrolled (registered)</h3>
                    <p className="text-sm">
                      {formatRegisteredDateTime(student.created_at)}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium mb-1">Last Updated</h3>
                    <p className="text-sm">
                      {latestUpdatedDate.toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <StudentPlanRenewalSection
              studentName={student?.full_name || "Student"}
              enrollments={enrollmentHistory}
              loading={enrollmentsLoading}
              authToken={getAuthToken()}
              onRenewed={() => {
                const token = getAuthToken()
                if (token) {
                  void fetchEnrollmentHistory(token)
                  void fetchPaymentHistory(token)
                }
              }}
            />

            {/* M08-S03 Student ID Card */}
            <div ref={idCardSectionRef} className="scroll-mt-24">
              <StudentIdCardSection studentId={studentId} getToken={getAuthToken} />
            </div>

            {/* M08-S01 Account status history */}
            <div ref={statusHistoryRef} className="scroll-mt-24">
            <Card className="rounded-2xl border-gray-200/80 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center font-bold text-[#4D5077]">
                  Account status history
                </CardTitle>
              </CardHeader>
              <CardContent className="text-[#7F8592]">
                {statusHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No status changes recorded yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {statusHistory.map((row, idx) => (
                      <div
                        key={row.id || idx}
                        className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {row.previous_label || "—"} → {row.new_label || "—"}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {formatAccountStatusHistoryAt(row.created_at)}
                          </span>
                        </div>
                        {row.reason ? (
                          <p className="mt-1 text-slate-700">Reason: {row.reason}</p>
                        ) : null}
                        {row.actor_name ? (
                          <p className="text-xs text-slate-500 mt-0.5">By {row.actor_name}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            </div>

            {/* Recent Activity */}
            <Card className="rounded-2xl border-gray-200/80 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center font-bold text-[#4D5077]">
                  <Clock className="mr-2 h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="text-[#7F8592]">
                {attendanceLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                  </div>
                ) : attendanceRecords.length === 0 && paymentHistory.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">
                    <Clock className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                    <p className="text-sm">No recent activity yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Attendance and payments will show here when available.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {attendanceRecords.slice(0, 5).map((record, index) => (
                      <div
                        key={`att-${index}`}
                        className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                      >
                        <div>
                          <div className="mb-1 flex items-center space-x-2">
                            {getAttendanceIcon(record.status)}
                            <span className="font-medium">Attendance · {record.course_name}</span>
                          </div>
                          <div className="text-sm">
                            {new Date(record.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            record.status === "present"
                              ? "bg-green-100 text-green-800"
                              : record.status === "late"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {record.status}
                        </Badge>
                      </div>
                    ))}
                    {filteredPaymentHistory.slice(0, 3).map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-3"
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <CreditCard className="h-4 w-4 text-blue-600" />
                          <span>
                            Payment · ₹{payment.amount.toLocaleString()} — {payment.description}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(payment.payment_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
              </TabsContent>

              <TabsContent value="enrollments" className="mt-0 space-y-6">
            <Card className="rounded-2xl border-gray-200/80 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center font-bold text-[#4D5077]">
                  Course Enrollment History ({enrollmentsLoading ? '...' : enrollmentHistory.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="text-[#7F8592]">
                {enrollmentsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-4 bg-gray-50 rounded-lg">
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-full" />
                        </div>
                        <Skeleton className="h-2 w-full" />
                      </div>
                    ))}
                  </div>
                ) : enrollmentHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No course enrollment history available</p>
                    <p className="text-sm mt-2">Course enrollments will appear here once the student enrolls in courses.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {enrollmentHistory.map((enrollment) => {
                      const pay = String(enrollment.payment_status || "").toLowerCase()
                      const isPaid = pay === "paid" || pay === "completed"
                      const borderClass =
                        enrollment.status === "active"
                          ? "border-l-green-500"
                          : enrollment.status === "expired"
                            ? "border-l-red-400"
                            : enrollment.status === "cancelled"
                              ? "border-l-gray-400"
                              : "border-l-slate-300"
                      const badgeClass =
                        enrollment.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : enrollment.status === "active"
                            ? "bg-blue-100 text-blue-800"
                            : enrollment.status === "inactive"
                              ? "bg-gray-100 text-gray-700"
                              : enrollment.status === "paused"
                                ? "bg-yellow-100 text-yellow-800"
                                : enrollment.status === "expired"
                                  ? "bg-red-100 text-red-800"
                                  : enrollment.status === "cancelled"
                                    ? "bg-red-50 text-red-700"
                                    : enrollment.status === "pending"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-slate-100 text-slate-700"
                      const statusLabel =
                        enrollment.status === "expired"
                          ? "Expired"
                          : enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1)
                      const dueDate = enrollment.next_due_date || (isPaid ? enrollment.end_date : undefined)

                      return (
                      <div key={enrollment.id} className={`p-4 bg-gray-50 rounded-lg border-l-4 ${borderClass}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <BookOpen className="w-5 h-5" />
                            <h4 className="font-semibold">{enrollment.course_name}</h4>
                            {enrollment.duration_label ? (
                              <span className="text-xs text-slate-500">({enrollment.duration_label})</span>
                            ) : null}
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(enrollment.status)}
                            <Badge variant="secondary" className={`text-xs ${badgeClass}`}>
                              {statusLabel}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-3">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span className="font-medium">Enrolled:</span>
                            <span>
                              {formatPlanCalendarDate(
                                enrollment.registered_at ||
                                  enrollment.created_at ||
                                  enrollment.enrollment_date
                              )}
                            </span>
                          </div>
                          {enrollment.start_date && (
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span className="font-medium">Start:</span>
                              <span>{formatPlanCalendarDate(enrollment.start_date)}</span>
                            </div>
                          )}
                          {enrollment.end_date && (
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span className="font-medium">End:</span>
                              <span>{formatPlanCalendarDate(enrollment.end_date)}</span>
                            </div>
                          )}
                          {dueDate && (
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4 text-amber-600" />
                              <span className="font-medium">Next due:</span>
                              <span className="font-semibold text-amber-700">
                                {formatPlanCalendarDate(dueDate)}
                              </span>
                            </div>
                          )}
                          {isPaid && enrollment.fee_amount != null && Number(enrollment.fee_amount) > 0 && (
                            <div className="flex items-center space-x-1">
                              <CreditCard className="w-4 h-4 text-blue-600" />
                              <span className="font-medium">Course fee paid:</span>
                              <span className="font-semibold text-blue-700">
                                ₹{Number(enrollment.fee_amount).toLocaleString("en-IN")}
                              </span>
                            </div>
                          )}
                          {enrollment.branch_name && (
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-4 h-4" />
                              <span className="font-medium">Branch:</span>
                              <span>{enrollment.branch_name}</span>
                            </div>
                          )}
                          {enrollment.completion_date && (
                            <div className="flex items-center space-x-1">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="font-medium">Completed:</span>
                              <span>{formatPlanCalendarDate(enrollment.completion_date)}</span>
                            </div>
                          )}
                          {enrollment.grade && (
                            <div className="flex items-center space-x-1">
                              <Award className="w-4 h-4 text-yellow-600" />
                              <span className="font-medium">Grade:</span>
                              <span className="font-semibold">{enrollment.grade}</span>
                            </div>
                          )}
                        </div>

                        {enrollment.progress > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="flex items-center">
                                <TrendingUp className="w-4 h-4 mr-1" />
                                Course Progress
                              </span>
                              <span className="font-semibold text-blue-600">{enrollment.progress}%</span>
                            </div>
                            <Progress value={enrollment.progress} className="h-3" />
                          </div>
                        )}
                      </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
              </TabsContent>

              <TabsContent value="payments" className="mt-0 space-y-6">
            <Card className="rounded-2xl border-gray-200/80 shadow-sm">
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center justify-between gap-2 font-bold text-[#4D5077]">
                  <span>
                    Payment History ({paymentsLoading ? "..." : filteredPaymentHistory.length}
                    {!paymentsLoading && paymentPeriodFilter !== "all" ? ` of ${paymentHistory.length}` : ""})
                  </span>
                  {adminType === "super-admin" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="font-normal"
                      onClick={() => router.push(`/${adminType}/dashboard/payment-tracking`)}
                    >
                      Payment Tracking — recover cancelled
                    </Button>
                  )}
                </CardTitle>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {([
                    { id: "week", label: "Week" },
                    { id: "month", label: "Month" },
                    { id: "all", label: "All" },
                  ] as const).map((opt) => (
                    <Button
                      key={opt.id}
                      type="button"
                      size="sm"
                      variant={paymentPeriodFilter === opt.id ? "default" : "outline"}
                      className={
                        paymentPeriodFilter === opt.id
                          ? "h-8 bg-[#4D5077] hover:bg-[#3d4060] text-white"
                          : "h-8"
                      }
                      onClick={() => setPaymentPeriodFilter(opt.id)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
                {adminType === "super-admin" && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Super Admin: search this student in Payment Tracking and use <strong>Recover</strong> on cancelled payment rows to restore checkout, mark offline payment, or waive.
                  </p>
                )}
              </CardHeader>
              <CardContent className="text-[#7F8592]">
                {paymentsLoading ? (
                  <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="rounded-lg bg-gray-50 p-3">
                        <div className="mb-1 flex items-center justify-between">
                          <Skeleton className="h-5 w-20" />
                          <Skeleton className="h-5 w-16" />
                        </div>
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : paymentHistory.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">
                    <CreditCard className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    <p className="text-sm">No payment history available</p>
                    <p className="mt-1 text-xs">Payment transactions will appear here once payments are made.</p>
                  </div>
                ) : filteredPaymentHistory.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">
                    <CreditCard className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    <p className="text-sm">No payments in this period</p>
                    <p className="mt-1 text-xs">Try Month or All to see older records.</p>
                  </div>
                ) : (
                  <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-1">
                    {filteredPaymentHistory.map((payment) => (
                      <div key={payment.id} className="rounded-lg border-l-4 border-l-blue-500 bg-gray-50 p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <CreditCard className="h-4 w-4 text-blue-600" />
                            <span className="font-semibold">₹{payment.amount.toLocaleString()}</span>
                          </div>
                          <Badge
                            variant="secondary"
                            className={`text-xs ${
                              payment.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : payment.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {payment.status}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          <p className="font-medium">{payment.description}</p>
                          <div className="flex items-center justify-between">
                            <span>
                              📅{" "}
                              {new Date(payment.payment_date).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            <span>💳 {formatPaymentSourceLabel(payment)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
              </TabsContent>

              <TabsContent value="attendance" className="mt-0 space-y-6">
            <Card className="rounded-2xl border-gray-200/80 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center font-bold text-[#4D5077]">
                  <Clock className="mr-2 h-5 w-5" />
                  Attendance Records
                </CardTitle>
              </CardHeader>
              <CardContent className="text-[#7F8592]">
                {attendanceLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                  </div>
                ) : attendanceRecords.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">
                    <Clock className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                    <p>No attendance records available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {attendanceRecords.map((record, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                      >
                        <div>
                          <div className="mb-1 flex items-center space-x-2">
                            {getAttendanceIcon(record.status)}
                            <span className="font-medium">{record.course_name}</span>
                          </div>
                          <div className="text-sm">
                            {new Date(record.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                            {record.duration_minutes && (
                              <span className="ml-2">• {record.duration_minutes} min</span>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            record.status === "present"
                              ? "bg-green-100 text-green-800"
                              : record.status === "late"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {record.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
              </TabsContent>

              <TabsContent value="achievements" className="mt-0 space-y-6">
            <AchievementList
              studentId={studentId}
              studentName={student?.full_name}
              achievements={achievements}
              loading={achievementsLoading}
              onRefresh={() => {
                const t = TokenManager.getToken()
                if (t) fetchAchievements(t)
              }}
            />
              </TabsContent>
            </Tabs>
          }
          side={
            <>
            <Card className="rounded-2xl border-gray-200/80 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-[#4D5077] font-bold">
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-[#7F8592]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <BookOpen className="w-4 h-4 mr-2" />
                    <span className="text-sm">Total Courses</span>
                  </div>
                  <span className="font-semibold">{student.total_courses || student.courses?.length || 0}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Award className="w-4 h-4 mr-2" />
                    <span className="text-sm">Completed</span>
                  </div>
                  <span className="font-semibold">
                    {student.completed_courses || student.courses?.filter(c => c.status === 'completed').length || 0}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    <span className="text-sm">Attendance Rate</span>
                  </div>
                  <span className="font-semibold">
                    {student.attendance_percentage ||
                     Math.round((attendanceRecords.filter(r => r.status === 'present').length /
                                Math.max(attendanceRecords.length, 1)) * 100) || 0}%
                  </span>
                </div>

                {student.outstanding_balance !== undefined && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CreditCard className="w-4 h-4 mr-2 text-red-600" />
                      <span className="text-sm">Outstanding</span>
                    </div>
                    <span className={`font-semibold ${student.outstanding_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{student.outstanding_balance.toLocaleString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-gray-200/80 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center font-bold text-[#4F5077]">Student Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-[#6B7A99]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm">Status</span>
                  <AdminStatusPill status={student.is_active ? "active" : "inactive"}>
                    {student.is_active ? "Active" : "Inactive"}
                  </AdminStatusPill>
                </div>
                <div>
                  <span className="text-xs font-medium uppercase tracking-wide text-[#6B7A99]">
                    Enrolled On
                  </span>
                  <p className="mt-1 text-sm font-medium text-[#4F5077]">
                    {formatRegisteredDateTime(student.created_at)}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium uppercase tracking-wide text-[#6B7A99]">
                    Last Updated
                  </span>
                  <p className="mt-1 text-sm font-medium text-[#4F5077]">
                    {latestUpdatedDate.toLocaleString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-gray-200/80 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center font-bold text-[#4F5077]">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-gray-100 p-0 px-1 pb-1">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.onClick}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[#4F5077] transition hover:bg-gray-50"
                  >
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E8F1FF] text-[#4F5077]">
                      <action.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 font-medium">{action.label}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#6B7A99]" />
                  </button>
                ))}
              </CardContent>
            </Card>
            </>
          }
        />

      <Dialog
        open={statusDialogOpen}
        onOpenChange={(open) => {
          if (!open && !statusSaving) {
            setStatusDialogOpen(false)
            setStatusReason("")
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {student?.is_active ? "Deactivate student" : "Activate student"}
            </DialogTitle>
            <DialogDescription>
              {student?.is_active
                ? "They will not be able to sign in until reactivated. Enrollment and payment records are unchanged."
                : "They will be able to sign in again. Enrollment and payment records are unchanged."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="detail-status-reason">
              Reason {student?.is_active ? "(required)" : "(optional)"}
            </Label>
            <Textarea
              id="detail-status-reason"
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              rows={3}
              placeholder={
                student?.is_active
                  ? "Why is this student being deactivated?"
                  : "Optional note for the status history…"
              }
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={statusSaving}
              onClick={() => {
                setStatusDialogOpen(false)
                setStatusReason("")
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={statusSaving}
              onClick={() => void confirmDetailStatusChange()}
            >
              {statusSaving ? "Saving…" : student?.is_active ? "Deactivate" : "Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  )
}
