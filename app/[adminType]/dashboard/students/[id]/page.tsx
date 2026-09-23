"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { formatRegisteredDateTime } from "@/lib/formatRegisteredDate"
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
  XCircle
} from "lucide-react"
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
  duration_id?: string
  updated_at?: string
  created_at?: string
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
    const explicit = String(enrollment?.status || "").toLowerCase()
    const active = enrollment?.is_active !== false
    const paymentStatus = String(enrollment?.payment_status || "").toLowerCase()
    if (paymentStatus === "cancelled" || paymentStatus === "canceled") return "cancelled"
    if (paymentStatus === "paused") return "paused"
    if (paymentStatus === "expired") return "expired"
    if (!active) return "inactive"
    if (["completed", "paused", "cancelled", "inactive", "active"].includes(explicit)) {
      return explicit
    }
    return "active"
  }

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
      const enrollmentResponse = await fetch(getBackendApiUrl(`users/${studentId}/enrollments`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (enrollmentResponse.ok) {
        const enrollmentData = await enrollmentResponse.json()
        const enrollments = enrollmentData.enrollments || []

        // Transform API response to match frontend interface
        const history: EnrollmentHistory[] = enrollments.map((enrollment: any) => ({
          id: enrollment.id || `enrollment-${Date.now()}`,
          course_name: enrollment.course_name || 'Unknown Course',
          enrollment_date: enrollment.enrollment_date || enrollment.created_at || new Date().toISOString(),
          start_date: enrollment.start_date,
          end_date: enrollment.end_date,
          next_due_date: enrollment.next_due_date || enrollment.end_date,
          completion_date: enrollment.completion_date,
          status: deriveEnrollmentStatus(enrollment),
          progress: enrollment.progress || 0,
          grade: enrollment.grade,
          is_active: enrollment.is_active,
          payment_status: enrollment.payment_status,
          fee_amount: enrollment.fee_amount,
          batch_ref: enrollment.batch_ref,
          course_id: enrollment.course_id,
          branch_id: enrollment.branch_id,
          duration_id: enrollment.duration_id,
          updated_at: enrollment.updated_at,
          created_at: enrollment.created_at,
        }))

        setEnrollmentHistory(history)
      } else {
        console.error('Failed to fetch enrollment history:', enrollmentResponse.status, enrollmentResponse.statusText)
        setError('Failed to load enrollment history')
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
        return <Clock className="w-4 h-4 " />
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
        return <Clock className="w-4 h-4 " />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
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
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold  mb-2">Student Not Found</h2>
            <p className=" mb-6">{error}</p>
            <div className="space-x-4">
              <Button onClick={handleBack} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Students
              </Button>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
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

  return (
    <div className="min-h-screen bg-gray-50">
      
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          {/* Mobile: row 1 = back + actions, row 2 = name + status */}
          <div className="flex flex-col gap-4 lg:hidden">
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="px-0 hover:bg-transparent"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Students
              </Button>
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => router.push(`${basePath}/students/${studentId}/performance`)}
                  className="border-amber-300 text-amber-900 hover:bg-amber-50 h-9 w-9"
                  aria-label="Performance"
                >
                  <TrendingUp className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={handleEdit}
                  className="bg-yellow-400 hover:bg-yellow-500 text-white"
                >
                  <Edit className="w-4 h-4 mr-1.5" />
                  Edit Student
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[#4F5077]">
              <h1 className="text-2xl font-bold uppercase">
                {student.full_name}
              </h1>
              <Badge
                variant={student.is_active ? "default" : "secondary"}
                className={student.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
              >
                {student.is_active ? "Active" : "Inactive"}
              </Badge>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => {
                  setStatusReason("")
                  setStatusDialogOpen(true)
                }}
              >
                {student.is_active ? "Deactivate" : "Activate"}
              </Button>
              {student.student_id && (
                <Badge variant="outline">
                  ID: {student.student_id}
                </Badge>
              )}
            </div>
          </div>

          {/* Desktop */}
          <div className="hidden lg:flex items-center justify-between">
            <div className="flex flex-row gap-6 text-[#4F5077]">
              <div className="flex items-center space-x-4 border-r border-gray-200 pr-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className=" hover:"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Students
                </Button>
              </div>
              <div className="flex items-center space-x-4 ml-4">
                <h1 className="text-3xl font-bold uppercase">
                  {student.full_name}
                </h1>
                <Badge
                  variant={student.is_active ? "default" : "secondary"}
                  className={student.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                >
                  {student.is_active ? "Active" : "Inactive"}
                </Badge>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setStatusReason("")
                    setStatusDialogOpen(true)
                  }}
                >
                  {student.is_active ? "Deactivate" : "Activate"}
                </Button>
                {student.student_id && (
                  <Badge variant="outline">
                    ID: {student.student_id}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(`${basePath}/students/${studentId}/performance`)}
                className="border-amber-300 text-amber-900 hover:bg-amber-50"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Performance
              </Button>
              <Button onClick={handleEdit} className="bg-yellow-400 hover:bg-yellow-500 text-white">
                <Edit className="w-4 h-4 mr-2" />
                Edit Student
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card className="relative overflow-hidden">
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
                <CardTitle className="flex items-center text-[#4D5077] font-bold">
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10 space-y-6 text-[#7F8592]">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium  mb-2 flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </h3>
                    <p className="text-sm ">{student.email}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium  mb-2 flex items-center">
                      <Phone className="w-4 h-4 mr-2" />
                      Phone
                    </h3>
                    <p className="text-sm ">{student.phone || 'Not provided'}</p>
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
                      <h3 className="text-sm font-medium  mb-2 flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        Date of Birth
                      </h3>
                      <p className="text-sm ">
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
                      <h3 className="text-sm font-medium  mb-1">Gender</h3>
                      <p className="text-sm  capitalize">{student.gender}</p>
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
                    <h3 className="text-sm font-medium  mb-2 flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      Address
                    </h3>
                    <div className="text-sm ">
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
                    <h3 className="text-sm font-medium  mb-2 flex items-center">
                      <UserCheck className="w-4 h-4 mr-2" />
                      Emergency Contact
                    </h3>
                    <div className="text-sm ">
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
                    <h3 className="text-sm font-medium  mb-1">Enrolled (registered)</h3>
                    <p className="text-sm ">
                      {formatRegisteredDateTime(student.created_at)}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium  mb-1">Last Updated</h3>
                    <p className="text-sm ">
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

            {/* M08-S03 Student ID Card */}
            <StudentIdCardSection studentId={studentId} getToken={getAuthToken} />

            {/* M08-S01 Account status history */}
            <Card>
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
                            {row.created_at
                              ? new Date(row.created_at).toLocaleString("en-IN", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })
                              : ""}
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

            {/* Course Enrollment History */}
            <Card>
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
                    {enrollmentHistory.map((enrollment) => (
                      <div key={enrollment.id} className="p-4 bg-gray-50 rounded-lg border-l-4 border-l-green-500">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <BookOpen className="w-5 h-5 " />
                            <h4 className="font-semibold ">{enrollment.course_name}</h4>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(enrollment.status)}
                            <Badge
                              variant="secondary"
                              className={`text-xs ${
                                enrollment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                enrollment.status === 'active' ? 'bg-blue-100 text-blue-800' :
                                enrollment.status === 'inactive' ? 'bg-gray-100 text-gray-700' :
                                enrollment.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                                enrollment.status === 'expired' ? 'bg-red-100 text-red-800' :
                                'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1)}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm  mb-3">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span className="font-medium">Enrolled:</span>
                            <span>{new Date(enrollment.enrollment_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}</span>
                          </div>
                          {enrollment.start_date && (
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span className="font-medium">Start:</span>
                              <span>
                                {new Date(enrollment.start_date).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </div>
                          )}
                          {enrollment.end_date && (
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span className="font-medium">End:</span>
                              <span>
                                {new Date(enrollment.end_date).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </div>
                          )}
                          {(enrollment.next_due_date || enrollment.end_date) && (
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4 text-amber-600" />
                              <span className="font-medium">Next due:</span>
                              <span className="font-semibold text-amber-700">
                                {new Date(
                                  (enrollment.next_due_date || enrollment.end_date) as string
                                ).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </div>
                          )}
                          {enrollment.is_active !== false && enrollment.fee_amount != null && enrollment.fee_amount > 0 && (
                            <div className="flex items-center space-x-1">
                              <CreditCard className="w-4 h-4 text-blue-600" />
                              <span className="font-medium">Last paid course fee:</span>
                              <span className="font-semibold text-blue-700">
                                ₹{Number(enrollment.fee_amount).toLocaleString("en-IN")}
                              </span>
                            </div>
                          )}
                          {enrollment.completion_date && (
                            <div className="flex items-center space-x-1">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="font-medium">Completed:</span>
                              <span>{new Date(enrollment.completion_date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}</span>
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

                        {enrollment.progress >= 0 && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className=" flex items-center">
                                <TrendingUp className="w-4 h-4 mr-1" />
                                Course Progress
                              </span>
                              <span className="font-semibold text-blue-600">{enrollment.progress}%</span>
                            </div>
                            <Progress value={enrollment.progress} className="h-3" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Student Achievements */}
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

            {/* Recent Attendance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center font-bold text-[#4D5077]">
                  <Clock className="w-5 h-5 mr-2" />
                  Recent Attendance
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
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No attendance records available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {attendanceRecords.slice(0, 10).map((record, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            {getAttendanceIcon(record.status)}
                            <span className="font-medium ">{record.course_name}</span>
                          </div>
                          <div className="text-sm ">
                            {new Date(record.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                            {record.duration_minutes && (
                              <span className="ml-2">• {record.duration_minutes} min</span>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            record.status === 'present' ? 'bg-green-100 text-green-800' :
                            record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
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
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-[#4D5077] font-bold">
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-[#7F8592]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <BookOpen className="w-4 h-4 mr-2" />
                    <span className="text-sm ">Total Courses</span>
                  </div>
                  <span className="font-semibold">{student.total_courses || student.courses?.length || 0}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Award className="w-4 h-4 mr-2" />
                    <span className="text-sm ">Completed</span>
                  </div>
                  <span className="font-semibold">
                    {student.completed_courses || student.courses?.filter(c => c.status === 'completed').length || 0}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    <span className="text-sm ">Attendance Rate</span>
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
                      <span className="text-sm ">Outstanding</span>
                    </div>
                    <span className={`font-semibold ${student.outstanding_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{student.outstanding_balance.toLocaleString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment History */}
            <Card>
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
                <div className="flex flex-wrap items-center gap-2 mt-3">
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
                  <p className="text-xs text-muted-foreground mt-2">
                    Super Admin: search this student in Payment Tracking and use <strong>Recover</strong> on cancelled payment rows to restore checkout, mark offline payment, or waive.
                  </p>
                )}
              </CardHeader>
              <CardContent className="text-[#7F8592]">
                {paymentsLoading ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
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
                  <div className="text-center py-6 text-gray-500">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No payment history available</p>
                    <p className="text-xs mt-1">Payment transactions will appear here once payments are made.</p>
                  </div>
                ) : filteredPaymentHistory.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No payments in this period</p>
                    <p className="text-xs mt-1">Try Month or All to see older records.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {filteredPaymentHistory.map((payment) => (
                      <div key={payment.id} className="p-4 bg-gray-50 rounded-lg border-l-4 border-l-blue-500">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <CreditCard className="w-4 h-4 text-blue-600" />
                            <span className="font-semibold ">₹{payment.amount.toLocaleString()}</span>
                          </div>
                          <Badge
                            variant="secondary"
                            className={`text-xs ${
                              payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                              payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}
                          >
                            {payment.status}
                          </Badge>
                        </div>
                        <div className="text-sm  space-y-1">
                          <p className="font-medium">{payment.description}</p>
                          <div className="flex items-center justify-between">
                            <span>
                              📅 {new Date(payment.payment_date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
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

            {/* Student Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center font-bold text-[#4D5077]">Student Status</CardTitle>
              </CardHeader>
              <CardContent className="text-[#7F8592]">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm ">Status</span>
                    <Badge
                      variant={student.is_active ? "default" : "secondary"}
                      className={student.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                    >
                      {student.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm ">Student ID</span>
                    <span className="text-sm font-mono ">
                      {student.student_id || student.id}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm ">Role</span>
                    <Badge variant="outline" className="text-xs">
                      {student.role}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>

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
    </div>
  )
}
