"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { format } from "date-fns"
import {
  CalendarIcon,
  Download,
  Search,
  Filter,
  Loader2,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { getBackendApiUrl } from "@/lib/config"
import { TokenManager } from "@/lib/tokenManager"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"

interface AttendanceReport {
  id: string
  student_id?: string
  student_name: string
  course_name: string
  branch_name: string
  attendance_date: string
  check_in_time?: string
  check_out_time?: string
  is_present: boolean
  status: string
  method: string
  notes?: string
}

interface ReportSummary {
  total: number
  present: number
  absent: number
  late: number
  biometric: number
}

interface BranchOption {
  id: string
  name: string
}

interface StudentOption {
  id: string
  full_name?: string
  first_name?: string
  last_name?: string
}

function authHeaders(): HeadersInit {
  const token = BranchManagerAuth.getToken() || TokenManager.getToken()
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
  }
}

function studentLabel(s: StudentOption) {
  return (
    s.full_name ||
    [s.first_name, s.last_name].filter(Boolean).join(" ") ||
    s.id
  )
}

function statusBadge(status: string) {
  const s = (status || "").toLowerCase()
  if (s === "present") return "bg-green-100 text-green-800 hover:bg-green-100"
  if (s === "late") return "bg-amber-100 text-amber-900 hover:bg-amber-100"
  if (s === "absent") return "bg-red-100 text-red-800 hover:bg-red-100"
  return "bg-slate-100 text-slate-700 hover:bg-slate-100"
}

