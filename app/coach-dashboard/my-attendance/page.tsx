"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { format, parseISO } from "date-fns"
import {
  Calendar,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Search,
  RefreshCw,
  Download,
  Filter,
  UserCheck,
  Building2,
  FileText,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import CoachDashboardHeader from "@/components/coach-dashboard-header"
import { checkCoachAuth, CoachData } from "@/lib/coachAuth"
import { getBackendApiUrl } from "@/lib/config"

interface AttendanceRecord {
  id: string
  attendance_date: string
  day_name?: string
  status: "present" | "absent"
  is_present: boolean
  check_in_time?: string | null
  check_out_time?: string | null
  raw_check_in?: string | null
  raw_check_out?: string | null
  method: string
  notes?: string
  marked_by?: string | null
  marked_by_name?: string | null
  marked_by_role?: string | null
  branch_id?: string | null
  branch_name?: string | null
  created_at?: string | null
  updated_at?: string | null
}

interface AttendanceSummary {
  total_days: number
  present_days: number
  absent_days: number
  attendance_rate: number
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

export default function CoachMyAttendancePage() {
  const router = useRouter()
  const [coachData, setCoachData] = useState<CoachData | null>(null)
  const [authToken, setAuthToken] = useState<string | null>(null)

  // Filter state
  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState<string>(String(currentDate.getMonth() + 1))
  const [selectedYear, setSelectedYear] = useState<string>(String(currentDate.getFullYear()))
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")

  // Data state
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [summary, setSummary] = useState<AttendanceSummary>({
    total_days: 0,
    present_days: 0,
    absent_days: 0,
    attendance_rate: 0,
  })
  const [coachInfo, setCoachInfo] = useState<{
    id?: string
    name?: string
    branch_name?: string
  }>({})

  // UI state
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Years options (last 3 years)
  const yearOptions = useMemo(() => {
    const y = currentDate.getFullYear()
    return [y, y - 1, y - 2].map(String)
  }, [])

  // Authentication check
  useEffect(() => {
    const auth = checkCoachAuth()
    if (!auth.isAuthenticated || !auth.coach) {
      router.push("/coach/login")
      return
    }
    setCoachData(auth.coach)
    setAuthToken(auth.token)
  }, [router])

  // Fetch attendance records from backend
  const fetchAttendance = useCallback(
    async (token: string, monthVal: string, yearVal: string) => {
      try {
        setError(null)
        const params = new URLSearchParams()

        if (monthVal !== "all") {
          params.append("month", monthVal)
        }
        if (yearVal !== "all") {
          params.append("year", yearVal)
        }

        const queryStr = params.toString() ? `?${params.toString()}` : ""
        const url = getBackendApiUrl(`attendance/coach/my-attendance${queryStr}`)

        const res = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })

        if (!res.ok) {
          if (res.status === 401) {
            router.push("/coach/login")
            return
          }
          throw new Error(`Failed to fetch attendance data (${res.status})`)
        }

        const data = await res.json()
        setRecords(data.records || [])
        setSummary(data.summary || {
          total_days: 0,
          present_days: 0,
          absent_days: 0,
          attendance_rate: 0,
        })
        if (data.coach) {
          setCoachInfo(data.coach)
        }
      } catch (err: any) {
        console.error("Error fetching coach attendance:", err)
        setError(err.message || "Failed to load attendance records")
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [router]
  )

  // Trigger fetch when auth ready or date filters change
  useEffect(() => {
    if (authToken) {
      setLoading(true)
      fetchAttendance(authToken, selectedMonth, selectedYear)
    }
  }, [authToken, selectedMonth, selectedYear, fetchAttendance])

  const handleRefresh = () => {
    if (authToken) {
      setRefreshing(true)
      fetchAttendance(authToken, selectedMonth, selectedYear)
    }
  }

  // Filter records by status and search query
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      // Status filter
      if (selectedStatus !== "all" && rec.status !== selectedStatus) {
        return false
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const dateMatch = rec.attendance_date?.toLowerCase().includes(q)
        const dayMatch = rec.day_name?.toLowerCase().includes(q)
        const markerMatch = rec.marked_by_name?.toLowerCase().includes(q)
        const roleMatch = rec.marked_by_role?.toLowerCase().includes(q)
        const branchMatch = rec.branch_name?.toLowerCase().includes(q)
        const notesMatch = rec.notes?.toLowerCase().includes(q)
        const methodMatch = rec.method?.toLowerCase().includes(q)
        return (
          dateMatch ||
          dayMatch ||
          markerMatch ||
          roleMatch ||
          branchMatch ||
          notesMatch ||
          methodMatch
        )
      }

      return true
    })
  }, [records, selectedStatus, searchQuery])

  // Export records to CSV
  const handleExportCSV = () => {
    if (!filteredRecords.length) return

    const headers = [
      "Date",
      "Day",
      "Status",
      "Check In",
      "Check Out",
      "Marked By",
      "Role",
      "Branch",
      "Method",
      "Notes",
    ]

    const csvRows = [headers.join(",")]

    filteredRecords.forEach((r) => {
      const row = [
        `"${r.attendance_date || ""}"`,
        `"${r.day_name || ""}"`,
        `"${r.status || ""}"`,
        `"${r.check_in_time || "—"}"`,
        `"${r.check_out_time || "—"}"`,
        `"${r.marked_by_name || ""}"`,
        `"${r.marked_by_role || ""}"`,
        `"${r.branch_name || ""}"`,
        `"${r.method || "manual"}"`,
        `"${(r.notes || "").replace(/"/g, '""')}"`,
      ]
      csvRows.push(row.join(","))
    })

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `my-attendance-${selectedYear}-${selectedMonth}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Helper for status badge styling
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-semibold px-2.5 py-0.5 flex items-center gap-1.5 w-fit">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Present</span>
          </Badge>
        )
      case "late":
        return (
          <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 font-semibold px-2.5 py-0.5 flex items-center gap-1.5 w-fit">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Late</span>
          </Badge>
        )
      case "absent":
        return (
          <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-semibold px-2.5 py-0.5 flex items-center gap-1.5 w-fit">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Absent</span>
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-gray-600">
            {status}
          </Badge>
        )
    }
  }

  // Format date readable
  const formatReadableDate = (dateStr: string) => {
    try {
      const parsed = parseISO(dateStr)
      return format(parsed, "dd MMM yyyy")
    } catch {
      return dateStr
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <CoachDashboardHeader
        currentPage="My Attendance"
        coachName={coachData?.full_name || "Coach"}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Page Title & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-gray-200/80">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-yellow-100/70 text-yellow-800 rounded-xl">
                <CalendarCheck className="w-6 h-6 text-[#FFB70F]" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                  My Attendance
                </h1>
                <p className="text-sm text-gray-600 mt-0.5">
                  View your attendance records marked by Super Admin and Branch Managers
                </p>
              </div>
            </div>
          </div>

          {/* Month / Year Selectors & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[140px] bg-white border-gray-200 shadow-xs h-9 text-xs sm:text-sm font-medium">
                <SelectValue placeholder="Select Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {MONTH_NAMES.map((name, idx) => (
                  <SelectItem key={idx + 1} value={String(idx + 1)}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[105px] bg-white border-gray-200 shadow-xs h-9 text-xs sm:text-sm font-medium">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-9 px-3 bg-white hover:bg-gray-50 border-gray-200 text-gray-700 shadow-xs"
              title="Refresh attendance records"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={filteredRecords.length === 0}
              className="h-9 px-3 bg-white hover:bg-gray-50 border-gray-200 text-gray-700 shadow-xs"
              title="Export to CSV"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800 text-sm">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Unable to load attendance records</p>
              <p className="text-red-700 text-xs mt-0.5">{error}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              className="h-8 border-red-300 text-red-700 hover:bg-red-100"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Top Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Days */}
          <Card className="border-gray-200/80 shadow-xs hover:shadow-md transition-shadow bg-white">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Total Logged</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                    {loading ? "..." : summary.total_days}
                  </p>
                </div>
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-2">
                Marked working sessions
              </p>
            </CardContent>
          </Card>

          {/* Present */}
          <Card className="border-gray-200/80 shadow-xs hover:shadow-md transition-shadow bg-white">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-emerald-600">Present</p>
                  <p className="text-2xl sm:text-3xl font-bold text-emerald-700 mt-1">
                    {loading ? "..." : summary.present_days}
                  </p>
                </div>
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] sm:text-xs text-emerald-600/80 mt-2 font-medium">
                Full session attended
              </p>
            </CardContent>
          </Card>

          {/* Absent */}
          <Card className="border-gray-200/80 shadow-xs hover:shadow-md transition-shadow bg-white">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-rose-600">Absent</p>
                  <p className="text-2xl sm:text-3xl font-bold text-rose-700 mt-1">
                    {loading ? "..." : summary.absent_days}
                  </p>
                </div>
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                  <XCircle className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] sm:text-xs text-rose-600/80 mt-2 font-medium">
                Sessions missed
              </p>
            </CardContent>
          </Card>

          {/* Attendance Percentage */}
          <Card className="border-gray-200/80 shadow-xs hover:shadow-md transition-shadow bg-white">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Attendance Rate</p>
                  <p className="text-2xl sm:text-3xl font-bold text-[#FFB70F] mt-1">
                    {loading ? "..." : `${summary.attendance_rate}%`}
                  </p>
                </div>
                <div className="p-2.5 bg-yellow-50 text-[#FFB70F] rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
                <div
                  className="bg-[#FFB70F] h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, summary.attendance_rate))}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Pills & Search */}
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200/80 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedStatus("all")}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  selectedStatus === "all"
                    ? "bg-[#FFB70F] text-black shadow-xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                }`}
              >
                All ({records.length})
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus("present")}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  selectedStatus === "present"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Present ({summary.present_days})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus("absent")}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  selectedStatus === "absent"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Absent ({summary.absent_days})</span>
              </button>
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Search by date, admin, branch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs sm:text-sm bg-gray-50 border-gray-200 focus:bg-white transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Records Display */}
        <Card className="border-gray-200/80 shadow-xs bg-white overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base sm:text-lg font-bold text-gray-900">
                  Attendance Records
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  Showing {filteredRecords.length} {filteredRecords.length === 1 ? "record" : "records"} for{" "}
                  {selectedMonth === "all" ? "All Months" : MONTH_NAMES[parseInt(selectedMonth, 10) - 1]}{" "}
                  {selectedYear === "all" ? "" : selectedYear}
                </CardDescription>
              </div>

              {coachInfo?.branch_name && (
                <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-white px-3 py-1 rounded-full border border-gray-200 w-fit">
                  <Building2 className="w-3.5 h-3.5 text-gray-500" />
                  <span>Assigned Branch: <strong>{coachInfo.branch_name}</strong></span>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="py-16 text-center">
                <RefreshCw className="w-8 h-8 text-[#FFB70F] animate-spin mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-600">Loading attendance history...</p>
                <p className="text-xs text-gray-400 mt-1">Fetching records from management portal</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="py-16 px-4 text-center">
                <div className="w-14 h-14 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CalendarCheck className="w-7 h-7" />
                </div>
                <h3 className="text-base font-semibold text-gray-900">No attendance records found</h3>
                <p className="text-xs sm:text-sm text-gray-500 max-w-sm mx-auto mt-1">
                  {searchQuery || selectedStatus !== "all"
                    ? "Try adjusting your filters or search terms."
                    : "No attendance has been recorded for you for this selected period yet."}
                </p>
                {(searchQuery || selectedStatus !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedStatus("all")
                      setSearchQuery("")
                    }}
                    className="mt-4 text-xs"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50/75 text-gray-600 text-xs uppercase font-semibold border-b border-gray-200/70">
                      <tr>
                        <th className="py-3 px-4">Date & Day</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Timings</th>
                        <th className="py-3 px-4">Marked By</th>
                        <th className="py-3 px-4">Branch</th>
                        <th className="py-3 px-4">Method</th>
                        <th className="py-3 px-4">Remarks / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredRecords.map((rec) => (
                        <tr key={rec.id} className="hover:bg-gray-50/60 transition-colors">
                          {/* Date & Day */}
                          <td className="py-3.5 px-4 font-medium text-gray-900">
                            <div className="font-semibold text-gray-900">
                              {formatReadableDate(rec.attendance_date)}
                            </div>
                            <div className="text-xs text-gray-500">{rec.day_name || "—"}</div>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4">
                            {renderStatusBadge(rec.status)}
                          </td>

                          {/* Timings */}
                          <td className="py-3.5 px-4">
                            {rec.status === "absent" ? (
                              <span className="text-xs text-gray-400 italic">No timings (Absent)</span>
                            ) : (
                              <div className="space-y-0.5">
                                <div className="text-xs text-gray-800 flex items-center gap-1.5">
                                  <span className="text-[11px] font-semibold text-gray-500 uppercase">In:</span>
                                  <span className="font-medium">{rec.check_in_time || "—"}</span>
                                </div>
                                {rec.check_out_time && (
                                  <div className="text-xs text-gray-800 flex items-center gap-1.5">
                                    <span className="text-[11px] font-semibold text-gray-500 uppercase">Out:</span>
                                    <span className="font-medium">{rec.check_out_time}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Marked By */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-yellow-100/80 text-yellow-800 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                <UserCheck className="w-3.5 h-3.5 text-yellow-700" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-gray-900 truncate text-xs sm:text-sm">
                                  {rec.marked_by_name || "Management"}
                                </div>
                                <span className="inline-block text-[10px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded border border-gray-200">
                                  {rec.marked_by_role || "Admin"}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Branch */}
                          <td className="py-3.5 px-4">
                            <span className="text-xs text-gray-700 flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <span className="truncate">{rec.branch_name || "Main Branch"}</span>
                            </span>
                          </td>

                          {/* Method */}
                          <td className="py-3.5 px-4">
                            <Badge
                              variant="outline"
                              className="text-[11px] uppercase tracking-wider text-gray-600 bg-gray-50 font-medium"
                            >
                              {rec.method || "manual"}
                            </Badge>
                          </td>

                          {/* Notes */}
                          <td className="py-3.5 px-4 text-xs text-gray-600 max-w-xs">
                            {rec.notes ? (
                              <div className="flex items-start gap-1">
                                <FileText className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                                <span className="truncate" title={rec.notes}>
                                  {rec.notes}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card List View */}
                <div className="md:hidden divide-y divide-gray-100">
                  {filteredRecords.map((rec) => (
                    <div key={rec.id} className="p-4 space-y-3 hover:bg-gray-50/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-gray-900 text-sm">
                            {formatReadableDate(rec.attendance_date)}
                          </div>
                          <div className="text-xs text-gray-500">{rec.day_name || "—"}</div>
                        </div>
                        {renderStatusBadge(rec.status)}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                        <div>
                          <span className="text-gray-500 font-medium block">Check-in:</span>
                          <span className="text-gray-800 font-semibold">{rec.check_in_time || "—"}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 font-medium block">Check-out:</span>
                          <span className="text-gray-800 font-semibold">{rec.check_out_time || "—"}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <UserCheck className="w-3.5 h-3.5 text-yellow-600" />
                          <span>
                            {rec.marked_by_name || "Management"} ({rec.marked_by_role || "Admin"})
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {rec.method || "manual"}
                        </Badge>
                      </div>

                      {rec.notes && (
                        <p className="text-xs text-gray-600 bg-amber-50/50 border border-amber-100 p-2 rounded-md">
                          <strong>Note:</strong> {rec.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Information Callout */}
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-700 mt-0.5 flex-shrink-0" />
          <div className="text-xs sm:text-sm text-amber-900 leading-relaxed">
            <p className="font-semibold text-amber-950">How is coach attendance tracked?</p>
            <p className="mt-0.5 text-amber-800">
              Your daily attendance is recorded and managed by your Branch Manager or the Super Admin. If you notice any discrepancy or missed attendance punch, please get in touch with your branch management or administrator.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

