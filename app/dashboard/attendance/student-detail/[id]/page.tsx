"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, usePathname, useRouter } from "next/navigation"
import { format, subDays } from "date-fns"
import {
  ArrowLeft,
  CalendarIcon,
  Download,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { toast } from "sonner"
import { getBackendApiUrl } from "@/lib/config"
import { TokenManager } from "@/lib/tokenManager"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"

interface AttendanceRow {
  id: string
  attendance_date: string
  course_name?: string
  branch_name?: string
  status?: string
  is_present?: boolean
  check_in_time?: string
  check_out_time?: string
  method?: string
  notes?: string
}

function authHeaders(): HeadersInit {
  const token = BranchManagerAuth.getToken() || TokenManager.getToken()
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
  }
}

function resolveStatus(row: AttendanceRow) {
  const s = String(row.status || "").toLowerCase()
  if (s === "present" || s === "absent" || s === "late") return s
  return row.is_present ? "present" : "absent"
}

export default function StudentAttendanceDetailPage() {
  const router = useRouter()
  const params = useParams()
  const pathname = usePathname() ?? ""
  const adminBase = useDashboardBasePath()
  const basePath = pathname.startsWith("/branch-manager-dashboard")
    ? "/branch-manager-dashboard"
    : adminBase
  const studentId = String(params?.id || "")

  const [loading, setLoading] = useState(true)
  const [studentName, setStudentName] = useState("Student")
  const [rows, setRows] = useState<AttendanceRow[]>([])
  const [corrections, setCorrections] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState("all")
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30))
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [startOpen, setStartOpen] = useState(false)
  const [endOpen, setEndOpen] = useState(false)

  const load = useCallback(async () => {
    if (!studentId) return
    const token = BranchManagerAuth.getToken() || TokenManager.getToken()
    if (!token) {
      router.push("/login")
      return
    }
    try {
      setLoading(true)
      const paramsQs = new URLSearchParams({
        student_id: studentId,
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
      })
      if (statusFilter !== "all") paramsQs.set("status", statusFilter)

      const [reportsRes, studentRes, corrRes] = await Promise.all([
        fetch(getBackendApiUrl(`attendance/reports?${paramsQs.toString()}`), {
          headers: authHeaders(),
          cache: "no-store",
        }),
        fetch(getBackendApiUrl(`users/${studentId}`), {
          headers: authHeaders(),
          cache: "no-store",
        }).catch(() => null),
        fetch(
          getBackendApiUrl(
            `attendance/corrections?student_id=${encodeURIComponent(studentId)}&limit=20`
          ),
          { headers: authHeaders(), cache: "no-store" }
        ).catch(() => null),
      ])

      if (!reportsRes.ok) {
        const text = await reportsRes.text()
        throw new Error(text || `Failed (${reportsRes.status})`)
      }
      const data = await reportsRes.json()
      setRows(data.attendance_records || [])

      if (corrRes && corrRes.ok) {
        const cdata = await corrRes.json()
        setCorrections(cdata.corrections || [])
      } else {
        setCorrections([])
      }

      if (studentRes && studentRes.ok) {
        const user = await studentRes.json()
        const u = user.user || user
        setStudentName(
          u.full_name ||
            [u.first_name, u.last_name].filter(Boolean).join(" ") ||
            "Student"
        )
      } else if ((data.attendance_records || [])[0]?.student_name) {
        setStudentName(data.attendance_records[0].student_name)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load history")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [studentId, startDate, endDate, statusFilter, router])

  useEffect(() => {
    load()
  }, [load])

  const counts = useMemo(() => {
    let present = 0
    let absent = 0
    let late = 0
    for (const r of rows) {
      const s = resolveStatus(r)
      if (s === "present") present += 1
      else if (s === "absent") absent += 1
      else if (s === "late") late += 1
    }
    const total = rows.length
    const pct = total ? Math.round((present / total) * 1000) / 10 : 0
    return { present, absent, late, total, pct }
  }, [rows])

  const exportCsv = () => {
    const headers = [
      "Date",
      "Course",
      "Branch",
      "Status",
      "Check-in",
      "Check-out",
      "Method",
      "Notes",
    ]
    const lines = rows.map((r) =>
      [
        r.attendance_date,
        r.course_name,
        r.branch_name,
        resolveStatus(r),
        r.check_in_time,
        r.check_out_time,
        r.method,
        r.notes,
      ]
        .map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
    const blob = new Blob([[headers.join(","), ...lines].join("\n")], {
      type: "text/csv",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `student_attendance_${studentId}_${format(new Date(), "yyyyMMdd")}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="w-full p-4 lg:px-8 mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Button
            variant="ghost"
            className="mb-2 -ml-2 text-slate-600"
            onClick={() => router.push(`${basePath}/attendance/reports`)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to reports
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">{studentName}</h1>
          <p className="text-sm text-gray-600">Attendance history</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() =>
              router.push(
                `${basePath}/attendance/reports?student_id=${encodeURIComponent(studentId)}`
              )
            }
          >
            Open in reports
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500">Records</p>
            <p className="text-2xl font-semibold">{counts.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500">Present</p>
            <p className="text-2xl font-semibold text-green-700">{counts.present}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500">Absent / Late</p>
            <p className="text-2xl font-semibold text-amber-700">
              {counts.absent + counts.late}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500">Attendance %</p>
            <p className="text-2xl font-semibold text-blue-700">{counts.pct}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Popover open={startOpen} onOpenChange={setStartOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start font-normal">
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
          <Popover open={endOpen} onOpenChange={setEndOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start font-normal">
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="present">Present</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
              <SelectItem value="late">Late</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading…
            </div>
          ) : rows.length === 0 ? (
            <p className="text-center py-12 text-slate-500">
              No attendance records in this date range.
            </p>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => {
                const st = resolveStatus(r)
                return (
                  <div
                    key={r.id || `${r.attendance_date}-${r.course_name}`}
                    className="rounded-lg border border-slate-100 px-3 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {r.attendance_date
                          ? format(new Date(r.attendance_date), "EEE, dd MMM yyyy")
                          : "—"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {r.course_name || "Course"} · {r.branch_name || "Branch"}
                        {r.method ? ` · ${r.method}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Badge
                        className={
                          st === "present"
                            ? "bg-green-100 text-green-800 hover:bg-green-100"
                            : st === "late"
                              ? "bg-amber-100 text-amber-900 hover:bg-amber-100"
                              : "bg-red-100 text-red-800 hover:bg-red-100"
                        }
                      >
                        {st}
                      </Badge>
                      <span className="text-slate-600">
                        {r.check_in_time
                          ? format(new Date(r.check_in_time), "hh:mm a")
                          : "—"}
                        {" – "}
                        {r.check_out_time
                          ? format(new Date(r.check_out_time), "hh:mm a")
                          : "—"}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {corrections.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Correction audit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {corrections.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2"
              >
                <p className="font-medium text-slate-800">
                  {c.reason || c.action || "Correction"}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {c.admin_name || c.admin_id || "Admin"}
                  {c.created_at
                    ? ` · ${format(new Date(c.created_at), "dd MMM yyyy, hh:mm a")}`
                    : ""}
                  {c.before?.status || c.after?.status
                    ? ` · ${c.before?.status || "—"} → ${c.after?.status || "—"}`
                    : ""}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </main>
  )
}
