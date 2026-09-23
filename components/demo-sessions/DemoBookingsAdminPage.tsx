"use client"

import { useCallback, useEffect, useState } from "react"
import { Download, Loader2, RefreshCw, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { TokenManager } from "@/lib/tokenManager"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { getBackendApiUrl } from "@/lib/config"
import {
  ALLOWED_ADMIN_BOOKING_TRANSITIONS,
  DEMO_BOOKING_STATUSES,
  demoBookingAdminAPI,
} from "@/lib/demoBookingAdminAPI"
import {
  bookingStatusLabel,
  formatSlotDate,
  type DemoBooking,
} from "@/lib/demoSessionAPI"

type Opt = { id: string; name: string }

const STATUS_BADGE: Record<string, string> = {
  pending_payment: "bg-amber-50 text-amber-900 border-amber-200",
  confirmed: "bg-green-50 text-green-800 border-green-200",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200",
  expired: "bg-gray-100 text-gray-600 border-gray-200",
  failed: "bg-red-50 text-red-800 border-red-200",
}

export default function DemoBookingsAdminPage() {
  const { toast } = useToast()
  const [rows, setRows] = useState<DemoBooking[]>([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [branchFilter, setBranchFilter] = useState("all")
  const [courseFilter, setCourseFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [paymentFilter, setPaymentFilter] = useState("all")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [summary, setSummary] = useState<{
    total: number
    by_status: Record<string, number>
  } | null>(null)
  const [branches, setBranches] = useState<Opt[]>([])
  const [courses, setCourses] = useState<Opt[]>([])
  const [exporting, setExporting] = useState(false)
  const limit = 25

  const [detail, setDetail] = useState<DemoBooking | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [nextStatus, setNextStatus] = useState("")
  const [statusNote, setStatusNote] = useState("")

  const ensureAuth = () => {
    const token = BranchManagerAuth.getToken() || TokenManager.getToken()
    if (!token) {
      setError("Not authenticated")
      return null
    }
    return token
  }

  const filters = {
    branch_id: branchFilter !== "all" ? branchFilter : undefined,
    course_id: courseFilter !== "all" ? courseFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    payment_status: paymentFilter !== "all" ? paymentFilter : undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
    search: search.trim() || undefined,
  }

  const load = useCallback(async () => {
    if (!ensureAuth()) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [data, summaryData] = await Promise.all([
        demoBookingAdminAPI.list({ ...filters, skip, limit }),
        demoBookingAdminAPI.summary({
          branch_id: branchFilter !== "all" ? branchFilter : undefined,
        }),
      ])
      setRows(data.bookings || [])
      setTotal(typeof data.total === "number" ? data.total : data.bookings?.length || 0)
      setSummary(summaryData)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load demo bookings")
      setRows([])
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [skip, search, branchFilter, courseFilter, statusFilter, paymentFilter, fromDate, toDate])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const token = BranchManagerAuth.getToken() || TokenManager.getToken()
    if (!token) return
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }

    fetch(getBackendApiUrl("branches?skip=0&limit=200"), { headers, cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.resolve({ branches: [] })))
      .then((data) => {
        const list = data.branches || data || []
        setBranches(
          (Array.isArray(list) ? list : []).map(
            (b: { id: string; name?: string; branch?: { name?: string } }) => ({
              id: b.id,
              name: b.branch?.name || b.name || b.id,
            })
          )
        )
      })
      .catch(() => setBranches([]))

    fetch(getBackendApiUrl("courses?skip=0&limit=200"), { headers, cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.resolve({ courses: [] })))
      .then((data) => {
        const list = data.courses || data || []
        setCourses(
          (Array.isArray(list) ? list : []).map(
            (c: { id: string; name?: string; title?: string }) => ({
              id: c.id,
              name: c.name || c.title || c.id,
            })
          )
        )
      })
      .catch(() => setCourses([]))
  }, [])

  const openDetail = async (id: string) => {
    setDetailLoading(true)
    setNextStatus("")
    setStatusNote("")
    try {
      const data = await demoBookingAdminAPI.get(id)
      setDetail(data.booking)
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Failed to load booking",
        variant: "destructive",
      })
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const saveStatus = async () => {
    if (!detail || !nextStatus) return
    setSaving(true)
    try {
      const result = await demoBookingAdminAPI.updateStatus(
        detail.id,
        nextStatus,
        statusNote.trim() || undefined
      )
      setDetail(result.booking)
      toast({ title: "Status updated" })
      await load()
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Update failed",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const doExport = async () => {
    if (!ensureAuth()) return
    setExporting(true)
    try {
      const data = await demoBookingAdminAPI.export(filters)
      const blob = new Blob([data.content], { type: data.content_type || "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = data.filename || "demo_bookings.csv"
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast({ title: `Exported ${data.total ?? 0} bookings` })
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Export failed",
        variant: "destructive",
      })
    } finally {
      setExporting(false)
    }
  }

  const transitions = detail
    ? ALLOWED_ADMIN_BOOKING_TRANSITIONS[detail.status] || []
    : []

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Demo bookings</h1>
            <p className="text-gray-600 text-sm">
              Review paid demo reservations by branch, date, course and status
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => load()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              type="button"
              className="bg-yellow-400 hover:bg-yellow-500 text-white"
              onClick={doExport}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Export CSV
            </Button>
          </div>
        </div>

        {summary ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <button
              type="button"
              className="rounded-lg border bg-white px-3 py-3 text-left hover:border-yellow-400"
              onClick={() => {
                setStatusFilter("all")
                setSkip(0)
              }}
            >
              <div className="text-xs text-gray-500">Total</div>
              <div className="text-xl font-bold">{summary.total}</div>
            </button>
            {DEMO_BOOKING_STATUSES.map((s) => (
              <button
                key={s.value}
                type="button"
                className={`rounded-lg border px-3 py-3 text-left hover:border-yellow-400 ${
                  statusFilter === s.value ? "border-yellow-400 bg-yellow-50" : "bg-white"
                }`}
                onClick={() => {
                  setStatusFilter(s.value)
                  setSkip(0)
                }}
              >
                <div className="text-xs text-gray-500">{s.label}</div>
                <div className="text-xl font-bold">{summary.by_status[s.value] || 0}</div>
              </button>
            ))}
          </div>
        ) : null}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Bookings ({total})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                setSkip(0)
                setSearch(searchInput)
              }}
            >
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search name, phone, course, payment id…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button type="submit" className="bg-yellow-400 hover:bg-yellow-500 text-white">
                  Search
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
                <Select
                  value={branchFilter}
                  onValueChange={(v) => {
                    setSkip(0)
                    setBranchFilter(v)
                  }}
                >
                  <SelectTrigger className="h-10 bg-white">
                    <SelectValue placeholder="Branch" />
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
                <Select
                  value={courseFilter}
                  onValueChange={(v) => {
                    setSkip(0)
                    setCourseFilter(v)
                  }}
                >
                  <SelectTrigger className="h-10 bg-white">
                    <SelectValue placeholder="Course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All courses</SelectItem>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setSkip(0)
                    setStatusFilter(v)
                  }}
                >
                  <SelectTrigger className="h-10 bg-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {DEMO_BOOKING_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={paymentFilter}
                  onValueChange={(v) => {
                    setSkip(0)
                    setPaymentFilter(v)
                  }}
                >
                  <SelectTrigger className="h-10 bg-white">
                    <SelectValue placeholder="Payment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All payments</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="not_required">Not required</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setSkip(0)
                    setFromDate(e.target.value)
                  }}
                  className="h-10"
                  aria-label="From date"
                />
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setSkip(0)
                    setToDate(e.target.value)
                  }}
                  className="h-10"
                  aria-label="To date"
                />
              </div>
            </form>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {loading ? (
              <p className="text-gray-500 text-sm py-8 text-center">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="text-gray-500 text-sm py-8 text-center">No demo bookings found.</p>
            ) : (
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Slot</th>
                      <th className="px-3 py-2 font-semibold">Branch / Course</th>
                      <th className="px-3 py-2 font-semibold">Participant</th>
                      <th className="px-3 py-2 font-semibold">Fee</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold">Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-t hover:bg-yellow-50 cursor-pointer"
                        onClick={() => openDetail(row.id)}
                      >
                        <td className="px-3 py-2">
                          <div className="font-medium">{formatSlotDate(row.slot_date)}</div>
                          <div className="text-xs text-gray-500">
                            {row.start_time} – {row.end_time}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div>{row.branch_name || "—"}</div>
                          <div className="text-xs text-gray-500">{row.course_name || "—"}</div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{row.participant_name}</div>
                          <div className="text-xs text-gray-500">{row.participant_phone}</div>
                        </td>
                        <td className="px-3 py-2">₹{row.fee_inr}</td>
                        <td className="px-3 py-2">
                          <Badge
                            variant="outline"
                            className={STATUS_BADGE[row.status] || ""}
                          >
                            {bookingStatusLabel(row.status)}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-xs capitalize">
                          {row.payment_status || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {total > limit ? (
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  disabled={skip === 0}
                  onClick={() => setSkip(Math.max(0, skip - limit))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={skip + limit >= total}
                  onClick={() => setSkip(skip + limit)}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {(detail || detailLoading) && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => {
            if (!saving) setDetail(null)
          }}
        >
          <div
            className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-auto p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading || !detail ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                <div className="flex justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold">{detail.participant_name}</h2>
                    <p className="text-sm text-gray-600">{detail.participant_phone}</p>
                    <Badge
                      variant="outline"
                      className={`mt-2 ${STATUS_BADGE[detail.status] || ""}`}
                    >
                      {bookingStatusLabel(detail.status)}
                    </Badge>
                  </div>
                  <Button variant="outline" onClick={() => setDetail(null)} disabled={saving}>
                    Close
                  </Button>
                </div>
                <div className="text-sm space-y-1 text-gray-700">
                  <p>
                    Slot: {formatSlotDate(detail.slot_date)} · {detail.start_time} –{" "}
                    {detail.end_time}
                  </p>
                  <p>
                    {detail.branch_name || "—"} · {detail.course_name || "—"}
                  </p>
                  <p>Email: {detail.participant_email || "—"}</p>
                  <p>Age: {detail.participant_age ?? "—"}</p>
                  <p>Fee: ₹{detail.fee_inr}</p>
                  <p>Payment: {detail.payment_status}</p>
                  {detail.razorpay_payment_id ? (
                    <p className="text-xs break-all">Txn: {detail.razorpay_payment_id}</p>
                  ) : null}
                </div>

                {transitions.length > 0 ? (
                  <div className="space-y-3 border-t pt-4">
                    <Label>Update status</Label>
                    <Select value={nextStatus || undefined} onValueChange={setNextStatus}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select new status" />
                      </SelectTrigger>
                      <SelectContent>
                        {transitions.map((s) => (
                          <SelectItem key={s} value={s}>
                            {bookingStatusLabel(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      placeholder="Optional note"
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      rows={2}
                    />
                    <Button
                      type="button"
                      className="bg-yellow-400 hover:bg-yellow-500 text-white"
                      disabled={!nextStatus || saving}
                      onClick={saveStatus}
                    >
                      {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Save status
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 border-t pt-4">
                    No further status changes available for this booking.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
