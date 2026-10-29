"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { format } from "date-fns"
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
  Calendar,
  CalendarIcon,
  Download,
  Search,
  Filter,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  FileText,
  TrendingUp,
  MapPin,
  BookOpen,
  User,
  MessageCircle,
  Phone,
  Award
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import DashboardHeader from "@/components/dashboard-header"
import { checkAuth, getAuthHeaders } from "@/lib/auth"
import { formatTimeIST } from "@/lib/formatRegisteredDate"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { TokenManager } from "@/lib/tokenManager"

function getCoachAttendanceHeaders(): Record<string, string> | null {
  if (checkAuth().isAuthenticated) return getAuthHeaders()
  const token = BranchManagerAuth.getToken() || TokenManager.getToken()
  if (!token) return null
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
}

function isCoachAttendanceAuthenticated(): boolean {
  return !!getCoachAttendanceHeaders()
}

interface CoachAttendanceRecord {
  id: string
  coach_id: string
  coach_name: string
  email: string
  phone?: string
  expertise?: string
  branch_id: string
  branch_name: string
  status: "present" | "absent" | "late" | "not_marked"
  check_in_time?: string
  check_out_time?: string
  notes?: string
  date: string
  date_of_join?: string
}

interface CoachAttendanceStats {
  total_coaches: number
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

export default function SuperAdminCoachAttendancePage() {
  const router = useRouter()
  const pathname = usePathname()
  const usesDashboardLayoutNav =
    !!pathname &&
    (pathname.startsWith("/super-admin/dashboard") ||
      pathname.startsWith("/branch-admin/dashboard") ||
      pathname.startsWith("/branch-manager-dashboard/"))

  // Enhanced state management
  const [attendanceRecords, setAttendanceRecords] = useState<CoachAttendanceRecord[]>([])
  const [attendanceStats, setAttendanceStats] = useState<CoachAttendanceStats>({
    total_coaches: 0,
    present_today: 0,
    absent_today: 0,
    late_today: 0,
    not_marked_today: 0,
    attendance_rate: 0
  })
  const [branches, setBranches] = useState<Branch[]>([])

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Filter state
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedBranch, setSelectedBranch] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")

  // Saving state for individual records
  const [saveStatus, setSaveStatus] = useState<Record<string, 'idle' | 'saving' | 'success' | 'error'>>({})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  /** Reason required when changing an already-marked coach attendance status */
  const [correctionDraft, setCorrectionDraft] = useState<{
    recordId: string
    status: "present" | "absent" | "late"
  } | null>(null)
  const [correctionReason, setCorrectionReason] = useState("")
  const [correctionSubmitting, setCorrectionSubmitting] = useState(false)

  // Filter attendance records based on search and filters
  const filteredRecords = attendanceRecords.filter(record => {
    const matchesSearch = record.coach_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.expertise && record.expertise.toLowerCase().includes(searchTerm.toLowerCase())) ||
      record.branch_name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesBranch = selectedBranch === "all" || record.branch_id === selectedBranch
    const matchesStatus = selectedStatus === "all" || record.status === selectedStatus

    return matchesSearch && matchesBranch && matchesStatus
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
      if (!isCoachAttendanceAuthenticated()) return

      const headers = getCoachAttendanceHeaders()
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

  // Fetch coach attendance data for selected date
  const fetchCoachAttendanceData = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!isCoachAttendanceAuthenticated()) {
        setError("Authentication required")
        return
      }

      const headers = getCoachAttendanceHeaders()
      if (!headers) {
        setError("Authentication required")
        return
      }
      const dateStr = format(selectedDate, 'yyyy-MM-dd')

      console.log(`🔄 Superadmin fetching coach attendance data for date: ${dateStr}`)

      // Fetch all coaches first
      const coachesResponse = await fetch('/api/backend/coaches', {
        method: 'GET',
        headers
      })

