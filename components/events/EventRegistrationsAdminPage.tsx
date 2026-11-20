"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, Download, Eye, Loader2, Pencil, RefreshCw, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import BranchSelectionField from "@/components/layout/BranchSelectionField"
import { Textarea } from "@/components/ui/textarea"
import { AppModal } from "@/components/ui/AppModal"
import {
  AdminCard,
  AdminFilterBar,
  AdminPageHeader,
  AdminPageShell,
  AdminTableShell,
  adminOutlineBtnClass,
  adminPrimaryBtnClass,
} from "@/components/dashboard/AdminPageShell"
import { cn } from "@/lib/utils"
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
  const [statusModalOpen, setStatusModalOpen] = useState(false)

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
      setStatusModalOpen(false)
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

  const openView = async (id: string) => {
    setStatusModalOpen(false)
    await openDetail(id)
  }

  const openChangeStatus = async (id: string) => {
    await openDetail(id)
    setStatusModalOpen(true)
  }

  const shortRegId = (id: string) => `ER-${id.replace(/-/g, "").toUpperCase().slice(-5)}`

  const RegDefCard = ({
    title,
    rows,
  }: {
    title: string
    rows: { label: string; value: ReactNode }[]
  }) => (
    <AdminCard className="flex h-full min-h-[11rem] flex-col border-[#E8EAF0]">
      <h3 className="mb-3 border-b border-[#E8EAF0] pb-2 text-sm font-semibold text-[#2F3153]">{title}</h3>
      <dl className="grid flex-1 grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">{row.label}</dt>
            <dd className="mt-1 break-words text-sm font-medium leading-snug text-[#2F3153]">{row.value ?? "—"}</dd>
          </div>
        ))}
      </dl>
    </AdminCard>
  )

  return (
    <AdminPageShell className="admin-stack min-h-0 flex-1">
      <AdminPageHeader
        icon={CalendarDays}
        title="Event Registration Enquiries"
        subtitle="Seminar, workshop, and event sign-ups. New registrations also sync to Leads (academy_event_registration)."
        actions={
          <>
            <Link
              href={eventsCmsHref || "/events"}
              className="text-sm font-medium text-[#4F5077] hover:text-[#2F3153] hover:underline"
            >
              Manage events CMS →
            </Link>
            <Button type="button" variant="outline" className={adminOutlineBtnClass} onClick={() => load()} disabled={loading}>
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button type="button" className={adminPrimaryBtnClass} onClick={() => void doExport()} disabled={exporting}>
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Export CSV
            </Button>
          </>
        }
      />

      {summary ? (
        <div className="admin-kpi-grid">
          <button
            type="button"
            className="admin-kpi-card text-left transition hover:ring-2 hover:ring-[#E1BB33]/40"
            onClick={() => {
              setStatusFilter("all")
              setSkip(0)
            }}
          >
            <div>
              <div className="admin-kpi-label">Total</div>
              <div className="admin-kpi-value">{summary.total}</div>
            </div>
          </button>
          {EVENT_REGISTRATION_STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              className={cn(
                "admin-kpi-card text-left transition hover:ring-2 hover:ring-[#E1BB33]/40",
                statusFilter === s.value && "ring-2 ring-[#E1BB33]"
              )}
              onClick={() => {
                setStatusFilter(s.value)
                setSkip(0)
              }}
            >
              <div>
                <div className="admin-kpi-label">{s.label}</div>
                <div className="admin-kpi-value">{summary.by_status?.[s.value] ?? 0}</div>
              </div>
            </button>
          ))}
        </div>
      ) : null}

      <AdminFilterBar>
        <Select
          value={eventFilter}
          onValueChange={(v) => {
            setEventFilter(v)
            setSkip(0)
          }}
        >
          <SelectTrigger className="w-full bg-white">
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
        {pathname?.startsWith("/branch-admin/") ? (
          <BranchSelectionField readOnly className="bg-white" />
        ) : (
          <Select
            value={branchFilter}
            onValueChange={(v) => {
              setBranchFilter(v)
              setSkip(0)
            }}
          >
            <SelectTrigger className="w-full bg-white">
              <SelectValue placeholder="All academies" />
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
        )}
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v)
            setSkip(0)
          }}
        >
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder="Status" />
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
        <Select
          value={paymentFilter}
          onValueChange={(v) => {
            setPaymentFilter(v)
            setSkip(0)
          }}
        >
          <SelectTrigger className="w-full bg-white">
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
            setFromDate(e.target.value)
            setSkip(0)
          }}
        />
        <Input
          type="date"
          value={toDate}
          onChange={(e) => {
            setToDate(e.target.value)
            setSkip(0)
          }}
        />
        <form
          className="col-span-full flex min-w-0 gap-2 lg:col-span-2"
          onSubmit={(e) => {
            e.preventDefault()
            setSearch(searchInput.trim())
            setSkip(0)
          }}
        >
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
            <Input
              className="pl-10"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Name, phone, email, event, payment id…"
            />
          </div>
          <Button type="submit" variant="outline" className={adminOutlineBtnClass}>
            Search
          </Button>
        </form>
      </AdminFilterBar>

      {error ? (
        <AdminCard className="border-red-200 bg-red-50 text-sm text-red-700">{error}</AdminCard>
      ) : null}

      <AdminTableShell
        footer={
          total > limit ? (
            <>
              <span className="text-sm text-[#6B7280]">
                {skip + 1}–{Math.min(skip + limit, total)} of {total}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={skip <= 0} onClick={() => setSkip(Math.max(0, skip - limit))}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={skip + limit >= total} onClick={() => setSkip(skip + limit)}>
                  Next
                </Button>
              </div>
            </>
          ) : (
            <span className="text-sm text-[#6B7280]">{total} enquir{total === 1 ? "y" : "ies"}</span>
          )
        }
      >
        <table className="min-w-[1000px] w-full text-sm">
          <thead>
            <tr className="border-b border-[#E8EAF0] text-left text-xs font-medium uppercase tracking-wide text-[#6B7280]">
              <th className="px-4 py-3">Enquiry # / Date</th>
              <th className="px-4 py-3">Participant</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Fee</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-[#6B7280]">
                  <Loader2 className="mr-2 inline h-5 w-5 animate-spin" />
                  Loading enquiries…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-[#6B7280]">
                  No registrations match these filters.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/60">
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs font-semibold text-[#2F3153]">{shortRegId(r.id)}</div>
                    <div className="mt-0.5 text-xs text-[#6B7280]">{formatWhen(r.created_at)}</div>
                  </td>
                  <td className="px-4 py-3 font-medium text-[#2F3153]">{r.participant_name}</td>
                  <td className="px-4 py-3 text-xs text-[#4F5077]">
                    <div>{r.participant_phone}</div>
                    {r.participant_email ? <div className="text-[#6B7280]">{r.participant_email}</div> : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#4F5077] line-clamp-1">{r.event_title || "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-[#2F3153]">{formatEventFee(r.fee_inr)}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={cn("text-xs", STATUS_BADGE[r.status] || "")}>
                      {registrationStatusLabel(r.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => void openView(r.id)}>
                        <Eye className="mr-1 h-3.5 w-3.5" />
                        View
                      </Button>
                      <Button type="button" size="sm" variant="ghost" className="text-[#4F5077]" onClick={() => void openChangeStatus(r.id)}>
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Change Status
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AdminTableShell>

      <AppModal
        open={(!!detail || detailLoading) && !statusModalOpen}
        onClose={() => setDetail(null)}
        title="Event registration enquiry"
        size="lg"
        className="max-w-4xl"
      >
        {detailLoading && !detail ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#6B7280]" />
          </div>
        ) : detail ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[#E8EAF0] bg-[#F8FAFC] p-4">
              <div>
                <p className="text-lg font-semibold text-[#2F3153]">{detail.participant_name}</p>
                <p className="mt-1 text-xs text-[#6B7280]">
                  {shortRegId(detail.id)} · {formatWhen(detail.created_at)}
                </p>
              </div>
              <Badge variant="outline" className={STATUS_BADGE[detail.status] || ""}>
                {registrationStatusLabel(detail.status)}
              </Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <RegDefCard
                title="Participant"
                rows={[
                  { label: "Name", value: detail.participant_name },
                  { label: "Phone", value: detail.participant_phone },
                  { label: "Email", value: detail.participant_email },
                  { label: "Notes", value: detail.notes },
                ]}
              />
              <RegDefCard
                title="Event"
                rows={[
                  { label: "Title", value: detail.event_title },
                  { label: "Start", value: formatWhen(detail.event_start_at) },
                  { label: "Venue", value: detail.event_venue },
                  {
                    label: "Public page",
                    value: detail.event_slug ? (
                      <Link href={`/events/${detail.event_slug}`} className="text-[#C9971A] hover:underline" target="_blank">
                        /events/{detail.event_slug}
                      </Link>
                    ) : (
                      "—"
                    ),
                  },
                ]}
              />
              <RegDefCard
                title="Payment"
                rows={[
                  { label: "Fee", value: formatEventFee(detail.fee_inr) },
                  { label: "Payment status", value: detail.payment_status },
                  { label: "Razorpay ID", value: detail.razorpay_payment_id },
                  { label: "Reference", value: detail.id },
                ]}
              />
            </div>
          </div>
        ) : null}
      </AppModal>

      <AppModal
        open={statusModalOpen && !!detail}
        onClose={() => {
          setStatusModalOpen(false)
        }}
        title="Update enquiry status"
        size="md"
        footer={
          transitions.length > 0 ? (
            <Button
              type="button"
              className={adminPrimaryBtnClass}
              disabled={!nextStatus || saving}
              onClick={() => void saveStatus()}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save status
            </Button>
          ) : undefined
        }
      >
        {detail ? (
          <div className="space-y-3 text-sm">
            <p className="text-[#4F5077]">
              <span className="font-medium text-[#2F3153]">{detail.participant_name}</span> ·{" "}
              {registrationStatusLabel(detail.status)}
            </p>
            {transitions.length > 0 ? (
              <>
                <Label>New status</Label>
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
                <Label>Internal note (optional)</Label>
                <Textarea
                  rows={3}
                  placeholder="Optional note"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                />
              </>
            ) : (
              <p className="text-xs text-[#6B7280]">No status transitions are available for the current state.</p>
            )}
          </div>
        ) : null}
      </AppModal>
    </AdminPageShell>
  )
}
