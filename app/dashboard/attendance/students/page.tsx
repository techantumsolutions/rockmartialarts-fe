"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { format, parseISO } from "date-fns"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts"
import {
  CalendarIcon,
  Download,
  Search,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  MapPin,
  BookOpen
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import DashboardHeader from "@/components/dashboard-header"
import { SuperAdminAuth } from "@/lib/auth"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { TokenManager } from "@/lib/tokenManager"
import { formatTimeIST } from "@/lib/formatRegisteredDate"
import { useToast } from "@/hooks/use-toast"

function getAttendanceAuthHeaders(): Record<string, string> | null {
  if (typeof window === "undefined") return null
  if (SuperAdminAuth.isAuthenticated()) {
    return SuperAdminAuth.getAuthHeaders()
  }
  const token = BranchManagerAuth.getToken() || TokenManager.getToken()
  if (!token) return null
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }
}

function isAttendanceAuthenticated(): boolean {
  return !!getAttendanceAuthHeaders()
}

function parseDatetimeLocalToIso(value: string): string | null {
  if (!value || !value.trim()) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function computeAttendanceStats(records: AttendanceRecord[]): AttendanceStats {
  return {
    total_students: records.length,
    present_today: records.filter((r) => r.status === "present").length,
    absent_today: records.filter((r) => r.status === "absent").length,
    late_today: records.filter((r) => r.status === "late").length,
    not_marked_today: records.filter((r) => r.status === "not_marked").length,
    attendance_rate:
      records.length > 0
        ? (records.filter((r) => r.status === "present" || r.status === "late").length /
            records.length) *
          100
        : 0,
  }
}

interface Student {
  id: string
  full_name: string
  email: string
  phone?: string
  courses?: Array<{
    id: string
    name: string
    course_id?: string
    course_name?: string
  }>
  branch_id?: string
  branch_name?: string
  attendance?: {
    status: "present" | "absent" | "late" | "not_marked"
    check_in_time?: string
    check_out_time?: string
    notes?: string
    marked_by?: string
  }
}

interface AttendanceRecord {
  id: string
  student_id: string
  student_name: string
  course_id: string
  course_name: string
  branch_id: string
  branch_name: string
  email: string
  phone?: string
  status: "present" | "absent" | "late" | "not_marked"
  check_in_time?: string
  check_out_time?: string
  notes?: string
  date: string
  /** Raw ISO from API for editing / re-save */
  check_in_iso?: string | null
  check_out_iso?: string | null
  admin_adjusted?: boolean
  /** Mongo attendance.id when a same-day record exists */
  attendance_id?: string | null
  correction_reason?: string | null
}

interface AttendanceStats {
  total_students: number
  present_today: number
  absent_today: number
  late_today: number
  not_marked_today: number
  attendance_rate: number
}

interface Branch {
  id: string
  name: string
  branch?: {
    name: string
  }
}

interface Course {
  id: string
  name: string
  title?: string
}

export default function SuperAdminStudentAttendancePage() {
  const { toast } = useToast()
  const router = useRouter()
  const pathname = usePathname()
  const usesDashboardLayoutNav =
    !!pathname &&
    (pathname.startsWith("/super-admin/dashboard") ||
      pathname.startsWith("/branch-admin/dashboard") ||
      pathname.startsWith("/branch-manager-dashboard/"))

  const canEditCheckInTime =
    typeof window !== "undefined" &&
    (SuperAdminAuth.isAuthenticated() ||
      BranchManagerAuth.getCurrentUser()?.role === "branch_manager" ||
      TokenManager.getUser()?.role === "branch_manager")

  const canChangeAttendanceStatus =
    typeof window !== "undefined" &&
    (SuperAdminAuth.isAuthenticated() ||
      BranchManagerAuth.getCurrentUser()?.role === "branch_manager")

  // Enhanced state management
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats>({
    total_students: 0,
    present_today: 0,
    absent_today: 0,
    late_today: 0,
    not_marked_today: 0,
    attendance_rate: 0
  })
  const [branches, setBranches] = useState<Branch[]>([])
  const [courses, setCourses] = useState<Course[]>([])

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Filter state
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedBranch, setSelectedBranch] = useState("all")
  const [selectedCourse, setSelectedCourse] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")

  // View state
  const [viewMode, setViewMode] = useState<"today" | "range">("today")
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined
    to: Date | undefined
  }>({
    from: undefined,
    to: undefined
  })

  // Saving state for individual records (check-in/out + attendance marks)
  const [saveStatus, setSaveStatus] = useState<Record<string, 'idle' | 'saving' | 'success' | 'error'>>({})
  /** Which Present/Late/Absent action is in flight for a row (button-level spinner). */
  const [markActionPending, setMarkActionPending] = useState<
    Record<string, "present" | "late" | "absent" | null>
  >({})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [editingCheckInId, setEditingCheckInId] = useState<string | null>(null)
  const [checkInEditDraft, setCheckInEditDraft] = useState("")
  const [editingCheckOutId, setEditingCheckOutId] = useState<string | null>(null)
  const [checkOutEditDraft, setCheckOutEditDraft] = useState("")

  /** M09-S05: reason required when correcting an already-marked record */
  type CorrectionDraft =
    | {
        kind: "status"
        recordId: string
        status: "present" | "absent" | "late"
      }
    | {
        kind: "check_in"
        recordId: string
        iso: string
      }
    | {
        kind: "check_out"
        recordId: string
        iso: string
      }
  const [correctionDraft, setCorrectionDraft] = useState<CorrectionDraft | null>(null)
  const [correctionReason, setCorrectionReason] = useState("")
  const [correctionSubmitting, setCorrectionSubmitting] = useState(false)

  // Filter attendance records based on search and filters
  const filteredRecords = attendanceRecords.filter(record => {
    const matchesSearch = record.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.branch_name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesBranch = selectedBranch === "all" || record.branch_id === selectedBranch
    const matchesCourse = selectedCourse === "all" || record.course_id === selectedCourse
    const matchesStatus = selectedStatus === "all" || record.status === selectedStatus

    return matchesSearch && matchesBranch && matchesCourse && matchesStatus
  })

  // Clear messages after timeout
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 8000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // Fetch branches for filtering
  const fetchBranches = async () => {
    try {
      if (!isAttendanceAuthenticated()) return

      const headers = getAttendanceAuthHeaders()
      if (!headers) return
      const response = await fetch('/api/backend/branches', {
        method: 'GET',
        headers
      })

      if (response.ok) {
        const data = await response.json()
        const branchList = (data.branches || []).map((branch: any) => ({
          id: branch.id,
          name: branch.branch?.name || branch.name || 'Unknown Branch'
        }))
        setBranches(branchList)
      }
    } catch (error) {
      console.error("Error fetching branches:", error)
    }
  }

  // Fetch courses for filtering
  const fetchCourses = async () => {
    try {
      if (!isAttendanceAuthenticated()) return

      const headers = getAttendanceAuthHeaders()
      if (!headers) return
      const response = await fetch('/api/backend/courses', {
        method: 'GET',
        headers
      })

      if (response.ok) {
        const data = await response.json()
        const courseList = (data.courses || []).map((course: any) => ({
          id: course.id,
          name: course.title || course.name || 'Unknown Course'
        }))
        setCourses(courseList)
      }
    } catch (error) {
      console.error("Error fetching courses:", error)
    }
  }

  // Fetch attendance data for selected date
  const fetchAttendanceData = async (options?: { silent?: boolean }) => {
    const silent = Boolean(options?.silent)
    try {
      if (!silent) {
        setLoading(true)
        setError(null)
      }

      if (!isAttendanceAuthenticated()) {
        if (!silent) setError("Authentication required")
        return
      }

      const headers = getAttendanceAuthHeaders()
      if (!headers) {
        if (!silent) setError("Authentication required")
        return
      }
      const dateStr = format(selectedDate, 'yyyy-MM-dd')

      console.log(`🔄 Superadmin fetching attendance data for date: ${dateStr}`)

      // Use the unified attendance endpoint
      const response = await fetch(`/api/backend/attendance/students?date=${dateStr}`, {
        method: 'GET',
        headers
      })

      if (response.ok) {
        const data = await response.json()
        console.log("✅ Superadmin attendance data received:", data)

        const records: AttendanceRecord[] = (data.students || []).map((student: any) => {
          // Handle multiple courses per student
          const courses = student.courses || []
          const primaryCourse = courses[0] || {}

          return {
            id: `${student.id}_${primaryCourse.id || 'no-course'}_${dateStr}`,
            student_id: student.id,
            student_name: student.full_name || 'Unknown Student',
            course_id: primaryCourse.id || primaryCourse.course_id || '',
            course_name: primaryCourse.name || primaryCourse.course_name || 'No Course',
            branch_id: student.branch_id || '',
            branch_name: branches.find(b => b.id === student.branch_id)?.name || 'Unknown Branch',
            email: student.email || '',
            phone: student.phone || '',
            status: student.attendance?.status || "not_marked",
            check_in_iso: student.attendance?.check_in_time
              ? (typeof student.attendance.check_in_time === "string"
                  ? student.attendance.check_in_time
                  : new Date(student.attendance.check_in_time).toISOString())
              : null,
            check_out_iso: student.attendance?.check_out_time
              ? (typeof student.attendance.check_out_time === "string"
                  ? student.attendance.check_out_time
                  : new Date(student.attendance.check_out_time).toISOString())
              : null,
            check_in_time: student.attendance?.check_in_time
              ? formatTimeIST(
                  typeof student.attendance.check_in_time === "string"
                    ? student.attendance.check_in_time
                    : new Date(student.attendance.check_in_time).toISOString()
                )
              : undefined,
            check_out_time: student.attendance?.check_out_time
              ? formatTimeIST(
                  typeof student.attendance.check_out_time === "string"
                    ? student.attendance.check_out_time
                    : new Date(student.attendance.check_out_time).toISOString()
                )
              : undefined,
            admin_adjusted: Boolean(student.attendance?.admin_adjusted),
            attendance_id:
              student.attendance?.attendance_id ||
              student.attendance?.id ||
              null,
            correction_reason: student.attendance?.correction_reason || null,
            notes: student.attendance?.notes || "",
            date: dateStr
          }
        })

        setAttendanceRecords(records)

        // Calculate statistics
        const stats = {
          total_students: records.length,
          present_today: records.filter(r => r.status === "present").length,
          absent_today: records.filter(r => r.status === "absent").length,
          late_today: records.filter(r => r.status === "late").length,
          not_marked_today: records.filter(r => r.status === "not_marked").length,
          attendance_rate: records.length > 0 ?
            (records.filter(r => r.status === "present" || r.status === "late").length / records.length) * 100 : 0
        }

        setAttendanceStats(stats)
        console.log("📊 Calculated stats:", stats)

      } else {
        const errorText = await response.text()
        console.error("❌ Failed to fetch attendance data:", response.status, errorText)
        if (silent) {
          toast({
            title: "Could not refresh table",
            description: `Server returned ${response.status}.`,
            variant: "destructive",
          })
        } else {
          setError(`Failed to fetch attendance data: ${response.status}`)
        }
      }

    } catch (error) {
      console.error("❌ Error fetching attendance data:", error)
      if (!silent) {
        setError("Failed to load attendance data. Please check your connection and try again.")
        setAttendanceRecords([])
        setAttendanceStats({
          total_students: 0,
          present_today: 0,
          absent_today: 0,
          late_today: 0,
          not_marked_today: 0,
          attendance_rate: 0
        })
      } else {
        toast({
          title: "Could not refresh attendance",
          description: "Your change may have saved; try Refresh if counts look wrong.",
          variant: "destructive",
        })
      }
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  const isAttendanceStatusFinal = (s: string) =>
    s === "present" || s === "late" || s === "absent"

  // Handle attendance marking with improved error handling and user feedback
  const handleMarkAttendance = async (recordId: string, status: "present" | "absent" | "late") => {
    try {
      setMarkActionPending((prev) => ({ ...prev, [recordId]: status }))
      setSaveStatus((prev) => ({ ...prev, [recordId]: "saving" }))
      setError(null)

      if (!isAttendanceAuthenticated()) {
        setSaveStatus((prev) => ({ ...prev, [recordId]: "error" }))
        toast({
          title: "Authentication required",
          description: "Please log in again.",
          variant: "destructive",
        })
        return
      }

      const record = attendanceRecords.find((r) => r.id === recordId)
      if (!record) {
        setSaveStatus((prev) => ({ ...prev, [recordId]: "error" }))
        toast({
          title: "Record not found",
          description: "Refresh the page and try again.",
          variant: "destructive",
        })
        return
      }

      // M09-S05: changing an already-marked row requires a reason via corrections API
      const hasExistingAttendance =
        Boolean(record.attendance_id) ||
        Boolean(record.check_in_iso) ||
        (isAttendanceStatusFinal(record.status) && record.status !== "not_marked" && Boolean(record.notes))
      if (isAttendanceStatusFinal(record.status) && hasExistingAttendance) {
        setMarkActionPending((prev) => ({ ...prev, [recordId]: null }))
        setSaveStatus((prev) => ({ ...prev, [recordId]: "idle" }))
        setCorrectionDraft({ kind: "status", recordId, status })
        setCorrectionReason("")
        return
      }

      if (!record.course_id || !record.branch_id) {
        setSaveStatus((prev) => ({ ...prev, [recordId]: "error" }))
        toast({
          title: "Missing data",
          description: "Course or branch is missing for this student.",
          variant: "destructive",
        })
        return
      }

      const headers = getAttendanceAuthHeaders()
      if (!headers) {
        setSaveStatus((prev) => ({ ...prev, [recordId]: "error" }))
        toast({
          title: "Authentication required",
          description: "Please log in again.",
          variant: "destructive",
        })
        return
      }

      const checkIso = new Date().toISOString()
      const attendanceData = {
        user_id: record.student_id,
        user_type: "student",
        course_id: record.course_id,
        branch_id: record.branch_id,
        attendance_date: `${record.date}T10:00:00Z`,
        status: status,
        check_in_time: status !== "absent" ? checkIso : null,
        notes: `Marked by superadmin on ${format(new Date(), "PPP")}`,
      }

      const response = await fetch(`/api/backend/attendance/mark`, {
        method: "POST",
        headers,
        body: JSON.stringify(attendanceData),
      })

      if (response.ok) {
        const notesStr = attendanceData.notes as string
        setSaveStatus((prev) => ({ ...prev, [recordId]: "success" }))
        setSuccessMessage(`Attendance marked as ${status.toUpperCase()} for ${record.student_name}`)
        toast({
          title: "Attendance saved",
          description: `${record.student_name} — ${status}`,
        })

        setAttendanceRecords((prev) => {
          const next = prev.map((r) =>
            r.id === recordId
              ? {
                  ...r,
                  status,
                  check_in_iso: status !== "absent" ? checkIso : null,
                  check_out_iso: status === "absent" ? null : r.check_out_iso,
                  check_out_time: status === "absent" ? undefined : r.check_out_time,
                  check_in_time: status !== "absent" ? formatTimeIST(new Date()) : undefined,
                  notes: notesStr,
                }
              : r
          )
          setAttendanceStats(computeAttendanceStats(next))
          return next
        })

        void fetchAttendanceData({ silent: true })

        setTimeout(() => {
          setSaveStatus((prev) => ({ ...prev, [recordId]: "idle" }))
        }, 2500)
      } else {
        const errorText = await response.text()
        let errorMessage = "Failed to save attendance"
        try {
          const errorJson = JSON.parse(errorText) as { detail?: string; message?: string }
          errorMessage = errorJson.detail || errorJson.message || errorMessage
        } catch {
          errorMessage = `${errorMessage} (${response.status})`
        }

        setSaveStatus((prev) => ({ ...prev, [recordId]: "error" }))
        setError(errorMessage)
        toast({
          title: "Could not save attendance",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("❌ Error marking attendance:", error)
      setSaveStatus((prev) => ({ ...prev, [recordId]: "error" }))
      const msg =
        error instanceof Error
          ? error.message
          : "Please check your connection and try again."
      setError(msg)
      toast({
        title: "Network error",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setMarkActionPending((prev) => ({ ...prev, [recordId]: null }))
    }
  }

  const isStatusButtonDisabled = (
    record: AttendanceRecord,
    role: "present" | "late" | "absent"
  ) => {
    if (saveStatus[record.id] === "saving" || markActionPending[record.id] != null) return true
    if (canChangeAttendanceStatus) return false
    if (isAttendanceStatusFinal(record.status)) {
      return record.status !== role
    }
    return false
  }

  const handleUpdateCheckInTime = async (recordId: string, iso: string) => {
    const record = attendanceRecords.find((r) => r.id === recordId)
    if (!record || record.status === "absent" || record.status === "not_marked") return
    if (!canEditCheckInTime) return
    const tInNew = new Date(iso).getTime()
    if (Number.isNaN(tInNew)) {
      toast({
        title: "Invalid check-in time",
        description: "Choose a valid date and time.",
        variant: "destructive",
      })
      return
    }
    if (record.check_out_iso) {
      const tIn = tInNew
      const tOut = new Date(record.check_out_iso).getTime()
      if (!(tOut > tIn)) {
        const msg =
          "Check-out must be after check-in. Adjust check-out or clear it first."
        setError(msg)
        toast({ title: "Invalid times", description: msg, variant: "destructive" })
        return
      }
    }
    // M09-S05: require reason before persisting time correction
    setCorrectionDraft({ kind: "check_in", recordId, iso })
    setCorrectionReason("")
  }

  const handleUpdateCheckOutTime = async (recordId: string, draftLocal: string) => {
    const record = attendanceRecords.find((r) => r.id === recordId)
    if (!record || record.status === "absent" || record.status === "not_marked") return
    if (!canEditCheckInTime) return

    const iso = parseDatetimeLocalToIso(draftLocal)
    if (!iso) {
      const msg = "Enter a valid check-out date and time."
      setError(msg)
      toast({ title: "Invalid check-out time", description: msg, variant: "destructive" })
      return
    }

    const cinBase = record.check_in_iso
    if (!cinBase) {
      const msg =
        "Check-in is not recorded for this student. Mark present or set check-in before check-out."
      setError(msg)
      toast({ title: "Cannot check out", description: msg, variant: "destructive" })
      return
    }

    const tIn = new Date(cinBase).getTime()
    const tOut = new Date(iso).getTime()
    if (Number.isNaN(tIn) || Number.isNaN(tOut)) {
      const msg = "Could not read check-in or check-out time. Try refreshing the page."
      setError(msg)
      toast({ title: "Invalid data", description: msg, variant: "destructive" })
      return
    }
    if (!(tOut > tIn)) {
      const msg = "Check-out must be after check-in."
      setError(msg)
      toast({ title: "Invalid times", description: msg, variant: "destructive" })
      return
    }

    // M09-S05: require reason before persisting time correction
    setCorrectionDraft({ kind: "check_out", recordId, iso })
    setCorrectionReason("")
  }

  const submitAttendanceCorrection = async () => {
    if (!correctionDraft) return
    const reason = correctionReason.trim()
    if (reason.length < 3) {
      toast({
        title: "Reason required",
        description: "Enter at least 3 characters explaining this correction.",
        variant: "destructive",
      })
      return
    }
    const record = attendanceRecords.find((r) => r.id === correctionDraft.recordId)
    if (!record) {
      toast({
        title: "Record not found",
        description: "Refresh and try again.",
        variant: "destructive",
      })
      return
    }
    const headers = getAttendanceAuthHeaders()
    if (!headers) {
      toast({
        title: "Authentication required",
        description: "Please log in again.",
        variant: "destructive",
      })
      return
    }

    const body: Record<string, unknown> = {
      reason,
      student_id: record.student_id,
      course_id: record.course_id,
      branch_id: record.branch_id,
      attendance_date: `${record.date}T10:00:00Z`,
    }
    if (record.attendance_id) body.attendance_id = record.attendance_id

    if (correctionDraft.kind === "status") {
      body.status = correctionDraft.status
      if (correctionDraft.status !== "absent") {
        body.check_in_time =
          record.check_in_iso || new Date().toISOString()
        if (record.check_out_iso) body.check_out_time = record.check_out_iso
      }
    } else if (correctionDraft.kind === "check_in") {
      body.status = record.status
      body.check_in_time = correctionDraft.iso
      if (record.check_out_iso) body.check_out_time = record.check_out_iso
    } else {
      body.status = record.status
      body.check_in_time = record.check_in_iso
      body.check_out_time = correctionDraft.iso
    }

    try {
      setCorrectionSubmitting(true)
      setSaveStatus((prev) => ({ ...prev, [record.id]: "saving" }))
      const response = await fetch(`/api/backend/attendance/corrections`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        const t = await response.text()
        let detail = t || `Failed (${response.status})`
        try {
          const j = JSON.parse(t) as { detail?: string }
          if (typeof j.detail === "string") detail = j.detail
        } catch {
          /* keep */
        }
        throw new Error(detail)
      }
      const payload = (await response.json().catch(() => null)) as {
        attendance_id?: string
        after?: { status?: string; check_in_time?: string; check_out_time?: string }
      } | null

      const nextStatus =
        correctionDraft.kind === "status"
          ? correctionDraft.status
          : record.status
      const nextInIso =
        correctionDraft.kind === "check_in"
          ? correctionDraft.iso
          : correctionDraft.kind === "status" && correctionDraft.status === "absent"
            ? null
            : correctionDraft.kind === "check_out"
              ? record.check_in_iso
              : correctionDraft.kind === "status"
                ? record.check_in_iso || new Date().toISOString()
                : record.check_in_iso
      const nextOutIso =
        correctionDraft.kind === "check_out"
          ? correctionDraft.iso
          : correctionDraft.kind === "status" && correctionDraft.status === "absent"
            ? null
            : record.check_out_iso

      setAttendanceRecords((prev) => {
        const next = prev.map((r) =>
          r.id === record.id
            ? {
                ...r,
                status: nextStatus,
                attendance_id: payload?.attendance_id || r.attendance_id,
                check_in_iso: nextInIso,
                check_out_iso: nextOutIso,
                check_in_time: nextInIso ? formatTimeIST(nextInIso) : undefined,
                check_out_time: nextOutIso ? formatTimeIST(nextOutIso) : undefined,
                admin_adjusted: true,
                correction_reason: reason,
              }
            : r
        )
        setAttendanceStats(computeAttendanceStats(next))
        return next
      })
      setEditingCheckInId(null)
      setEditingCheckOutId(null)
      setCorrectionDraft(null)
      setCorrectionReason("")
      setSuccessMessage("Attendance corrected")
      toast({
        title: "Correction saved",
        description: "Change recorded with audit reason.",
      })
      void fetchAttendanceData({ silent: true })
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to correct attendance"
      setError(msg)
      toast({ title: "Correction failed", description: msg, variant: "destructive" })
    } finally {
      setCorrectionSubmitting(false)
      setSaveStatus((prev) => ({ ...prev, [record.id]: "idle" }))
    }
  }

  // Load initial data
  useEffect(() => {
    const initializeData = async () => {
      await Promise.all([
        fetchBranches(),
        fetchCourses()
      ])
    }
    initializeData()
  }, [])

  // Fetch attendance data when date changes
  useEffect(() => {
    if (branches.length > 0) {
      fetchAttendanceData()
    }
  }, [selectedDate, branches])

  // Utility functions
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Present</Badge>
      case "absent":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Absent</Badge>
      case "late":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Late</Badge>
      default:
        return <Badge variant="outline" className="text-gray-600">Not Marked</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "absent":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "late":
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const getSaveStatusIcon = (recordId: string) => {
    const status = saveStatus[recordId] || 'idle'
    switch (status) {
      case 'saving':
        return <RefreshCw className="h-3 w-3 animate-spin text-blue-600" />
      case 'success':
        return <CheckCircle className="h-3 w-3 text-green-600" />
      case 'error':
        return <XCircle className="h-3 w-3 text-red-600" />
      default:
        return null
    }
  }

  // Export functionality
  const handleExportData = () => {
    const csvContent = [
      ['Student Name', 'Email', 'Course', 'Branch', 'Status', 'Check In Time', 'Notes', 'Date'].join(','),
      ...filteredRecords.map(record => [
        record.student_name,
        record.email,
        record.course_name,
        record.branch_name,
        record.status,
        record.check_in_time || '',
        record.notes || '',
        record.date
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `student_attendance_${format(selectedDate, 'yyyy-MM-dd')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  // Chart data for analytics
  const getChartData = () => {
    const statusCounts = {
      present: attendanceStats.present_today,
      absent: attendanceStats.absent_today,
      late: attendanceStats.late_today,
      not_marked: attendanceStats.not_marked_today
    }

    return [
      { name: 'Present', value: statusCounts.present, fill: '#10B981' },
      { name: 'Absent', value: statusCounts.absent, fill: '#EF4444' },
      { name: 'Late', value: statusCounts.late, fill: '#F59E0B' },
      { name: 'Not Marked', value: statusCounts.not_marked, fill: '#6B7280' }
    ]
  }

  const getBranchWiseData = () => {
    const branchStats = branches.map(branch => {
      const branchRecords = filteredRecords.filter(r => r.branch_id === branch.id)
      return {
        name: branch.name,
        present: branchRecords.filter(r => r.status === 'present').length,
        absent: branchRecords.filter(r => r.status === 'absent').length,
        late: branchRecords.filter(r => r.status === 'late').length,
        total: branchRecords.length
      }
    }).filter(branch => branch.total > 0)

    return branchStats
  }

  // Render main content
  return (
    <div className="min-h-screen bg-gray-50">
      {!usesDashboardLayoutNav && <DashboardHeader />}

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Attendance Management</h1>
          <p className="text-gray-600">Manage attendance across all branches and courses</p>
        </div>

        {/* Alerts */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900">{attendanceStats.total_students}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Present</p>
                  <p className="text-2xl font-bold text-green-600">{attendanceStats.present_today}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <XCircle className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Absent</p>
                  <p className="text-2xl font-bold text-red-600">{attendanceStats.absent_today}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Late</p>
                  <p className="text-2xl font-bold text-yellow-600">{attendanceStats.late_today}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
                  <p className="text-2xl font-bold text-purple-600">{attendanceStats.attendance_rate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Controls */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              {/* Date Picker */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(selectedDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Branch Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Branch</label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Branches" />
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
              </div>

              {/* Course Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Course</label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Courses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Status</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="not_marked">Not Marked</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Actions</label>
                <div className="flex gap-2">
                  <Button
                    onClick={fetchAttendanceData}
                    variant="outline"
                    size="sm"
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button
                    onClick={handleExportData}
                    variant="outline"
                    size="sm"
                    disabled={filteredRecords.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content: full-width attendance table, then three analytics cards in one row */}
        <div className="space-y-8">
            <Card className="shadow-lg border-0 w-full">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-semibold text-gray-900">Student Attendance</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {filteredRecords.length} students • {format(selectedDate, "EEEE, MMMM d, yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={fetchAttendanceData}
                      variant="outline"
                      size="sm"
                      disabled={loading}
                      className="text-xs"
                    >
                      <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                    <Button
                      onClick={handleExportData}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <RefreshCw className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Loading attendance data...</h3>
                      <p className="text-gray-600">Please wait while we fetch the latest information</p>
                    </div>
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="bg-gray-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                      <Users className="h-10 w-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
                    <p className="text-gray-600 mb-4">
                      {attendanceRecords.length === 0
                        ? "No students enrolled for the selected date."
                        : "No students match your current filters."}
                    </p>
                    <Button onClick={() => {
                      setSearchTerm("")
                      setSelectedBranch("all")
                      setSelectedCourse("all")
                      setSelectedStatus("all")
                    }} variant="outline" size="sm">
                      Clear Filters
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Student
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Course
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Branch
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Check In
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Check Out
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {filteredRecords.map((record, index) => (
                          <tr
                            key={record.id}
                            className={`hover:bg-blue-50 transition-colors duration-150 ${
                              index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                            }`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-12 w-12">
                                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-md">
                                    <span className="text-white font-semibold text-sm">
                                      {record.student_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-4 min-w-0">
                                  <div className="text-sm font-semibold text-gray-900">
                                    {record.student_name}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[16rem]">
                                    {record.branch_name}
                                    <span className="text-gray-400 mx-1">•</span>
                                    {record.course_name}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                                  <BookOpen className="h-4 w-4 text-indigo-600" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{record.course_name}</div>
                                  <div className="text-xs text-gray-500">Course</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="bg-green-100 p-2 rounded-lg mr-3">
                                  <MapPin className="h-4 w-4 text-green-600" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{record.branch_name}</div>
                                  <div className="text-xs text-gray-500">Branch</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {getStatusIcon(record.status)}
                                <span className="ml-2">{getStatusBadge(record.status)}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap align-top">
                              {editingCheckInId === record.id &&
                              canEditCheckInTime &&
                              (record.status === "present" || record.status === "late") ? (
                                <div className="flex flex-col gap-1 max-w-[14rem]">
                                  <Input
                                    type="datetime-local"
                                    className="h-8 text-xs"
                                    value={checkInEditDraft}
                                    onChange={(e) => setCheckInEditDraft(e.target.value)}
                                  />
                                  <div className="flex gap-1">
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="h-7 text-xs"
                                      disabled={saveStatus[record.id] === "saving"}
                                      onClick={() => {
                                        const iso = parseDatetimeLocalToIso(checkInEditDraft)
                                        if (!iso) {
                                          toast({
                                            title: "Invalid check-in time",
                                            description: "Choose a valid date and time.",
                                            variant: "destructive",
                                          })
                                          return
                                        }
                                        void handleUpdateCheckInTime(record.id, iso)
                                      }}
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => setEditingCheckInId(null)}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-gray-900 font-medium">
                                  {record.check_in_time || (
                                    <span className="text-gray-400 italic">Not recorded</span>
                                  )}
                                  {record.admin_adjusted && (
                                    <span
                                      className="ml-2 text-[10px] uppercase tracking-wide text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded"
                                      title={record.correction_reason || "Manually adjusted"}
                                    >
                                      Adjusted
                                    </span>
                                  )}
                                  {canEditCheckInTime &&
                                    (record.status === "present" || record.status === "late") &&
                                    record.check_in_iso && (
                                      <Button
                                        type="button"
                                        variant="link"
                                        className="h-auto p-0 ml-2 text-xs"
                                        onClick={() => {
                                          setEditingCheckOutId(null)
                                          setEditingCheckInId(record.id)
                                          try {
                                            setCheckInEditDraft(
                                              format(parseISO(record.check_in_iso as string), "yyyy-MM-dd'T'HH:mm")
                                            )
                                          } catch {
                                            setCheckInEditDraft("")
                                          }
                                        }}
                                      >
                                        Edit
                                      </Button>
                                    )}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap align-top">
                              {editingCheckOutId === record.id &&
                              canEditCheckInTime &&
                              (record.status === "present" || record.status === "late") ? (
                                <div className="flex flex-col gap-1 max-w-[14rem]">
                                  <Input
                                    type="datetime-local"
                                    className="h-8 text-xs"
                                    value={checkOutEditDraft}
                                    onChange={(e) => setCheckOutEditDraft(e.target.value)}
                                  />
                                  <div className="flex gap-1">
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="h-7 text-xs"
                                      disabled={saveStatus[record.id] === "saving"}
                                      onClick={() => {
                                        void handleUpdateCheckOutTime(record.id, checkOutEditDraft)
                                      }}
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => setEditingCheckOutId(null)}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-gray-900 font-medium">
                                  {record.check_out_time || (
                                    <span className="text-gray-400 italic">Not recorded</span>
                                  )}
                                  {canEditCheckInTime &&
                                    (record.status === "present" || record.status === "late") &&
                                    record.check_in_iso && (
                                      <Button
                                        type="button"
                                        variant="link"
                                        className="h-auto p-0 ml-2 text-xs"
                                        onClick={() => {
                                          setEditingCheckInId(null)
                                          setEditingCheckOutId(record.id)
                                          const baseIso = record.check_out_iso || record.check_in_iso
                                          try {
                                            setCheckOutEditDraft(
                                              format(parseISO(baseIso as string), "yyyy-MM-dd'T'HH:mm")
                                            )
                                          } catch {
                                            setCheckOutEditDraft("")
                                          }
                                        }}
                                      >
                                        Edit
                                      </Button>
                                    )}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  onClick={() => handleMarkAttendance(record.id, "present")}
                                  size="sm"
                                  variant={record.status === "present" ? "default" : "outline"}
                                  className={`text-xs font-medium transition-all duration-200 ${
                                    record.status === "present"
                                      ? "bg-green-600 hover:bg-green-700 text-white shadow-md"
                                      : "hover:bg-green-50 hover:border-green-300 hover:text-green-700"
                                  }`}
                                  disabled={isStatusButtonDisabled(record, "present")}
                                >
                                  {saveStatus[record.id] === "saving" &&
                                  markActionPending[record.id] === "present" ? (
                                    <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                                  ) : (
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                  )}
                                  Present
                                </Button>
                                <Button
                                  onClick={() => handleMarkAttendance(record.id, "late")}
                                  size="sm"
                                  variant={record.status === "late" ? "default" : "outline"}
                                  className={`text-xs font-medium transition-all duration-200 ${
                                    record.status === "late"
                                      ? "bg-yellow-600 hover:bg-yellow-700 text-white shadow-md"
                                      : "hover:bg-yellow-50 hover:border-yellow-300 hover:text-yellow-700"
                                  }`}
                                  disabled={isStatusButtonDisabled(record, "late")}
                                >
                                  {saveStatus[record.id] === "saving" &&
                                  markActionPending[record.id] === "late" ? (
                                    <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                                  ) : (
                                    <Clock className="h-3 w-3 mr-1" />
                                  )}
                                  Late
                                </Button>
                                <Button
                                  onClick={() => handleMarkAttendance(record.id, "absent")}
                                  size="sm"
                                  variant={record.status === "absent" ? "default" : "outline"}
                                  className={`text-xs font-medium transition-all duration-200 ${
                                    record.status === "absent"
                                      ? "bg-red-600 hover:bg-red-700 text-white shadow-md"
                                      : "hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                                  }`}
                                  disabled={isStatusButtonDisabled(record, "absent")}
                                >
                                  {saveStatus[record.id] === "saving" &&
                                  markActionPending[record.id] === "absent" ? (
                                    <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                                  ) : (
                                    <XCircle className="h-3 w-3 mr-1" />
                                  )}
                                  Absent
                                </Button>
                                <div className="ml-1">
                                  {getSaveStatusIcon(record.id)}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
            {/* Attendance Distribution */}
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle className="text-lg">Attendance Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getChartData()}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {getChartData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Branch-wise Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Branch-wise Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getBranchWiseData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        fontSize={12}
                      />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="present" fill="#10B981" name="Present" />
                      <Bar dataKey="late" fill="#F59E0B" name="Late" />
                      <Bar dataKey="absent" fill="#EF4444" name="Absent" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Branches</span>
                  <span className="font-semibold">{branches.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Courses</span>
                  <span className="font-semibold">{courses.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Filtered Results</span>
                  <span className="font-semibold">{filteredRecords.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Attendance Rate</span>
                  <span className="font-semibold text-green-600">
                    {attendanceStats.attendance_rate.toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog
        open={!!correctionDraft}
        onOpenChange={(open) => {
          if (!open && !correctionSubmitting) {
            setCorrectionDraft(null)
            setCorrectionReason("")
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm attendance correction</DialogTitle>
            <DialogDescription>
              A reason is required so this change is audited. First-time marking does not need this step.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-600">
              {correctionDraft?.kind === "status"
                ? `Change status to “${correctionDraft.status}”.`
                : correctionDraft?.kind === "check_in"
                  ? "Update check-in time."
                  : correctionDraft?.kind === "check_out"
                    ? "Update check-out time."
                    : null}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="correction-reason">Reason</Label>
              <Textarea
                id="correction-reason"
                rows={3}
                placeholder="e.g. Student arrived late; biometric punch missed"
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                disabled={correctionSubmitting}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={correctionSubmitting}
              onClick={() => {
                setCorrectionDraft(null)
                setCorrectionReason("")
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={correctionSubmitting || correctionReason.trim().length < 3}
              onClick={() => void submitAttendanceCorrection()}
            >
              {correctionSubmitting ? "Saving…" : "Save correction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
