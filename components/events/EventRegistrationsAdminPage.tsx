"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
import { formatEventFee } from "@/lib/academyEventAPI"
import type { AcademyEventRegistration } from "@/lib/academyEventRegistrationAPI"
import {
  ALLOWED_ADMIN_REGISTRATION_TRANSITIONS,
  EVENT_REGISTRATION_STATUSES,
  academyEventRegistrationAdminAPI,
  registrationStatusLabel,
} from "@/lib/academyEventRegistrationAdminAPI"

type Opt = { id: string; name: string }

const STATUS_BADGE: Record<string, string> = {
  pending_payment: "bg-amber-50 text-amber-900 border-amber-200",
  confirmed: "bg-green-50 text-green-800 border-green-200",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200",
  expired: "bg-gray-100 text-gray-600 border-gray-200",
  failed: "bg-red-50 text-red-800 border-red-200",
}

function formatWhen(iso?: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export default function EventRegistrationsAdminPage() {
  const { toast } = useToast()
  const pathname = usePathname()
  const eventsCmsHref = (pathname || "").replace(
    /\/event-registrations.*/,
    "/events"
  )
  const [rows, setRows] = useState<AcademyEventRegistration[]>([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [branchFilter, setBranchFilter] = useState("all")
  const [eventFilter, setEventFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [paymentFilter, setPaymentFilter] = useState("all")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [summary, setSummary] = useState<{
    total: number
    by_status: Record<string, number>
  } | null>(null)
  const [branches, setBranches] = useState<Opt[]>([])
  const [events, setEvents] = useState<Opt[]>([])
  const [exporting, setExporting] = useState(false)
  const limit = 25

  const [detail, setDetail] = useState<AcademyEventRegistration | null>(null)
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
    event_id: eventFilter !== "all" ? eventFilter : undefined,
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
        academyEventRegistrationAdminAPI.list({ ...filters, skip, limit }),
        academyEventRegistrationAdminAPI.summary({
          branch_id: branchFilter !== "all" ? branchFilter : undefined,
          event_id: eventFilter !== "all" ? eventFilter : undefined,
        }),
      ])
      setRows(data.registrations || [])
      setTotal(
        typeof data.total === "number"
          ? data.total
          : data.registrations?.length || 0
      )
      setSummary(summaryData)
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load event registrations"
      )
      setRows([])
      setSummary(null)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    skip,
    search,
    branchFilter,
    eventFilter,
    statusFilter,
    paymentFilter,
    fromDate,
    toDate,
  ])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const token = BranchManagerAuth.getToken() || TokenManager.getToken()
    if (!token) return
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }

    fetch(getBackendApiUrl("branches?skip=0&limit=200"), {
      headers,
      cache: "no-store",
    })
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

    fetch(getBackendApiUrl("academy-events?skip=0&limit=200"), {
      headers,
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : Promise.resolve({ events: [] })))
      .then((data) => {
        const list = data.events || []
        setEvents(
          (Array.isArray(list) ? list : []).map(
            (ev: { id: string; title?: string }) => ({
              id: ev.id,
              name: ev.title || ev.id,
            })
          )
        )
      })
      .catch(() => setEvents([]))
  }, [])

  const openDetail = async (id: string) => {
    setDetailLoading(true)
    setNextStatus("")
    setStatusNote("")
    try {
      const data = await academyEventRegistrationAdminAPI.get(id)
      setDetail(data.registration)
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Failed to load registration",
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
      const result = await academyEventRegistrationAdminAPI.updateStatus(
        detail.id,
        nextStatus,
        statusNote.trim() || undefined
      )
      setDetail(result.registration)
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
      const data = await academyEventRegistrationAdminAPI.export(filters)
      const blob = new Blob([data.content], {
        type: data.content_type || "text/csv",
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = data.filename || "academy_event_registrations.csv"
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast({ title: `Exported ${data.total ?? 0} registrations` })
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
    ? ALLOWED_ADMIN_REGISTRATION_TRANSITIONS[detail.status] || []
    : []

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Event registrations
            </h1>
            <p className="text-gray-600 text-sm">
              Review seminar, workshop, and event registrations. New sign-ups
              also sync to Leads (source: academy_event_registration).
            </p>
            <Link
              href={eventsCmsHref || "/events"}
              className="text-sm text-[#4F5077] hover:underline mt-1 inline-block"
            >
              Manage events CMS →
            </Link>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => load()}
              disabled={loading}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button
              type="button"
              className="bg-yellow-400 hover:bg-yellow-500 text-white"
              onClick={() => void doExport()}
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
            {EVENT_REGISTRATION_STATUSES.map((s) => (
              <button
                key={s.value}
                type="button"
                className={`rounded-lg border px-3 py-3 text-left hover:border-yellow-400 ${
                  statusFilter === s.value
                    ? "border-yellow-400 bg-yellow-50"
                    : "bg-white"
                }`}
                onClick={() => {
                  setStatusFilter(s.value)
                  setSkip(0)
                }}
              >
                <div className="text-xs text-gray-500">{s.label}</div>
                <div className="text-xl font-bold">
                  {summary.by_status?.[s.value] ?? 0}
                </div>
              </button>
            ))}
          </div>
        ) : null}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label>Event</Label>
              <Select
                value={eventFilter}
                onValueChange={(v) => {
                  setEventFilter(v)
                  setSkip(0)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All events</SelectItem>
                  {events.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Branch</Label>
              <Select
                value={branchFilter}
                onValueChange={(v) => {
                  setBranchFilter(v)
                  setSkip(0)
                }}
              >
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
            <div>
              <Label>Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v)
                  setSkip(0)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {EVENT_REGISTRATION_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment</Label>
              <Select
                value={paymentFilter}
                onValueChange={(v) => {
                  setPaymentFilter(v)
                  setSkip(0)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="not_required">Not required</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>From (created)</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value)
                  setSkip(0)
                }}
              />
            </div>
            <div>
              <Label>To (created)</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value)
                  setSkip(0)
                }}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Search</Label>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  setSearch(searchInput.trim())
                  setSkip(0)
                }}
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    className="pl-9"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Name, phone, email, event, payment id…"
                  />
                </div>
                <Button type="submit" variant="outline">
                  Search
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Card className="lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Registrations ({total})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : rows.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-10">
                  No registrations match these filters.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="py-2 pr-2">Participant</th>
                        <th className="py-2 pr-2">Event</th>
                        <th className="py-2 pr-2">Fee</th>
                        <th className="py-2 pr-2">Status</th>
                        <th className="py-2"> </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className="border-b border-gray-100">
                          <td className="py-2.5 pr-2">
                            <div className="font-medium text-gray-900">
                              {r.participant_name}
                            </div>
                            <div className="text-xs text-gray-400">
                              {r.participant_phone}
                            </div>
                          </td>
                          <td className="py-2.5 pr-2">
                            <div className="text-gray-800 line-clamp-1">
                              {r.event_title || "—"}
                            </div>
                            <div className="text-xs text-gray-400">
                              {formatWhen(r.created_at)}
                            </div>
                          </td>
                          <td className="py-2.5 pr-2">
                            {formatEventFee(r.fee_inr)}
                          </td>
                          <td className="py-2.5 pr-2">
                            <Badge
                              variant="outline"
                              className={`text-xs ${STATUS_BADGE[r.status] || ""}`}
                            >
                              {registrationStatusLabel(r.status)}
                            </Badge>
                          </td>
                          <td className="py-2.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void openDetail(r.id)}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {total > limit ? (
                <div className="flex items-center justify-between mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={skip <= 0}
                    onClick={() => setSkip(Math.max(0, skip - limit))}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-gray-500">
                    {skip + 1}–{Math.min(skip + limit, total)} of {total}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={skip + limit >= total}
                    onClick={() => setSkip(skip + limit)}
                  >
                    Next
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Detail</CardTitle>
            </CardHeader>
            <CardContent>
              {detailLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : !detail ? (
                <p className="text-sm text-gray-500 text-center py-10">
                  Select a registration to view details and update status.
                </p>
              ) : (
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {detail.participant_name}
                    </div>
                    <div className="text-gray-500">{detail.participant_phone}</div>
                    {detail.participant_email ? (
                      <div className="text-gray-500">
                        {detail.participant_email}
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-md bg-gray-50 border p-3 space-y-1">
                    <div className="font-medium">
                      {detail.event_title || "Event"}
                    </div>
                    <div className="text-xs text-gray-500">
                      Start: {formatWhen(detail.event_start_at)}
                    </div>
                    {detail.event_venue ? (
                      <div className="text-xs text-gray-500">
                        Venue: {detail.event_venue}
                      </div>
                    ) : null}
                    {detail.event_slug ? (
                      <Link
                        href={`/events/${detail.event_slug}`}
                        className="text-xs text-[#4F5077] hover:underline"
                        target="_blank"
                      >
                        Public landing →
                      </Link>
                    ) : null}
                  </div>
                  <p>
                    Fee:{" "}
                    <span className="font-medium">
                      {formatEventFee(detail.fee_inr)}
                    </span>
                  </p>
                  <p>
                    Status:{" "}
                    <Badge
                      variant="outline"
                      className={STATUS_BADGE[detail.status] || ""}
                    >
                      {registrationStatusLabel(detail.status)}
                    </Badge>
                  </p>
                  <p className="text-xs text-gray-500">
                    Payment: {detail.payment_status || "—"}
                  </p>
                  {detail.razorpay_payment_id ? (
                    <p className="text-xs text-gray-500 break-all">
                      Pay ID: {detail.razorpay_payment_id}
                    </p>
                  ) : null}
                  {detail.notes ? (
                    <p className="text-xs text-gray-600">Notes: {detail.notes}</p>
                  ) : null}
                  <p className="text-xs text-gray-400 break-all">
                    Ref: {detail.id}
                  </p>

                  {transitions.length > 0 ? (
                    <div className="border-t pt-3 space-y-2">
                      <Label>Update status</Label>
                      <Select value={nextStatus} onValueChange={setNextStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {transitions.map((s) => (
                            <SelectItem key={s} value={s}>
                              {registrationStatusLabel(s)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Textarea
                        rows={2}
                        placeholder="Optional note"
                        value={statusNote}
                        onChange={(e) => setStatusNote(e.target.value)}
                      />
                      <Button
                        disabled={!nextStatus || saving}
                        onClick={() => void saveStatus()}
                        className="bg-[#4F5077] hover:bg-[#3d3e5c]"
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        Save status
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