export default function AttendanceReportsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const basePath = useDashboardBasePath()
  const isBranchAdmin = basePath.includes("branch-admin")

  const initialStudentId = searchParams.get("student_id") || "all"

  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [reports, setReports] = useState<AttendanceReport[]>([])
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  const [startDate, setStartDate] = useState<Date>(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  )
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [selectedStudent, setSelectedStudent] = useState(initialStudentId)
  const [selectedBranch, setSelectedBranch] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedMethod, setSelectedMethod] = useState("all")

  const [students, setStudents] = useState<StudentOption[]>([])
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [startOpen, setStartOpen] = useState(false)
  const [endOpen, setEndOpen] = useState(false)

  const getToken = () => BranchManagerAuth.getToken() || TokenManager.getToken()

  const loadLookups = useCallback(async () => {
    const token = getToken()
    if (!token) return
    try {
      const [studentsRes, branchesRes] = await Promise.all([
        fetch(getBackendApiUrl("students/search?limit=200"), {
          headers: authHeaders(),
          cache: "no-store",
        }),
        fetch(getBackendApiUrl("branches"), {
          headers: authHeaders(),
          cache: "no-store",
        }),
      ])
      if (studentsRes.ok) {
        const data = await studentsRes.json()
        setStudents(data.students || data || [])
      }
      if (branchesRes.ok) {
        const data = await branchesRes.json()
        const list = (data.branches || data || []).map((b: any) => ({
          id: b.id,
          name: b.name || b.branch?.name || b.code || b.id,
        }))
        setBranches(list)
      }
    } catch {
      /* optional */
    }
  }, [])

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams()
    params.set("start_date", format(startDate, "yyyy-MM-dd"))
    params.set("end_date", format(endDate, "yyyy-MM-dd"))
    if (selectedStudent !== "all") params.set("student_id", selectedStudent)
    if (selectedBranch !== "all") params.set("branch_id", selectedBranch)
    if (selectedStatus !== "all") params.set("status", selectedStatus)
    if (selectedMethod !== "all") params.set("method", selectedMethod)
    return params
  }, [
    startDate,
    endDate,
    selectedStudent,
    selectedBranch,
    selectedStatus,
    selectedMethod,
  ])

  const fetchReports = useCallback(async () => {
    const token = getToken()
    if (!token) {
      router.push(isBranchAdmin ? "/branch-manager/login" : "/superadmin/login")
      return
    }
    try {
      setLoading(true)
      const params = buildQuery()
      const res = await fetch(
        getBackendApiUrl(`attendance/reports?${params.toString()}`),
        { headers: authHeaders(), cache: "no-store" }
      )
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Failed (${res.status})`)
      }
      const data = await res.json()
      setReports(data.attendance_records || [])
      setSummary(data.summary || null)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load attendance reports"
      )
      setReports([])
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [buildQuery, isBranchAdmin, router])

  useEffect(() => {
    loadLookups()
  }, [loadLookups])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return reports
    const q = searchTerm.toLowerCase()
    return reports.filter(
      (r) =>
        (r.student_name || "").toLowerCase().includes(q) ||
        (r.course_name || "").toLowerCase().includes(q) ||
        (r.branch_name || "").toLowerCase().includes(q)
    )
  }, [reports, searchTerm])

  const downloadExport = async (fmt: "csv" | "excel") => {
    try {
      setExporting(true)
      const params = buildQuery()
      params.set("format", fmt)
      const res = await fetch(
        getBackendApiUrl(`attendance/export?${params.toString()}`),
        { headers: authHeaders(), cache: "no-store" }
      )
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Export failed (${res.status})`)
      }
      const data = await res.json()
      const blob = new Blob([data.content || ""], {
        type: data.content_type || "text/csv",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download =
        data.filename ||
        `attendance_report_${format(new Date(), "yyyyMMdd")}.${fmt === "excel" ? "xls" : "csv"}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("Report exported")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed")
    } finally {
      setExporting(false)
    }
  }

  return (
    <main className="w-full p-4 lg:px-8 mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Reports</h1>
          <p className="text-gray-600 text-sm mt-1">
            History by student, branch, date, status, and method (including biometric).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={fetchReports} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => downloadExport("csv")}
            disabled={exporting || loading}
          >
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => downloadExport("excel")}
            disabled={exporting || loading}
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 mr-1" />
            )}
            Excel
          </Button>
        </div>
      </div>

      {summary ? (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total", value: summary.total, className: "text-slate-900" },
            { label: "Present", value: summary.present, className: "text-green-700" },
            { label: "Absent", value: summary.absent, className: "text-red-700" },
            { label: "Late", value: summary.late, className: "text-amber-700" },
            {
              label: "Biometric",
              value: summary.biometric,
              className: "text-blue-700",
            },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-slate-500">{item.label}</p>
                <p className={`text-2xl font-semibold ${item.className}`}>{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Start date</label>
              <Popover open={startOpen} onOpenChange={setStartOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(startDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={(d) => {
                      if (d) setStartDate(d)
                      setStartOpen(false)
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">End date</label>
              <Popover open={endOpen} onOpenChange={setEndOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(endDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={endDate}
                    onSelect={(d) => {
                      if (d) setEndDate(d)
                      setEndOpen(false)
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Student</label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="All students" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All students</SelectItem>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {studentLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Branch</label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="All branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Method</label>
              <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="All methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All methods</SelectItem>
                  <SelectItem value="biometric">Biometric</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Search student, course, or branch…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={fetchReports}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Filter className="h-4 w-4 mr-1" />
              )}
              Apply filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Records{" "}
            <span className="text-slate-500 font-normal text-sm">
              ({filtered.length}
              {summary ? ` of ${summary.total}` : ""})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading attendance…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <XCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No attendance records for these filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 pr-3 font-medium">Student</th>
                    <th className="py-2 pr-3 font-medium">Course</th>
                    <th className="py-2 pr-3 font-medium">Branch</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Check-in</th>
                    <th className="py-2 pr-3 font-medium">Check-out</th>
                    <th className="py-2 font-medium">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr
                      key={r.id || `${r.student_id}-${r.attendance_date}`}
                      className="border-b last:border-0"
                    >
                      <td className="py-2.5 pr-3 whitespace-nowrap">
                        {r.attendance_date
                          ? format(new Date(r.attendance_date), "dd MMM yyyy")
                          : "—"}
                      </td>
                      <td className="py-2.5 pr-3">
                        {r.student_id ? (
                          <button
                            type="button"
                            className="text-blue-700 hover:underline text-left"
                            onClick={() =>
                              router.push(
                                `${basePath}/attendance/student-detail/${r.student_id}`
                              )
                            }
                          >
                            {r.student_name || "—"}
                          </button>
                        ) : (
                          r.student_name || "—"
                        )}
                      </td>
                      <td className="py-2.5 pr-3">{r.course_name || "—"}</td>
                      <td className="py-2.5 pr-3">{r.branch_name || "—"}</td>
                      <td className="py-2.5 pr-3">
                        <Badge className={statusBadge(r.status)}>
                          {(r.status || "unknown").replace(/^\w/, (c) => c.toUpperCase())}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap">
                        {r.check_in_time
                          ? format(new Date(r.check_in_time), "hh:mm a")
                          : "—"}
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap">
                        {r.check_out_time
                          ? format(new Date(r.check_out_time), "hh:mm a")
                          : "—"}
                      </td>
                      <td className="py-2.5">
                        <span className="inline-flex items-center gap-1">
                          {(r.method || "").toLowerCase().includes("biometric") ? (
                            <CheckCircle className="h-3.5 w-3.5 text-blue-600" />
                          ) : null}
                          {r.method || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
