"use client"

import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react"
import {
  ArrowLeft,
  CalendarDays,
  Eye,
  HeartPulse,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Tent,
  User,
  Wallet,
} from "lucide-react"
import { getBackendApiUrl } from "@/lib/config"
import { TokenManager } from "@/lib/tokenManager"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AppModal } from "@/components/ui/AppModal"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import { cn } from "@/lib/utils"
import {
  AdminCard,
  AdminFilterBar,
  AdminPageHeader,
  AdminPageShell,
  AdminTableShell,
  adminOutlineBtnClass,
  adminPrimaryBtnClass,
} from "@/components/dashboard/AdminPageShell"

type EventOption = { event_id: string; event_name: string; event_dates?: string }

type Row = {
  id: string
  status?: string
  event_id?: string
  event_name?: string
  event_dates?: string
  event_location?: string
  full_name?: string
  parent_guardian_mobile?: string
  email?: string
  payment_mode?: string
  transaction_id?: string
  created_at?: string
}

type Detail = {
  id: string
  status?: string
  registration_code?: string
  event?: {
    event_id?: string
    event_name?: string
    event_dates?: string
    event_location?: string
    fee_total?: string
    fee_pay_now?: string
    fee_balance?: string
    refund_text?: string
  }
  participant?: Record<string, string>
  training?: Record<string, string>
  medical?: Record<string, string>
  food?: Record<string, string>
  emergency?: Record<string, string>
  residential?: Record<string, string>
  payment?: Record<string, string | boolean>
  rules?: Record<string, boolean>
  photo?: { consent?: boolean }
  parent_consent?: Record<string, string | boolean>
  hear_about?: { sources?: string[]; other_source?: string; referred_by?: string }
  final?: Record<string, string | boolean>
  created_at?: string
}

function pick(data: Record<string, unknown> | undefined, keys: string[]): string {
  if (!data) return ""
  for (const k of keys) {
    const v = data[k]
    if (v !== null && v !== undefined && String(v).trim() !== "") return String(v)
  }
  return ""
}

const LEAD_STATUSES = [
  "received",
  "contacted",
  "confirmed",
  "waitlisted",
  "pending_payment",
  "paid",
  "registered",
  "cancelled",
  "rejected",
] as const

function statusLabel(status?: string) {
  if (status === "paid") return "Paid"
  if (status === "pending_payment") return "Pending payment"
  if (status === "received") return "New enquiry"
  if (status === "contacted") return "Contacted"
  if (status === "confirmed") return "Confirmed"
  if (status === "waitlisted") return "Waitlisted"
  if (status === "registered") return "Registered"
  if (status === "cancelled") return "Cancelled"
  if (status === "rejected") return "Rejected"
  return status ? status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—"
}

function statusPillClass(status?: string) {
  if (status === "paid" || status === "confirmed" || status === "registered") return "admin-status-paid"
  if (status === "received" || status === "contacted") return "admin-status-pending"
  if (status === "pending_payment" || status === "waitlisted") return "admin-status-draft"
  if (status === "cancelled" || status === "rejected") return "admin-status-cancelled"
  return "admin-status-draft"
}

function shortId(id?: string) {
  if (!id) return "—"
  const clean = id.replace(/-/g, "").toUpperCase()
  return `CR-${clean.slice(-5)}`
}

function formatWhen(iso?: string) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

function Field({ label, value, wide }: { label: string; value: ReactNode; wide?: boolean }) {
  return (
    <div className={cn("min-w-0", wide && "sm:col-span-2 xl:col-span-3")}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">{label}</dt>
      <dd className="mt-1.5 text-[15px] font-medium leading-relaxed text-[#2F3153] break-words">
        {value || <span className="font-normal text-[#9CA3AF]">—</span>}
      </dd>
    </div>
  )
}

function EnquirySection({
  icon: Icon,
  title,
  accent,
  children,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  accent: string
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#E8EAF0] bg-white shadow-sm">
      <div className={cn("flex items-center gap-2.5 border-b border-[#E8EAF0] px-5 py-3.5", accent)}>
        <Icon className="h-4.5 w-4.5 h-[18px] w-[18px] shrink-0 text-[#C9971A]" />
        <h3 className="text-sm font-semibold text-[#2F3153]">{title}</h3>
      </div>
      <dl className="grid grid-cols-1 gap-x-8 gap-y-5 p-5 sm:grid-cols-2 xl:grid-cols-3">{children}</dl>
    </section>
  )
}

