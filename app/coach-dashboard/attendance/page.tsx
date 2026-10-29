"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Calendar as CalendarIcon,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Download,
  Loader2,
  Eye,
  RefreshCw,
  AlertCircle
} from "lucide-react"
import { format } from "date-fns"
import CoachDashboardHeader from "@/components/coach-dashboard-header"
import { checkCoachAuth, getCoachAuthHeaders } from "@/lib/coachAuth"
import { cn } from "@/lib/utils"
import { getBackendApiUrl } from "@/lib/config"
import {
  fetchCoachAssignments,
  filterStudentsForCoach,
  CoachAssignments,
  CoachAssignedBatch,
} from "@/lib/coachStudentFilter"

interface AttendanceRecord {
  id: string
  student_name: string
  student_id: string
  course_name: string
  course_id: string
  date: string
  status: "present" | "absent" | "late" | "not_marked"
  /** True when API already had present/late/absent for this day (not a UI default). */
  already_marked?: boolean
  check_in_time?: string
  check_out_time?: string
  notes?: string
  batch_ref?: string
  batch_name?: string
  raw_student?: any
}

interface AttendanceStats {
  total_students: number
  present_today: number
  absent_today: number
  late_today: number
  attendance_rate: number
}

export default function CoachAttendancePage() {
  const router = useRouter()
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([])
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats>({
    total_students: 0,
    present_today: 0,
    absent_today: 0,
    late_today: 0,
    attendance_rate: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [coachData, setCoachData] = useState<any>(null)

  // Dynamic Course and Batch filters
  const [coachAssignments, setCoachAssignments] = useState<CoachAssignments | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<string>("all")
  const [selectedBatch, setSelectedBatch] = useState<string>("all")
  const [availableBatches, setAvailableBatches] = useState<CoachAssignedBatch[]>([])

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saveStatus, setSaveStatus] = useState<{[key: string]: 'saving' | 'success' | 'error'}>({})
  const [bulkSaving, setBulkSaving] = useState(false)
  const [viewMode, setViewMode] = useState<'today' | 'historical'>('today')
  const [startDate, setStartDate] = useState<Date>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // 7 days ago
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [historicalRecords, setHistoricalRecords] = useState<AttendanceRecord[]>([])
  const [loadingHistorical, setLoadingHistorical] = useState(false)

  const isFirstRender = useRef(true)

  useEffect(() => {
    // Use the robust coach authentication check
    const authResult = checkCoachAuth()

    if (!authResult.isAuthenticated) {
      console.log("Coach not authenticated:", authResult.error)
      router.push("/coach/login")
      return
    }

    if (authResult.coach && authResult.token) {
      setCoachData(authResult.coach)
      fetchAttendanceData(authResult.token, authResult.coach)
    } else {
      setError("Coach information not found")
      setLoading(false)
    }
  }, [router])

  // Update available batches when selectedCourse changes
  useEffect(() => {
    if (!coachAssignments) return

    if (selectedCourse === "all") {
      const allBatches: CoachAssignedBatch[] = []
      coachAssignments.courses.forEach((c) => allBatches.push(...c.batches))
      setAvailableBatches(allBatches)
    } else {
      const course = coachAssignments.courses.find(
        (c) => c.id === selectedCourse || c.course_id === selectedCourse
      )
      setAvailableBatches(course?.batches || [])
    }
  }, [selectedCourse, coachAssignments])

  // Filter records based on searchTerm, selectedCourse, and selectedBatch
  useEffect(() => {
    if (!coachAssignments) {
      if (searchTerm) {
        const filtered = attendanceRecords.filter((record) =>
          record.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.course_name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        setFilteredRecords(filtered)
      } else {
        setFilteredRecords(attendanceRecords)
      }
      return
    }

    const filtered = attendanceRecords.filter((record) => {
      // Course filter
      if (selectedCourse !== "all") {
        const recordCourseId = String(record.course_id || "").trim()
        const rawStudentCourses = Array.isArray(record.raw_student?.courses)
          ? record.raw_student.courses
          : []
        const hasMatchingCourse =
          recordCourseId === selectedCourse ||
          rawStudentCourses.some(
            (c: any) =>
              String(c.id || c.course_id || "").trim() === selectedCourse ||
              String(c.name || "").trim().toLowerCase() === selectedCourse.toLowerCase()
          )
        if (!hasMatchingCourse) return false
      }

      // Batch filter
      if (selectedBatch !== "all") {
        const sBatchRef = String(record.batch_ref || record.raw_student?.batch_ref || "").trim()
        const sBatchName = String(record.batch_name || record.raw_student?.batch_name || "").trim().toLowerCase()
        const rawStudentCourses = Array.isArray(record.raw_student?.courses)
          ? record.raw_student.courses
          : []
        const targetBatch = availableBatches.find(
          (b) =>
            b.id === selectedBatch ||
            b.batch_id === selectedBatch ||
            b.batch_name.toLowerCase() === selectedBatch.toLowerCase()
        )

        const matchesBatch =
          (targetBatch &&
            (sBatchRef === targetBatch.id ||
              sBatchRef === targetBatch.batch_id ||
              sBatchName === targetBatch.batch_name.toLowerCase())) ||
          sBatchRef === selectedBatch ||
          rawStudentCourses.some(
            (c: any) =>
              String(c.batch_ref || c.batch_id || "").trim() === selectedBatch ||
              (targetBatch &&
                (String(c.batch_ref || "").trim() === targetBatch.id ||
                  String(c.batch_ref || "").trim() === targetBatch.batch_id))
          )
        if (!matchesBatch) return false
      }

      // Search term filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim()
        const matches =
          record.student_name.toLowerCase().includes(term) ||
          record.course_name.toLowerCase().includes(term) ||
          (record.batch_name && record.batch_name.toLowerCase().includes(term))
        if (!matches) return false
      }

      return true
    })

    setFilteredRecords(filtered)
  }, [searchTerm, selectedCourse, selectedBatch, attendanceRecords, coachAssignments, availableBatches])

  // Recalculate attendance stats dynamically based on filteredRecords
  useEffect(() => {
    const stats: AttendanceStats = {
      total_students: filteredRecords.length,
      present_today: filteredRecords.filter((r) => r.status === "present").length,
      absent_today: filteredRecords.filter((r) => r.status === "absent").length,
      late_today: filteredRecords.filter((r) => r.status === "late").length,
      attendance_rate:
        filteredRecords.length > 0
          ? Number(
              (
                (filteredRecords.filter((r) => r.status === "present" || r.status === "late").length /
                  filteredRecords.length) *
                100
              ).toFixed(2)
            )
          : 0,
    }
    setAttendanceStats(stats)
  }, [filteredRecords])

  // Effect to reload data when selected date changes (skip initial mount)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (coachData) {
      const authResult = checkCoachAuth()
      if (authResult.isAuthenticated && authResult.token && authResult.coach) {
        fetchAttendanceData(authResult.token, authResult.coach)
      }
    }
  }, [selectedDate])

  const fetchHistoricalAttendance = async () => {
    try {
      setLoadingHistorical(true)
      setError(null)

      const authResult = checkCoachAuth()
      if (!authResult.isAuthenticated || !authResult.coach) {
        throw new Error("Coach authentication required")
      }

      const branchId = authResult.coach?.branch_id
      if (!branchId) {
        setError("Coach is not assigned to any branch")
        return
      }

      console.log("📊 Fetching historical attendance records...")

      // Format dates for API
      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]

      // Fetch historical attendance reports
      const response = await fetch(
        getBackendApiUrl(
          `attendance/reports?branch_id=${encodeURIComponent(branchId)}&start_date=${encodeURIComponent(startDateStr)}&end_date=${encodeURIComponent(endDateStr)}`
        ),
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authResult.token}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch historical attendance: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log("✅ Historical attendance data received:", data)

      // Transform the data into AttendanceRecord format
      const records: AttendanceRecord[] = data.reports?.map((record: any) => ({
        id: record.id || `${record.student_id}_${record.attendance_date}`,
        student_name: record.student_name || 'Unknown Student',
        student_id: record.student_id,
        course_name: record.course_name || 'Unknown Course',
        course_id: record.course_id,
        date: record.attendance_date ? new Date(record.attendance_date).toISOString().split('T')[0] : '',
        status: record.status || (record.is_present ? "present" : "absent"),
        check_in_time: record.check_in_time ?
          new Date(record.check_in_time).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }) : "",
        check_out_time: record.check_out_time ?
          new Date(record.check_out_time).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }) : "",
        notes: record.notes || ""
      })) || []

      setHistoricalRecords(records)
      console.log(`📊 Loaded ${records.length} historical attendance records`)

    } catch (error) {
      console.error("Error fetching historical attendance:", error)
      setError(`Failed to load historical attendance: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setHistoricalRecords([])
    } finally {
      setLoadingHistorical(false)
    }
  }

  const fetchAttendanceData = async (token: string, coach: any) => {
    try {
      setLoading(true)
      setError(null)

      const coachId = coach?.id || coach?._id
      const branchId = coach?.branch_id
      if (!coachId || !branchId) {
        console.error("❌ No coach or branch ID found for coach")
        setError("Coach information or branch is missing")
        setLoading(false)
        return
      }

      console.log("🏢 Fetching coach assignments and branch attendance for:", branchId)

      // 1. Fetch coach assignments (courses and batches assigned to this coach in their branch)
      const assignments = await fetchCoachAssignments(token, coach)
      setCoachAssignments(assignments)
      console.log("📋 Coach assignments loaded for attendance:", assignments)

      // Use selected date instead of always using today
      const selectedDateStr = selectedDate.toISOString().split('T')[0]

      // Fetch attendance data using the unified endpoint
      const attendanceResponse = await fetch(getBackendApiUrl(`attendance/students?date=${encodeURIComponent(selectedDateStr)}`), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!attendanceResponse.ok) {
        throw new Error(`Failed to fetch attendance data: ${attendanceResponse.status} ${attendanceResponse.statusText}`)
      }

      const attendanceData = await attendanceResponse.json()
      const rawStudents = attendanceData.students || []
      console.log("✅ ATTENDANCE PAGE: Raw students received from API:", rawStudents.length)

      // 2. Filter students strictly by coach assignments (branch, assigned courses, and assigned batches)
      const assignedStudents = filterStudentsForCoach(rawStudents, assignments)
      console.log(`✅ ATTENDANCE PAGE: Filtered to ${assignedStudents.length} assigned students`)

      // Create a batch lookup map from assignments to find human-readable batch names
      const batchLookup = new Map<string, CoachAssignedBatch>()
      assignments.courses.forEach((c) => {
        c.batches.forEach((b) => {
          if (b.id) batchLookup.set(b.id, b)
          if (b.batch_id) batchLookup.set(b.batch_id, b)
        })
      })

      // Transform assigned students into attendance records
      const records: AttendanceRecord[] = []

      for (const student of assignedStudents) {
        // Get course information
        const primaryCourse = student.courses?.[0]
        const attendance = student.attendance || {}

        const rawStatus = String(attendance.status || "").toLowerCase()
        const alreadyMarked =
          rawStatus === "present" || rawStatus === "late" || rawStatus === "absent"

        // Determine student's batch_ref and batch_name
        const sBatchRef =
          student.batch_ref ||
          primaryCourse?.batch_ref ||
          student.batch_id ||
          student.course?.batch_ref ||
          ""

        let batchDisplayName = ""
        if (sBatchRef && batchLookup.has(sBatchRef)) {
          const bObj = batchLookup.get(sBatchRef)!
          const timeStr = bObj.start_time && bObj.end_time ? ` (${bObj.start_time} - ${bObj.end_time})` : ""
          batchDisplayName = `${bObj.batch_name}${timeStr}`
        } else if (student.batch_name) {
          batchDisplayName = student.batch_name
        }

        const processedRecord: AttendanceRecord = {
          id: `${student.id}_${selectedDateStr}`,
          student_name: student.full_name || student.name || 'Unknown Student',
          student_id: student.id,
          course_name: primaryCourse?.name || primaryCourse?.course_name || 'No Course Assigned',
          course_id: primaryCourse?.id || primaryCourse?.course_id || '',
          date: selectedDateStr,
          status: (alreadyMarked ? rawStatus : "not_marked") as
            | "present"
            | "absent"
            | "late"
            | "not_marked",
          already_marked: alreadyMarked,
          check_in_time: attendance.check_in_time ?
            new Date(attendance.check_in_time).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }) : "",
          check_out_time: attendance.check_out_time ?
            new Date(attendance.check_out_time).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }) : "",
          notes: attendance.notes || "",
          batch_ref: sBatchRef,
          batch_name: batchDisplayName,
          raw_student: student,
        }

        records.push(processedRecord)
      }

      setAttendanceRecords(records)
      setFilteredRecords(records)

      // Successful fetch - clear any previous error.
      // 0 students or 0 assigned courses is an empty state, not a fatal error.
      setError(null)

    } catch (error) {
      console.error("Error fetching attendance data:", error)

      // Check if it's an authentication error
      if (error instanceof Error && error.message.includes('401')) {
        setError("Authentication failed. Please log in again as a coach.")
      } else if (error instanceof Error && error.message.includes('Failed to fetch')) {
        setError("Could not reach the server. Check your connection and try again.")
        setAttendanceRecords([])
        setFilteredRecords([])
        setAttendanceStats({
          total_students: 0,
          present_today: 0,
          absent_today: 0,
          late_today: 0,
          attendance_rate: 0,
        })
      } else {
        setError(`Failed to load attendance data: ${error instanceof Error ? error.message : 'Unknown error'}`)

        // Fallback to empty state for other errors
        setAttendanceRecords([])
        setFilteredRecords([])
        setAttendanceStats({
          total_students: 0,
          present_today: 0,
          absent_today: 0,
          late_today: 0,
          attendance_rate: 0
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAttendance = async (
    recordId: string,
    status: "present" | "absent" | "late"
  ) => {
    try {
      // Set saving status for this record
      setSaveStatus(prev => ({ ...prev, [recordId]: 'saving' }))

      // Add debugging
      console.log("🔄 Marking attendance for record:", recordId, "status:", status)

      const authResult = checkCoachAuth()
      if (!authResult.isAuthenticated || !authResult.coach) {
        setSaveStatus(prev => ({ ...prev, [recordId]: 'error' }))
        setError("Authentication required")
        return
      }

      const record = attendanceRecords.find(r => r.id === recordId)
      if (!record) {
        setSaveStatus(prev => ({ ...prev, [recordId]: 'error' }))
        setError("Attendance record not found")
        return
      }

      // Already marked for the day → ask before changing (first-time mark skips this).
      if (record.already_marked && record.status !== status) {
        const ok = window.confirm(
          `${record.student_name} is already marked as ${record.status.toUpperCase()} for this day.\n\nChange to ${status.toUpperCase()}?`
        )
        if (!ok) {
          setSaveStatus((prev) => {
            const next = { ...prev }
            delete next[recordId]
            return next
          })
          return
        }
      }

      // Update local state immediately for better UX
      setAttendanceRecords(prev =>
        prev.map(r =>
          r.id === recordId
            ? {
                ...r,
                status,
                already_marked: true,
                check_in_time: status !== "absent" ? new Date().toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                }) : undefined
              }
            : r
        )
      )

      // Update filtered records as well
      setFilteredRecords(prev =>
        prev.map(r =>
          r.id === recordId
            ? {
                ...r,
                status,
                already_marked: true,
                check_in_time: status !== "absent" ? new Date().toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                }) : undefined
              }
            : r
        )
      )

      // Update attendance stats
      const updatedRecords = attendanceRecords.map(r =>
        r.id === recordId ? { ...r, status } : r
      )

      const stats: AttendanceStats = {
        total_students: updatedRecords.length,
        present_today: updatedRecords.filter(r => r.status === "present").length,
        absent_today: updatedRecords.filter(r => r.status === "absent").length,
        late_today: updatedRecords.filter(r => r.status === "late").length,
        attendance_rate: updatedRecords.length > 0
  ? Number(
      (
        (updatedRecords.filter(r => r.status === "present" || r.status === "late").length / updatedRecords.length) * 100
      ).toFixed(2)
    )
  : 0

      }
      setAttendanceStats(stats)

      // Mark as having unsaved changes (no immediate save to backend)
      setHasUnsavedChanges(true)
      setSaveStatus(prev => ({ ...prev, [recordId]: 'success' }))
      console.log("📝 Attendance status updated locally - marked as unsaved for bulk save")

      // Clear save status after 3 seconds
      setTimeout(() => {
        setSaveStatus(prev => {
          const newStatus = { ...prev }
          delete newStatus[recordId]
          return newStatus
        })
      }, 3000)

    } catch (error) {
      console.error("Error marking attendance:", error)
      setSaveStatus(prev => ({ ...prev, [recordId]: 'error' }))
      setError("Failed to mark attendance")
    }
  }

  const handleSaveAttendance = async () => {
    try {
      setBulkSaving(true)
      setError(null)
      setSuccessMessage(null)

      const authResult = checkCoachAuth()
      if (!authResult.isAuthenticated || !authResult.coach) {
        setError("Authentication required")
        return
      }

      let successCount = 0
      let errorCount = 0

      console.log("💾 Starting to save attendance records to backend...")

      // Save only students the coach actually marked (skip not_marked defaults)
      for (const record of attendanceRecords) {
        if (record.status === "not_marked") continue
        try {
          const attendanceData = {
            user_id: record.student_id,
            user_type: "student",
            course_id: record.course_id,
            branch_id: authResult.coach.branch_id || "",
            attendance_date: selectedDate.toISOString(),
            status: record.status,
            check_in_time: record.status !== "absent" ? new Date().toISOString() : null,
            notes: `Saved by coach: ${authResult.coach.full_name} for ${format(selectedDate, "PPP")}`
          }

          console.log(`💾 Saving attendance for ${record.student_name} with status: ${record.status}`)

          const response = await fetch(getBackendApiUrl("attendance/mark"), {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem("access_token") || localStorage.getItem("token")}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(attendanceData)
          })

          if (response.ok) {
            successCount++
            console.log(`✅ Successfully saved attendance for ${record.student_name}`)
          } else {
            errorCount++
            const errorText = await response.text()
            console.warn(`❌ Failed to save attendance for ${record.student_name}: ${response.status} ${errorText}`)
          }
        } catch (error) {
          errorCount++
          console.error(`❌ Error saving attendance for ${record.student_name}:`, error)
        }
      }

      // Show result message
      if (errorCount === 0) {
        setError(null)
        console.log(`✅ Successfully saved attendance for all ${successCount} students`)
        // Show success message briefly
        setSuccessMessage(`Successfully saved attendance for all ${successCount} students`)
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        const message = `⚠️ Saved ${successCount} records, ${errorCount} failed. Check console for details.`
        setError(message)
        console.warn(message)
      }

      // Clear unsaved changes flag
      setHasUnsavedChanges(false)

    } catch (error) {
      console.error("Error saving attendance records:", error)
      setError("Failed to save attendance records")
    } finally {
      setBulkSaving(false)
    }
  }

  const handleExportAttendance = async () => {
    try {
      const authResult = checkCoachAuth()
      if (!authResult.isAuthenticated || !authResult.coach) {
        setError("Authentication required")
        return
      }

      const headers = getCoachAuthHeaders()

      // Try to export from backend
      try {
        const response = await fetch(getBackendApiUrl("attendance/export?format=csv"), {
          method: 'GET',
          headers
        })

        if (response.ok) {
          const data = await response.json()

          // Create and download CSV file
          const blob = new Blob([data.content], { type: 'text/csv' })
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = data.filename || 'attendance_report.csv'
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          window.URL.revokeObjectURL(url)

          console.log("Attendance exported successfully")
          return
        }
      } catch (apiError) {
        console.warn("Backend export not available, using local data:", apiError)
      }

      // Fallback: Export local data as CSV
      const csvContent = [
        ['Student Name', 'Course', 'Date', 'Status', 'Check In', 'Check Out', 'Notes'].join(','),
        ...filteredRecords.map(record => [
          record.student_name,
          record.course_name,
          record.date,
          record.status,
          record.check_in_time || '',
          record.check_out_time || '',
          record.notes || ''
        ].join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      console.log("Local attendance data exported successfully")
    } catch (error) {
      console.error("Error exporting attendance:", error)
      setError("Failed to export attendance data")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return <Badge className="bg-green-100 text-green-800">Present</Badge>
      case "absent":
        return <Badge className="bg-red-100 text-red-800">Absent</Badge>
      case "late":
        return <Badge className="bg-yellow-100 text-yellow-800">Late</Badge>
      case "not_marked":
        return <Badge className="bg-gray-100 text-gray-700">Not Marked</Badge>
      default:
        return <Badge variant="outline">Not Marked</Badge>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CoachDashboardHeader 
          currentPage="Attendance"
          coachName={coachData?.full_name || "Coach"}
        />
        <main className="mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
            </div>
          </div>
        </main>
      </div>
    )
  }



  return (
    <div className="min-h-screen bg-gray-50">
      <CoachDashboardHeader 
        currentPage="Attendance"
        coachName={coachData?.full_name || "Coach"}
      />
      
      <main className="mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Attendance Tracking</h1>
              <p className="text-gray-600">Monitor and manage student attendance</p>
            </div>
            <div className="flex space-x-2">
              {hasUnsavedChanges && (
                <Button
                  onClick={handleSaveAttendance}
                  disabled={bulkSaving}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {bulkSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Save Attendance
                    </>
                  )}
                </Button>
              )}

              <Button onClick={handleExportAttendance} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>

              {viewMode === 'today' ? (
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date || new Date())
                        setDatePickerOpen(false)
                      }}
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <div className="flex space-x-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(startDate, "MMM dd")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => setStartDate(date || startDate)}
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="flex items-center text-gray-500">to</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(endDate, "MMM dd")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => setEndDate(date || endDate)}
                      />
                    </PopoverContent>
                  </Popover>
                  <Button onClick={fetchHistoricalAttendance} disabled={loadingHistorical}>
                    {loadingHistorical ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4 mr-2" />
                    )}
                    Load Records
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2 shrink-0" />
                <div>
                  <p className="text-red-800 font-medium">Error loading attendance data</p>
                  <p className="text-sm text-red-700 mt-0.5">{error}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const authResult = checkCoachAuth()
                  if (authResult.isAuthenticated && authResult.token && authResult.coach) {
                    fetchAttendanceData(authResult.token, authResult.coach)
                  }
                }}
                className="border-red-300 text-red-800 hover:bg-red-100 shrink-0 ml-4"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <p className="text-green-800 font-medium">{successMessage}</p>
              </div>
            </div>
          )}

          {/* View Mode Toggle */}
          <div className="flex justify-center mb-6">
            <div className="bg-gray-100 p-1 rounded-lg">
              <Button
                variant={viewMode === 'today' ? 'default' : 'ghost'}
                onClick={() => setViewMode('today')}
                className="mr-1"
              >
                Today's Attendance
              </Button>
              <Button
                variant={viewMode === 'historical' ? 'default' : 'ghost'}
                onClick={() => setViewMode('historical')}
              >
                Historical Records
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
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
                    <p className="text-sm font-medium text-gray-600">Present Today</p>
                    <p className="text-2xl font-bold text-gray-900">{attendanceStats.present_today}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <XCircle className="h-8 w-8 text-red-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Absent Today</p>
                    <p className="text-2xl font-bold text-gray-900">{attendanceStats.absent_today}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-yellow-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Late Today</p>
                    <p className="text-2xl font-bold text-gray-900">{attendanceStats.late_today}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-bold text-sm">%</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{attendanceStats.attendance_rate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between mb-6">
            <div className="flex flex-col sm:flex-row gap-3 flex-1 items-stretch sm:items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search students, courses, or batches..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>

              {/* Course Filter Dropdown - show if more than one course assigned */}
              {coachAssignments && coachAssignments.courses.length > 1 && (
                <div className="w-full sm:w-56">
                  <Select
                    value={selectedCourse}
                    onValueChange={(val) => {
                      setSelectedCourse(val)
                      setSelectedBatch("all")
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Courses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Courses</SelectItem>
                      {coachAssignments.courses.map((course) => (
                        <SelectItem
                          key={course.id || course.course_id}
                          value={course.course_id || course.id}
                        >
                          {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Batch Filter Dropdown - show if course has multiple batches */}
              {availableBatches.length > 1 && (
                <div className="w-full sm:w-64">
                  <Select
                    value={selectedBatch}
                    onValueChange={(val) => setSelectedBatch(val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Batches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Batches</SelectItem>
                      {availableBatches.map((batch) => {
                        const timeStr =
                          batch.start_time && batch.end_time
                            ? ` (${batch.start_time} - ${batch.end_time})`
                            : ""
                        return (
                          <SelectItem
                            key={batch.id || batch.batch_id}
                            value={batch.id || batch.batch_id}
                          >
                            {batch.batch_name}{timeStr}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {hasUnsavedChanges && (
              <div className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-md border border-amber-200 shrink-0">
                <span className="font-medium">Unsaved changes detected</span> - Click "Save Attendance" to persist
              </div>
            )}
          </div>

          {/* Attendance Records */}
          <Card>
            <CardHeader>
              <CardTitle>
                {viewMode === 'today'
                  ? `Attendance for ${format(selectedDate, "PPP")}`
                  : `Historical Records (${format(startDate, "MMM dd")} - ${format(endDate, "MMM dd")})`
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {viewMode === 'today' ? (
                  // Today's attendance view
                  filteredRecords.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Users className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-3 text-base font-medium text-gray-900">
                        {searchTerm
                          ? "No records found"
                          : selectedCourse !== "all" || selectedBatch !== "all"
                          ? "No students found"
                          : coachAssignments && coachAssignments.courses.length === 0
                          ? "No courses assigned"
                          : "No students enrolled"}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
                        {searchTerm
                          ? "No records match your search."
                          : selectedCourse !== "all" || selectedBatch !== "all"
                          ? "No students found for the selected course or batch."
                          : coachAssignments && coachAssignments.courses.length === 0
                          ? "You do not have any courses assigned in this branch yet. Please contact your administrator."
                          : `No students found enrolled in your assigned courses and batches in this branch for ${format(selectedDate, "PPP")}.`}
                      </p>
                    </div>
                  ) : (
                    filteredRecords.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div>
                            <h3 className="font-medium text-gray-900">{record.student_name}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-sm text-gray-600">{record.course_name}</p>
                              {record.batch_name && (
                                <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200">
                                  {record.batch_name}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        {record.check_in_time && (
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Check In</p>
                            <p className="text-sm font-medium">{record.check_in_time}</p>
                          </div>
                        )}
                        
                        {record.check_out_time && (
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Check Out</p>
                            <p className="text-sm font-medium">{record.check_out_time}</p>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(record.status)}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={record.status === "present" ? "default" : "outline"}
                            onClick={() => handleMarkAttendance(record.id, "present")}
                            disabled={saveStatus[record.id] === 'saving'}
                            className={record.status === "present" ? "bg-green-600 hover:bg-green-700" : ""}
                          >
                            {saveStatus[record.id] === 'saving' && record.status === "present" ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant={record.status === "absent" ? "destructive" : "outline"}
                            onClick={() => handleMarkAttendance(record.id, "absent")}
                            disabled={saveStatus[record.id] === 'saving'}
                          >
                            {saveStatus[record.id] === 'saving' && record.status === "absent" ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                          </Button>
                        </div>

                        {/* Save Status Indicator */}
                        {saveStatus[record.id] && (
                          <div className="flex items-center ml-2">
                            {saveStatus[record.id] === 'success' && (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            )}
                            {saveStatus[record.id] === 'error' && (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                          </div>
                        )}
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => router.push(`/coach-dashboard/students/${record.student_id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )
                ) : (
                  // Historical records view
                  loadingHistorical ? (
                    <div className="text-center py-8">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-yellow-600" />
                      <p className="mt-2 text-sm text-gray-600">Loading historical records...</p>
                    </div>
                  ) : historicalRecords.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Users className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-3 text-base font-medium text-gray-900">
                        {coachAssignments && coachAssignments.courses.length === 0
                          ? "No courses assigned"
                          : "No historical records found"}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
                        {coachAssignments && coachAssignments.courses.length === 0
                          ? "You do not have any courses assigned in this branch yet. Please contact your administrator."
                          : "No attendance records found for the selected date range. Try adjusting the dates or check if attendance was recorded during this period."}
                      </p>
                    </div>
                  ) : (
                    historicalRecords
                      .filter(record =>
                        searchTerm === "" ||
                        record.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        record.course_name.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((record) => (
                        <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4">
                              <div>
                                <h3 className="font-medium text-gray-900">{record.student_name}</h3>
                                <p className="text-sm text-gray-600">{record.course_name}</p>
                                <p className="text-xs text-gray-500">{record.date}</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                            {record.check_in_time && (
                              <div className="text-center">
                                <p className="text-xs text-gray-500">Check In</p>
                                <p className="text-sm font-medium">{record.check_in_time}</p>
                              </div>
                            )}

                            {record.check_out_time && (
                              <div className="text-center">
                                <p className="text-xs text-gray-500">Check Out</p>
                                <p className="text-sm font-medium">{record.check_out_time}</p>
                              </div>
                            )}

                            <div className="flex items-center space-x-2">
                              {getStatusBadge(record.status)}
                            </div>

                            {record.notes && (
                              <div className="text-center max-w-32">
                                <p className="text-xs text-gray-500">Notes</p>
                                <p className="text-sm text-gray-700 truncate" title={record.notes}>{record.notes}</p>
                              </div>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => router.push(`/coach-dashboard/students/${record.student_id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