      if (coachesResponse.ok) {
        const coachesData = await coachesResponse.json()
        console.log("✅ Coaches data received:", coachesData)

        const records: CoachAttendanceRecord[] = (coachesData.coaches || []).map((coach: any) => {
          return {
            id: `${coach.id}_${dateStr}`,
            coach_id: coach.id,
            coach_name: coach.full_name || 'Unknown Coach',
            email: coach.email || '',
            phone: coach.phone || '',
            expertise: coach.expertise || 'General',
            branch_id: coach.branch_id || '',
            branch_name: branches.find(b => b.id === coach.branch_id)?.name || 'Unknown Branch',
            status: "not_marked", // Default status - we'll fetch actual attendance separately
            check_in_time: undefined,
            check_out_time: undefined,
            notes: "",
            date: dateStr,
            date_of_join: coach.date_of_join
          }
        })

        // Now try to fetch actual attendance data for coaches
        try {
          const attendanceResponse = await fetch(`/api/backend/attendance/coaches?date=${dateStr}`, {
            method: 'GET',
            headers
          })

          if (attendanceResponse.ok) {
            const attendanceData = await attendanceResponse.json()
            console.log("✅ Coach attendance data received:", attendanceData)

            // Update records with actual attendance data
            const updatedRecords = records.map(record => {
              const attendanceRecord = (attendanceData.coaches || []).find((a: any) =>
                a.coach_id === record.coach_id || a.id === record.coach_id
              )

              if (attendanceRecord && attendanceRecord.attendance) {
                return {
                  ...record,
                  status: attendanceRecord.attendance.status || "not_marked",
                  check_in_time: attendanceRecord.attendance.check_in_time
                    ? formatTimeIST(
                        typeof attendanceRecord.attendance.check_in_time === "string"
                          ? attendanceRecord.attendance.check_in_time
                          : new Date(attendanceRecord.attendance.check_in_time).toISOString()
                      )
                    : undefined,
                  check_out_time: attendanceRecord.attendance.check_out_time
                    ? formatTimeIST(
                        typeof attendanceRecord.attendance.check_out_time === "string"
                          ? attendanceRecord.attendance.check_out_time
                          : new Date(attendanceRecord.attendance.check_out_time).toISOString()
                      )
                    : undefined,
                  notes: attendanceRecord.attendance.notes || ""
                }
              }
              return record
            })

            setAttendanceRecords(updatedRecords)
          } else {
            console.warn("No attendance endpoint for coaches, using coach list only")
            setAttendanceRecords(records)
          }
        } catch (attendanceError) {
          console.warn("Failed to fetch coach attendance, using coach list only:", attendanceError)
          setAttendanceRecords(records)
        }

        // Calculate statistics
        const stats = {
          total_coaches: records.length,
          present_today: records.filter(r => r.status === "present").length,
          absent_today: records.filter(r => r.status === "absent").length,
          late_today: records.filter(r => r.status === "late").length,
          not_marked_today: records.filter(r => r.status === "not_marked").length,
          attendance_rate: records.length > 0 ?
            (records.filter(r => r.status === "present" || r.status === "late").length / records.length) * 100 : 0
        }

        setAttendanceStats(stats)
        console.log("📊 Calculated coach stats:", stats)

      } else {
        const errorText = await coachesResponse.text()
        console.error("❌ Failed to fetch coaches data:", coachesResponse.status, errorText)
        setError(`Failed to fetch coaches data: ${coachesResponse.status}`)
      }

    } catch (error) {
      console.error("❌ Error fetching coach attendance data:", error)
      setError("Failed to load coach attendance data. Please check your connection and try again.")
      setAttendanceRecords([])
      setAttendanceStats({
        total_coaches: 0,
        present_today: 0,
        absent_today: 0,
        late_today: 0,
        not_marked_today: 0,
        attendance_rate: 0
      })
    } finally {
      setLoading(false)
    }
  }

  const isAttendanceStatusFinal = (s: string) =>
    s === "present" || s === "late" || s === "absent"

  // Handle coach attendance marking
  const handleMarkAttendance = async (
    recordId: string,
    status: "present" | "absent" | "late",
    options?: { correctionReason?: string }
  ): Promise<boolean> => {
    try {
      setSaveStatus(prev => ({ ...prev, [recordId]: 'saving' }))

      console.log("🔄 Superadmin marking coach attendance for record:", recordId, "status:", status)

      if (!isCoachAttendanceAuthenticated()) {
        setSaveStatus(prev => ({ ...prev, [recordId]: 'error' }))
        setError("Authentication required")
        return false
      }

      const record = attendanceRecords.find(r => r.id === recordId)
      if (!record) {
        setSaveStatus(prev => ({ ...prev, [recordId]: 'error' }))
        setError("Coach attendance record not found")
        return false
      }

      // Already marked → ask for a reason before changing (first-time mark skips this)
      if (isAttendanceStatusFinal(record.status) && !options?.correctionReason) {
        setSaveStatus(prev => ({ ...prev, [recordId]: 'idle' }))
        if (record.status === status) return true
        setCorrectionDraft({ recordId, status })
        setCorrectionReason("")
        return true
      }

      const headers = getCoachAttendanceHeaders()
      if (!headers) {
        setSaveStatus(prev => ({ ...prev, [recordId]: 'error' }))
        setError("Authentication required")
        return false
      }

      const checkIso = new Date().toISOString()
      const reason = options?.correctionReason?.trim()
      const attendanceData = {
        user_id: record.coach_id,
        user_type: "coach",
        branch_id: record.branch_id,
        attendance_date: `${record.date}T10:00:00Z`,
        status: status,
        check_in_time: status !== "absent" ? checkIso : null,
        notes: reason
          ? `Corrected by admin on ${format(new Date(), 'PPP')}. Reason: ${reason}`
          : `Marked by superadmin on ${format(new Date(), 'PPP')}`
      }

      console.log(`💾 Saving coach attendance for ${record.coach_name} with status: ${status}`)

      const response = await fetch(`/api/backend/attendance/mark`, {
        method: 'POST',
        headers,
        body: JSON.stringify(attendanceData)
      })

      if (response.ok) {
        console.log(`✅ Successfully saved coach attendance for ${record.coach_name}`)

        setSaveStatus(prev => ({ ...prev, [recordId]: 'success' }))
        setSuccessMessage(
          reason
            ? `Attendance corrected to ${status} for coach ${record.coach_name}`
            : `Attendance marked as ${status} for coach ${record.coach_name}`
        )

        // Update local state
        setAttendanceRecords(prev =>
          prev.map(r =>
            r.id === recordId
              ? {
                  ...r,
                  status: status,
                  check_in_time: status !== "absent" ? formatTimeIST(new Date()) : undefined,
                  notes: attendanceData.notes
                }
              : r
          )
        )

        // Update statistics
        setAttendanceStats(() => {
          const updatedRecords = attendanceRecords.map(r =>
            r.id === recordId ? { ...r, status } : r
          )

          return {
            total_coaches: updatedRecords.length,
            present_today: updatedRecords.filter(r => r.status === "present").length,
            absent_today: updatedRecords.filter(r => r.status === "absent").length,
            late_today: updatedRecords.filter(r => r.status === "late").length,
            not_marked_today: updatedRecords.filter(r => r.status === "not_marked").length,
            attendance_rate: updatedRecords.length > 0 ?
              (updatedRecords.filter(r => r.status === "present" || r.status === "late").length / updatedRecords.length) * 100 : 0
          }
        })

        // Clear success status after delay
        setTimeout(() => {
          setSaveStatus(prev => ({ ...prev, [recordId]: 'idle' }))
        }, 2000)

        return true
      }

      const errorText = await response.text()
      console.warn(`❌ Failed to save coach attendance for ${record.coach_name}: ${response.status} ${errorText}`)
      setSaveStatus(prev => ({ ...prev, [recordId]: 'error' }))
      setError(`Failed to save coach attendance: ${response.status}`)
      return false
    } catch (error) {
      console.error("❌ Error marking coach attendance:", error)
      setSaveStatus(prev => ({ ...prev, [recordId]: 'error' }))
      setError("Failed to mark coach attendance. Please try again.")
      return false
    }
  }

  const submitCoachAttendanceCorrection = async () => {
    if (!correctionDraft) return
    const reason = correctionReason.trim()
    if (reason.length < 3) {
      setError("Enter at least 3 characters explaining this correction.")
      return
    }
    const { recordId, status } = correctionDraft
    setCorrectionSubmitting(true)
    try {
      const ok = await handleMarkAttendance(recordId, status, { correctionReason: reason })
      if (ok) {
        setCorrectionDraft(null)
        setCorrectionReason("")
      }
    } finally {
      setCorrectionSubmitting(false)
    }
  }

  const isCoachStatusButtonDisabled = (
    record: CoachAttendanceRecord,
    _role: "present" | "late" | "absent"
  ) => {
    // Keep all actions available so already-marked status can be corrected (with reason).
    return saveStatus[record.id] === "saving" || correctionSubmitting
  }

  // Load initial data
  useEffect(() => {
    fetchBranches()
  }, [])

  // Fetch attendance data when date changes
  useEffect(() => {
    if (branches.length > 0) {
      fetchCoachAttendanceData()
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
      ['Coach Name', 'Email', 'Phone', 'Expertise', 'Branch', 'Status', 'Check In Time', 'Notes', 'Date'].join(','),
      ...filteredRecords.map(record => [
        record.coach_name,
        record.email,
        record.phone || '',
        record.expertise || '',
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
    link.download = `coach_attendance_${format(selectedDate, 'yyyy-MM-dd')}.csv`
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Coach Attendance Management</h1>
          <p className="text-gray-600">Manage coach attendance across all branches</p>
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
                  <p className="text-sm font-medium text-gray-600">Total Coaches</p>
                  <p className="text-2xl font-bold text-gray-900">{attendanceStats.total_coaches}</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                    placeholder="Search coaches..."
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
                    onClick={fetchCoachAttendanceData}
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

        {/* Main Content: full-width table, then three analytics cards */}
        <div className="space-y-8">
            <Card className="w-full shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Coach Attendance ({filteredRecords.length} coaches)</span>
                  <div className="text-sm text-gray-500">
                    {format(selectedDate, "EEEE, MMMM d, yyyy")}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center items-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-3 text-gray-600">Loading coach attendance data...</span>
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No coaches found</h3>
                    <p className="text-gray-500">
                      {attendanceRecords.length === 0
                        ? "No coaches available for the selected date."
                        : "No coaches match your current filters."}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Coach
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Expertise
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Branch
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Check In
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredRecords.map((record) => (
                          <tr key={record.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                    <User className="h-5 w-5 text-gray-600" />
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {record.coach_name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {record.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <Award className="h-4 w-4 text-gray-400 mr-2" />
                                <span className="text-sm text-gray-900">{record.expertise}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                                <span className="text-sm text-gray-900">{record.branch_name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {getStatusIcon(record.status)}
                                <span className="ml-2">{getStatusBadge(record.status)}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.check_in_time || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                <Button
                                  onClick={() => handleMarkAttendance(record.id, "present")}
                                  size="sm"
                                  variant={record.status === "present" ? "default" : "outline"}
                                  className="text-xs"
                                  disabled={isCoachStatusButtonDisabled(record, "present")}
                                >
                                  Present
                                </Button>
                                <Button
                                  onClick={() => handleMarkAttendance(record.id, "absent")}
                                  size="sm"
                                  variant={record.status === "absent" ? "default" : "outline"}
                                  className="text-xs"
                                  disabled={isCoachStatusButtonDisabled(record, "absent")}
                                >
                                  Absent
                                </Button>
                                {getSaveStatusIcon(record.id)}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
              This coach is already marked for the day. Confirm and enter a reason to change it.
              First-time marking does not need this step.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-600">
              {correctionDraft
                ? (() => {
                    const current = attendanceRecords.find(
                      (r) => r.id === correctionDraft.recordId
                    )
                    return `Change ${current?.coach_name || "coach"} from “${
                      current?.status || "marked"
                    }” to “${correctionDraft.status}”.`
                  })()
                : null}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="coach-correction-reason">Reason</Label>
              <Textarea
                id="coach-correction-reason"
                rows={3}
                placeholder="e.g. Coach arrived late; status marked incorrectly"
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
              onClick={() => void submitCoachAttendanceCorrection()}
            >
              {correctionSubmitting ? "Saving…" : "Save correction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