export default function CampRegistrationsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [events, setEvents] = useState<EventOption[]>([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [eventId, setEventId] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [viewMode, setViewMode] = useState<"list" | "detail">("list")
  const [statusViewId, setStatusViewId] = useState<string | null>(null)
  const [statusDraft, setStatusDraft] = useState("received")
  const [statusNote, setStatusNote] = useState("")
  const [statusSaving, setStatusSaving] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const limit = 25

  const load = useCallback(async () => {
    const token = TokenManager.getToken()
    if (!token) {
      setError("Not authenticated")
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const q = new URLSearchParams({ skip: String(skip), limit: String(limit) })
      if (search.trim()) q.set("search", search.trim())
      if (eventId !== "all") q.set("event_id", eventId)
      const res = await fetch(getBackendApiUrl(`camp-registrations?${q.toString()}`), {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        cache: "no-store",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Failed to load")
      setRows(Array.isArray(data.items) ? data.items : [])
      setTotal(typeof data.total === "number" ? data.total : 0)
      setEvents(Array.isArray(data.events) ? data.events : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [skip, search, eventId])

  useEffect(() => {
    load()
  }, [load])

  const openDetail = async (id: string) => {
    const token = TokenManager.getToken()
    if (!token) return
    setDetailLoading(true)
    setViewMode("detail")
    setDetail(null)
    try {
      const res = await fetch(getBackendApiUrl(`camp-registrations/${encodeURIComponent(id)}`), {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      if (!res.ok) {
        setViewMode("list")
        return
      }
      setDetail(await res.json())
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetail = () => {
    setViewMode("list")
    setDetail(null)
  }

  const participantName = useMemo(
    () => pick(detail?.participant, ["full_name", "name", "participant_name"]) || "Participant",
    [detail]
  )

  const openStatus = (id: string, current?: string) => {
    setStatusViewId(id)
    setStatusDraft((current || rows.find((r) => r.id === id)?.status || "received").toLowerCase())
    setStatusNote("")
    setStatusError(null)
  }

  const saveStatus = async () => {
    if (!statusViewId) return
    const token = TokenManager.getToken()
    if (!token) return
    setStatusSaving(true)
    setStatusError(null)
    try {
      const res = await fetch(getBackendApiUrl(`camp-registrations/${encodeURIComponent(statusViewId)}/status`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusDraft, note: statusNote.trim() || null }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.detail === "string" ? data.detail : "Failed to update status")
      }
      const next = data.status || statusDraft
      setRows((prev) => prev.map((r) => (r.id === statusViewId ? { ...r, status: next } : r)))
      if (detail?.id === statusViewId) {
        setDetail({ ...detail, status: next })
      }
      setStatusViewId(null)
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : "Failed to update status")
    } finally {
      setStatusSaving(false)
    }
  }

  const statusRow = rows.find((r) => r.id === statusViewId)

  if (viewMode === "detail") {
    return (
      <AdminPageShell className="admin-stack min-h-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={closeDetail}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#4F5077] hover:text-[#2F3153]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to enquiries
          </button>
        </div>

        {detailLoading && !detail ? (
          <AdminCard className="flex min-h-[50vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#6B7280]" />
          </AdminCard>
        ) : detail ? (
          <div className="flex min-h-0 flex-1 flex-col gap-5 pb-6">
            {/* Lead header */}
            <div className="rounded-2xl border border-[#E8EAF0] bg-gradient-to-br from-[#FFFBF0] via-white to-[#F8FAFC] p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-[#2F3153] px-2.5 py-1 font-mono text-xs font-semibold tracking-wide text-white">
                      {shortId(detail.id)}
                    </span>
                    <span className="text-xs font-medium uppercase tracking-wide text-[#C9971A]">
                      Campaign enquiry
                    </span>
                    <span className={cn(statusPillClass(detail.status), "inline-flex")}>
                      {statusLabel(detail.status)}
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#2F3153] sm:text-[1.75rem]">
                    {participantName}
                  </h1>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#4F5077]">
                    <span className="inline-flex items-center gap-1.5">
                      <Tent className="h-4 w-4 text-[#C9971A]" />
                      {detail.event?.event_name || "Camp registration"}
                    </span>
                    {detail.event?.event_dates ? (
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-4 w-4 text-[#6B7280]" />
                        {detail.event.event_dates}
                      </span>
                    ) : null}
                    {detail.event?.event_location ? (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-[#6B7280]" />
                        {detail.event.event_location}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-[#6B7280]">
                    Submitted {formatWhen(detail.created_at)}
                    {detail.registration_code ? ` · Code ${detail.registration_code}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className={adminOutlineBtnClass}
                    onClick={() => openStatus(detail.id, detail.status)}
                  >
                    Change Status
                  </Button>
                  <Button type="button" className={adminPrimaryBtnClass} onClick={closeDetail}>
                    Done
                  </Button>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 border-t border-[#E8EAF0]/80 pt-4 sm:grid-cols-3">
                <div className="rounded-xl bg-white/80 px-4 py-3 ring-1 ring-[#E8EAF0]">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">Phone</div>
                  <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-[#2F3153]">
                    <Phone className="h-3.5 w-3.5 text-[#C9971A]" />
                    {pick(detail.participant, ["parent_guardian_mobile", "phone", "mobile"]) || "—"}
                  </div>
                </div>
                <div className="rounded-xl bg-white/80 px-4 py-3 ring-1 ring-[#E8EAF0]">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">Email</div>
                  <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-[#2F3153] break-all">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-[#C9971A]" />
                    {pick(detail.participant, ["email"]) || "—"}
                  </div>
                </div>
                <div className="rounded-xl bg-white/80 px-4 py-3 ring-1 ring-[#E8EAF0]">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">Fee / pay now</div>
                  <div className="mt-1 text-sm font-semibold text-[#2F3153]">
                    {[detail.event?.fee_total, detail.event?.fee_pay_now].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Full-page sections */}
            <EnquirySection icon={User} title="Participant information" accent="bg-[#FFFBF0]">
              <Field label="Full name" value={pick(detail.participant, ["full_name", "name"])} />
              <Field label="Date of birth" value={pick(detail.participant, ["dob", "date_of_birth"])} />
              <Field label="Age" value={pick(detail.participant, ["age"])} />
              <Field label="Gender" value={pick(detail.participant, ["gender"])} />
              <Field
                label="Guardian name"
                value={pick(detail.participant, ["guardian_name", "parent_guardian_name"])}
              />
              <Field
                label="Guardian relation"
                value={pick(detail.participant, ["guardian_relation", "relationship", "parent_relation"])}
              />
              <Field
                label="Alternate contact"
                value={pick(detail.participant, ["alternate_contact", "alt_phone"])}
              />
              <Field label="Address" value={pick(detail.participant, ["address", "full_address"])} wide />
            </EnquirySection>

            <EnquirySection icon={Tent} title="Training background" accent="bg-[#F8FAFC]">
              <Field
                label="Level / beginner"
                value={pick(detail.training, ["level", "belt_level", "course_level", "shaolin_beginner"])}
              />
              <Field
                label="Trained before"
                value={pick(detail.training, ["trained_before", "prior_training"])}
              />
              <Field label="Training details" value={pick(detail.training, ["trained_details"])} />
              <Field label="Current sports" value={pick(detail.training, ["current_sports", "sports"])} />
              <Field label="Fitness level" value={pick(detail.training, ["fitness_level", "fitness"])} />
            </EnquirySection>

            <EnquirySection icon={HeartPulse} title="Medical & dietary" accent="bg-[#FFF8F8]">
              <Field label="Injuries" value={pick(detail.medical, ["injury", "injuries"])} />
              <Field label="Injury details" value={pick(detail.medical, ["injury_details"])} />
              <Field
                label="Medical conditions"
                value={pick(detail.medical, ["medical_condition", "conditions"])}
              />
              <Field label="Allergies" value={pick(detail.medical, ["allergies"])} />
              <Field label="Medication" value={pick(detail.medical, ["medication"])} />
              <Field label="Blood group" value={pick(detail.medical, ["blood_group"])} />
              <Field label="Food preference" value={pick(detail.food, ["preference", "food_preference"])} />
              <Field
                label="Dietary restrictions"
                value={pick(detail.food, ["dietary_restriction", "dietary_details"])}
              />
            </EnquirySection>

            <EnquirySection icon={MapPin} title="Camp stay & emergency" accent="bg-[#F5F9FF]">
              <Field label="Emergency contact" value={pick(detail.emergency, ["name", "contact_name"])} />
              <Field label="Relationship" value={pick(detail.emergency, ["relationship"])} />
              <Field label="Emergency phone" value={pick(detail.emergency, ["phone", "mobile"])} />
              <Field
                label="Alternate phone"
                value={pick(detail.emergency, ["alternate_phone"])}
              />
              <Field
                label="Attended before"
                value={pick(detail.residential, ["attended_before"])}
              />
              <Field
                label="Special requirements"
                value={pick(detail.residential, [
                  "special_requirements",
                  "special_requirements_details",
                  "accommodation",
                  "room_type",
                ])}
                wide
              />
            </EnquirySection>

            <EnquirySection icon={Wallet} title="Payment & consent" accent="bg-[#F7FBF4]">
              <Field label="Fee total" value={detail.event?.fee_total} />
              <Field label="Pay now" value={detail.event?.fee_pay_now} />
              <Field label="Balance" value={detail.event?.fee_balance} />
              <Field label="Payment mode" value={String(detail.payment?.payment_mode || "")} />
              <Field label="Transaction ID" value={String(detail.payment?.transaction_id || "")} />
              <Field
                label="Screenshot"
                value={
                  typeof detail.payment?.screenshot_url === "string" && detail.payment.screenshot_url ? (
                    <a
                      className="font-semibold text-[#C9971A] underline"
                      href={resolvePublicAssetUrl(detail.payment.screenshot_url)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View payment screenshot
                    </a>
                  ) : (
                    ""
                  )
                }
              />
              <Field
                label="How they heard"
                value={
                  [
                    Array.isArray(detail.hear_about?.sources) ? detail.hear_about.sources.join(", ") : "",
                    detail.hear_about?.other_source,
                    detail.hear_about?.referred_by ? `Referred by ${detail.hear_about.referred_by}` : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")
                }
              />
              <Field label="Photo / video consent" value={detail.photo?.consent ? "Agreed" : ""} />
              <Field
                label="Parent consent"
                value={
                  detail.parent_consent?.agreed
                    ? [
                        "Agreed",
                        detail.parent_consent?.name ? String(detail.parent_consent.name) : "",
                        detail.parent_consent?.relationship
                          ? `(${String(detail.parent_consent.relationship)})`
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")
                    : ""
                }
              />
            </EnquirySection>
          </div>
        ) : (
          <AdminCard className="text-sm text-[#6B7280]">Unable to load this enquiry.</AdminCard>
        )}

        <AppModal
          open={!!statusViewId}
          onClose={() => !statusSaving && setStatusViewId(null)}
          title="Change enquiry status"
          size="sm"
          footer={
            <div className="flex w-full flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className={adminOutlineBtnClass}
                disabled={statusSaving}
                onClick={() => setStatusViewId(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className={adminPrimaryBtnClass}
                disabled={statusSaving}
                onClick={() => void saveStatus()}
              >
                {statusSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Update status
              </Button>
            </div>
          }
        >
          {statusViewId ? (
            <div className="space-y-4 text-sm text-[#4F5077]">
              <p>
                <span className="font-medium text-[#2F3153]">{detail?.participant ? participantName : statusRow?.full_name}</span>{" "}
                · {shortId(statusViewId)}
              </p>
              <p>
                Current:{" "}
                <span className={cn(statusPillClass(detail?.status || statusRow?.status), "inline-flex")}>
                  {statusLabel(detail?.status || statusRow?.status)}
                </span>
              </p>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">New status</label>
                <Select value={statusDraft} onValueChange={setStatusDraft}>
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {statusLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Note (optional)</label>
                <Input
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="e.g. Called guardian, awaiting fee"
                />
              </div>
              {statusError ? <p className="text-sm text-red-600">{statusError}</p> : null}
            </div>
          ) : null}
        </AppModal>
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell className="admin-stack min-h-0 flex-1">
      <AdminPageHeader
        icon={CalendarDays}
        title="Camp Registration Enquiries"
        subtitle="Leads from campaign camp registration forms — review submissions and update status."
        actions={
          <Button type="button" variant="outline" className={adminOutlineBtnClass} onClick={() => load()} disabled={loading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      <AdminFilterBar>
        <Select
          value={eventId}
          onValueChange={(v) => {
            setSkip(0)
            setEventId(v)
          }}
        >
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder="All events" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All events</SelectItem>
            {events.map((ev) => (
              <SelectItem key={ev.event_id} value={ev.event_id}>
                {ev.event_name}
                {ev.event_dates ? ` • ${ev.event_dates}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <form
          className="col-span-full flex min-w-0 flex-col gap-2 sm:col-span-2 sm:flex-row lg:col-span-3"
          onSubmit={(e) => {
            e.preventDefault()
            setSkip(0)
            setSearch(searchInput)
          }}
        >
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
            <Input
              placeholder="Search name, phone, email, event…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" className={adminPrimaryBtnClass}>
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
                {skip + 1}–{Math.min(skip + limit, total)} of {total} enquiries
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - limit))}>
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
        <table className="min-w-[960px] w-full text-sm">
          <thead>
            <tr className="border-b border-[#E8EAF0] text-left text-xs font-medium uppercase tracking-wide text-[#6B7280]">
              <th className="px-4 py-3">Enquiry # / Date</th>
              <th className="px-4 py-3">Participant</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Camp</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-[#6B7280]">
                  <Loader2 className="mr-2 inline h-5 w-5 animate-spin" />
                  Loading enquiries…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-[#6B7280]">
                  No camp registration enquiries found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/60">
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs font-semibold text-[#2F3153]">{shortId(row.id)}</div>
                    <div className="mt-0.5 text-xs text-[#6B7280]">{formatWhen(row.created_at)}</div>
                  </td>
                  <td className="px-4 py-3 font-medium text-[#2F3153]">{row.full_name || "—"}</td>
                  <td className="px-4 py-3 text-[#4F5077]">
                    <div className="flex items-center gap-1 text-xs">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-[#6B7280]" />
                      {row.parent_guardian_mobile || "—"}
                    </div>
                    {row.email ? (
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-[#6B7280]">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        {row.email}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#4F5077]">{row.event_name || "—"}</div>
                    {row.event_dates ? <div className="text-xs text-[#6B7280]">{row.event_dates}</div> : null}
                  </td>
                  <td className="px-4 py-3">
                    <span className={statusPillClass(row.status)}>{statusLabel(row.status)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => void openDetail(row.id)}>
                        <Eye className="mr-1 h-3.5 w-3.5" />
                        View
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-[#4F5077]"
                        onClick={() => openStatus(row.id, row.status)}
                      >
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
        open={!!statusViewId}
        onClose={() => !statusSaving && setStatusViewId(null)}
        title="Change enquiry status"
        size="sm"
        footer={
          <div className="flex w-full flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className={adminOutlineBtnClass}
              disabled={statusSaving}
              onClick={() => setStatusViewId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className={adminPrimaryBtnClass}
              disabled={statusSaving}
              onClick={() => void saveStatus()}
            >
              {statusSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Update status
            </Button>
          </div>
        }
      >
        {statusRow ? (
          <div className="space-y-4 text-sm text-[#4F5077]">
            <p>
              <span className="font-medium text-[#2F3153]">{statusRow.full_name}</span> · {shortId(statusRow.id)}
            </p>
            <p>
              Current:{" "}
              <span className={cn(statusPillClass(statusRow.status), "inline-flex")}>
                {statusLabel(statusRow.status)}
              </span>
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">New status</label>
              <Select value={statusDraft} onValueChange={setStatusDraft}>
                <SelectTrigger className="w-full bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Note (optional)</label>
              <Input
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="e.g. Called guardian, awaiting fee"
              />
            </div>
            {statusError ? <p className="text-sm text-red-600">{statusError}</p> : null}
          </div>
        ) : null}
      </AppModal>
    </AdminPageShell>
  )
}
